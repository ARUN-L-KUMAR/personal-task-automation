import React, { useState, useEffect } from 'react';
import {
    Mic, MicOff, Volume2, VolumeX, X, Bot, AlertCircle,
    Loader2, RefreshCw, Clock, Settings, ChevronRight,
    Trash2, Plus, Globe, Zap, MessageSquare,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import {
    useVoice,
    VOICE_LANGUAGES,
    type VoiceMessage,
} from '../../hooks/useVoice';

// Lightweight inline markdown formatter
function fmtInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-bold">{p.slice(2, -2)}</strong>;
        if (p.startsWith('*') && p.endsWith('*')) return <em key={i} className="italic">{p.slice(1, -1)}</em>;
        if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="px-0.5 bg-black/10 dark:bg-white/10 rounded text-[10px] font-mono">{p.slice(1, -1)}</code>;
        return p;
    });
}
function VoiceMarkdown({ text, className }: { text: string; className?: string }) {
    const lines = text.split('\n');
    return (
        <div className={cn('space-y-0.5', className)}>
            {lines.map((line, i) => {
                const trimmed = line.trimStart();
                if (/^#{1,6}\s/.test(trimmed)) return <p key={i} className="font-bold">{fmtInline(trimmed.replace(/^#{1,6}\s+/, ''))}</p>;
                if (/^[-*•]\s/.test(trimmed)) return <div key={i} className="flex items-start gap-1"><span className="mt-1 h-1 w-1 rounded-full bg-current flex-shrink-0 opacity-50" /><span>{fmtInline(trimmed.replace(/^[-*•]\s/, ''))}</span></div>;
                if (/^\d+\.\s/.test(trimmed)) { const n = trimmed.match(/^(\d+)\./)?.[1]; return <div key={i} className="flex items-start gap-1"><span className="font-bold opacity-50 text-[9px] flex-shrink-0">{n}.</span><span>{fmtInline(trimmed.replace(/^\d+\.\s/, ''))}</span></div>; }
                if (!line.trim()) return <div key={i} className="h-0.5" />;
                return <p key={i}>{fmtInline(line)}</p>;
            })}
        </div>
    );
}

// Animated sound bars
function SoundBars() {
    return (
        <div className="flex gap-0.5 items-end h-4">
            {[10, 14, 8, 12, 6].map((h, i) => (
                <div
                    key={i}
                    className="w-0.5 bg-violet-400 dark:bg-violet-300 rounded-full animate-bounce"
                    style={{ height: `${h}px`, animationDelay: `${i * 0.1}s`, animationDuration: '0.6s' }}
                />
            ))}
        </div>
    );
}

// Single message bubble
function VoiceBubble({ msg }: { msg: VoiceMessage }) {
    const isUser = msg.role === 'user';
    if (msg.id === 'voice-welcome') {
        return (
            <div className="flex justify-center px-3 pt-2 pb-1">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-snug">
                    {msg.content}
                </p>
            </div>
        );
    }
    return (
        <div className={cn('flex gap-2 px-3 mb-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
            {!isUser && (
                <div className="h-6 w-6 rounded-lg bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                </div>
            )}
            <div className={cn(
                'max-w-[78%] px-2.5 py-2 rounded-xl text-[11px] leading-snug',
                isUser
                    ? 'bg-violet-600 text-white rounded-tr-sm'
                    : msg.error
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-sm'
            )}>                {isUser ? msg.content : <VoiceMarkdown text={msg.content} />}
                {isUser && msg.confidence !== undefined && msg.confidence < 0.6 && (
                    <span className="block mt-0.5 text-[9px] text-violet-200 opacity-80">low confidence</span>
                )}
            </div>
        </div>
    );
}

// History panel
function HistoryPanel({ sessions, historyLoading, activeSessionId, onLoad, onDelete, onNew, onClose }: {
    sessions: ReturnType<typeof useVoice>['voiceSessions'];
    historyLoading: boolean;
    activeSessionId: string | null;
    onLoad: (id: string) => void;
    onDelete: (id: string) => void;
    onNew: () => void;
    onClose: () => void;
}) {
    return (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 z-10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Voice History</span>
                <div className="flex items-center gap-1">
                    <button onClick={onNew} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                        <Plus className="h-3 w-3" />New
                    </button>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {historyLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-violet-400" /></div>}
                {!historyLoading && sessions.length === 0 && (
                    <p className="text-[11px] text-slate-400 text-center py-8 px-4">No voice sessions yet.</p>
                )}
                {!historyLoading && sessions.map(s => (
                    <div key={s.id} className={cn('group flex items-center gap-2 px-3 py-2.5 border-b border-slate-50 dark:border-slate-800/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors', s.id === activeSessionId && 'bg-violet-50 dark:bg-violet-950/20 border-l-2 border-l-violet-500')} onClick={() => { onLoad(s.id); onClose(); }}>
                        <Mic className="h-3 w-3 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{s.title}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{s.messageCount ? `${s.messageCount} msg · ` : ''}{new Date(s.updatedAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); onDelete(s.id); }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                            <Trash2 className="h-3 w-3 text-red-400" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Settings panel
function SettingsPanel({ language, setLanguage, autoListen, setAutoListen, ttsRate, setTtsRate, inputMode, setInputMode, autoSendVoice, setAutoSendVoice, selectedVoiceName, setSelectedVoiceName, elevenVoiceId, setElevenVoiceId, voiceQualityPreset, setVoiceQualityPreset, persistTranscripts, setPersistTranscripts, clearVoiceLocalData, analytics, averageRecognitionDurationMs, syncPolicy, elevenVoices, availableVoices, selectedVoice, setSelectedVoice, onClose }: {
    language: string; setLanguage: (c: string) => void;
    autoListen: boolean; setAutoListen: (v: boolean) => void;
    ttsRate: number; setTtsRate: (v: number) => void;
    inputMode: 'continuous' | 'push_to_talk'; setInputMode: (v: 'continuous' | 'push_to_talk') => void;
    autoSendVoice: boolean; setAutoSendVoice: (v: boolean) => void;
    selectedVoiceName: string; setSelectedVoiceName: (v: string) => void;
    elevenVoiceId: string; setElevenVoiceId: (v: string) => void;
    voiceQualityPreset: 'quiet_room' | 'noisy_street' | 'headphones'; setVoiceQualityPreset: (v: 'quiet_room' | 'noisy_street' | 'headphones') => void;
    persistTranscripts: boolean; setPersistTranscripts: (v: boolean) => void;
    clearVoiceLocalData: () => void;
    analytics: { sttStartFailures: number; fallbackRate: number; lowConfidenceRate: number };
    averageRecognitionDurationMs: number;
    syncPolicy: string;
    elevenVoices: Array<{ id: string; name: string }>;
    availableVoices: SpeechSynthesisVoice[]; selectedVoice: SpeechSynthesisVoice | null; setSelectedVoice: (v: SpeechSynthesisVoice | null) => void;
    onClose: () => void;
}) {
    return (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 z-10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Voice Settings</span>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-5">
                <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5"><Globe className="inline h-3 w-3 mr-1" />Language</label>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500">
                        {VOICE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                    </select>
                </div>
                <div className="flex items-start gap-3">
                    <div className="flex-1">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Auto-listen after response</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Restart mic when G-One finishes speaking</p>
                    </div>
                    <button onClick={() => setAutoListen(!autoListen)} className={cn('relative h-5 w-9 rounded-full transition-colors flex-shrink-0 mt-0.5', autoListen ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700')}>
                        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', autoListen ? 'left-4' : 'left-0.5')} />
                    </button>
                </div>
                <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Voice quality preset</label>
                    <select value={voiceQualityPreset} onChange={e => setVoiceQualityPreset(e.target.value as 'quiet_room' | 'noisy_street' | 'headphones')} className="w-full text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="quiet_room">Quiet room</option>
                        <option value="noisy_street">Noisy street</option>
                        <option value="headphones">Headphones</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Voice input mode</p>
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button onClick={() => setInputMode('continuous')} className={cn('px-2.5 py-1 text-[10px] font-medium', inputMode === 'continuous' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300')}>Continuous</button>
                        <button onClick={() => setInputMode('push_to_talk')} className={cn('px-2.5 py-1 text-[10px] font-medium border-l border-slate-200 dark:border-slate-700', inputMode === 'push_to_talk' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300')}>Push-to-talk</button>
                    </div>
                </div>
                <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Voice send mode</p>
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button onClick={() => setAutoSendVoice(false)} className={cn('px-2.5 py-1 text-[10px] font-medium', !autoSendVoice ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300')}>Review</button>
                        <button onClick={() => setAutoSendVoice(true)} className={cn('px-2.5 py-1 text-[10px] font-medium border-l border-slate-200 dark:border-slate-700', autoSendVoice ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300')}>Auto</button>
                    </div>
                </div>
                <div>
                    <label className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        <span>TTS Speed</span><span className="font-mono text-violet-600">{ttsRate.toFixed(2)}×</span>
                    </label>
                    <input type="range" min="0.75" max="1.5" step="0.05" value={ttsRate} onChange={e => setTtsRate(parseFloat(e.target.value))} className="w-full accent-violet-600" />
                    <div className="flex justify-between text-[9px] text-slate-400 mt-0.5"><span>0.75×</span><span>1.5×</span></div>
                </div>
                {availableVoices.length > 0 && (
                    <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Browser Voice</label>
                        <select value={selectedVoiceName || selectedVoice?.name || ''} onChange={e => { setSelectedVoiceName(e.target.value); }} className="w-full text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500">
                            {availableVoices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                        </select>
                    </div>
                )}
                {elevenVoices.length > 0 && (
                    <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">ElevenLabs Voice</label>
                        <select value={elevenVoiceId} onChange={e => { setElevenVoiceId(e.target.value); }} className="w-full text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500">
                            {elevenVoices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                )}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Privacy</p>
                    <div className="flex items-start gap-3">
                        <div className="flex-1">
                            <p className="text-[10px] text-slate-600 dark:text-slate-300">Persist transcripts locally</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Disable to avoid storing voice history on this device.</p>
                        </div>
                        <button onClick={() => setPersistTranscripts(!persistTranscripts)} className={cn('relative h-5 w-9 rounded-full transition-colors flex-shrink-0 mt-0.5', persistTranscripts ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700')} aria-pressed={persistTranscripts}>
                            <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', persistTranscripts ? 'left-4' : 'left-0.5')} />
                        </button>
                    </div>
                    <button onClick={clearVoiceLocalData} className="w-full rounded-lg px-2.5 py-1.5 text-[10px] font-semibold border border-red-300 text-red-700 dark:text-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20">
                        Clear drafts and cached summaries
                    </button>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Voice analytics</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300">STT start failures: <span className="font-bold">{analytics.sttStartFailures}</span></div>
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300">Fallbacks: <span className="font-bold">{analytics.fallbackRate}</span></div>
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300">Low confidence: <span className="font-bold">{analytics.lowConfidenceRate}</span></div>
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300">Avg STT time: <span className="font-bold">{averageRecognitionDurationMs} ms</span></div>
                    </div>
                    <p className="text-[9px] text-slate-500">Sync policy: <span className="font-semibold">{syncPolicy === 'shared_voice_profile' ? 'Shared across chatbot, widget, and voice page' : syncPolicy}</span></p>
                </div>
            </div>
        </div>
    );
}

// Main widget
export function FloatingVoiceWidget() {
    const {
        messages, isListening, isProcessing, isSpeaking,
        interimTranscript, error, lowConfidence, uncertainWords, draftTranscript, voiceErrorCategory,
        language, autoListen, ttsRate, inputMode, autoSendVoice, selectedVoice, selectedVoiceName, elevenVoiceId, elevenVoices, availableVoices, premiumTTSEnabled,
        analytics, persistTranscripts, voiceQualityPreset, syncPolicy, averageRecognitionDurationMs,
        voiceSessions, activeSessionId, historyLoading,
        isSTTSupported,
        setLanguage, setAutoListen, setTtsRate, setInputMode, setAutoSendVoice, setPersistTranscripts, setVoiceQualityPreset, setDraftTranscript, setSelectedVoice, setSelectedVoiceName, setElevenVoiceId,
        toggleListening, startHoldToTalk, endHoldToTalk, submitDraftTranscript, discardDraftTranscript, stopAll, processCommand, retryLastCommand,
        clearVoiceLocalData,
        fetchVoiceSessions, loadVoiceSession, startNewSession, deleteVoiceSession,
        endRef,
    } = useVoice();

    const [isOpen, setIsOpen]                 = useState(false);
    const [isHistoryOpen, setIsHistoryOpen]   = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [textOnlyMode, setTextOnlyMode] = useState(false);
    const [textOnlyDraft, setTextOnlyDraft] = useState('');
    const [showMicHelp, setShowMicHelp] = useState(false);
    const [isPushPressing, setIsPushPressing] = useState(false);

    useEffect(() => {
        if (!isSTTSupported) {
            setTextOnlyMode(true);
        }
    }, [isSTTSupported]);

    useEffect(() => {
        if (isHistoryOpen) fetchVoiceSessions();
    }, [isHistoryOpen, fetchVoiceSessions]);

    useEffect(() => {
        if (!isOpen) stopAll();
    }, [isOpen, stopAll]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                if (isSettingsOpen) { setIsSettingsOpen(false); return; }
                if (isHistoryOpen)  { setIsHistoryOpen(false);  return; }
                stopAll();
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, isHistoryOpen, isSettingsOpen, stopAll]);

    const hasConversation = messages.some(m => m.id !== 'voice-welcome');
    const currentLang = VOICE_LANGUAGES.find(l => l.code === language);

    const statusLabel = isListening ? 'Listening... Speak now' : isSpeaking ? 'Speaking reply...' : isProcessing ? 'Thinking...' : 'Ready';
    const statusColor = isListening ? 'text-rose-50' : isSpeaking ? 'text-emerald-50' : 'text-sky-50';

    const micBtnClass = cn(
        'relative h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-4',
        isListening
            ? 'bg-rose-500 border-rose-300 dark:border-rose-600 text-white scale-110'
            : !isSTTSupported
                ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 cursor-not-allowed'
                : isProcessing
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                : isSpeaking
                    ? 'bg-emerald-500 border-emerald-300 dark:border-emerald-600 text-white'
                    : 'bg-violet-600 border-violet-300 dark:border-violet-700 text-white hover:bg-violet-700 hover:scale-105 active:scale-95'
    );

    const submitTextOnly = () => {
        const value = textOnlyDraft.trim();
        if (!value) return;
        setTextOnlyDraft('');
        void processCommand(value);
    };

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-24 right-6 z-[200] h-14 w-14 flex items-center justify-center rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 text-white bg-gradient-to-br from-violet-600 to-purple-700"
                    title="Voice Assistant (Ctrl+Shift+K)"
                >
                    <Mic className="h-6 w-6" />
                </button>
            )}

            {isOpen && (
                <div className="fixed bottom-24 right-6 z-[200] flex flex-col w-[340px] h-[500px] shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">

                    {/* Header */}
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 text-white flex-shrink-0">
                        <div className="relative">
                            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                                <Mic className="h-4 w-4" />
                            </div>
                            {(isListening || isSpeaking) && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                                    <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', isListening ? 'bg-rose-400' : 'bg-emerald-400')} />
                                    <span className={cn('relative inline-flex rounded-full h-3 w-3 border border-white/50', isListening ? 'bg-rose-500' : 'bg-emerald-500')} />
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold leading-none">G-One Voice</p>
                            <p className={cn('text-[10px] mt-0.5 leading-none', statusColor)}>{statusLabel}</p>
                        </div>
                        <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold border', isSTTSupported ? 'bg-emerald-100/95 text-emerald-800 border-emerald-300' : 'bg-amber-100/95 text-amber-800 border-amber-300')}>{isSTTSupported ? 'Speech ready' : 'Text-only mode'}</span>
                        <div className="flex items-center gap-0.5">
                            {isSpeaking && (
                                <button onClick={stopAll} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Stop speaking">
                                    <VolumeX className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <button onClick={() => { setIsSettingsOpen(false); setIsHistoryOpen(v => !v); }} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Voice history">
                                <Clock className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => { setIsHistoryOpen(false); setIsSettingsOpen(v => !v); }} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Settings">
                                <Settings className="h-3.5 w-3.5" />
                            </button>
                            {hasConversation && (
                                <button onClick={() => startNewSession()} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="New session">
                                    <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <button onClick={() => { stopAll(); setIsOpen(false); }} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Close (Esc)">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Body with overlay panels */}
                    <div className="relative flex-1 overflow-hidden">

                        {isHistoryOpen && (
                            <HistoryPanel
                                sessions={voiceSessions}
                                historyLoading={historyLoading}
                                activeSessionId={activeSessionId}
                                onLoad={loadVoiceSession}
                                onDelete={deleteVoiceSession}
                                onNew={() => { startNewSession(); setIsHistoryOpen(false); }}
                                onClose={() => setIsHistoryOpen(false)}
                            />
                        )}

                        {isSettingsOpen && (
                            <SettingsPanel
                                language={language} setLanguage={setLanguage}
                                autoListen={autoListen} setAutoListen={setAutoListen}
                                ttsRate={ttsRate} setTtsRate={setTtsRate}
                                inputMode={inputMode} setInputMode={setInputMode}
                                autoSendVoice={autoSendVoice} setAutoSendVoice={setAutoSendVoice}
                                selectedVoiceName={selectedVoiceName} setSelectedVoiceName={setSelectedVoiceName}
                                elevenVoiceId={elevenVoiceId} setElevenVoiceId={setElevenVoiceId}
                                voiceQualityPreset={voiceQualityPreset} setVoiceQualityPreset={setVoiceQualityPreset}
                                persistTranscripts={persistTranscripts} setPersistTranscripts={setPersistTranscripts}
                                clearVoiceLocalData={clearVoiceLocalData}
                                analytics={analytics}
                                averageRecognitionDurationMs={averageRecognitionDurationMs}
                                syncPolicy={syncPolicy}
                                elevenVoices={elevenVoices}
                                availableVoices={availableVoices} selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice}
                                onClose={() => setIsSettingsOpen(false)}
                            />
                        )}

                        <div className="h-full overflow-y-auto custom-scrollbar flex flex-col">
                            <div className="sr-only" aria-live="polite" aria-atomic="true">{statusLabel}</div>

                            {!isSTTSupported && (
                                <div className="mx-3 mt-3 mb-1 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
                                    <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">Speech recognition unavailable</p>
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">Use text-only mode now, or open this in Chrome/Edge for voice input.</p>
                                    <button onClick={() => setTextOnlyMode(v => !v)} className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 underline">
                                        <MessageSquare className="h-3 w-3" />
                                        {textOnlyMode ? 'Hide text input' : 'Switch to text-only chat'}
                                    </button>
                                </div>
                            )}

                            {textOnlyMode && (
                                <div className="mx-3 mb-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2.5 space-y-2">
                                    <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Text-only chat input</p>
                                    <textarea value={textOnlyDraft} onChange={(e) => setTextOnlyDraft(e.target.value)} rows={2} className="w-full text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5" placeholder="Type your command" />
                                    <div className="flex justify-end">
                                        <button onClick={submitTextOnly} className="px-2.5 py-1 rounded-md bg-violet-600 text-white text-[10px] font-semibold">Send</button>
                                    </div>
                                </div>
                            )}

                            {/* Mic orb */}
                            <div className="flex flex-col items-center py-4 flex-shrink-0">
                                <div className="relative flex items-center justify-center">
                                    {isListening && (
                                        <>
                                            <div className="absolute h-28 w-28 rounded-full bg-rose-500/20 animate-ping [animation-duration:1.2s]" />
                                            <div className="absolute h-40 w-40 rounded-full bg-rose-400/10 animate-ping [animation-duration:2s]" />
                                        </>
                                    )}
                                    {isSpeaking && (
                                        <>
                                            <div className="absolute h-28 w-28 rounded-full bg-emerald-500/20 animate-ping [animation-duration:0.9s]" />
                                            <div className="absolute h-40 w-40 rounded-full bg-emerald-400/10 animate-ping [animation-duration:1.8s]" />
                                        </>
                                    )}
                                    <button
                                        onClick={inputMode === 'continuous' ? () => {
                                            if (!isSTTSupported) { setShowMicHelp(v => !v); return; }
                                            void toggleListening();
                                        } : undefined}
                                        onPointerDown={inputMode === 'push_to_talk' ? () => {
                                            if (!isSTTSupported) { setShowMicHelp(v => !v); return; }
                                            setIsPushPressing(true);
                                            void startHoldToTalk();
                                        } : undefined}
                                        onPointerUp={inputMode === 'push_to_talk' ? () => { setIsPushPressing(false); endHoldToTalk(); } : undefined}
                                        onPointerLeave={inputMode === 'push_to_talk' ? () => { setIsPushPressing(false); endHoldToTalk(); } : undefined}
                                        onPointerCancel={inputMode === 'push_to_talk' ? () => { setIsPushPressing(false); endHoldToTalk(); } : undefined}
                                        disabled={isProcessing}
                                        aria-disabled={!isSTTSupported || isProcessing}
                                        className={cn(micBtnClass, 'touch-none', isPushPressing && 'scale-95 ring-4 ring-violet-300/60 dark:ring-violet-800/70')}
                                    >
                                        {isProcessing ? <Loader2 className="h-8 w-8 animate-spin" /> : isSpeaking ? <Volume2 className="h-8 w-8" /> : isListening ? <Mic className="h-8 w-8 animate-pulse" /> : <MicOff className="h-8 w-8" />}
                                    </button>
                                </div>
                                <p className="mt-3 text-[10px] font-medium text-slate-500 dark:text-slate-400 text-center leading-tight">
                                    {isListening ? 'Listening... Speak now' : isSpeaking ? <span className="flex items-center gap-1.5 justify-center">Speaking reply... <SoundBars /></span> : isProcessing ? 'Thinking...' : !isSTTSupported ? 'Speech not supported — use Chrome or Edge' : inputMode === 'push_to_talk' ? 'Press and hold mic to talk' : 'Tap the mic to start speaking'}
                                </p>
                                {interimTranscript && (
                                    <div className="mt-2 mx-3 w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg">
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic text-center">"{interimTranscript}<span className="animate-pulse">…</span>"</p>
                                    </div>
                                )}
                                {!isSTTSupported && showMicHelp && (
                                    <button onClick={() => setTextOnlyMode(true)} className="mt-2 text-[10px] text-violet-700 dark:text-violet-300 underline font-semibold">Use text-only chat instead</button>
                                )}
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="mx-3 mb-2 flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
                                    <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-red-700 dark:text-red-300 leading-snug"><span className="font-bold">{voiceErrorCategory || 'error'}:</span> {error}</p>
                                </div>
                            )}

                            {/* Low confidence */}
                            {lowConfidence && !error && (
                                <div className="mx-3 mb-2 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 flex-1">Low confidence — did you mean something else?</p>
                                    <button onClick={retryLastCommand} className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex-shrink-0">Retry</button>
                                </div>
                            )}

                            {draftTranscript && (
                                <div className="mx-3 mb-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl space-y-2">
                                    <p className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">Review detected text</p>
                                    <textarea value={draftTranscript} onChange={(e) => setDraftTranscript(e.target.value)} rows={2} className="w-full text-[11px] rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 px-2 py-1.5" />
                                    {uncertainWords.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {uncertainWords.map(word => (
                                                <span key={word} className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-[9px] text-amber-800 dark:text-amber-300">{word}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={submitDraftTranscript} className="px-2 py-1 rounded-md bg-indigo-600 text-white text-[10px] font-semibold">Send</button>
                                        <button onClick={discardDraftTranscript} className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">Retry</button>
                                    </div>
                                </div>
                            )}

                            {/* Conversation thread */}
                            <div className="flex-1 pb-2">
                                {messages.map(msg => <VoiceBubble key={msg.id} msg={msg} />)}
                                <div ref={endRef} />
                            </div>

                            {/* Quick prompts */}
                            {!hasConversation && !isListening && !isProcessing && (
                                <div className="mx-3 mb-3 flex-shrink-0">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">Try asking</p>
                                    <div className="space-y-1.5">
                                        {[
                                            { text: "What's my next meeting?", emoji: '📅' },
                                            { text: "Any new emails?",          emoji: '📧' },
                                            { text: "Summarize my tasks",       emoji: '✅' },
                                            { text: "Plan my day",              emoji: '✨' },
                                        ].map(p => (
                                            <button key={p.text} onClick={() => processCommand(p.text)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all text-left group">
                                                <span className="text-base leading-none flex-shrink-0">{p.emoji}</span>
                                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-violet-700 dark:group-hover:text-violet-300">"{p.text}"</span>
                                                <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600 ml-auto" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-3.5 py-2 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={cn('h-1.5 w-1.5 rounded-full', isSTTSupported ? 'bg-emerald-500' : 'bg-red-500')} />
                            <button onClick={() => { setIsHistoryOpen(false); setIsSettingsOpen(true); }} className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-violet-600 transition-colors" title="Change language">
                                <span>{currentLang?.flag}</span>
                                <span>{currentLang?.label}</span>
                            </button>
                            {premiumTTSEnabled && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-[9px] font-bold text-violet-600 dark:text-violet-400">
                                    <Zap className="h-2.5 w-2.5" />EL
                                </span>
                            )}
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono">Ctrl+Shift+K</p>
                    </div>
                </div>
            )}
        </>
    );
}

