import { useState, useRef } from 'react';
import { Mic, Square, Play, Pause } from 'lucide-react';
import { transcribeAudio, correctTranscript, translateText } from '../services/openai';

interface AudioRecorderProps {
    language: string;
    onNewTranscript: (original: string, translation: string) => void;
    onAnalyserReady?: (analyser: AnalyserNode | null) => void;
    onRecordingStateChange?: (isRecording: boolean) => void;
}

export default function AudioRecorder({ language, onNewTranscript, onAnalyserReady, onRecordingStateChange }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const CHUNK_INTERVAL = 10000; // 10 seconds for "live" feel

    const startRecording = async () => {
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
            alert(`Microphone access denied: ${err.message || err.name}. \n\nNote: If using --host, you must use HTTPS or access via localhost.`);
        }
    };

    const processChunk = async (chunk: Blob) => {
        // Create a file from the chunk
        const file = new File([chunk], "speech.webm", { type: 'audio/webm' });

        try {
            // 1. Transcribe
            const transcript = await transcribeAudio(file, language);
            if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) return;

            // 2. Correct
            const corrected = await correctTranscript(transcript);

            // 3. Translate
            const translation = await translateText(corrected);

            onNewTranscript(corrected, translation);

        } catch (error) {
            console.error("Processing chunk failed:", error);
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
        <div className="flex gap-4 justify-center" style={{ position: 'relative', zIndex: 60 }}>
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
    );
}
