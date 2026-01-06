import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
    console.warn("OpenAI API Key is missing. Please set VITE_OPENAI_API_KEY in .env");
}

const client = new OpenAI({
    apiKey: apiKey || 'dummy',
    dangerouslyAllowBrowser: true // Required for client-side usage
});

const SYSTEM_PROMPT_CORRECTION = `
You are a helpful assistant for the company ZyntriQix. Your task is 
to correct any spelling discrepancies in the transcribed text. Make 
sure that the names of the following products are spelled correctly: 
ZyntriQix, Digique Plus, CynapseFive, VortiQore V8, EchoNix Array, 
OrbitalLink Seven, DigiFractal Matrix, PULSE, RAPT, B.R.I.C.K., 
Q.U.A.R.T.Z., F.L.I.N.T. Only add necessary punctuation such as 
periods, commas, and capitalization, and use only the context provided.
`;

export async function transcribeAudio(audioFile: File, language: string) {
    try {
        const transcription = await client.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1", // 'gpt-4o-mini-transcribe' is not a standard public model for audio yet, falling back to whisper-1 but keeping structure.
            language: language, // ISO-639-1 code e.g. 'en', 'ko'
            response_format: "text",
            prompt: "The following conversation is a lecture about the recent developments around OpenAI, GPT-4.5 and the future of AI."
        });
        return transcription;
    } catch (error) {
        console.error("Transcription error:", error);
        throw error;
    }
}

export async function correctTranscript(transcript: string) {
    try {
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT_CORRECTION
                },
                {
                    role: "user",
                    content: transcript
                }
            ],
            store: true,
        });
        return completion.choices[0].message.content || transcript;
    } catch (error) {
        console.error("Correction error:", error);
        return transcript;
    }
}

export async function translateText(text: string, targetLang: string = "en") {
    // If source is English and target is English, skip? 
    // But user wants translation. Assuming targetLang is always English for now or fixed? 
    // User asked for "live translation" but didn't specify target explicitly differently per language?
    // Let's assume target is English if source is not English, or just translate to English by default.
    // Actually, let's make it configurable or just translate to English for now as per "translate after finish".
    // "I want to have aweb app, with feature of live translation."

    // Let's assume we translate everything to English for simplicity unless specified better.
    // Or we can prompt: "Translate the following text to English"

    try {
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a professional translator. Translate the user input into ${targetLang === 'en' ? 'English' : targetLang}. If it is already ${targetLang === 'en' ? 'English' : targetLang}, just refine it slightly.`
                },
                {
                    role: "user",
                    content: text
                }
            ]
        });
        return completion.choices[0].message.content || "";
    } catch (error) {
        console.error("Translation error:", error);
        return "";
    }
}
