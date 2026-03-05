import { useState } from 'react';
import { MessageSquarePlus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog.tsx';
import { Input } from '../ui/input.tsx';
import { useChatStore } from '../../stores/useChatStore.ts';
import { chatService } from '../../services/chatSevice.ts';
import UserAvatar from './UserAvatar.tsx';
import StatusBadge from './StatusBadge.tsx';
import { toast } from 'sonner';
import { Button } from '../ui/button.tsx';

const CreateNewChat = () => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [creating, setCreating] = useState<string | null>(null);
    const { friends, onlineUsers, conversations, addOrUpdateConversation, setActiveConversation } =
        useChatStore();

    const filtered = friends.filter(
        (f) =>
            f.displayName.toLowerCase().includes(query.toLowerCase()) ||
            f.username.toLowerCase().includes(query.toLowerCase())
    );

    const handleOpenChat = async (friendId: string) => {
        // Kiểm tra xem đã có conversation chưa
        const existing = conversations.find(
            (c) => c.type === 'direct' && c.participants.some((p) => p._id?.toString() === friendId)
        );
        if (existing) {
            setActiveConversation(existing._id);
            setOpen(false);
            return;
        }

        // Tạo conversation mới
        try {
            setCreating(friendId);
            const convo = await chatService.createConversation('direct', [friendId]);
            addOrUpdateConversation(convo);
            setActiveConversation(convo._id);
            setOpen(false);
        } catch (error: unknown) {
            const msg =
                (error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Lỗi khi tạo cuộc trò chuyện';
            toast.error(msg);
        } finally {
            setCreating(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant='outline'
                    className='w-full justify-start gap-2 text-muted-foreground hover:text-foreground border-dashed hover:border-primary/50 transition-smooth'
                >
                    <MessageSquarePlus className='size-4' />
                    <span className='text-sm'>Tin nhắn mới...</span>
                </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <span className='size-8 rounded-full bg-gradient-primary flex items-center justify-center'>
                            <MessageSquarePlus className='size-4 text-white' />
                        </span>
                        Bắt đầu cuộc trò chuyện
                    </DialogTitle>
                </DialogHeader>

                {/* Search */}
                <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                    <Input
                        placeholder='Tìm bạn bè...'
                        className='pl-9'
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Friends list */}
                <div className='max-h-72 overflow-y-auto'>
                    {filtered.length === 0 && (
                        <div className='text-center py-8 text-muted-foreground text-sm'>
                            {friends.length === 0
                                ? 'Bạn chưa có bạn bè nào. Hãy kết bạn trước!'
                                : 'Không tìm thấy bạn bè nào'}
                        </div>
                    )}
                    <div className='flex flex-col gap-1'>
                        {filtered.map((friend) => {
                            const isOnline = onlineUsers.includes(friend._id);
                            const isCreating = creating === friend._id;
                            return (
                                <button
                                    key={friend._id}
                                    onClick={() => handleOpenChat(friend._id)}
                                    disabled={!!creating}
                                    className='flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-smooth text-left w-full disabled:opacity-60'
                                >
                                    <div className='relative'>
                                        <UserAvatar
                                            type='chat'
                                            name={friend.displayName}
                                            avatarUrl={friend.avatarUrl}
                                        />
                                        <StatusBadge status={isOnline ? 'online' : 'offline'} />
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                        <p className='text-sm font-medium truncate'>
                                            {friend.displayName}
                                        </p>
                                        <p className='text-xs text-muted-foreground'>
                                            {isOnline ? '● Đang hoạt động' : 'Offline'}
                                        </p>
                                    </div>
                                    {isCreating && (
                                        <div className='size-5 border-2 border-primary border-t-transparent rounded-full animate-spin' />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreateNewChat;
