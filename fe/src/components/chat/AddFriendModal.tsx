import { useState, useCallback } from 'react';
import { UserPlus, Search, X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog.tsx';
import { Input } from '../ui/input.tsx';
import { Button } from '../ui/button.tsx';
import { chatService } from '../../services/chatSevice.ts';
import { useChatStore } from '../../stores/useChatStore.ts';
import type { User } from '../../types/user.ts';
import UserAvatar from './UserAvatar.tsx';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/useAuthStores.ts';

let debounceTimer: ReturnType<typeof setTimeout>;

const AddFriendModal = ({ children }: { children?: React.ReactNode }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());
    const { friends, friendRequests, sendFriendRequest, cancelFriendRequest } = useChatStore();
    const { user } = useAuthStore();

    const friendIds = new Set(friends.map((f) => f._id));
    const sentRequestIds = new Set(friendRequests.sent.map((r) => r.to?._id ?? ''));
    // Map từ userId -> requestId để dùng cho cancel
    const sentRequestMap = new Map(friendRequests.sent.map((r) => [r.to?._id ?? '', r._id]));

    const handleSearch = useCallback((value: string) => {
        setQuery(value);
        clearTimeout(debounceTimer);
        if (value.trim().length < 2) {
            setResults([]);
            return;
        }
        debounceTimer = setTimeout(async () => {
            try {
                setSearching(true);
                const { users } = await chatService.searchUsers(value.trim());
                setResults(users);
            } catch {
                toast.error('Lỗi khi tìm kiếm');
            } finally {
                setSearching(false);
            }
        }, 400);
    }, []);

    const handleSend = async (userId: string) => {
        await sendFriendRequest(userId);
        setSentIds((prev) => new Set([...prev, userId]));
    };

    const handleCancel = async (userId: string) => {
        const requestId = sentRequestMap.get(userId);
        if (!requestId) return;
        await cancelFriendRequest(requestId);
        setSentIds((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
        });
    };

    const getButtonState = (userId: string) => {
        if (userId === user?._id) return 'self';
        if (friendIds.has(userId)) return 'friend';
        if (sentRequestIds.has(userId) || sentIds.has(userId)) return 'sent';
        return 'add';
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild={!!children}>
                {children || <UserPlus className='size-4' />}
            </DialogTrigger>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <span className='size-8 rounded-full bg-gradient-primary flex items-center justify-center'>
                            <UserPlus className='size-4 text-white' />
                        </span>
                        Kết bạn mới
                    </DialogTitle>
                </DialogHeader>

                {/* Search input */}
                <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                    <Input
                        placeholder='Tìm theo username, tên, email, số điện thoại...'
                        className='pl-9'
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        autoFocus
                    />
                    {query && (
                        <button
                            className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                            onClick={() => {
                                setQuery('');
                                setResults([]);
                            }}
                        >
                            <X className='size-3.5' />
                        </button>
                    )}
                </div>

                {/* Results */}
                <div className='min-h-[120px] max-h-72 overflow-y-auto'>
                    {searching && (
                        <div className='flex justify-center py-8'>
                            <div className='size-6 rounded-full border-2 border-primary border-t-transparent animate-spin' />
                        </div>
                    )}

                    {!searching && query.trim().length >= 2 && results.length === 0 && (
                        <div className='text-center py-8 text-muted-foreground text-sm'>
                            Không tìm thấy người dùng nào
                        </div>
                    )}

                    {!searching && query.trim().length < 2 && (
                        <div className='text-center py-8 text-muted-foreground text-sm'>
                            Nhập ít nhất 2 ký tự để tìm kiếm
                        </div>
                    )}

                    <div className='flex flex-col gap-1'>
                        {results.map((user) => {
                            const state = getButtonState(user._id);
                            return (
                                <div
                                    key={user._id}
                                    className='flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-smooth'
                                >
                                    <UserAvatar
                                        type='chat'
                                        name={user.displayName}
                                        avatarUrl={user.avatarUrl}
                                    />
                                    <div className='flex-1 min-w-0'>
                                        <p className='text-sm font-medium truncate'>
                                            {user.displayName}
                                        </p>
                                        <p className='text-xs text-muted-foreground truncate'>
                                            @{user.username}
                                        </p>
                                    </div>
                                    {state === 'self' && (
                                        <span className='text-xs text-blue-500 flex items-center gap-1'>
                                            Đây là bạn
                                        </span>
                                    )}
                                    {state === 'friend' && (
                                        <span className='text-xs text-green-500 flex items-center gap-1'>
                                            <Check className='size-3' /> Đã là bạn bè
                                        </span>
                                    )}
                                    {state === 'sent' && (
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            className='h-7 px-3 text-xs text-muted-foreground hover:text-destructive hover:border-destructive'
                                            onClick={() => handleCancel(user._id)}
                                        >
                                            <X className='size-3 mr-1' /> Hủy lời mời
                                        </Button>
                                    )}
                                    {state === 'add' && (
                                        <Button
                                            size='sm'
                                            className='bg-gradient-primary hover:opacity-90 text-white h-7 px-3 text-xs'
                                            onClick={() => handleSend(user._id)}
                                        >
                                            <UserPlus className='size-3 mr-1' /> Kết bạn
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddFriendModal;
