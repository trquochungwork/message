import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../stores/useChatStore.ts';
import { formatChatCardTime } from '../../lib/utils.ts';
import type { Conversation } from '../../types/chat.ts';
import ChatCard from './ChatCard.tsx';
import { useAuthStore } from '../../stores/useAuthStores.ts';
import UserAvatar from './UserAvatar.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';

const GroupChatCard = ({ convo }: { convo: Conversation }) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { activeConversationId } = useChatStore();
    const { setOpenMobile } = useSidebar();
    if (!user) return null;
    const unreadCount = convo.unreadCounts?.[user._id] ?? 0;
    const name = convo.group?.name ?? 'Nhóm chat';

    const handleSelectConversation = (id: string) => {
        navigate(`/group/${id}`);
        setOpenMobile(false);
    };

    return (
        <ChatCard
            convoId={convo._id}
            name={name}
            isActive={activeConversationId === convo._id}
            onSelect={handleSelectConversation}
            unreadCount={unreadCount}
            leftSection={
                <UserAvatar
                    type='chat'
                    name={name}
                    avatarUrl={convo.group?.avatarUrl}
                    className='size-12 shadow-soft'
                />
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
                                        {formatChatCardTime(new Date(convo.lastMessage.createdAt))}
                                    </span>
                                )}
                        </>
                    ) : (
                        <div className='flex items-center gap-1 truncate text-muted-foreground'>
                            <span className='truncate'>
                                {convo.lastMessage?.content ? (
                                    <>
                                        {convo.lastMessage.sender?._id === user._id
                                            ? 'Bạn: '
                                            : `${
                                                  convo.participants.find(
                                                      (p) =>
                                                          p._id?.toString() ===
                                                          convo.lastMessage?.sender?._id
                                                  )?.nickname ||
                                                  convo.lastMessage.sender?.displayName ||
                                                  'Người dùng'
                                              }: `}
                                        {convo.lastMessage.content}
                                    </>
                                ) : (
                                    <span className='italic'>
                                        {convo.participants.length} thành viên
                                    </span>
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
    );
};

export default GroupChatCard;
