import React, { useState, useRef, useEffect } from 'react';
import { Square, Trash2, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface VoiceRecorderProps {
    onSend: (file: File) => void;
    onCancel: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<number | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        startRecording();
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            timerRef.current = window.setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Microphone access denied:', err);
            onCancel();
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) window.clearInterval(timerRef.current);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSend = () => {
        if (audioBlob) {
            const file = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
                type: 'audio/webm',
            });
            onSend(file);
        }
    };

    return (
        <div className='flex-1 flex items-center justify-between gap-4 bg-muted/30 rounded-2xl px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300'>
            <div className='flex items-center gap-3'>
                <div className='relative'>
                    <div
                        className={cn(
                            'size-3 rounded-full bg-red-500 animate-pulse',
                            !isRecording && 'opacity-0'
                        )}
                    />
                    {isRecording && (
                        <div className='absolute inset-0 size-3 rounded-full bg-red-500 animate-ping opacity-75' />
                    )}
                </div>
                <span className='text-sm font-semibold tabular-nums min-w-[40px]'>
                    {formatTime(recordingTime)}
                </span>
            </div>

            <div className='flex-1 flex items-center justify-center'>
                {isRecording ? (
                    <div className='flex items-center gap-1 h-6'>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                            <div
                                key={i}
                                className='w-0.5 bg-primary/40 rounded-full animate-voice-bar'
                                style={{
                                    height: `${Math.random() * 100}%`,
                                    animationDelay: `${i * 0.05}s`,
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <span className='text-sm text-muted-foreground animate-pulse'>
                        Đã dừng ghi âm
                    </span>
                )}
            </div>

            <div className='flex items-center gap-2'>
                <Button
                    variant='ghost'
                    size='icon'
                    className='size-9 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors'
                    onClick={onCancel}
                >
                    <Trash2 className='size-5' />
                </Button>

                {isRecording ? (
                    <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20'
                        onClick={stopRecording}
                    >
                        <Square className='size-4 fill-current' />
                    </Button>
                ) : (
                    <Button
                        size='icon'
                        className='size-9 rounded-full bg-gradient-primary hover:opacity-90 shadow-glow'
                        onClick={handleSend}
                    >
                        <Send className='size-4' />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default VoiceRecorder;
