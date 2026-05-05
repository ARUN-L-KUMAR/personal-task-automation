import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Mic, MicOff, Volume2, VolumeX, Bot, AlertCircle, Loader2,
    RefreshCw, Clock, Settings, Trash2, Plus, Globe, Sparkles,
    Copy, Check, ChevronDown, ChevronRight, Zap,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import {
    useVoice,
    VOICE_LANGUAGES,
    type VoiceMessage,
} from '../../hooks/useVoice';
import { usePageContextStore } from '../../store/usePageContextStore';

// Lightweight inline markdown formatter
function fmtInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-bold">{p.slice(2, -2)}</strong>;
        if (p.startsWith('*') && p.endsWith('*')) return <em key={i} className="italic">{p.slice(1, -1)}</em>;
        if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded text-xs font-mono">{p.slice(1, -1)}</code>;
        return p;
    });
}
function PageVoiceMarkdown({ text, className }: { text: string; className?: string }) {
    const lines = text.split('\n');
    return (
        <div className={cn('space-y-1', className)}>
            {lines.map((line, i) => {
                const trimmed = line.trimStart();
                if (/^#{1,6}\s/.test(trimmed)) return <p key={i} className="font-bold">{fmtInline(trimmed.replace(/^#{1,6}\s+/, ''))}</p>;
                if (/^[-*•]\s/.test(trimmed)) return <div key={i} className="flex items-start gap-1.5"><span className="mt-2 h-1 w-1 rounded-full bg-current flex-shrink-0 opacity-50" /><span>{fmtInline(trimmed.replace(/^[-*•]\s/, ''))}</span></div>;
                if (/^\d+\.\s/.test(trimmed)) { const n = trimmed.match(/^(\d+)\./)?.[1]; return <div key={i} className="flex items-start gap-1.5"><span className="font-bold opacity-50 text-[11px] flex-shrink-0">{n}.</span><span>{fmtInline(trimmed.replace(/^\d+\.\s/, ''))}</span></div>; }
                if (!line.trim()) return <div key={i} className="h-1" />;
                return <p key={i}>{fmtInline(line)}</p>;
            })}
        </div>
    );
}

// Animated sound bars
function SoundBars({ color = 'text-brand-500' }: { color?: string }) {
    return (
        <div className="flex gap-0.5 items-end h-5">
            {[12, 18, 10, 16, 8, 14, 10].map((h, i) => (
                <div
                    key={i}
                    className={cn('w-1 rounded-full animate-bounce', color === 'brand' ? 'bg-brand-500' : 'bg-violet-500')}
                    style={{ height: `${h}px`, animationDelay: `${i * 0.08}s`, animationDuration: '0.55s' }}
                />
            ))}
        </div>
    );
}

// Voice message bubble (full page)
function PageVoiceBubble({ msg }: { msg: VoiceMessage }) {
    const isUser = msg.role === 'user';
    if (msg.id === 'voice-welcome') {
        return (
            <div className="flex justify-center py-6">
                <div className="text-center max-w-sm">
                    <div className="h-14 w-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 flex items-center justify-center mx-auto mb-3">
                        <Mic className="h-7 w-7 text-violet-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Tap the mic or press <kbd className="px-1.5 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">Space</kbd> to start speaking
                    </p>
                </div>
            </div>
        );
    }
    return (
        <div className={cn('flex gap-3 mb-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
            {!isUser && (
                <div className="h-8 w-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-violet-600" />
                </div>
            )}
            <div className="max-w-[80%] space-y-1">
                <div className={cn(
                    'px-4 py-3 rounded-2xl text-sm leading-relaxed',
                    isUser
                        ? 'bg-violet-600 text-white rounded-tr-sm'
                        : msg.error
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-tl-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm rounded-tl-sm'
                )}>
                    {isUser ? msg.content : <PageVoiceMarkdown text={msg.content} />}
                </div>
                <div className={cn('flex items-center gap-2 px-1', isUser ? 'justify-end' : 'justify-start')}>
                    <span className="text-[10px] text-slate-400">
                        {msg.timestamp instanceof Date
                            ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                    </span>
                    {isUser && msg.confidence !== undefined && msg.confidence < 0.6 && (
                        <span className="text-[10px] text-amber-500">⚠ low confidence</span>
                    )}
                    {!isUser && msg.meta?.agentsUsed && msg.meta.agentsUsed.length > 0 && (
                        <span className="text-[10px] text-slate-400">{msg.meta.agentsUsed.join(', ')}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// Collapsible sidebar panel
function SidePanel({ title, icon: Icon, defaultOpen = true, children }: { title: string; icon: React.ElementType; defaultOpen?: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800">
            <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <Icon className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1 text-left">{title}</span>
                {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            </button>
            {open && <div className="border-t border-slate-100 dark:border-slate-700">{children}</div>}
        </div>
    );
}

export function VoiceAssistantPage() {
    const {
        messages, isListening, isProcessing, isSpeaking,
        interimTranscript, error, lowConfidence,
        language, autoListen, ttsRate, inputMode, autoSendVoice, draftTranscript, selectedVoice, selectedVoiceName, elevenVoiceId, elevenVoices, availableVoices, premiumTTSEnabled,
        ttsFallbackNotice, backendVoiceEngine, backendModelId, backendVoiceId,
        voiceSessions, activeSessionId, historyLoading,
        isSTTSupported, isTTSSupported,
        setLanguage, setAutoListen, setTtsRate, setInputMode, setAutoSendVoice, setDraftTranscript, setSelectedVoice, setSelectedVoiceName, setElevenVoiceId,
        toggleListening, startHoldToTalk, endHoldToTalk, submitDraftTranscript, discardDraftTranscript, clearTTSFallbackNotice, stopAll, processCommand, retryLastCommand,
        fetchVoiceSessions, loadVoiceSession, startNewSession, deleteVoiceSession,
        endRef,
    } = useVoice();
    const { setHeaderContext, clearHeaderContext } = usePageContextStore();

    // ── Canvas waveform ──
    const canvasRef   = useRef<HTMLCanvasElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number>(0);
    const micStreamRef = useRef<MediaStream | null>(null);
    const audioCtxRef  = useRef<AudioContext | null>(null);

    const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
    const [copied, setCopied] = useState(false);
    const [isPushTalking, setIsPushTalking] = useState(false);

    // Fetch sessions on mount
    useEffect(() => { fetchVoiceSessions(); }, [fetchVoiceSessions]);

    // Space key shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Only trigger when not inside an input / textarea
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (e.key === ' ') {
                e.preventDefault();
                toggleListening();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [toggleListening]);

    // Check mic permission on mount
    useEffect(() => {
        if (!navigator.mediaDevices) { setMicPermission('unsupported'); return; }
        navigator.permissions?.query({ name: 'microphone' as PermissionName }).then(result => {
            setMicPermission(result.state as any);
            result.onchange = () => setMicPermission(result.state as any);
        }).catch(() => { /* permissions API not available */ });
    }, []);

    // Init mic stream for waveform on first grant
    const initMicStream = useCallback(async () => {
        if (micStreamRef.current) return; // already running
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicPermission('granted');
            micStreamRef.current = stream;
            const ctx = new AudioContext();
            audioCtxRef.current = ctx;
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            ctx.createMediaStreamSource(stream).connect(analyser);
            analyserRef.current = analyser;
        } catch {
            setMicPermission('denied');
        }
    }, []);

    // Draw waveform loop
    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const data = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(data);

        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const barWidth = (W / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (data[i] / 255) * H;
            const gradient = ctx.createLinearGradient(0, H - barHeight, 0, H);
            gradient.addColorStop(0, 'rgba(139,92,246,0.9)');
            gradient.addColorStop(1, 'rgba(109,40,217,0.4)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, H - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }
        animFrameRef.current = requestAnimationFrame(drawWaveform);
    }, []);

    useEffect(() => {
        if (isListening) {
            initMicStream().then(() => {
                animFrameRef.current = requestAnimationFrame(drawWaveform);
            });
        } else {
            cancelAnimationFrame(animFrameRef.current);
            // Clear canvas
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx?.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [isListening, drawWaveform, initMicStream]);

    // ── Export transcript ──
    const exportTranscript = useCallback(() => {
        const text = messages
            .filter(m => m.id !== 'voice-welcome')
            .map(m => `[${m.role === 'user' ? 'You' : 'G-One'}] ${m.content}`)
            .join('\n\n');
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [messages]);

    const hasConversation = messages.some(m => m.id !== 'voice-welcome');
    const currentLang = VOICE_LANGUAGES.find(l => l.code === language);

    useEffect(() => {
        setHeaderContext({
            hideSearch: true,
            summary: 'Speak naturally to manage your life.',
            actions: hasConversation ? (
                <>
                    <button
                        onClick={exportTranscript}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:border-violet-400 hover:text-violet-600 transition-colors"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? 'Copied!' : 'Export'}
                    </button>
                    <button
                        onClick={startNewSession}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:border-violet-400 hover:text-violet-600 transition-colors"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        New Session
                    </button>
                </>
            ) : undefined,
        });
        return () => clearHeaderContext();
    }, [clearHeaderContext, copied, exportTranscript, hasConversation, setHeaderContext, startNewSession]);

    const statusLabel = isListening ? 'Listening... Speak now' : isSpeaking ? 'Speaking reply...' : isProcessing ? 'Thinking...' : 'Ready';

    const micBtnClass = cn(
        'h-32 w-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl border-8',
        isListening
            ? 'bg-rose-500 border-rose-300 text-white scale-110'
            : isProcessing
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                : isSpeaking
                    ? 'bg-emerald-500 border-emerald-300 text-white'
                    : 'bg-violet-600 border-violet-300 dark:border-violet-700 text-white hover:bg-violet-700 hover:scale-105 active:scale-95'
    );

    const handlePushToTalkStart = useCallback(() => {
        if (isPushTalking || isProcessing) return;
        setIsPushTalking(true);
        void startHoldToTalk();
    }, [isProcessing, isPushTalking, startHoldToTalk]);

    const handlePushToTalkEnd = useCallback(() => {
        if (!isPushTalking) return;
        setIsPushTalking(false);
        endHoldToTalk();
    }, [endHoldToTalk, isPushTalking]);

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col overflow-hidden">

            {/* ── Main 2-column grid ── */}
            <div className="grid lg:grid-cols-3 gap-0 flex-1 min-h-0 border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">

                {/* ── Main column (col-span-2) ── */}
                <div className="lg:col-span-2 space-y-3 min-h-0 overflow-y-auto custom-scrollbar p-4">

                    {/* Browser compat warning */}
                    {!isSTTSupported && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
                            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Speech Recognition not supported</p>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Please use Google Chrome or Microsoft Edge for full voice functionality.</p>
                            </div>
                        </div>
                    )}

                    {/* Mic permission gate */}
                    {micPermission === 'denied' && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Microphone access denied</p>
                                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Click the lock icon in your browser's address bar and allow microphone access, then reload the page.</p>
                            </div>
                        </div>
                    )}
                    {micPermission === 'prompt' && !isListening && (
                        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <Mic className="h-5 w-5 text-blue-500" />
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Microphone permission needed</p>
                            </div>
                            <button onClick={initMicStream} className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">Allow</button>
                        </div>
                    )}

                    {/* Mic orb + canvas waveform card */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">

                        {/* Canvas waveform */}
                        <canvas
                            ref={canvasRef}
                            width={600}
                            height={60}
                            className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 mb-6"
                        />

                        {/* Mic orb */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative flex items-center justify-center">
                                {isListening && (
                                    <>
                                        <div className="absolute h-44 w-44 rounded-full bg-rose-500/20 animate-ping [animation-duration:1.2s]" />
                                        <div className="absolute h-56 w-56 rounded-full bg-rose-400/10 animate-ping [animation-duration:2s]" />
                                    </>
                                )}
                                {isSpeaking && (
                                    <>
                                        <div className="absolute h-44 w-44 rounded-full bg-emerald-500/20 animate-ping [animation-duration:0.9s]" />
                                        <div className="absolute h-56 w-56 rounded-full bg-emerald-400/10 animate-ping [animation-duration:1.8s]" />
                                    </>
                                )}
                                <button
                                    onClick={inputMode === 'continuous' ? () => void toggleListening() : undefined}
                                    onPointerDown={inputMode === 'push_to_talk' ? handlePushToTalkStart : undefined}
                                    onPointerUp={inputMode === 'push_to_talk' ? handlePushToTalkEnd : undefined}
                                    onPointerLeave={inputMode === 'push_to_talk' ? handlePushToTalkEnd : undefined}
                                    onPointerCancel={inputMode === 'push_to_talk' ? handlePushToTalkEnd : undefined}
                                    disabled={isProcessing || !isSTTSupported}
                                    className={cn(micBtnClass, 'touch-none')}
                                >
                                    {isProcessing ? <Loader2 className="h-14 w-14 animate-spin" /> : isSpeaking ? <Volume2 className="h-14 w-14" /> : (isListening || isPushTalking) ? <Mic className="h-14 w-14 animate-pulse" /> : <MicOff className="h-14 w-14" />}
                                </button>
                            </div>

                            {/* Status row */}
                            <div className="flex items-center gap-4 flex-wrap justify-center">
                                <div className="flex items-center gap-2">
                                    <span className={cn('h-3 w-3 rounded-full shadow-lg', isSpeaking ? 'bg-emerald-500 animate-pulse shadow-emerald-500/50' : isListening ? 'bg-rose-500 animate-pulse shadow-rose-500/50' : isProcessing ? 'bg-amber-500 animate-pulse shadow-amber-500/50' : 'bg-slate-300 dark:bg-slate-600')} />
                                    <span className={cn('text-sm font-bold', isSpeaking ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400')}>{statusLabel}</span>
                                    {isSpeaking && <SoundBars />}
                                </div>

                                {/* Language selector */}
                                <div className="relative">
                                    <select
                                        value={language}
                                        onChange={e => setLanguage(e.target.value)}
                                        className="appearance-none pl-2.5 pr-7 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    >
                                        {VOICE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                                    </select>
                                    <Globe className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                                </div>

                                {isSpeaking && (
                                    <button onClick={stopAll} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white border border-red-500 shadow-lg shadow-red-500/30 transition-all animate-pulse">
                                        <VolumeX className="h-4 w-4" />Stop Playback
                                    </button>
                                )}
                            </div>

                            <p className="text-xs text-slate-400 text-center">
                                Press <kbd className="px-1 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono">Space</kbd> to toggle mic (continuous mode)
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                                Input mode: <span className="font-semibold">{inputMode === 'continuous' ? 'Continuous' : 'Push-to-talk'}</span>
                            </p>
                        </div>
                    </div>

                    {ttsFallbackNotice && (
                        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
                            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                            <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">{ttsFallbackNotice}</p>
                            <button onClick={clearTTSFallbackNotice} className="text-xs font-semibold text-amber-700 dark:text-amber-300">Dismiss</button>
                        </div>
                    )}

                    {draftTranscript && (
                        <div className="px-4 py-3 bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-2">
                            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Review detected text before send</p>
                            <textarea
                                value={draftTranscript}
                                onChange={(e) => setDraftTranscript(e.target.value)}
                                rows={3}
                                className="w-full rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                            />
                            <div className="flex items-center gap-2">
                                <button onClick={submitDraftTranscript} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Send</button>
                                <button onClick={discardDraftTranscript} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">Retry voice</button>
                            </div>
                        </div>
                    )}

                    {/* Interim transcript */}
                    {interimTranscript && (
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                            <p className="text-xs text-slate-400 font-medium mb-1">Hearing…</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{interimTranscript}<span className="animate-pulse text-slate-400">…</span>"</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Low confidence */}
                    {lowConfidence && !error && (
                        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
                            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                            <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">Low confidence — did you mean something else?</p>
                            <button onClick={retryLastCommand} className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">Retry</button>
                        </div>
                    )}

                    {/* Conversation thread */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 min-h-[200px] max-h-[500px] overflow-y-auto custom-scrollbar">
                        {messages.map(msg => <PageVoiceBubble key={msg.id} msg={msg} />)}
                        <div ref={endRef} />
                    </div>
                </div>

                {/* ── Sidebar (col-span-1) ── */}
                <div className="space-y-3 min-h-0 overflow-y-auto custom-scrollbar p-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">

                    {/* History */}
                    <SidePanel title="Voice Sessions" icon={Clock}>
                        <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                            {historyLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-violet-400" /></div>}
                            {!historyLoading && voiceSessions.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-6 px-4">No sessions yet. Start a conversation to save history.</p>
                            )}
                            <div className="px-2 py-2 space-y-1">
                                <button onClick={startNewSession} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors border border-dashed border-violet-300 dark:border-violet-700">
                                    <Plus className="h-3.5 w-3.5" />New Session
                                </button>
                                {!historyLoading && voiceSessions.map(s => (
                                    <div key={s.id} className={cn('group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors', s.id === activeSessionId && 'bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800')} onClick={() => loadVoiceSession(s.id)}>
                                        <Mic className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{s.title}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(s.updatedAt).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); deleteVoiceSession(s.id); }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                            <Trash2 className="h-3 w-3 text-red-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </SidePanel>

                    {/* Quick commands */}
                    <SidePanel title="Quick Commands" icon={Sparkles}>
                        <div className="px-3 py-3 space-y-1.5">
                            {[
                                { text: "What's my next meeting?", emoji: '📅' },
                                { text: "Any new emails?",          emoji: '📧' },
                                { text: "Summarize my tasks",       emoji: '✅' },
                                { text: "Plan my day",              emoji: '✨' },
                                { text: "Check for conflicts today", emoji: '⚡' },
                                { text: "What's on my agenda?",    emoji: '📋' },
                            ].map(p => (
                                <button key={p.text} onClick={() => processCommand(p.text)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all text-left group">
                                    <span className="text-base leading-none flex-shrink-0">{p.emoji}</span>
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-violet-700 dark:group-hover:text-violet-300">"{p.text}"</span>
                                </button>
                            ))}
                        </div>
                    </SidePanel>

                    {/* Settings */}
                    <SidePanel title="Settings" icon={Settings} defaultOpen={false}>
                        <div className="px-4 py-4 space-y-5">
                            {/* Language */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5"><Globe className="inline h-3 w-3 mr-1" />Language</label>
                                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500">
                                    {VOICE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                                </select>
                            </div>
                            {/* Auto-listen */}
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Auto-listen after response</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Restart mic when G-One finishes speaking</p>
                                </div>
                                <button onClick={() => setAutoListen(!autoListen)} className={cn('relative h-6 w-11 rounded-full transition-colors flex-shrink-0', autoListen ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700')}>
                                    <span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all', autoListen ? 'left-6' : 'left-1')} />
                                </button>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Voice input mode</p>
                                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <button onClick={() => setInputMode('continuous')} className={cn('px-2.5 py-1 text-[11px] font-medium', inputMode === 'continuous' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300')}>Continuous</button>
                                    <button onClick={() => setInputMode('push_to_talk')} className={cn('px-2.5 py-1 text-[11px] font-medium border-l border-slate-200 dark:border-slate-700', inputMode === 'push_to_talk' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300')}>Push-to-talk</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Voice send mode</p>
                                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <button onClick={() => setAutoSendVoice(false)} className={cn('px-2.5 py-1 text-[11px] font-medium', !autoSendVoice ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300')}>Review</button>
                                    <button onClick={() => setAutoSendVoice(true)} className={cn('px-2.5 py-1 text-[11px] font-medium border-l border-slate-200 dark:border-slate-700', autoSendVoice ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300')}>Auto</button>
                                </div>
                            </div>
                            {/* Speed */}
                            <div>
                                <label className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    <span>TTS Speed</span><span className="font-mono text-violet-600">{ttsRate.toFixed(2)}×</span>
                                </label>
                                <input type="range" min="0.75" max="1.5" step="0.05" value={ttsRate} onChange={e => setTtsRate(parseFloat(e.target.value))} className="w-full accent-violet-600" />
                                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>0.75×</span><span>1.5×</span></div>
                            </div>
                            {/* Voice picker */}
                            {availableVoices.length > 0 && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Browser Voice</label>
                                    <select value={selectedVoiceName || selectedVoice?.name || ''} onChange={e => { setSelectedVoiceName(e.target.value); }} className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500">
                                        {availableVoices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                                    </select>
                                </div>
                            )}
                            {premiumTTSEnabled && elevenVoices.length > 0 && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">ElevenLabs Voice</label>
                                    <select value={elevenVoiceId} onChange={e => setElevenVoiceId(e.target.value)} className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500">
                                        {elevenVoices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </SidePanel>
                </div>
            </div>
        </div>
    );
}
