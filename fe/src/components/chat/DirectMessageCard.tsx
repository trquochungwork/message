import { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStores.ts';
import { useChatStore } from '../../stores/useChatStore.ts';
import { formatChatCardTime } from '../../lib/utils.ts';
import type { Conversation } from '../../types/chat.ts';
import ChatCard from './ChatCard.tsx';
import StatusBadge from './StatusBadge.tsx';
import UnreadCountBadge from './UnreadCountBadge.tsx';
import UserAvatar from './UserAvatar.tsx';
import ConfirmDialog from '@/components/ui/ConfirmDialog.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';

const DirectMessageCard = ({ convo }: { convo: Conversation }) => {
    const { user } = useAuthStore();
    const {
        activeConversationId,
        setActiveConversation,
        onlineUsers,
        deleteConversation,
        blockUser,
        unblockUser,
        blockedUsers,
    } = useChatStore();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const { setOpenMobile } = useSidebar();

    if (!user) return null;

    const otherUser = convo.participants.find((p) => p._id?.toString() !== user._id.toString());
    if (!otherUser) return null;

    const displayName = (otherUser as any).nickname || otherUser.displayName || '';
    const unreadCount = convo.unreadCounts?.[user._id] ?? 0;
    const lastMessage = convo.lastMessage?.content ?? '';
    const isOnline = otherUser._id ? onlineUsers.includes(otherUser._id.toString()) : false;
    const isBlocked = otherUser._id
        ? blockedUsers.some((b) => b._id?.toString() === otherUser._id?.toString())
        : false;

    const handleSelectConversations = async (id: string) => {
        setActiveConversation(id);
        setOpenMobile(false);
    };

    const handleDelete = async () => {
        await deleteConversation(convo._id);
        setShowDeleteConfirm(false);
    };

    const handleBlock = async () => {
        if (!otherUser._id) return;
        if (isBlocked) {
            await unblockUser(otherUser._id.toString());
        } else {
            await blockUser(otherUser._id.toString());
        }
        setShowBlockConfirm(false);
    };

    return (
        <>
            <ChatCard
                convoId={convo._id}
                name={displayName}
                isActive={activeConversationId === convo._id}
                onSelect={handleSelectConversations}
                unreadCount={unreadCount}
                onDelete={() => setShowDeleteConfirm(true)}
                onBlock={() => setShowBlockConfirm(true)}
                isBlocked={isBlocked}
                leftSection={
                    <>
                        <div className='relative'>
                            <UserAvatar
                                type='sidebar'
                                name={displayName}
                                avatarUrl={otherUser.avatarUrl ?? undefined}
                                previewable
                            />
                            <StatusBadge status={isOnline ? 'online' : 'offline'} />
                        </div>
                        {unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}
                    </>
                }
                subtitle={
                    <div className='flex items-center gap-1 w-full text-sm truncate'>
                        {unreadCount > 0 ? (
                            <>
                                <span className='font-bold text-foreground shrink-0'>
                                    {unreadCount} tin nhắn mới
                                </span>
                                {convo.lastMessage?.createdAt &&
                                    new Date().toDateString() !==
                                        new Date(convo.lastMessage.createdAt).toDateString() && (
                                        <span className='text-muted-foreground shrink-0'>
                                            {' · '}
                                            {formatChatCardTime(
                                                new Date(convo.lastMessage.createdAt)
                                            )}
                                        </span>
                                    )}
                            </>
                        ) : (
                            <div className='flex items-center gap-1 truncate text-muted-foreground'>
                                <span className='truncate'>
                                    {convo.lastMessage?.sender?._id === user._id && 'Bạn: '}
                                    {lastMessage || (
                                        <span className='italic'>Chưa có tin nhắn</span>
                                    )}
                                </span>
                                {convo.lastMessage?.createdAt && (
                                    <span className='shrink-0'>
                                        {' · '}
                                        {formatChatCardTime(new Date(convo.lastMessage.createdAt))}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                }
            />

            {/* Dialog xác nhận xóa */}
            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                onConfirm={handleDelete}
                title='Xóa cuộc trò chuyện'
                description={`Bạn có chắc muốn xóa toàn bộ cuộc trò chuyện với ${displayName}? Tất cả tin nhắn sẽ bị xóa vĩnh viễn.`}
                confirmText='Xóa'
                variant='destructive'
            />

            {/* Dialog xác nhận chặn/bỏ chặn */}
            <ConfirmDialog
                open={showBlockConfirm}
                onOpenChange={setShowBlockConfirm}
                onConfirm={handleBlock}
                title={isBlocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng'}
                description={
                    isBlocked
                        ? `Bỏ chặn ${displayName}? Họ có thể nhắn tin cho bạn trở lại.`
                        : `Chặn ${displayName}? Bạn và họ sẽ không thể nhắn tin cho nhau.`
                }
                confirmText={isBlocked ? 'Bỏ chặn' : 'Chặn'}
                variant={isBlocked ? 'default' : 'destructive'}
            />
        </>
    );
};

export default DirectMessageCard;
