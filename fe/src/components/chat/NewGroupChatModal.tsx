import { useEffect, useRef, useState } from 'react';
import { Users, Plus, Check, Smile } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '../ui/dialog.tsx';
import { Input } from '../ui/input.tsx';
import { Button } from '../ui/button.tsx';
import { useChatStore } from '../../stores/useChatStore.ts';
import { chatService } from '../../services/chatSevice.ts';
import UserAvatar from './UserAvatar.tsx';
import { toast } from 'sonner';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';

const NewGroupChatModal = () => {
    const [open, setOpen] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [creating, setCreating] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const emojiRef = useRef<HTMLDivElement>(null);
    const { friends, addOrUpdateConversation } = useChatStore();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
                setShowEmoji(false);
            }
        };
        if (showEmoji) {
            document.addEventListener('mousedown', handler);
        }
        return () => document.removeEventListener('mousedown', handler);
    }, [showEmoji]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleCreate = async () => {
        if (!groupName.trim()) {
            toast.error('Vui lòng nhập tên nhóm');
            return;
        }
        if (selectedIds.size === 0) {
            toast.error('Vui lòng chọn ít nhất một thành viên');
            return;
        }
        try {
            setCreating(true);
            const convo = await chatService.createConversation(
                'group',
                Array.from(selectedIds),
                groupName.trim()
            );
            addOrUpdateConversation(convo);
            toast.success(`Đã tạo nhóm "${groupName.trim()}"`);
            setOpen(false);
            setGroupName('');
            setSelectedIds(new Set());
        } catch (error: unknown) {
            const msg =
                (error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Lỗi khi tạo nhóm chat';
            toast.error(msg);
        } finally {
            setCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Plus className='size-4' />
            </DialogTrigger>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <span className='size-8 rounded-full bg-gradient-primary flex items-center justify-center'>
                            <Users className='size-4 text-white' />
                        </span>
                        Tạo nhóm chat mới
                    </DialogTitle>
                </DialogHeader>

                {/* Group name */}
                <div>
                    <label className='text-xs font-medium text-muted-foreground mb-1.5 block'>
                        Tên nhóm
                    </label>
                    <div className='relative'>
                        <Input
                            placeholder='Nhập tên nhóm...'
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            autoFocus
                            className='pr-10'
                        />
                        <div className='absolute right-1 top-1/2 -translate-y-1/2' ref={emojiRef}>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 text-muted-foreground hover:text-primary'
                                onClick={() => setShowEmoji((prev) => !prev)}
                                type='button'
                            >
                                <Smile className='size-4' />
                            </Button>
                            {showEmoji && (
                                <div className='absolute top-full right-0 mt-2 z-50 shadow-xl'>
                                    <EmojiPicker
                                        onEmojiClick={(data: any) => {
                                            setGroupName((prev) => prev + data.emoji);
                                            setShowEmoji(false);
                                        }}
                                        theme={'auto' as EmojiTheme}
                                        searchDisabled
                                        skinTonesDisabled
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Members */}
                <div>
                    <label className='text-xs font-medium text-muted-foreground mb-1.5 block'>
                        Thêm thành viên ({selectedIds.size} đã chọn)
                    </label>
                    {friends.length === 0 ? (
                        <div className='text-center py-6 text-muted-foreground text-sm'>
                            Bạn chưa có bạn bè nào
                        </div>
                    ) : (
                        <div className='flex flex-col gap-1 max-h-60 overflow-y-auto'>
                            {friends.map((friend) => {
                                const selected = selectedIds.has(friend._id);
                                return (
                                    <button
                                        key={friend._id}
                                        onClick={() => toggleSelect(friend._id)}
                                        className={`flex items-center gap-3 p-2 rounded-xl transition-smooth text-left w-full ${
                                            selected
                                                ? 'bg-primary/10 ring-1 ring-primary/30'
                                                : 'hover:bg-muted/50'
                                        }`}
                                    >
                                        <UserAvatar
                                            type='chat'
                                            name={friend.displayName}
                                            avatarUrl={friend.avatarUrl}
                                        />
                                        <div className='flex-1 min-w-0'>
                                            <p className='text-sm font-medium truncate'>
                                                {friend.displayName}
                                            </p>
                                            <p className='text-xs text-muted-foreground truncate'>
                                                @{friend.username}
                                            </p>
                                        </div>
                                        <div
                                            className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-smooth ${
                                                selected
                                                    ? 'bg-primary border-primary'
                                                    : 'border-border'
                                            }`}
                                        >
                                            {selected && <Check className='size-3 text-white' />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant='outline' onClick={() => setOpen(false)} disabled={creating}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={creating || selectedIds.size === 0}
                        className='bg-gradient-primary hover:opacity-90 text-white'
                    >
                        {creating ? (
                            <span className='flex items-center gap-2'>
                                <span className='size-4 border-2 border-white/50 border-t-white rounded-full animate-spin' />
                                Đang tạo...
                            </span>
                        ) : (
                            <span className='flex items-center gap-2'>
                                <Users className='size-4' /> Tạo nhóm
                            </span>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NewGroupChatModal;
