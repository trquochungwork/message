import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../stores/useChatStore.ts';
import { useAuthStore } from '../../stores/useAuthStores.ts';
import { chatService } from '../../services/chatSevice.ts';
import UserAvatar from './UserAvatar.tsx';
import StatusBadge from './StatusBadge.tsx';
import UnreadCountBadge from './UnreadCountBadge.tsx';
import { toast } from 'sonner';
import { cn } from '../../lib/utils.ts';
import { useSidebar } from '@/components/ui/sidebar.tsx';

const FriendList = () => {
    const navigate = useNavigate();
    const {
        friends,
        onlineUsers,
        conversations,
        addOrUpdateConversation,
        sidebarSearchQuery,
        activeConversationId,
    } = useChatStore();
    const { user } = useAuthStore();
    const [openingId, setOpeningId] = useState<string | null>(null);
    const { setOpenMobile } = useSidebar();

    if (!friends || friends.length === 0) {
        return (
            <div className='px-2 py-3 text-xs text-muted-foreground text-center'>
                Chưa có bạn bè nào
            </div>
        );
    }

    const handleOpenChat = async (friendId: string) => {
        // Tìm conversation direct đã tồn tại
        const existing = conversations.find(
            (c) => c.type === 'direct' && c.participants.some((p) => p._id?.toString() === friendId)
        );

        if (existing) {
            navigate(`/chat/${existing._id}`);
            setOpenMobile(false);
            return;
        }

        // Tạo conversation mới
        try {
            setOpeningId(friendId);
            const convo = await chatService.createConversation('direct', [friendId]);
            addOrUpdateConversation(convo);
            navigate(`/chat/${convo._id}`);
            setOpenMobile(false);
        } catch (error: unknown) {
            const msg =
                (error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Lỗi khi mở cuộc trò chuyện';
            toast.error(msg);
        } finally {
            setOpeningId(null);
        }
    };

    const query = (sidebarSearchQuery || '').toLowerCase();
    const filteredFriends = friends.filter((friend) => {
        if (!query) return true;
        // Search by displayName or nickname
        const relatedConvo = conversations.find(
            (c) =>
                c.type === 'direct' && c.participants.some((p) => p._id?.toString() === friend._id)
        );
        const participant = relatedConvo?.participants.find(
            (p) => p._id?.toString() === friend._id.toString()
        );
        const displayName = (participant as any)?.nickname || friend.displayName || '';
        return displayName.toLowerCase().includes(query);
    });

    if (filteredFriends.length === 0 && query) {
        return (
            <div className='px-2 py-3 text-xs text-muted-foreground text-center'>
                Không tìm thấy kết quả phù hợp
            </div>
        );
    }

    return (
        <div className='flex flex-col overflow-y-auto p-2 space-y-1'>
            {filteredFriends.map((friend) => {
                const isOnline = onlineUsers.includes(friend._id?.toString());
                // console.log(
                //     `Checking friend ${friend.displayName} (${friend._id}): isOnline=${isOnline}. onlineUsers=[${onlineUsers}]`
                // );
                const isLoading = openingId === friend._id;

                // Tính unread count từ conversation tương ứng
                const relatedConvo = conversations.find(
                    (c) =>
                        c.type === 'direct' &&
                        c.participants.some((p) => p._id?.toString() === friend._id)
                );
                const unreadCount =
                    relatedConvo && user ? (relatedConvo.unreadCounts?.[user._id] ?? 0) : 0;
                const lastMessage = relatedConvo?.lastMessage?.content ?? null;

                // Kiểm tra conversation có đang active không
                const isActive = relatedConvo ? activeConversationId === relatedConvo._id : false;

                const participant = relatedConvo?.participants.find(
                    (p) => p._id?.toString() === friend._id.toString()
                );
                const displayName = (participant as any)?.nickname || friend.displayName;

                return (
                    <button
                        key={friend._id}
                        onClick={() => handleOpenChat(friend._id)}
                        disabled={isLoading}
                        className={cn(
                            'flex items-center gap-3 p-3 rounded-xl transition-smooth text-left w-full cursor-pointer group',
                            isActive
                                ? 'ring-2 ring-primary/50 bg-linear-to-tr from-primary/10 to-primary-foreground'
                                : 'hover:bg-muted/30',
                            isLoading && 'opacity-60'
                        )}
                    >
                        {/* Avatar + status */}
                        <div className='relative shrink-0'>
                            <UserAvatar
                                type='sidebar'
                                name={displayName}
                                avatarUrl={friend.avatarUrl}
                            />
                            <StatusBadge status={isOnline ? 'online' : 'offline'} />
                            {unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}
                        </div>

                        {/* Info */}
                        <div className='flex-1 min-w-0'>
                            <div className='flex items-center justify-between mb-0.5'>
                                <p
                                    className={cn(
                                        'text-sm font-semibold truncate',
                                        unreadCount > 0 ? 'text-foreground' : ''
                                    )}
                                >
                                    {displayName}
                                </p>
                                {isLoading && (
                                    <span className='size-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0' />
                                )}
                            </div>
                            <p
                                className={cn(
                                    'text-xs truncate',
                                    unreadCount > 0
                                        ? 'font-medium text-foreground'
                                        : 'text-muted-foreground'
                                )}
                            >
                                {lastMessage ?? (
                                    <span className='italic'>
                                        {isOnline ? '● Đang hoạt động' : 'Offline'}
                                    </span>
                                )}
                            </p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default FriendList;
