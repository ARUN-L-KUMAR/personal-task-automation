const TTS_CHUNK_MAX_BROWSER = 180;
const TTS_CHUNK_MAX_PREMIUM = 900;

export function splitTextForTTS(text: string, maxLen: number = TTS_CHUNK_MAX_BROWSER): string[] {
    const sentences = text.match(/[^.!?\n]+[.!?\n]+(\s|$)|[^.!?\n]+$/g) || [text];
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
        if ((current + sentence).length > maxLen && current.length > 0) {
            chunks.push(current.trim());
            current = sentence;
        } else {
            current += sentence;
        }
    }

    if (current.trim()) chunks.push(current.trim());
    return chunks;
}

export function stripMarkdownForTTS(text: string): string {
    return text
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
        .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/^>\s?/gm, '')
        .replace(/^[-*_]{3,}$/gm, '')
        .replace(/^[-*•]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/[⚠️✅❌🔥⚡📅📧📋✨🎯💡🚀]/g, '')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, '. ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export function getTTSChunkLimit(usePremiumTTS: boolean): number {
    return usePremiumTTS ? TTS_CHUNK_MAX_PREMIUM : TTS_CHUNK_MAX_BROWSER;
}