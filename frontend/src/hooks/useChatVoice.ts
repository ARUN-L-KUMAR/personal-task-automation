import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import api from '../services/api';
import { getTTSChunkLimit, splitTextForTTS, stripMarkdownForTTS } from '../utils/voice';

const VOICE_LANG_KEY = 'g1_voice_lang';
const VOICE_RATE_KEY = 'g1_voice_rate';
const VOICE_INPUT_MODE_KEY = 'g1_voice_input_mode';
const VOICE_BROWSER_NAME_KEY = 'g1_voice_browser_name';
const ELEVEN_VOICE_ID_KEY = 'g1_eleven_voice_id';
const NO_SPEECH_TIMEOUT = 8000;
const CONFIDENCE_MIN = 0.6;
const RESUME_LISTEN_AFTER_TTS_MS = 900;
const TTS_REQUEST_TIMEOUT_MS = 10000;
const TTS_MAX_RETRIES = 3;

type VoiceErrorCategory = 'network' | 'permission' | 'engine_unavailable' | 'unknown';

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

type VoiceInputMode = 'continuous' | 'push_to_talk';

interface AssistantReply {
    id: string;
    content: string;
}

interface UseChatVoiceOptions {
    latestAssistantMessage: AssistantReply | null;
    isChatLoading: boolean;
    onVoiceMessage: (text: string) => void | Promise<void>;
    onVoiceDraft?: (text: string) => void;
    autoSendVoice?: boolean;
}

interface UseChatVoiceResult {
    isListening: boolean;
    isSpeaking: boolean;
    isStarting: boolean;
    isVoiceMode: boolean;
    interimTranscript: string;
    error: string | null;
    lowConfidence: boolean;
    language: string;
    ttsRate: number;
    inputMode: VoiceInputMode;
    availableVoices: SpeechSynthesisVoice[];
    selectedVoiceName: string;
    elevenVoiceId: string;
    elevenVoices: Array<{ id: string; name: string }>;
    isSTTSupported: boolean;
    isTTSSupported: boolean;
    premiumTTSEnabled: boolean;
    ttsFallbackNotice: string | null;
    backendVoiceEngine: string;
    backendModelId: string;
    backendVoiceId: string;
    setLanguage: Dispatch<SetStateAction<string>>;
    setTtsRate: Dispatch<SetStateAction<number>>;
    setInputMode: Dispatch<SetStateAction<VoiceInputMode>>;
    setSelectedVoiceName: (name: string) => void;
    setElevenVoiceId: Dispatch<SetStateAction<string>>;
    clearTTSFallbackNotice: () => void;
    toggleListening: () => Promise<void>;
    startHoldToTalk: () => Promise<void>;
    endHoldToTalk: () => void;
    stopAll: () => void;
}

