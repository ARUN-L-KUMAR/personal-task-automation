/**
 * useVoice — Shared voice assistant logic.
 * Mirrors useChat.ts exactly, adding:
 *   • SpeechRecognition (STT) lifecycle
 *   • speechSynthesis / ElevenLabs (TTS) with graceful fallback
 *   • Multi-turn conversation history sent to /api/chatbot/ask
 *   • Session persistence via /api/chat-history/sessions (same DB as chat)
 *   • Multi-language selection (persisted in localStorage)
 *   • Auto-listen mode (OFF by default)
 *   • 8-second no-speech timeout
 *   • Confidence < 0.6 → lowConfidence flag
 *   • TTS chunking at sentence boundaries (prevents browser 200-char cut-off)
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../services/api';
import { usePageContextStore } from '../store/usePageContextStore';
import { getTTSChunkLimit, splitTextForTTS, stripMarkdownForTTS } from '../utils/voice';

export type VoiceErrorCategory = 'network' | 'permission' | 'engine_unavailable' | 'unknown';
export type VoiceQualityPreset = 'quiet_room' | 'noisy_street' | 'headphones';

interface VoiceAnalytics {
    sttStartFailures: number;
    fallbackRate: number;
    lowConfidenceRate: number;
    recognitionCount: number;
    recognitionDurationMsTotal: number;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface VoiceMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    confidence?: number;
    error?: boolean;
    meta?: {
        model?: string;
        agentsUsed?: string[];
        latency?: number;
    };
}

export interface VoiceSession {
    id: string;
    title: string;
    messages: VoiceMessage[];
    messageCount?: number;
    language?: string;
    createdAt: string;
    updatedAt: string;
}

export interface VoiceLanguage {
    code: string;
    label: string;
    flag: string;
}

export const VOICE_LANGUAGES: VoiceLanguage[] = [
    { code: 'en-US', label: 'English (US)',  flag: '🇺🇸' },
    { code: 'en-GB', label: 'English (UK)',  flag: '🇬🇧' },
    { code: 'es-ES', label: 'Spanish',       flag: '🇪🇸' },
    { code: 'fr-FR', label: 'French',        flag: '🇫🇷' },
    { code: 'de-DE', label: 'German',        flag: '🇩🇪' },
    { code: 'hi-IN', label: 'Hindi',         flag: '🇮🇳' },
    { code: 'ta-IN', label: 'Tamil',         flag: '🇮🇳' },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const VOICE_LANG_KEY    = 'g1_voice_lang';
const VOICE_RATE_KEY    = 'g1_voice_rate';
const VOICE_AUTO_LISTEN_KEY = 'g1_voice_auto_listen';
const VOICE_BROWSER_NAME_KEY = 'g1_voice_browser_name';
const VOICE_INPUT_MODE_KEY = 'g1_voice_input_mode';
const VOICE_SEND_MODE_KEY = 'g1_voice_send_mode';
const ELEVEN_VOICE_ID_KEY = 'g1_eleven_voice_id';
const VOICE_HISTORY_KEY = 'g1_voice_history';
const VOICE_PERSIST_TRANSCRIPTS_KEY = 'g1_voice_persist_transcripts';
const VOICE_QUALITY_PRESET_KEY = 'g1_voice_quality_preset';
const VOICE_ANALYTICS_KEY = 'g1_voice_analytics';
const VOICE_SYNC_POLICY_KEY = 'g1_voice_sync_policy';
const NO_SPEECH_TIMEOUT = 8000; // ms
const CONFIDENCE_MIN    = 0.6;
const MAX_SESSIONS      = 50;
const RESUME_LISTEN_AFTER_TTS_MS = 1000;
const TTS_REQUEST_TIMEOUT_MS = 10000;
const TTS_MAX_RETRIES = 3;

type VoiceInputMode = 'continuous' | 'push_to_talk';

function defaultAnalytics(): VoiceAnalytics {
    return {
        sttStartFailures: 0,
        fallbackRate: 0,
        lowConfidenceRate: 0,
        recognitionCount: 0,
        recognitionDurationMsTotal: 0,
    };
}

function loadAnalytics(): VoiceAnalytics {
    try {
        const raw = localStorage.getItem(VOICE_ANALYTICS_KEY);
        if (!raw) return defaultAnalytics();
        const parsed = JSON.parse(raw) as Partial<VoiceAnalytics>;
        return {
            ...defaultAnalytics(),
            ...parsed,
        };
    } catch {
        return defaultAnalytics();
    }
}

function getRecognitionErrorCategory(errorCode: string): VoiceErrorCategory {
    if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') return 'permission';
    if (errorCode === 'network') return 'network';
    if (errorCode === 'audio-capture' || errorCode === 'language-not-supported') return 'engine_unavailable';
    return 'unknown';
}

function getMicErrorMessage(category: VoiceErrorCategory, fallback: string): string {
    if (category === 'permission') return 'Microphone permission is blocked. Allow mic access and try again.';
    if (category === 'network') return 'Network issue while starting speech recognition. Check your connection and retry.';
    if (category === 'engine_unavailable') return 'Speech engine unavailable in this browser/device. Switch to text mode or try Chrome/Edge.';
    return fallback;
}

function getTTSCategory(error: any): VoiceErrorCategory {
    if (error?.code === 'ECONNABORTED') return 'network';
    const status = error?.response?.status;
    if (status === 401 || status === 403) return 'permission';
    if (status === 404 || status === 503) return 'engine_unavailable';
    if (status === 408 || status === 429 || status === 500 || status === 502 || status === 504) return 'network';
    if (error?.message?.toLowerCase?.().includes('network')) return 'network';
    return 'unknown';
}

function getTTSFallbackMessage(category: VoiceErrorCategory): string {
    if (category === 'network') return 'Network issue with premium voice. Switched to browser voice.';
    if (category === 'permission') return 'Premium voice permission/configuration issue. Switched to browser voice.';
    if (category === 'engine_unavailable') return 'Premium voice engine unavailable. Switched to browser voice.';
    return 'Premium voice failed. Switched to browser voice.';
}

function getPresetConstraints(preset: VoiceQualityPreset): MediaTrackConstraints {
    if (preset === 'noisy_street') {
        return {
            noiseSuppression: { ideal: true },
            echoCancellation: { ideal: true },
            autoGainControl: { ideal: true },
            channelCount: { ideal: 1 },
        };
    }
    if (preset === 'headphones') {
        return {
            noiseSuppression: { ideal: false },
            echoCancellation: { ideal: false },
            autoGainControl: { ideal: false },
            channelCount: { ideal: 2 },
        };
    }
    return {
        noiseSuppression: { ideal: true },
        echoCancellation: { ideal: true },
        autoGainControl: { ideal: true },
        channelCount: { ideal: 1 },
    };
}

function tokenize(value: string): string[] {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

function getUncertainWords(primary: string, alternate?: string): string[] {
    if (!alternate) return [];
    const a = tokenize(primary);
    const b = new Set(tokenize(alternate));
    return Array.from(new Set(a.filter(token => token.length > 2 && !b.has(token)))).slice(0, 6);
}

async function postTTSWithRetry(payload: { text: string; speed: number; voice_id: string }) {
    let lastErr: any;
    for (let attempt = 0; attempt < TTS_MAX_RETRIES; attempt++) {
        try {
            return await api.post('/api/voice/tts', payload, { responseType: 'blob', timeout: TTS_REQUEST_TIMEOUT_MS });
        } catch (err: any) {
            lastErr = err;
            if (attempt >= TTS_MAX_RETRIES - 1) break;
            const delayMs = 300 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    throw lastErr;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isLoggedIn(): boolean {
    return !!localStorage.getItem('g-one_token');
}

function loadLocalVoiceSessions(): VoiceSession[] {
    try {
        const raw = localStorage.getItem(VOICE_HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as VoiceSession[];
        return parsed.map(s => ({
            ...s,
            messages: s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
    } catch { return []; }
}

function saveLocalVoiceSessions(sessions: VoiceSession[]) {
    try {
        localStorage.setItem(VOICE_HISTORY_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
    } catch { /* quota exceeded */ }
}

