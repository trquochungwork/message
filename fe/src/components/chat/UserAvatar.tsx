import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useState } from 'react';
import { ImagePreview } from '../ui/ImagePreview';

interface IUserAvatarProps {
    type: 'sidebar' | 'chat' | 'profile';
    name: string;
    avatarUrl?: string | null;
    className?: string;
    previewable?: boolean;
}
const UserAvatar = ({ type, name, avatarUrl, className, previewable }: IUserAvatarProps) => {
    const [previewOpen, setPreviewOpen] = useState(false);

    const getGradientFromName = (name: string) => {
        const hash = name
            .split('')
            .reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        const h = Math.abs(hash % 360);
        return `linear-gradient(135deg, hsl(${h}, 70%, 60%), hsl(${(h + 40) % 360}, 80%, 70%))`;
    };

    if (!name) {
        name = 'Message';
    }

    const content = (
        <Avatar
            className={cn(
                className ?? '',
                type === 'sidebar' && 'size-12 text-base',
                type === 'chat' && 'size-8 text-sm',
                type === 'profile' && 'size-24 text-3xl shadow-md',
                previewable &&
                    'cursor-pointer hover:opacity-90 transition-opacity ring-2 ring-white/10'
            )}
            onClick={
                previewable
                    ? (e) => {
                          e.stopPropagation();
                          setPreviewOpen(true);
                      }
                    : undefined
            }
        >
            <AvatarImage src={avatarUrl || undefined} alt={name} className='object-cover' />
            <AvatarFallback
                className='text-white font-bold'
                style={{ background: !avatarUrl ? getGradientFromName(name) : undefined }}
            >
                {name.charAt(0).toUpperCase()}
            </AvatarFallback>
        </Avatar>
    );

    if (!previewable) return content;

    return (
        <>
            {content}
            {avatarUrl && (
                <ImagePreview
                    src={avatarUrl}
                    alt={name}
                    isOpen={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                />
            )}
        </>
    );
};

export default UserAvatar;
