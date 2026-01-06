import { useState, useEffect, useRef } from 'react';
import SpaceBackground from './components/SpaceBackground';
import LanguageSelector from './components/LanguageSelector';
import AudioRecorder from './components/AudioRecorder';
import AudioVisualizer from './components/AudioVisualizer';
import { Download, Sparkles } from 'lucide-react';

interface TranscriptItem {
  id: number;
  original: string;
  translation: string;
  timestamp: string;
}

function App() {
  const [language, setLanguage] = useState('ko');
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [latestCaption, setLatestCaption] = useState<string>("");

  const handleNewTranscript = (original: string, translation: string) => {
    const newItem: TranscriptItem = {
      id: Date.now(),
      original,
      translation,
      timestamp: new Date().toLocaleTimeString()
    };
    setTranscripts(prev => [...prev, newItem]);

    // Set for floating caption
    setLatestCaption(translation); // Showing translation as primary caption or original? User said "Caption... live translation". Assuming translation is key.

    // Clear floating caption after 6 seconds
    setTimeout(() => {
      setLatestCaption(prev => prev === translation ? "" : prev);
    }, 6000);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const downloadTranscript = () => {
    const content = transcripts.map(t =>
      `[${t.timestamp}] Original: ${t.original}\nTranslation: ${t.translation}\n`
    ).join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zrah-transcript-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SpaceBackground />

      {/* Visualizer Layer */}
      <AudioVisualizer analyser={analyser} isRecording={isRecording} />

      {/* Floating Caption Layer */}
      {isRecording && latestCaption && (
        <div className="floating-caption-container">
          <div className="typewriter-text">
            {latestCaption}<span className="cursor-blink">|</span>
          </div>
        </div>
      )}

      {/* Main UI Layer */}
      <div className="container" style={{ zIndex: 10 }}>

        <header className={isRecording ? 'fade-out' : 'fade-in'} style={{ textAlign: 'center', transition: 'opacity 0.5s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
            <Sparkles size={24} color="#8b5cf6" />
            <h1 style={{ margin: 0, fontSize: '2.5rem' }}>ZraH Live Transcription</h1>
          </div>


          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
            <LanguageSelector language={language} setLanguage={setLanguage} />
            <button className="glass-button" onClick={downloadTranscript} disabled={transcripts.length === 0}>
              <Download size={18} />
              Save
            </button>
          </div>
        </header>

        <main className={`glass-panel transcript-box ${isRecording ? 'fade-out' : 'fade-in'}`} ref={scrollRef} style={{ transition: 'opacity 0.5s', flex: 1 }}>
          {transcripts.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', marginTop: '80px' }}>
              <p>Initialize Sequence...</p>
            </div>
          ) : (
            transcripts.map((item) => (
              <div key={item.id} className="message">
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                  {item.timestamp}
                </div>
                <div className="message-original">{item.original}</div>
                <div className="message-translation">{item.translation}</div>
              </div>
            ))
          )}
        </main>

        <footer style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', justifyContent: 'center' }}>
          <AudioRecorder
            language={language}
            onNewTranscript={handleNewTranscript}
            onAnalyserReady={setAnalyser}
            onRecordingStateChange={setIsRecording}
          />
        </footer>
      </div>
    </>
  );
}

export default App;