function averageRecognitionDurationMs(analytics: VoiceAnalytics): number {
    if (!analytics.recognitionCount) return 0;
    return Math.round(analytics.recognitionDurationMsTotal / analytics.recognitionCount);
}

function deriveVoiceTitle(messages: VoiceMessage[]): string {
    const first = messages.find(m => m.role === 'user');
    if (!first) return 'New Voice Session';
    const text = first.content.trim();
    return text.length > 50 ? text.slice(0, 47) + '…' : text;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useVoice() {
    const WELCOME: VoiceMessage = {
        id: 'voice-welcome',
        role: 'assistant',
        content: "👋 Hi! I'm **G-One**. Tap the mic or press Ctrl+Shift+K to start speaking.",
        timestamp: new Date(),
    };

    // ── Core state ──
    const [messages, setMessages]               = useState<VoiceMessage[]>([WELCOME]);
    const [isListening, setIsListening]         = useState(false);
    const [isProcessing, setIsProcessing]       = useState(false);
    const [isSpeaking, setIsSpeaking]           = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError]                     = useState<string | null>(null);
    const [lowConfidence, setLowConfidence]     = useState(false);
    const [uncertainWords, setUncertainWords]   = useState<string[]>([]);
    const [voiceErrorCategory, setVoiceErrorCategory] = useState<VoiceErrorCategory | null>(null);

    // ── Language + settings ──
    const [language, setLanguageState]  = useState<string>(
        () => localStorage.getItem(VOICE_LANG_KEY) || 'en-US'
    );
    const [autoListen, setAutoListen]   = useState(() => localStorage.getItem(VOICE_AUTO_LISTEN_KEY) === 'true');
    const [ttsRate, setTtsRate]         = useState(() => {
        const stored = Number(localStorage.getItem(VOICE_RATE_KEY) || '1.05');
        return Number.isFinite(stored) ? Math.max(0.8, Math.min(stored, 1.2)) : 1.05;
    });
    const [selectedVoice, setSelectedVoice]  = useState<SpeechSynthesisVoice | null>(null);
    const [selectedVoiceName, setSelectedVoiceName] = useState(() => localStorage.getItem(VOICE_BROWSER_NAME_KEY) || '');
    const [elevenVoiceId, setElevenVoiceId] = useState(() => localStorage.getItem(ELEVEN_VOICE_ID_KEY) || '');
    const [elevenVoices, setElevenVoices] = useState<Array<{ id: string; name: string }>>([]);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [inputMode, setInputMode] = useState<VoiceInputMode>(() => (localStorage.getItem(VOICE_INPUT_MODE_KEY) as VoiceInputMode) || 'continuous');
    const [autoSendVoice, setAutoSendVoice] = useState(() => localStorage.getItem(VOICE_SEND_MODE_KEY) === 'auto');
    const [draftTranscript, setDraftTranscript] = useState('');
    const [persistTranscripts, setPersistTranscripts] = useState(() => localStorage.getItem(VOICE_PERSIST_TRANSCRIPTS_KEY) !== 'false');
    const [voiceQualityPreset, setVoiceQualityPreset] = useState<VoiceQualityPreset>(() => (localStorage.getItem(VOICE_QUALITY_PRESET_KEY) as VoiceQualityPreset) || 'quiet_room');
    const [syncPolicy] = useState(() => localStorage.getItem(VOICE_SYNC_POLICY_KEY) || 'shared_voice_profile');
    const [analytics, setAnalytics] = useState<VoiceAnalytics>(() => loadAnalytics());

    // ── Premium TTS ──
    const [premiumTTSEnabled, setPremiumTTSEnabled] = useState(false);
    const [ttsFallbackNotice, setTTSFallbackNotice] = useState<string | null>(null);
    const [backendVoiceEngine, setBackendVoiceEngine] = useState('browser');
    const [backendModelId, setBackendModelId] = useState('eleven_multilingual_v2');
    const [backendVoiceId, setBackendVoiceId] = useState('EXAVITQu4vr4xnSDxMaL');

    // ── Session / history state ──
    const [activeSessionId, setActiveSessionId]   = useState<string | null>(null);
    const [voiceSessions, setVoiceSessions]       = useState<VoiceSession[]>([]);
    const [historyLoading, setHistoryLoading]     = useState(false);

    // ── Refs (avoid stale closures in STT callbacks) ──
    const recognitionRef      = useRef<any>(null);
    const processCommandRef   = useRef<(text: string, confidence?: number) => Promise<void>>(async () => {});
    const autoListenRef       = useRef(false);
    const isProcessingRef     = useRef(false);
    const messagesRef         = useRef<VoiceMessage[]>([WELCOME]);
    const activeSessionIdRef  = useRef<string | null>(null);
    const saveTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
    const noSpeechTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSpeakingRef       = useRef(false);
    const wantsListeningRef   = useRef(false);   // true while user wants mic ON
    const abortTTSRef         = useRef(false);    // when true, speakText loop stops
    const activeAudioRef      = useRef<HTMLAudioElement | null>(null); // premium TTS audio
    const fallbackNotifiedRef = useRef(false);
    const holdToTalkRef       = useRef(false);
    const recognitionStartAtRef = useRef<number | null>(null);
    const endRef              = useRef<HTMLDivElement>(null);

    // Keep refs in sync with state
    useEffect(() => { autoListenRef.current       = autoListen; },       [autoListen]);
    useEffect(() => { isProcessingRef.current     = isProcessing; },     [isProcessing]);
    useEffect(() => { messagesRef.current         = messages; },         [messages]);
    useEffect(() => { activeSessionIdRef.current  = activeSessionId; },  [activeSessionId]);
    useEffect(() => { isSpeakingRef.current       = isSpeaking; },       [isSpeaking]);

    useEffect(() => {
        localStorage.setItem(VOICE_PERSIST_TRANSCRIPTS_KEY, String(persistTranscripts));
        if (!persistTranscripts) {
            localStorage.removeItem(VOICE_HISTORY_KEY);
        }
    }, [persistTranscripts]);

    useEffect(() => {
        localStorage.setItem(VOICE_QUALITY_PRESET_KEY, voiceQualityPreset);
    }, [voiceQualityPreset]);

    useEffect(() => {
        localStorage.setItem(VOICE_ANALYTICS_KEY, JSON.stringify(analytics));
    }, [analytics]);

    useEffect(() => {
        localStorage.setItem(VOICE_SYNC_POLICY_KEY, syncPolicy);
    }, [syncPolicy]);

    const trackAnalytics = useCallback((updater: (prev: VoiceAnalytics) => VoiceAnalytics) => {
        setAnalytics(prev => updater(prev));
    }, []);

    // ── Browser support flags ──
    const isSTTSupported = !!(
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
    );
    const isTTSSupported = !!window.speechSynthesis;

    // ── Persist language to localStorage ──
    const setLanguage = useCallback((code: string) => {
        setLanguageState(code);
        localStorage.setItem(VOICE_LANG_KEY, code);
    }, []);

    useEffect(() => {
        localStorage.setItem(VOICE_RATE_KEY, String(ttsRate));
    }, [ttsRate]);

    useEffect(() => {
        localStorage.setItem(VOICE_AUTO_LISTEN_KEY, String(autoListen));
    }, [autoListen]);

    useEffect(() => {
        localStorage.setItem(VOICE_INPUT_MODE_KEY, inputMode);
    }, [inputMode]);

    useEffect(() => {
        localStorage.setItem(VOICE_SEND_MODE_KEY, autoSendVoice ? 'auto' : 'review');
    }, [autoSendVoice]);

    // ── Load browser TTS voices ──
    useEffect(() => {
        if (!isTTSSupported) return;
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
            const explicit = selectedVoiceName
                ? voices.find(v => v.name === selectedVoiceName)
                : null;
            const preferred = explicit || voices.find(v =>
                v.name.toLowerCase().includes('google us english') ||
                v.name.toLowerCase().includes('samantha')
            ) || voices.find(v => v.lang === language) || voices[0] || null;
            setSelectedVoice(preferred);
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, [isTTSSupported, language, selectedVoiceName]);

    useEffect(() => {
        if (!selectedVoice?.name) return;
        localStorage.setItem(VOICE_BROWSER_NAME_KEY, selectedVoice.name);
        setSelectedVoiceName(selectedVoice.name);
    }, [selectedVoice]);

    // ── Check if premium TTS is available (ElevenLabs key present on backend) ──
    useEffect(() => {
        api.get('/api/voice/status')
            .then(res => {
                if (res.data?.elevenlabs_available === true) {
                    setPremiumTTSEnabled(true);
                }
            })
            .catch(() => {
                // Backend not running or route doesn't exist yet — gracefully keep false
            });

        api.get('/api/voice/settings')
            .then(res => {
                if (res.data?.engine) setBackendVoiceEngine(res.data.engine);
                if (res.data?.model_id) setBackendModelId(res.data.model_id);
                if (res.data?.voice_id) {
                    setBackendVoiceId(res.data.voice_id);
                    setElevenVoiceId(prev => prev || res.data.voice_id);
                }
            })
            .catch(() => {
                // Route may be unavailable in older backend versions.
            });

        api.get('/api/voice/voices')
            .then(res => {
                const voices = (res.data?.voices || []).map((v: any) => ({ id: v.id, name: v.name }));
                setElevenVoices(voices);
            })
            .catch(() => {
                // Voice list is optional.
            });
    }, []);

    useEffect(() => {
        if (!elevenVoiceId) return;
        localStorage.setItem(ELEVEN_VOICE_ID_KEY, elevenVoiceId);
    }, [elevenVoiceId]);

    // ── scrollToBottom ──
    const scrollToBottom = useCallback(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const ensureMicrophoneAccess = useCallback(async (): Promise<boolean> => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setVoiceErrorCategory('engine_unavailable');
            setError('Microphone access is not available in this browser. Use Chrome or Edge on localhost or HTTPS.');
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: getPresetConstraints(voiceQualityPreset),
            });
            stream.getTracks().forEach(track => track.stop());
            setVoiceErrorCategory(null);
            return true;
        } catch (err: any) {
            const category = getRecognitionErrorCategory(err?.name === 'NotAllowedError' ? 'not-allowed' : err?.name === 'NotFoundError' ? 'audio-capture' : 'unknown');
            setVoiceErrorCategory(category);
            setError(getMicErrorMessage(category, 'Unable to access microphone. Check device and browser settings.'));
            return false;
        }
    }, [voiceQualityPreset]);

    // ── TTS: speakText ──
    const speakText = useCallback(async (text: string) => {
        if (!text.trim()) return;

        // Cancel any ongoing TTS
        abortTTSRef.current = false;
        if (isTTSSupported) window.speechSynthesis.cancel();
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            activeAudioRef.current = null;
        }
        setIsSpeaking(true);
        isSpeakingRef.current = true;

        const chunks = splitTextForTTS(text, getTTSChunkLimit(premiumTTSEnabled));

        const speakChunkBrowser = (chunk: string): Promise<void> =>
            new Promise(resolve => {
                if (!isTTSSupported || abortTTSRef.current) { resolve(); return; }
                const utt = new SpeechSynthesisUtterance(chunk);
                utt.rate  = ttsRate;
                utt.pitch = 1.0;
                utt.lang  = language;
                if (selectedVoice) utt.voice = selectedVoice;
                utt.onend   = () => resolve();
                utt.onerror = () => resolve();
                window.speechSynthesis.speak(utt);
            });

        if (premiumTTSEnabled) {
            for (const chunk of chunks) {
                if (abortTTSRef.current) break;
                try {
                    const res = await postTTSWithRetry({
                        text: chunk,
                        speed: ttsRate,
                        voice_id: elevenVoiceId || backendVoiceId,
                    });
                    if (abortTTSRef.current) break;
                    const url = URL.createObjectURL(res.data);
                    await new Promise<void>(resolve => {
                        const audio = new Audio(url);
                        activeAudioRef.current = audio;
                        audio.onended = () => { activeAudioRef.current = null; URL.revokeObjectURL(url); resolve(); };
                        audio.onerror = () => { activeAudioRef.current = null; URL.revokeObjectURL(url); resolve(); };
                        audio.play().catch(() => resolve());
                    });
                } catch (err: any) {
                    if (abortTTSRef.current) break;
                    const category = getTTSCategory(err);
                    setVoiceErrorCategory(category);
                    if (!fallbackNotifiedRef.current) {
                        fallbackNotifiedRef.current = true;
                        setTTSFallbackNotice(getTTSFallbackMessage(category));
                        trackAnalytics(prev => ({
                            ...prev,
                            fallbackRate: prev.fallbackRate + 1,
                        }));
                    }
                    await speakChunkBrowser(chunk);
                }
            }
        } else {
            for (const chunk of chunks) {
                if (abortTTSRef.current) break;
                await speakChunkBrowser(chunk);
            }
        }

        setIsSpeaking(false);
        isSpeakingRef.current = false;

        // Restart mic after TTS finishes if user wants listening active.
        // Small cooldown prevents the recognizer from picking up speaker tail audio.
        if (!abortTTSRef.current && wantsListeningRef.current && !isProcessingRef.current && recognitionRef.current) {
            setTimeout(() => {
                if (wantsListeningRef.current) {
                    try { recognitionRef.current?.start(); } catch { /* ignore, may already be running */ }
                }
            }, RESUME_LISTEN_AFTER_TTS_MS);
        }
    }, [isTTSSupported, ttsRate, language, selectedVoice, premiumTTSEnabled, elevenVoiceId, backendVoiceId, trackAnalytics]);

    // ── Session persistence ──
    const persistVoiceSession = useCallback((msgs: VoiceMessage[]) => {
        if (!persistTranscripts) return;
        const realMsgs = msgs.filter(m => m.id !== 'voice-welcome');
        if (realMsgs.length === 0) return;

        const sessionId = activeSessionIdRef.current;
        const title = deriveVoiceTitle(msgs);
        const messagesPayload = msgs.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
            confidence: m.confidence,
            error: m.error,
            meta: m.meta,
        }));

        const now = new Date().toISOString();
        setVoiceSessions(prev => {
            let updated: VoiceSession[];
            if (sessionId) {
                const exists = prev.some(s => s.id === sessionId);
                if (exists) {
                    updated = prev.map(s => s.id === sessionId
                        ? { ...s, title, messages: msgs, messageCount: realMsgs.length, updatedAt: now }
                        : s
                    );
                } else {
                    updated = [{ id: sessionId, title, messages: msgs, messageCount: realMsgs.length, createdAt: now, updatedAt: now }, ...prev];
                }
            } else {
                updated = prev;
            }
            saveLocalVoiceSessions(updated);
            return updated;
        });

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            if (!isLoggedIn()) return;
            try {
                const res = await api.post('/api/chat-history/sessions', {
                    session_id: sessionId,
                    title,
                    messages: messagesPayload,
                });
                const dbId = res.data?.id;
                if (dbId && dbId !== sessionId) {
                    setActiveSessionId(dbId);
                    setVoiceSessions(prev => {
                        const filtered = prev.filter(s => s.id !== sessionId && s.id !== dbId);
                        const newEntry: VoiceSession = {
                            id: dbId,
                            title,
                            messages: msgs,
                            messageCount: realMsgs.length,
                            createdAt: res.data.created_at,
                            updatedAt: res.data.updated_at,
                        };
                        const updated = [newEntry, ...filtered].slice(0, MAX_SESSIONS);
                        saveLocalVoiceSessions(updated);
                        return updated;
                    });
                }
            } catch {
                // DB save failed — localStorage copy still kept
            }
        }, 800);
    }, [persistTranscripts]);

    // ── Fetch voice sessions ──
    const fetchVoiceSessions = useCallback(async () => {
        if (!persistTranscripts) {
            setVoiceSessions([]);
            return;
        }
        if (!isLoggedIn()) {
            setVoiceSessions(loadLocalVoiceSessions());
            return;
        }
        setHistoryLoading(true);
        try {
            const res = await api.get('/api/chat-history/sessions');
            const sessions: VoiceSession[] = (res.data || []).map((s: any) => ({
                id: s.id,
                title: s.title,
                messages: [],
                messageCount: s.message_count,
                createdAt: s.created_at,
                updatedAt: s.updated_at,
            }));
            setVoiceSessions(sessions);
        } catch {
            setVoiceSessions(loadLocalVoiceSessions());
        } finally {
            setHistoryLoading(false);
        }
    }, [persistTranscripts]);

    // ── Load a past voice session ──
    const loadVoiceSession = useCallback(async (sessionId: string) => {
        setActiveSessionId(sessionId);
        const local = voiceSessions.find(s => s.id === sessionId && s.messages.length > 0);
        if (local) {
            setMessages(local.messages.map(m => ({
                ...m,
                timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp as any),
            })));
            return;
        }
        if (isLoggedIn()) {
            try {
                const res = await api.get(`/api/chat-history/sessions/${sessionId}`);
                const msgs: VoiceMessage[] = (res.data.messages || []).map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp),
                }));
                setMessages(msgs.length > 0 ? msgs : [WELCOME]);
                setVoiceSessions(prev =>
                    prev.map(s => s.id === sessionId ? { ...s, messages: msgs } : s)
                );
            } catch {
                /* ignore: keep current messages */
            }
        }
    }, [voiceSessions]);

    // ── Start a new session ──
    const startNewSession = useCallback(() => {
        // Cancel any in-flight TTS / STT
        abortTTSRef.current = true;
        if (isTTSSupported) window.speechSynthesis.cancel();
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            activeAudioRef.current = null;
        }
        wantsListeningRef.current = false;
        recognitionRef.current?.abort();
        setIsListening(false);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setActiveSessionId(null);
        setMessages([WELCOME]);
        setError(null);
        setLowConfidence(false);
        setUncertainWords([]);
        setInterimTranscript('');
    }, [isTTSSupported]);

    // ── Delete a session ──
    const deleteVoiceSession = useCallback(async (sessionId: string) => {
        setVoiceSessions(prev => {
            const updated = prev.filter(s => s.id !== sessionId);
            saveLocalVoiceSessions(updated);
            return updated;
        });
        if (activeSessionId === sessionId) {
            setActiveSessionId(null);
            setMessages([WELCOME]);
        }
        if (isLoggedIn()) {
            try { await api.delete(`/api/chat-history/sessions/${sessionId}`); }
            catch { /* ignore */ }
        }
    }, [activeSessionId]);

    // ── Core: processCommand ──
    const processCommand = useCallback(async (text: string, confidence?: number) => {
        const trimmed = text.trim();
        if (!trimmed || isProcessingRef.current) return;

        // Pause recognition immediately so we don't capture the assistant's own output.
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }

        setError(null);
        setLowConfidence(false);
        setUncertainWords([]);
        setIsProcessing(true);
        isProcessingRef.current = true;

        // Low-confidence warning
        if (confidence !== undefined && confidence < CONFIDENCE_MIN) {
            setLowConfidence(true);
            trackAnalytics(prev => ({
                ...prev,
                lowConfidenceRate: prev.lowConfidenceRate + 1,
            }));
        }

        const userMsg: VoiceMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: trimmed,
            timestamp: new Date(),
            confidence,
        };

        setMessages(prev => {
            const updated = [...prev, userMsg];
            messagesRef.current = updated;
            return updated;
        });

        // Build history from last 10 messages (excluding welcome)
        const history = messagesRef.current
            .filter(m => m.id !== 'voice-welcome')
            .slice(-10)
            .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

        // Get current page context for screen-aware responses
        const pageCtx = usePageContextStore.getState().context;
        const page_context = pageCtx
            ? `Page: ${pageCtx.pageLabel} (${pageCtx.page})\n${pageCtx.visibleContent}`
            : undefined;

        try {
            const res = await api.post('/api/chatbot/ask', { message: trimmed, history, page_context });
            const reply = res.data?.reply || "Sorry, I didn't get a response.";

            const assistantMsg: VoiceMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: reply,
                timestamp: new Date(),
                meta: {
                    model: res.data?.model,
                    agentsUsed: res.data?.agents_used || [],
                    latency: res.data?.latency,
                },
            };

            setMessages(prev => {
                const updated = [...prev, assistantMsg];
                messagesRef.current = updated;
                persistVoiceSession(updated);
                return updated;
            });

            // Speak response (fire-and-forget) — strip markdown so TTS reads naturally
            speakText(stripMarkdownForTTS(reply));

            setTimeout(scrollToBottom, 80);
        } catch (err: any) {
            const msg = err?.response?.data?.detail || err?.message || 'Failed to reach AI.';
            const errMsg: VoiceMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `⚠️ ${msg}`,
                timestamp: new Date(),
                error: true,
            };
            setMessages(prev => {
                const updated = [...prev, errMsg];
                messagesRef.current = updated;
                return updated;
            });
            setError(msg);
            setVoiceErrorCategory(getTTSCategory(err));
            setIsSpeaking(false);
            isSpeakingRef.current = false;
        } finally {
            setIsProcessing(false);
            isProcessingRef.current = false;
        }
    }, [persistVoiceSession, speakText, scrollToBottom, trackAnalytics]);

    // Keep processCommandRef current (prevents stale closures in STT callback)
    useEffect(() => {
        processCommandRef.current = processCommand;
    }, [processCommand]);

    // ── Initialise SpeechRecognition (re-init when language changes) ──
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        // Abort old instance
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* ignore */ }
        }

        const rec = new SpeechRecognition();
        rec.continuous      = true;   // stay on until user clicks stop
        rec.interimResults  = true;
        rec.lang            = language;

        rec.onstart = () => {
            recognitionStartAtRef.current = Date.now();
            setIsListening(true);
            setInterimTranscript('');
            setVoiceErrorCategory(null);
            // Reset no-speech timer — if silent for 8s we restart silently
            if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
            noSpeechTimerRef.current = setTimeout(() => {
                // Silently restart rather than showing an error
                try { rec.stop(); } catch { /* ignore */ }
            }, NO_SPEECH_TIMEOUT);
        };

        rec.onend = () => {
            if (recognitionStartAtRef.current) {
                const elapsed = Math.max(0, Date.now() - recognitionStartAtRef.current);
                trackAnalytics(prev => ({
                    ...prev,
                    recognitionCount: prev.recognitionCount + 1,
                    recognitionDurationMsTotal: prev.recognitionDurationMsTotal + elapsed,
                }));
                recognitionStartAtRef.current = null;
            }
            setIsListening(false);
            setInterimTranscript('');
            if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
            // Auto-restart if user still wants listening and not currently speaking/processing
            if (wantsListeningRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
                setTimeout(() => {
                    if (wantsListeningRef.current) {
                        try { rec.start(); } catch { /* may already be running */ }
                    }
                }, 300);
            }
        };

        rec.onerror = (event: any) => {
            if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
            setInterimTranscript('');
            // 'no-speech' and 'aborted' are normal — silently restart
            if (event.error === 'no-speech' || event.error === 'aborted') {
                // onend will auto-restart if wantsListeningRef is true
                return;
            }
            const category = getRecognitionErrorCategory(event.error);
            setIsListening(false);
            wantsListeningRef.current = false;
            setVoiceErrorCategory(category);
            setError(getMicErrorMessage(category, `Mic error: ${event.error}`));
        };

        rec.onresult = (event: any) => {
            // Ignore STT frames while processing/speaking to prevent feedback loops.
            if (isProcessingRef.current || isSpeakingRef.current) return;

            // Reset no-speech timer on any speech activity
            if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
            noSpeechTimerRef.current = setTimeout(() => {
                try { rec.stop(); } catch { /* ignore */ }
            }, NO_SPEECH_TIMEOUT);

            let interim = '';
            let finalText = '';
            let confidence: number | undefined;
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText  += result[0].transcript;
                    confidence  = result[0].confidence;
                } else {
                    interim += result[0].transcript;
                }
            }
            if (interim) setInterimTranscript(interim);
            if (finalText) {
                setInterimTranscript('');
                const final = finalText.trim();
                if (!final) return;

                const isLowConfidence = confidence !== undefined && confidence < CONFIDENCE_MIN;
                const alt = event?.results?.[event.resultIndex]?.[1]?.transcript as string | undefined;
                if (isLowConfidence) {
                    setLowConfidence(true);
                    setUncertainWords(getUncertainWords(final, alt));
                    setDraftTranscript(final);
                    wantsListeningRef.current = false;
                    try { rec.stop(); } catch { /* ignore */ }
                    return;
                }

                if (!autoSendVoice) {
                    setDraftTranscript(final);
                    wantsListeningRef.current = false;
                    try { rec.stop(); } catch { /* ignore */ }
                    return;
                }

                processCommandRef.current(final, confidence);
            }
        };

        recognitionRef.current = rec;
        return () => {
            try { rec.abort(); } catch { /* ignore */ }
        };
    }, [autoSendVoice, language, trackAnalytics]);

    // ── Cleanup on unmount (page navigation) ──
    useEffect(() => {
        return () => {
            abortTTSRef.current = true;
            wantsListeningRef.current = false;
            try { recognitionRef.current?.abort(); } catch { /* ignore */ }
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            if (activeAudioRef.current) {
                activeAudioRef.current.pause();
                activeAudioRef.current = null;
            }
            if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, []);

    const startVoiceCapture = useCallback(async (holdToTalk: boolean) => {
        if (!isSTTSupported) {
            setVoiceErrorCategory('engine_unavailable');
            setError('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        if (isListening || isSpeaking) {
            return;
        }

        const hasMicAccess = await ensureMicrophoneAccess();
        if (!hasMicAccess) {
            trackAnalytics(prev => ({
                ...prev,
                sttStartFailures: prev.sttStartFailures + 1,
            }));
            return;
        }

        holdToTalkRef.current = holdToTalk;
        wantsListeningRef.current = true;
        abortTTSRef.current = true;
        setError(null);
        setLowConfidence(false);
        if (isTTSSupported) window.speechSynthesis.cancel();
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            activeAudioRef.current = null;
        }
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        try {
            recognitionRef.current?.start();
        } catch {
            trackAnalytics(prev => ({
                ...prev,
                sttStartFailures: prev.sttStartFailures + 1,
            }));
            // Recognition may already be active — ignore
        }
    }, [ensureMicrophoneAccess, isListening, isSpeaking, isSTTSupported, isTTSSupported, trackAnalytics]);

    const startHoldToTalk = useCallback(async () => {
        await startVoiceCapture(true);
    }, [startVoiceCapture]);

    const endHoldToTalk = useCallback(() => {
        if (!holdToTalkRef.current) return;
        holdToTalkRef.current = false;
        wantsListeningRef.current = false;
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.hidden) {
                endHoldToTalk();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [endHoldToTalk]);

    // ── toggleListening ──
    const toggleListening = useCallback(async () => {
        if (!isSTTSupported) {
            setVoiceErrorCategory('engine_unavailable');
            setError('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }
        if (isListening) {
            wantsListeningRef.current = false;
            recognitionRef.current?.stop();
            return;
        }
        await startVoiceCapture(false);
    }, [isListening, isSTTSupported, startVoiceCapture]);

    // ── stopAll ──
    const stopAll = useCallback(() => {
        wantsListeningRef.current = false;
        abortTTSRef.current = true;  // break the speakText chunk loop
        recognitionRef.current?.abort();
        if (isTTSSupported) window.speechSynthesis.cancel();
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            activeAudioRef.current.currentTime = 0;
            activeAudioRef.current = null;
        }
        if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
        setIsListening(false);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setInterimTranscript('');
    }, [isTTSSupported]);

    // ── retryLastCommand ──
    const retryLastCommand = useCallback(() => {
        const lastUser = [...messagesRef.current].reverse().find(m => m.role === 'user');
        if (lastUser) {
            setLowConfidence(false);
            setUncertainWords([]);
            setError(null);
            processCommandRef.current(lastUser.content);
        }
    }, []);

    const submitDraftTranscript = useCallback(() => {
        const draft = draftTranscript.trim();
        if (!draft) return;
        setDraftTranscript('');
        setUncertainWords([]);
        processCommandRef.current(draft);
    }, [draftTranscript]);

    const discardDraftTranscript = useCallback(() => {
        setDraftTranscript('');
        setLowConfidence(false);
        setUncertainWords([]);
    }, []);

    const clearVoiceLocalData = useCallback(() => {
        setDraftTranscript('');
        setVoiceSessions([]);
        setActiveSessionId(null);
        setMessages([WELCOME]);
        localStorage.removeItem(VOICE_HISTORY_KEY);
    }, [WELCOME]);

    return {
        // State
        messages,
        isListening,
        isProcessing,
        isSpeaking,
        interimTranscript,
        error,
        lowConfidence,
        uncertainWords,
        voiceErrorCategory,
        analytics,
        persistTranscripts,
        voiceQualityPreset,
        syncPolicy,
        averageRecognitionDurationMs: averageRecognitionDurationMs(analytics),
        language,
        autoListen,
        ttsRate,
        inputMode,
        autoSendVoice,
        draftTranscript,
        selectedVoice,
        selectedVoiceName,
        elevenVoiceId,
        elevenVoices,
        availableVoices,
        premiumTTSEnabled,
        ttsFallbackNotice,
        backendVoiceEngine,
        backendModelId,
        backendVoiceId,
        // Session state
        voiceSessions,
        activeSessionId,
        historyLoading,
        // Browser support
        isSTTSupported,
        isTTSSupported,
        // Actions
        setLanguage,
        setAutoListen,
        setTtsRate,
        setInputMode,
        setAutoSendVoice,
        setPersistTranscripts,
        setVoiceQualityPreset,
        setDraftTranscript,
        setSelectedVoice,
        setSelectedVoiceName,
        setElevenVoiceId,
        toggleListening,
        startHoldToTalk,
        endHoldToTalk,
        submitDraftTranscript,
        discardDraftTranscript,
        clearVoiceLocalData,
        clearTTSFallbackNotice: () => setTTSFallbackNotice(null),
        stopAll,
        speakText,
        processCommand,
        retryLastCommand,
        // Session actions
        fetchVoiceSessions,
        loadVoiceSession,
        startNewSession,
        deleteVoiceSession,
        // Refs for layout
        endRef,
        scrollToBottom,
    };
}
