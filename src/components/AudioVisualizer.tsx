import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    analyser: AnalyserNode | null;
    isRecording: boolean;
}

export default function AudioVisualizer({ analyser, isRecording }: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !analyser || !isRecording) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Create base dots
        const dots: { x: number; y: number; baseR: number; angle: number; speed: number }[] = [];
        const numDots = 150;

        for (let i = 0; i < numDots; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 50 + 50; // Base random distribution
            dots.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                baseR: radius,
                angle: angle,
                speed: (Math.random() - 0.5) * 0.02
            });
        }

        let animationId: number;

        const draw = () => {
            animationId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;

            // Scaling factor based on volume (sensitivity)
            const scale = 1 + (average / 128) * 1.5;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);

            // Rotate entire ball slowly
            const time = Date.now() * 0.001;
            ctx.rotate(time * 0.2);

            ctx.fillStyle = '#c084fc';

            dots.forEach((dot) => {
                // Distort radius based on frequency data (React to sound)
                // Map dot angle to frequency bin roughly
                const binIndex = Math.floor(((dot.angle + Math.PI) / (2 * Math.PI)) * bufferLength) % bufferLength;
                const freqValue = dataArray[binIndex] || 0;

                // Dynamic radius
                const currentRadius = dot.baseR * scale + (freqValue / 255) * 40;

                // Update angle for internal movement
                dot.angle += dot.speed;

                const x = Math.cos(dot.angle) * currentRadius;
                const y = Math.sin(dot.angle) * currentRadius;

                ctx.beginPath();
                ctx.arc(x, y, 2 + (freqValue / 255) * 3, 0, Math.PI * 2); // Dot size pulses too
                ctx.fill();
            });

            ctx.restore();
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
    }, [analyser, isRecording]);

    return (
        <div className="visualizer-container">
            <canvas
                ref={canvasRef}
                width={400}
                height={400}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
}
