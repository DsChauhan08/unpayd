'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    disabled?: boolean;
    className?: string;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export function VoiceInput({ onTranscript, disabled, className }: VoiceInputProps) {
    const [state, setState] = useState<RecordingState>('idle');
    const [audioLevel, setAudioLevel] = useState(0);
    const [duration, setDuration] = useState(0);
    const [transcript, setTranscript] = useState('');
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    
    // Speech Recognition for real-time feedback
    const recognitionRef = useRef<any>(null);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);
    
    const cleanup = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {}
        }
        
        mediaRecorderRef.current = null;
        streamRef.current = null;
        audioContextRef.current = null;
        analyserRef.current = null;
        audioChunksRef.current = [];
    }, []);
    
    const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
        try {
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            
            source.connect(analyser);
            analyserRef.current = analyser;
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            const updateLevel = () => {
                if (!analyserRef.current) return;
                
                analyserRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                const normalized = Math.min(average / 100, 1);
                
                setAudioLevel(normalized);
                animationFrameRef.current = requestAnimationFrame(updateLevel);
            };
            
            updateLevel();
        } catch (error) {
            console.error('Failed to start audio monitoring:', error);
        }
    }, []);
    
    const startRealTimeTranscription = useCallback(() => {
        const SpeechRecognition = 
            (window as any).SpeechRecognition || 
            (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) return;
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    setTranscript(prev => (prev + ' ' + text).trim());
                } else {
                    interim += text;
                }
            }
        };
        
        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.error('Speech recognition error:', event.error);
            }
        };
        
        recognitionRef.current = recognition;
        
        try {
            recognition.start();
        } catch (e) {
            console.error('Failed to start speech recognition:', e);
        }
    }, []);
    
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                }
            });
            
            streamRef.current = stream;
            audioChunksRef.current = [];
            setTranscript('');
            setDuration(0);
            
            // Start audio level monitoring
            startAudioLevelMonitoring(stream);
            
            // Start real-time transcription for preview
            startRealTimeTranscription();
            
            // Prefer webm/opus for best quality, fallback to other formats
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/mp4';
            
            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                // Process the audio
                setState('processing');
                
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                
                if (audioBlob.size < 1000) {
                    toast.error('Recording too short. Please speak for at least 1 second.');
                    setState('idle');
                    cleanup();
                    return;
                }
                
                try {
                    // Use Whisper API for accurate transcription
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'recording.webm');
                    
                    const response = await fetch('/api/transcribe', {
                        method: 'POST',
                        body: formData,
                    });
                    
                    const result = await response.json();
                    
                    if (result.success && result.text && result.text.trim().length > 0) {
                        // Filter out common transcription artifacts
                        const cleanText = result.text.trim();
                        const artifactPatterns = [
                            /^thank you\.?$/i,
                            /^thanks\.?$/i,
                            /^you\.?$/i,
                            /^\.\.+$/,
                            /^\s*$/,
                        ];
                        
                        const isArtifact = artifactPatterns.some(p => p.test(cleanText));
                        
                        if (!isArtifact) {
                            onTranscript(cleanText);
                            toast.success('Voice transcribed!');
                        } else {
                            toast.error('Could not understand. Please speak clearly and try again.');
                        }
                    } else {
                        toast.error(result.error || 'Transcription failed. Please try again.');
                    }
                } catch (error) {
                    console.error('Transcription error:', error);
                    toast.error('Failed to transcribe audio. Check your internet connection.');
                }
                
                setState('idle');
                setAudioLevel(0);
                setDuration(0);
                setTranscript('');
                cleanup();
            };
            
            mediaRecorder.start(100); // Collect data every 100ms
            setState('recording');
            
            // Track duration
            const startTime = Date.now();
            durationIntervalRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            toast.error('Could not access microphone');
            setState('idle');
        }
    }, [startAudioLevelMonitoring, startRealTimeTranscription, onTranscript, transcript, cleanup]);
    
    const stopRecording = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {}
        }
        
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
        }
        
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    }, []);
    
    const toggleRecording = useCallback(() => {
        if (state === 'recording') {
            stopRecording();
        } else if (state === 'idle') {
            startRecording();
        }
    }, [state, startRecording, stopRecording]);
    
    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Generate audio visualization bars
    const bars = Array.from({ length: 5 }, (_, i) => {
        const baseHeight = 8;
        const maxHeight = 24;
        const delay = i * 0.05;
        const height = state === 'recording' 
            ? baseHeight + (maxHeight - baseHeight) * audioLevel * Math.sin(Date.now() / 200 + i)
            : baseHeight;
        return { height: Math.max(baseHeight, Math.abs(height)), delay };
    });
    
    return (
        <div className={cn("relative inline-flex items-center gap-2", className)}>
            {/* Recording visualization */}
            {state === 'recording' && (
                <div className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 rounded-lg border border-red-500/30">
                    <div className="flex items-end gap-0.5 h-6">
                        {bars.map((bar, i) => (
                            <div
                                key={i}
                                className="w-1 bg-red-500 rounded-full transition-all duration-75"
                                style={{ 
                                    height: `${bar.height}px`,
                                    opacity: 0.6 + audioLevel * 0.4
                                }}
                            />
                        ))}
                    </div>
                    <span className="text-xs text-red-400 ml-2 font-mono min-w-[36px]">
                        {formatDuration(duration)}
                    </span>
                </div>
            )}
            
            {/* Processing indicator */}
            {state === 'processing' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-xs text-blue-400">Processing...</span>
                </div>
            )}
            
            {/* Voice button */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled || state === 'processing'}
                onClick={toggleRecording}
                className={cn(
                    "h-8 w-8 rounded-lg transition-all",
                    state === 'recording'
                        ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
            >
                {state === 'recording' ? (
                    <Square className="w-4 h-4" />
                ) : state === 'processing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Mic className="w-4 h-4" />
                )}
            </Button>
            
            {/* Real-time transcript preview */}
            {state === 'recording' && transcript && (
                <div className="absolute bottom-full left-0 mb-2 max-w-xs p-2 bg-secondary rounded-lg border border-border text-xs text-muted-foreground">
                    {transcript}
                </div>
            )}
        </div>
    );
}