export function useChatVoice({ latestAssistantMessage, isChatLoading, onVoiceMessage, onVoiceDraft, autoSendVoice = true }: UseChatVoiceOptions): UseChatVoiceResult {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [lowConfidence, setLowConfidence] = useState(false);
    const [language, setLanguage] = useState(() => localStorage.getItem(VOICE_LANG_KEY) || 'en-US');
    const [ttsRate, setTtsRate] = useState(() => {
        const stored = Number(localStorage.getItem(VOICE_RATE_KEY) || '1.05');
        return Number.isFinite(stored) ? Math.max(0.8, Math.min(stored, 1.2)) : 1.05;
    });
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceName, setSelectedVoiceName] = useState(() => localStorage.getItem(VOICE_BROWSER_NAME_KEY) || '');
    const [inputMode, setInputMode] = useState<VoiceInputMode>(() => (localStorage.getItem(VOICE_INPUT_MODE_KEY) as VoiceInputMode) || 'continuous');
    const [elevenVoiceId, setElevenVoiceId] = useState(() => localStorage.getItem(ELEVEN_VOICE_ID_KEY) || '');
    const [elevenVoices, setElevenVoices] = useState<Array<{ id: string; name: string }>>([]);
    const [premiumTTSEnabled, setPremiumTTSEnabled] = useState(false);
    const [ttsFallbackNotice, setTTSFallbackNotice] = useState<string | null>(null);
    const [backendVoiceEngine, setBackendVoiceEngine] = useState('browser');
    const [backendModelId, setBackendModelId] = useState('eleven_multilingual_v2');
    const [backendVoiceId, setBackendVoiceId] = useState('EXAVITQu4vr4xnSDxMaL');

    const recognitionRef = useRef<any>(null);
    const noSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wantsListeningRef = useRef(false);
    const abortTTSRef = useRef(false);
    const activeAudioRef = useRef<HTMLAudioElement | null>(null);
    const awaitingReplyRef = useRef(false);
    const lastSpokenReplyIdRef = useRef<string | null>(null);
    const latestAssistantMessageRef = useRef<AssistantReply | null>(latestAssistantMessage);
    const recognitionPhaseRef = useRef<'idle' | 'starting' | 'listening' | 'stopping'>('idle');
    const fallbackNotifiedRef = useRef(false);
    const holdToTalkRef = useRef(false);
    // Refs that shadow state so callbacks always read the latest value without
    // being affected by React's asynchronous state batching (stale closure fix).
    const isSpeakingRef = useRef(false);
    const onVoiceMessageRef = useRef(onVoiceMessage);
    const onVoiceDraftRef = useRef(onVoiceDraft);
    const autoSendVoiceRef = useRef(autoSendVoice);

    const isSTTSupported = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    const isTTSSupported = !!window.speechSynthesis;

    useEffect(() => {
        latestAssistantMessageRef.current = latestAssistantMessage;
    }, [latestAssistantMessage]);

    // Keep onVoiceMessageRef current on every render so the recognition effect
    // does NOT need onVoiceMessage in its dependency array.
    useEffect(() => {
        onVoiceMessageRef.current = onVoiceMessage;
    });

    useEffect(() => {
        onVoiceDraftRef.current = onVoiceDraft;
        autoSendVoiceRef.current = autoSendVoice;
    }, [onVoiceDraft, autoSendVoice]);

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
        api.get('/api/voice/status')
            .then(res => {
                if (res.data?.elevenlabs_available === true) setPremiumTTSEnabled(true);
            })
            .catch(() => {
                // Keep browser TTS as fallback.
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
                // Backend may not expose this route in older deployments.
            });

        api.get('/api/voice/voices')
            .then(res => {
                const voices = (res.data?.voices || []).map((v: any) => ({ id: v.id, name: v.name }));
                setElevenVoices(voices);
            })
            .catch(() => {
                // Ignore voice list failures and keep default backend voice.
            });
    }, []);

    useEffect(() => {
        localStorage.setItem(VOICE_INPUT_MODE_KEY, inputMode);
    }, [inputMode]);

    useEffect(() => {
        if (!selectedVoice?.name) return;
        localStorage.setItem(VOICE_BROWSER_NAME_KEY, selectedVoice.name);
    }, [selectedVoice]);

    useEffect(() => {
        if (!elevenVoiceId) return;
        localStorage.setItem(ELEVEN_VOICE_ID_KEY, elevenVoiceId);
    }, [elevenVoiceId]);

    const clearNoSpeechTimer = useCallback(() => {
        if (noSpeechTimerRef.current) {
            clearTimeout(noSpeechTimerRef.current);
            noSpeechTimerRef.current = null;
        }
    }, []);

    const clearRestartTimer = useCallback(() => {
        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
    }, []);

    const ensureMicrophoneAccess = useCallback(async (): Promise<boolean> => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setError('Microphone access is not available in this browser. Use Chrome or Edge on localhost or HTTPS.');
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (err: any) {
            const name = err?.name || 'UnknownError';
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                setError('Microphone permission is blocked. Allow mic access in the browser address bar and try again.');
            } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                setError('No microphone device was found. Connect a mic and try again.');
            } else {
                setError('Unable to access the microphone. Check browser permissions and audio device settings.');
            }
            return false;
        }
    }, []);

    const startRecognition = useCallback(() => {
        if (!recognitionRef.current) return;
        if (recognitionPhaseRef.current === 'starting' || recognitionPhaseRef.current === 'listening') return;
        recognitionPhaseRef.current = 'starting';
        try {
            recognitionRef.current.start();
        } catch {
            recognitionPhaseRef.current = 'idle';
        }
    }, []);

    const restartListeningIfNeeded = useCallback(() => {
        // Use isSpeakingRef (not isSpeaking state) to get the synchronously-current
        // value — avoids the stale-closure problem when called right after setIsSpeaking(false).
        if (!wantsListeningRef.current || isChatLoading || awaitingReplyRef.current || isSpeakingRef.current) return;
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
            if (!wantsListeningRef.current || awaitingReplyRef.current) return;
            setIsStarting(true);
            startRecognition();
        }, RESUME_LISTEN_AFTER_TTS_MS);
    }, [clearRestartTimer, isChatLoading, startRecognition]);

    const speakText = useCallback(async (text: string) => {
        if (!text.trim()) {
            awaitingReplyRef.current = false;
            restartListeningIfNeeded();
            return;
        }

        abortTTSRef.current = false;
        if (isTTSSupported) window.speechSynthesis.cancel();
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            activeAudioRef.current = null;
        }

        isSpeakingRef.current = true;
        setIsSpeaking(true);
        const chunks = splitTextForTTS(stripMarkdownForTTS(text), getTTSChunkLimit(premiumTTSEnabled));

        const speakChunkBrowser = (chunk: string): Promise<void> =>
            new Promise(resolve => {
                if (!isTTSSupported || abortTTSRef.current) {
                    resolve();
                    return;
                }
                const utterance = new SpeechSynthesisUtterance(chunk);
                utterance.rate = ttsRate;
                utterance.pitch = 1;
                utterance.lang = language;
                if (selectedVoice) utterance.voice = selectedVoice;
                utterance.onend = () => resolve();
                utterance.onerror = () => resolve();
                window.speechSynthesis.speak(utterance);
            });

        if (premiumTTSEnabled) {
            for (const chunk of chunks) {
                if (abortTTSRef.current) break;
                try {
                    const res = await postTTSWithRetry({ text: chunk, speed: ttsRate, voice_id: elevenVoiceId || backendVoiceId });
                    if (abortTTSRef.current) break;
                    const url = URL.createObjectURL(res.data);
                    await new Promise<void>(resolve => {
                        const audio = new Audio(url);
                        activeAudioRef.current = audio;
                        audio.onended = () => {
                            activeAudioRef.current = null;
                            URL.revokeObjectURL(url);
                            resolve();
                        };
                        audio.onerror = () => {
                            activeAudioRef.current = null;
                            URL.revokeObjectURL(url);
                            resolve();
                        };
                        audio.play().catch(() => resolve());
                    });
                } catch (err: any) {
                    if (abortTTSRef.current) break;
                    const category = getTTSCategory(err);
                    if (!fallbackNotifiedRef.current) {
                        fallbackNotifiedRef.current = true;
                        setTTSFallbackNotice(getTTSFallbackMessage(category));
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

        isSpeakingRef.current = false;
        setIsSpeaking(false);
        setIsStarting(false);
        awaitingReplyRef.current = false;
        if (!abortTTSRef.current) restartListeningIfNeeded();
    }, [isTTSSupported, language, premiumTTSEnabled, restartListeningIfNeeded, selectedVoice, ttsRate]);

    const stopAll = useCallback(() => {
        holdToTalkRef.current = false;
        wantsListeningRef.current = false;
        awaitingReplyRef.current = false;
        abortTTSRef.current = true;
        recognitionPhaseRef.current = 'stopping';
        setIsStarting(false);
        setIsVoiceMode(false);
        setIsListening(false);
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        setInterimTranscript('');
        clearNoSpeechTimer();
        clearRestartTimer();
        try { recognitionRef.current?.abort(); } catch { /* ignore */ }
        if (isTTSSupported) window.speechSynthesis.cancel();
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            activeAudioRef.current.currentTime = 0;
            activeAudioRef.current = null;
        }
    }, [clearNoSpeechTimer, clearRestartTimer, isTTSSupported]);

    const startVoiceCapture = useCallback(async (holdToTalk: boolean) => {
        if (!isSTTSupported) {
            setError('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        if (isListening || isSpeaking || isVoiceMode || isStarting) {
            stopAll();
            return;
        }

        holdToTalkRef.current = holdToTalk;
        setError(null);
        setLowConfidence(false);
        setIsStarting(true);
        wantsListeningRef.current = true;
        abortTTSRef.current = true;
        clearRestartTimer();
        if (isTTSSupported) window.speechSynthesis.cancel();
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            activeAudioRef.current = null;
        }

        const hasMicAccess = await ensureMicrophoneAccess();
        if (!hasMicAccess) {
            holdToTalkRef.current = false;
            wantsListeningRef.current = false;
            setIsStarting(false);
            setIsVoiceMode(false);
            return;
        }

        setIsVoiceMode(true);
        startRecognition();
    }, [clearRestartTimer, ensureMicrophoneAccess, isListening, isSpeaking, isSTTSupported, isTTSSupported, isVoiceMode, isStarting, startRecognition, stopAll]);

    const endHoldToTalk = useCallback(() => {
        if (!holdToTalkRef.current) return;
        holdToTalkRef.current = false;
        wantsListeningRef.current = false;
        setIsVoiceMode(false);
        recognitionPhaseRef.current = 'stopping';
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    }, []);

    const toggleListening = useCallback(async () => {
        if (isListening || isSpeaking || isVoiceMode || isStarting) {
            stopAll();
            return;
        }
        await startVoiceCapture(false);
    }, [isListening, isSpeaking, isVoiceMode, isStarting, startVoiceCapture, stopAll]);

    const startHoldToTalk = useCallback(async () => {
        await startVoiceCapture(true);
    }, [startVoiceCapture]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* ignore */ }
        }

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = language;

        rec.onstart = () => {
            recognitionPhaseRef.current = 'listening';
            setError(null);
            setIsStarting(false);
            setIsListening(true);
            setInterimTranscript('');
            clearNoSpeechTimer();
            noSpeechTimerRef.current = setTimeout(() => {
                recognitionPhaseRef.current = 'stopping';
                try { rec.stop(); } catch { /* ignore */ }
            }, NO_SPEECH_TIMEOUT);
        };

        rec.onend = () => {
            recognitionPhaseRef.current = 'idle';
            setIsStarting(false);
            setIsListening(false);
            setInterimTranscript('');
            clearNoSpeechTimer();
            // Use refs so this never captures stale state.
            if (wantsListeningRef.current && !awaitingReplyRef.current && !isSpeakingRef.current && !isChatLoading) {
                restartListeningIfNeeded();
            }
        };

        rec.onerror = (event: any) => {
            recognitionPhaseRef.current = 'idle';
            setIsStarting(false);
            clearNoSpeechTimer();
            setInterimTranscript('');
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            wantsListeningRef.current = false;
            setIsVoiceMode(false);
            setIsListening(false);
            setError(`Mic error: ${event.error}`);
        };

        rec.onresult = (event: any) => {
            clearNoSpeechTimer();
            noSpeechTimerRef.current = setTimeout(() => {
                recognitionPhaseRef.current = 'stopping';
                try { rec.stop(); } catch { /* ignore */ }
            }, NO_SPEECH_TIMEOUT);

            let interim = '';
            let finalText = '';
            let confidence: number | undefined;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                    confidence = result[0].confidence;
                } else {
                    interim += result[0].transcript;
                }
            }

            if (interim) setInterimTranscript(interim);
            if (finalText.trim()) {
                setInterimTranscript('');
                setLowConfidence(confidence !== undefined && confidence < CONFIDENCE_MIN);
                recognitionPhaseRef.current = 'stopping';
                try { rec.stop(); } catch { /* ignore */ }

                const final = finalText.trim();
                if (!autoSendVoiceRef.current && onVoiceDraftRef.current) {
                    awaitingReplyRef.current = false;
                    wantsListeningRef.current = false;
                    setIsVoiceMode(false);
                    onVoiceDraftRef.current(final);
                    return;
                }

                awaitingReplyRef.current = true;
                void Promise.resolve(onVoiceMessageRef.current(finalText.trim())).catch(() => {
                    awaitingReplyRef.current = false;
                    restartListeningIfNeeded();
                });
            }
        };

        recognitionRef.current = rec;
        return () => {
            recognitionPhaseRef.current = 'stopping';
            setIsStarting(false);
            clearRestartTimer();
            try { rec.abort(); } catch { /* ignore */ }
        };
    }, [clearNoSpeechTimer, clearRestartTimer, isChatLoading, language, restartListeningIfNeeded]);

    useEffect(() => {
        const latest = latestAssistantMessageRef.current;
        if (!latest || !awaitingReplyRef.current || latest.id === lastSpokenReplyIdRef.current) return;
        lastSpokenReplyIdRef.current = latest.id;
        void speakText(latest.content);
    }, [latestAssistantMessage, speakText]);

    useEffect(() => {
        localStorage.setItem(VOICE_LANG_KEY, language);
    }, [language]);

    useEffect(() => {
        localStorage.setItem(VOICE_RATE_KEY, String(ttsRate));
    }, [ttsRate]);

    useEffect(() => {
        return () => stopAll();
    }, [stopAll]);

    return {
        isListening,
        isSpeaking,
        isStarting,
        isVoiceMode,
        interimTranscript,
        error,
        lowConfidence,
        language,
        ttsRate,
        inputMode,
        availableVoices,
        selectedVoiceName,
        elevenVoiceId,
        elevenVoices,
        isSTTSupported,
        isTTSSupported,
        premiumTTSEnabled,
        ttsFallbackNotice,
        backendVoiceEngine,
        backendModelId,
        backendVoiceId,
        setLanguage,
        setTtsRate,
        setInputMode,
        setSelectedVoiceName: (name: string) => {
            setSelectedVoiceName(name);
            const voice = availableVoices.find(v => v.name === name) || null;
            setSelectedVoice(voice);
        },
        setElevenVoiceId,
        clearTTSFallbackNotice: () => setTTSFallbackNotice(null),
        toggleListening,
        startHoldToTalk,
        endHoldToTalk,
        stopAll,
    };
}