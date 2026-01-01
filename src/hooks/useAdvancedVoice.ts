'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface VoiceState {
    isListening: boolean;
    isProcessing: boolean;
    transcript: string;
    interimTranscript: string;
    confidence: number;
    error: string | null;
    audioLevel: number; // 0-1 for visualization
}

interface UseAdvancedVoiceReturn extends VoiceState {
    isSupported: boolean;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
    toggleListening: () => void;
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

type SpeechRecognitionInstance = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    onspeechstart: (() => void) | null;
    onspeechend: (() => void) | null;
    onaudiostart: (() => void) | null;
    onaudioend: (() => void) | null;
    onsoundstart: (() => void) | null;
    onsoundend: (() => void) | null;
};

export function useAdvancedVoice(): UseAdvancedVoiceReturn {
    const [state, setState] = useState<VoiceState>({
        isListening: false,
        isProcessing: false,
        transcript: '',
        interimTranscript: '',
        confidence: 0,
        error: null,
        audioLevel: 0,
    });
    
    const [isSupported, setIsSupported] = useState(false);
    
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const finalTranscriptRef = useRef<string>('');
    const isManualStopRef = useRef(false);
    
    // Initialize speech recognition
    useEffect(() => {
        const SpeechRecognition = 
            (window as any).SpeechRecognition || 
            (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }
        
        setIsSupported(true);
        
        const recognition = new SpeechRecognition() as SpeechRecognitionInstance;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = finalTranscriptRef.current;
            let interimTranscript = '';
            let totalConfidence = 0;
            let confidenceCount = 0;
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0].transcript;
                
                if (result.isFinal) {
                    finalTranscript += text + ' ';
                    totalConfidence += result[0].confidence || 0.9;
                    confidenceCount++;
                } else {
                    interimTranscript += text;
                }
            }
            
            finalTranscriptRef.current = finalTranscript;
            
            setState(prev => ({
                ...prev,
                transcript: finalTranscript.trim(),
                interimTranscript: interimTranscript.trim(),
                confidence: confidenceCount > 0 
                    ? totalConfidence / confidenceCount 
                    : prev.confidence,
                error: null,
            }));
        };
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            
            // Handle specific errors
            if (event.error === 'no-speech') {
                // Silently restart on no speech detected
                if (!isManualStopRef.current) {
                    restartTimeoutRef.current = setTimeout(() => {
                        try {
                            recognition.start();
                        } catch (e) {
                            // Already started
                        }
                    }, 100);
                }
                return;
            }
            
            if (event.error === 'aborted') {
                // User aborted, don't show error
                return;
            }
            
            setState(prev => ({
                ...prev,
                error: getErrorMessage(event.error),
                isListening: false,
                isProcessing: false,
            }));
        };
        
        recognition.onstart = () => {
            setState(prev => ({
                ...prev,
                isListening: true,
                isProcessing: false,
                error: null,
            }));
        };
        
        recognition.onend = () => {
            // Auto-restart if not manually stopped (for continuous listening)
            if (!isManualStopRef.current && finalTranscriptRef.current === state.transcript) {
                restartTimeoutRef.current = setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (e) {
                        setState(prev => ({
                            ...prev,
                            isListening: false,
                            isProcessing: false,
                        }));
                    }
                }, 100);
            } else {
                setState(prev => ({
                    ...prev,
                    isListening: false,
                    isProcessing: false,
                    interimTranscript: '',
                }));
            }
        };
        
        recognition.onspeechstart = () => {
            setState(prev => ({ ...prev, isProcessing: true }));
        };
        
        recognition.onspeechend = () => {
            setState(prev => ({ ...prev, isProcessing: false }));
        };
        
        recognitionRef.current = recognition;
        
        return () => {
            if (restartTimeoutRef.current) {
                clearTimeout(restartTimeoutRef.current);
            }
            try {
                recognition.abort();
            } catch (e) {}
        };
    }, []);
    
    // Audio level monitoring for visualization
    const startAudioMonitoring = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
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
                
                // Calculate average volume
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                const normalized = Math.min(average / 128, 1); // Normalize to 0-1
                
                setState(prev => ({ ...prev, audioLevel: normalized }));
                
                animationFrameRef.current = requestAnimationFrame(updateLevel);
            };
            
            updateLevel();
        } catch (error) {
            console.error('Failed to start audio monitoring:', error);
        }
    }, []);
    
    const stopAudioMonitoring = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        
        analyserRef.current = null;
        setState(prev => ({ ...prev, audioLevel: 0 }));
    }, []);
    
    const startListening = useCallback(() => {
        if (!recognitionRef.current || !isSupported) return;
        
        isManualStopRef.current = false;
        finalTranscriptRef.current = '';
        
        setState(prev => ({
            ...prev,
            transcript: '',
            interimTranscript: '',
            error: null,
        }));
        
        try {
            recognitionRef.current.start();
            startAudioMonitoring();
        } catch (error) {
            console.error('Failed to start recognition:', error);
        }
    }, [isSupported, startAudioMonitoring]);
    
    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return;
        
        isManualStopRef.current = true;
        
        if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
        }
        
        try {
            recognitionRef.current.stop();
        } catch (error) {
            console.error('Failed to stop recognition:', error);
        }
        
        stopAudioMonitoring();
    }, [stopAudioMonitoring]);
    
    const toggleListening = useCallback(() => {
        if (state.isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [state.isListening, startListening, stopListening]);
    
    const resetTranscript = useCallback(() => {
        finalTranscriptRef.current = '';
        setState(prev => ({
            ...prev,
            transcript: '',
            interimTranscript: '',
            confidence: 0,
        }));
    }, []);
    
    return {
        ...state,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
        toggleListening,
    };
}

function getErrorMessage(error: string): string {
    const messages: Record<string, string> = {
        'not-allowed': 'Microphone permission denied. Please allow access.',
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'No microphone found. Please connect a microphone.',
        'network': 'Network error. Please check your connection.',
        'service-not-allowed': 'Speech service not available.',
        'bad-grammar': 'Speech recognition error.',
        'language-not-supported': 'Language not supported.',
    };
    
    return messages[error] || `Recognition error: ${error}`;
}

export default useAdvancedVoice;
