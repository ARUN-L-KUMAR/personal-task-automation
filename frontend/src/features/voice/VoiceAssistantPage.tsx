import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, Sparkles, MessageSquare, Bot, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';

export function VoiceAssistantPage() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    if (recognition) {
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
    }

    const speak = useCallback((text: string) => {
        if (!window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    }, []);

    const processCommand = async (command: string) => {
        try {
            const response = await fetch('http://localhost:8000/api/chatbot/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: command })
            });
            const data = await response.json();
            setAiResponse(data.reply);
            speak(data.reply);
        } catch (err) {
            console.error('Voice process error:', err);
            setError('Failed to reach AI engine.');
        }
    };

    const toggleListening = () => {
        if (!recognition) {
            setError('Speech Recognition not supported in this browser.');
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            setError(null);
            setTranscript('');
            setAiResponse('');
            recognition.start();
        }
    };

    useEffect(() => {
        if (!recognition) return;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error('Recognition error', event.error);
            setError(`Error: ${event.error}`);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const currentTranscript = event.results[0][0].transcript;
            setTranscript(currentTranscript);
            processCommand(currentTranscript);
        };

        return () => {
            recognition.stop();
        };
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-12 py-12">
            <header className="text-center">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Voice Assistant</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Speak naturally to manage your life.</p>
            </header>

            <div className="flex flex-col items-center justify-center space-y-12">
                {/* Voice Visualizer */}
                <div className="relative">
                    <div className={cn(
                        "h-64 w-64 rounded-full border-4 flex items-center justify-center transition-all duration-700 relative z-10 bg-white dark:bg-slate-900 shadow-2xl shadow-brand-500/10",
                        isListening ? "border-brand-600 scale-110" : "border-slate-100 dark:border-slate-800"
                    )}>
                        <button
                            onClick={toggleListening}
                            className={cn(
                                "h-48 w-48 rounded-full flex items-center justify-center transition-all duration-500 group",
                                isListening ? "bg-brand-600 text-white animate-pulse" : "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-brand-600"
                            )}
                        >
                            {isListening ? <Mic className="h-16 w-16" /> : <MicOff className="h-16 w-16" />}
                        </button>
                    </div>

                    {/* Waveform Animation (Pulsing circles) */}
                    {isListening && (
                        <>
                            <div className="absolute inset-0 h-64 w-64 rounded-full bg-brand-500/20 animate-ping [animation-duration:2s]" />
                            <div className="absolute inset-0 h-64 w-64 rounded-full bg-brand-400/10 animate-ping [animation-duration:3s]" />
                        </>
                    )}
                </div>

                {/* Status & Results */}
                <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-4 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-bold">
                            <AlertCircle className="h-5 w-5" />
                            {error}
                        </div>
                    )}

                    {transcript && (
                        <Card className="p-8 border-slate-200 dark:border-slate-800 shadow-soft bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                            <div className="flex items-start gap-4">
                                <MessageSquare className="h-5 w-5 text-slate-400 shrink-0 mt-1" />
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">You said</h3>
                                    <p className="text-xl font-medium text-slate-800 dark:text-slate-200 italic">"{transcript}"</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {aiResponse && (
                        <Card className="p-8 border-brand-100 dark:border-brand-900/30 shadow-xl shadow-brand-500/5 bg-white dark:bg-slate-900 relative overflow-hidden">
                            <div className="relative z-10 flex items-start gap-4">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 flex items-center justify-center shrink-0",
                                    isSpeaking && "animate-bounce"
                                )}>
                                    <Bot className="h-6 w-6 text-brand-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xs font-bold text-brand-500 uppercase tracking-widest">Antigravity</h3>
                                        {isSpeaking && <div className="flex gap-0.5 h-3 items-end">
                                            <div className="w-0.5 bg-brand-500 animate-[h-3_0.5s_infinite]" />
                                            <div className="w-0.5 bg-brand-500 animate-[h-2_0.7s_infinite]" />
                                            <div className="w-0.5 bg-brand-500 animate-[h-4_0.4s_infinite]" />
                                        </div>}
                                    </div>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{aiResponse}</p>
                                </div>
                            </div>
                            <div className="absolute right-[-20px] top-[-20px] h-32 w-32 bg-brand-50 dark:bg-brand-900/10 rounded-full blur-3xl opacity-50" />
                        </Card>
                    )}
                </div>

                {!isListening && !transcript && (
                    <div className="flex flex-wrap justify-center gap-4 max-w-2xl px-4">
                        {["What's my next meeting?", "Check my tasks", "Any new emails?", "Start my day"].map((hint) => (
                            <Button
                                key={hint}
                                variant="outline"
                                size="sm"
                                onClick={() => { setTranscript(hint); processCommand(hint); }}
                                className="rounded-full bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-500 font-bold hover:text-brand-600 hover:border-brand-600 transition-all"
                            >
                                <Sparkles className="h-3 w-3 mr-2 text-brand-500" />
                                {hint}
                            </Button>
                        ))}
                    </div>
                )}
            </div>

            <footer className="text-center">
                <div className="inline-flex items-center gap-4 px-6 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-soft">
                    <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase">System Ready</span>
                    </div>
                    <div className="h-4 w-px bg-slate-100 dark:bg-slate-700" />
                    <span className="text-xs font-bold text-brand-600 uppercase">Context Sync: Active</span>
                </div>
            </footer>
        </div>
    );
}
