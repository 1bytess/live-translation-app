import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, AlertCircle, X } from 'lucide-react';
import { transcribeAudio, correctTranscript, translateText, isApiKeyConfigured } from '../services/openai';

interface AudioRecorderProps {
    language: string;
    onNewTranscript: (original: string, translation: string) => void;
    onAnalyserReady?: (analyser: AnalyserNode | null) => void;
    onRecordingStateChange?: (isRecording: boolean) => void;
}

export default function AudioRecorder({ language, onNewTranscript, onAnalyserReady, onRecordingStateChange }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processingStatus, setProcessingStatus] = useState<string | null>(null);
    const [apiKeyMissing, setApiKeyMissing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const CHUNK_INTERVAL = 10000; // 10 seconds for "live" feel

    // Check API key on mount
    useEffect(() => {
        if (!isApiKeyConfigured()) {
            setApiKeyMissing(true);
            console.error("API key check failed - transcription will not work");
        }
    }, []);

    const dismissError = () => setError(null);

    const startRecording = async () => {
        setError(null);

        // Warn if API key is missing
        if (apiKeyMissing) {
            setError("OpenAI API key is not configured. Transcription will not work.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Setup AudioContext for Visualizer
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser); // Connect source to analyser
            // Do NOT connect to destination (speakers) to avoid feedback loop unless desired

            if (onAnalyserReady) onAnalyserReady(analyser);

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    processChunk(event.data);
                }
            };

            // Start recording and slice every 10 seconds
            mediaRecorder.start(CHUNK_INTERVAL);
            setIsRecording(true);
            if (onRecordingStateChange) onRecordingStateChange(true);
            setIsPaused(false);

        } catch (err: any) {
            console.error("Error accessing microphone:", err);

            // Determine user-friendly error message
            let errorMessage = "Unable to access microphone.";
            if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
                errorMessage = "No microphone detected. Please connect a microphone and try again.";
            } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
            } else if (err.name === 'NotReadableError') {
                errorMessage = "Microphone is in use by another application.";
            } else if (err.message) {
                errorMessage = `Microphone error: ${err.message}`;
            }

            setError(errorMessage);
        }
    };

    const processChunk = async (chunk: Blob) => {
        // Create a file from the chunk
        const file = new File([chunk], "speech.webm", { type: 'audio/webm' });
        console.log("🎤 Processing audio chunk:", file.size, "bytes");
        setProcessingStatus("Transcribing...");

        try {
            // 1. Transcribe
            console.log("📝 Calling transcribeAudio...");
            const transcript = await transcribeAudio(file, language);
            console.log("📝 Transcription result:", transcript);

            if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
                console.log("⚠️ Empty transcription, skipping");
                setProcessingStatus(null);
                return;
            }

            // 2. Correct
            setProcessingStatus("Correcting...");
            console.log("✏️ Calling correctTranscript...");
            const corrected = await correctTranscript(transcript);
            console.log("✏️ Corrected result:", corrected);

            // 3. Translate
            setProcessingStatus("Translating...");
            console.log("🌐 Calling translateText...");
            const translation = await translateText(corrected);
            console.log("🌐 Translation result:", translation);

            setProcessingStatus(null);
            onNewTranscript(corrected, translation);

        } catch (error: any) {
            console.error("❌ Processing chunk failed:", error);
            setProcessingStatus(null);

            // Show error to user if it's an API error
            if (error.message?.includes('API') || error.message?.includes('401') || error.message?.includes('403')) {
                setError("OpenAI API error. Please check your API key configuration.");
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (onAnalyserReady) onAnalyserReady(null);

            setIsRecording(false);
            if (onRecordingStateChange) onRecordingStateChange(false);
            setIsPaused(false);
        }
    };

    const togglePause = () => {
        if (mediaRecorderRef.current) {
            if (isPaused) {
                mediaRecorderRef.current.resume();
                setIsPaused(false);
            } else {
                mediaRecorderRef.current.pause();
                setIsPaused(true);
            }
        }
    };

    return (
        <div className="audio-recorder-container" style={{ position: 'relative', zIndex: 60 }}>
            {/* Error Toast */}
            {error && (
                <div className="error-toast" style={{
                    position: 'fixed',
                    bottom: '100px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(220, 38, 38, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    maxWidth: '90vw',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    <AlertCircle size={20} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.95rem', flex: 1 }}>{error}</span>
                    <button
                        onClick={dismissError}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.7,
                            transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Processing Status Indicator */}
            {processingStatus && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(139, 92, 246, 0.9)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)'
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#fff',
                        animation: 'blink 1s infinite'
                    }} />
                    {processingStatus}
                </div>
            )}

            {/* API Key Warning */}
            {apiKeyMissing && !error && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(245, 158, 11, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontSize: '0.85rem',
                    color: '#000',
                    fontWeight: 500,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                }}>
                    ⚠️ OpenAI API key not configured - Transcription disabled
                </div>
            )}

            {/* Recording Controls */}
            <div className="flex gap-4 justify-center">
                {!isRecording ? (
                    <button className="glass-button" onClick={startRecording}>
                        <Mic size={20} />
                        Start Recording
                    </button>
                ) : (
                    <>
                        <button className="glass-button danger" onClick={stopRecording}>
                            <Square size={20} />
                            Stop
                        </button>
                        <button className="glass-button" onClick={togglePause}>
                            {isPaused ? <Play size={20} /> : <Pause size={20} />}
                            {isPaused ? "Resume" : "Pause"}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
