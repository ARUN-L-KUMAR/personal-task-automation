import { act, renderHook, waitFor } from '@testing-library/react';
import { useVoice } from './useVoice';
import api from '../services/api';

jest.mock('../services/api', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        delete: jest.fn(),
    },
}));

jest.mock('../store/usePageContextStore', () => ({
    usePageContextStore: {
        getState: () => ({ context: null }),
    },
}));

type MockRec = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: any) => void) | null;
    onresult: ((event: any) => void) | null;
    start: jest.Mock<void, []>;
    stop: jest.Mock<void, []>;
    abort: jest.Mock<void, []>;
};

let recInstances: MockRec[] = [];

const createRec = (): MockRec => ({
    continuous: true,
    interimResults: true,
    lang: 'en-US',
    onstart: null,
    onend: null,
    onerror: null,
    onresult: null,
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
});

beforeEach(() => {
    jest.useFakeTimers();
    recInstances = [];

    class SpeechRecognitionMock {
        continuous = true;
        interimResults = true;
        lang = 'en-US';
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: ((event: any) => void) | null = null;
        onresult: ((event: any) => void) | null = null;
        start = jest.fn();
        stop = jest.fn();
        abort = jest.fn();

        constructor() {
            recInstances.push(this as unknown as MockRec);
        }
    }

    (window as any).SpeechRecognition = SpeechRecognitionMock;
    (window as any).webkitSpeechRecognition = undefined;

    Object.defineProperty(window, 'speechSynthesis', {
        writable: true,
        value: {
            cancel: jest.fn(),
            speak: jest.fn((utt: SpeechSynthesisUtterance) => {
                setTimeout(() => utt.onend?.(new Event('end') as any), 0);
            }),
            getVoices: jest.fn(() => []),
            onvoiceschanged: null,
        },
    });

    (global as any).SpeechSynthesisUtterance = class {
        text: string;
        rate = 1;
        pitch = 1;
        lang = 'en-US';
        voice: SpeechSynthesisVoice | null = null;
        onend: ((event: any) => void) | null = null;
        onerror: ((event: any) => void) | null = null;
        constructor(text: string) {
            this.text = text;
        }
    };

    Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
            getUserMedia: jest.fn().mockResolvedValue({
                getTracks: () => [{ stop: jest.fn() }],
            }),
        },
    });

    (api.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/voice/status')) return Promise.resolve({ data: { elevenlabs_available: false } });
        if (url.includes('/api/voice/settings')) return Promise.resolve({ data: {} });
        if (url.includes('/api/voice/voices')) return Promise.resolve({ data: { voices: [] } });
        return Promise.resolve({ data: [] });
    });

    (api.post as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/chatbot/ask') {
            return Promise.resolve({ data: { reply: 'assistant response', model: 'test' } });
        }
        return Promise.resolve({ data: new Blob() });
    });
});

afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
});

function fireFinalResult(rec: MockRec, transcript: string, confidence = 0.95, altTranscript?: string) {
    const alternatives: Array<{ transcript: string; confidence: number }> = [{ transcript, confidence }];
    if (altTranscript) alternatives.push({ transcript: altTranscript, confidence: confidence - 0.2 });

    rec.onresult?.({
        resultIndex: 0,
        results: [
            {
                isFinal: true,
                0: alternatives[0],
                1: alternatives[1],
                length: alternatives.length,
            },
        ],
    });
}

test('state machine transitions idle to listening to processing to speaking to idle', async () => {
    const { result } = renderHook(() => useVoice());

    await act(async () => {
        await result.current.toggleListening();
    });

    const rec = recInstances[0];
    expect(rec).toBeDefined();

    act(() => {
        rec.onstart?.();
    });
    expect(result.current.isListening).toBe(true);

    await act(async () => {
        fireFinalResult(rec, 'schedule meeting', 0.9);
    });

    expect(result.current.draftTranscript).toContain('schedule meeting');

    await act(async () => {
        result.current.submitDraftTranscript();
    });

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/chatbot/ask', expect.anything()));
    expect(result.current.isProcessing).toBe(false);

    act(() => {
        jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(result.current.isSpeaking).toBe(false));
});

test('low confidence transcript opens draft review mode and highlights uncertain words', async () => {
    const { result } = renderHook(() => useVoice());

    await act(async () => {
        await result.current.toggleListening();
    });

    const rec = recInstances[0];

    act(() => {
        rec.onstart?.();
    });

    await act(async () => {
        fireFinalResult(rec, 'book train to mumbai', 0.2, 'book plane to delhi');
    });

    expect(result.current.lowConfidence).toBe(true);
    expect(result.current.draftTranscript).toContain('book train to mumbai');
    expect(result.current.uncertainWords.length).toBeGreaterThan(0);
});

test('push to talk starts and stops recognition explicitly', async () => {
    const { result } = renderHook(() => useVoice());

    await act(async () => {
        await result.current.startHoldToTalk();
    });

    const rec = recInstances[0];

    expect(rec.start).toHaveBeenCalled();

    act(() => {
        result.current.endHoldToTalk();
    });

    expect(rec.stop).toHaveBeenCalled();
});

test('unsupported STT triggers fallback error message', async () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    const { result } = renderHook(() => useVoice());

    await act(async () => {
        await result.current.toggleListening();
    });

    expect(result.current.isSTTSupported).toBe(false);
    expect(result.current.error).toMatch(/not supported/i);
});
