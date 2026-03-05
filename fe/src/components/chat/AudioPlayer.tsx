import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface AudioPlayerProps {
    url: string;
    isOwn?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ url, isOwn }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const setAudioData = () => {
            setDuration(audio.duration);
        };

        const setAudioTime = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className={cn(
                'flex items-center gap-3 p-1.5 pr-4 rounded-2xl min-w-[230px] max-w-full group/player transition-all',
                isOwn
                    ? 'bg-primary/15 border border-primary/10'
                    : 'bg-muted/80 border border-border/50'
            )}
        >
            <audio ref={audioRef} src={url} preload='metadata' />

            <Button
                variant='ghost'
                size='icon'
                className={cn(
                    'size-10 rounded-full shrink-0 shadow-sm transition-transform active:scale-95',
                    isOwn
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-primary/20 text-primary hover:bg-primary/30'
                )}
                onClick={togglePlay}
            >
                {isPlaying ? (
                    <Pause className='size-5 fill-current' />
                ) : (
                    <Play className='size-5 fill-current ml-0.5' />
                )}
            </Button>

            <div className='flex flex-col flex-1 gap-0.5 min-w-0 py-1'>
                <div className='flex items-center gap-2 h-5'>
                    <input
                        type='range'
                        min='0'
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleProgressChange}
                        className='flex-1 h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all'
                    />
                </div>
                <div className='flex justify-between text-[10px] text-muted-foreground font-semibold tabular-nums tracking-tight px-0.5'>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <div className='shrink-0 text-muted-foreground/40 group-hover/player:text-primary/60 transition-colors ml-1'>
                <Volume2 className='size-4' />
            </div>
        </div>
    );
};

export default AudioPlayer;
