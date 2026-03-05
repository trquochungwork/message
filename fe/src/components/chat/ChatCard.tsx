import { cn } from '@/lib/utils.ts';
import { MoreHorizontal, Trash2, ShieldOff, Shield } from 'lucide-react';
import { Card } from '../ui/card.tsx';
import { useRef, useState, useEffect } from 'react';

interface ChatCardProps {
    convoId: string;
    name: string;
    isActive: boolean;
    onSelect: (id: string) => void;
    unreadCount?: number;
    leftSection: React.ReactNode;
    subtitle: React.ReactNode;
    onDelete?: () => void;
    onBlock?: () => void;
    isBlocked?: boolean;
}

const ChatCard = ({
    convoId,
    name,
    isActive,
    onSelect,
    unreadCount,
    leftSection,
    subtitle,
    onDelete,
    onBlock,
    isBlocked,
}: ChatCardProps) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Đóng menu khi click ra ngoài
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen((prev) => !prev);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        onDelete?.();
    };

    const handleBlock = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        onBlock?.();
    };

    return (
        <Card
            key={convoId}
            className={cn(
                'group border-none p-3 cursor-pointer transition-smooth glass hover:bg-muted/30',
                isActive &&
                    'ring-2 ring-primary/50 bg-linear-to-tr from-primary-glow/10 to-primary-foreground'
            )}
            onClick={() => onSelect(convoId)}
        >
            <div className='flex items-center gap-3'>
                <div className='relative'>{leftSection}</div>
                <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between mb-0.5'>
                        <h3
                            className={cn(
                                'text-sm truncate transition-colors',
                                unreadCount && unreadCount > 0
                                    ? 'font-bold text-foreground'
                                    : 'font-normal text-muted-foreground'
                            )}
                        >
                            {name}
                        </h3>
                    </div>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-1 flex-1 min-w-0'>{subtitle}</div>

                        {/* Context menu button */}
                        <div className='relative' ref={menuRef}>
                            <button
                                id={`chat-card-menu-${convoId}`}
                                onClick={handleMenuClick}
                                className={cn(
                                    'size-6 rounded-md flex items-center justify-center text-muted-foreground',
                                    'opacity-0 group-hover:opacity-100 hover:bg-muted/60 hover:text-foreground transition-smooth'
                                )}
                            >
                                <MoreHorizontal className='size-4' />
                            </button>

                            {menuOpen && (
                                <div className='absolute right-0 top-7 z-50 min-w-[160px] rounded-xl border border-border/60 bg-background/95 backdrop-blur-md shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-100'>
                                    {onBlock && (
                                        <button
                                            id={`chat-card-block-${convoId}`}
                                            onClick={handleBlock}
                                            className={cn(
                                                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/60',
                                                isBlocked ? 'text-green-500' : 'text-orange-500'
                                            )}
                                        >
                                            {isBlocked ? (
                                                <>
                                                    <Shield className='size-4' />
                                                    Bỏ chặn người dùng
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldOff className='size-4' />
                                                    Chặn người dùng
                                                </>
                                            )}
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            id={`chat-card-delete-${convoId}`}
                                            onClick={handleDelete}
                                            className='w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors'
                                        >
                                            <Trash2 className='size-4' />
                                            Xóa cuộc trò chuyện
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default ChatCard;
