import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/useAuthStores.ts';
import { useChatStore } from '../../stores/useChatStore.ts';
import {
    connectSocket,
    disconnectSocket,
    joinConversationRooms,
} from '../../services/socketService.ts';
import { useCallStore } from '../../stores/useCallStore.ts';

import { toast } from 'sonner';

const SocketInitializer = () => {
    const { user, accessToken } = useAuthStore();
    const {
        conversations,
        setOnlineUsers,
        addMessage,
        addOrUpdateConversation,
        updateConversationMeta,
        activeConversationId,
        markConversationAsRead,
        updateMessageLocally,
        setTypingStatus,
        fetchFriendRequests,
        fetchFriends,
        updateUserInfo,
        updateGroupProfileLocally,
        removeParticipantLocally,
        updateParticipantRoleLocally,
    } = useChatStore();
    const { setAvailableGroupCall, setParticipants } = useCallStore();

    // Use ref to avoid re-triggering effects when activeConversationId changes
    const activeConvoRef = useRef(activeConversationId);
    useEffect(() => {
        activeConvoRef.current = activeConversationId;
    }, [activeConversationId]);

    useEffect(() => {
        if (accessToken && user?._id) {
            const socket = connectSocket(user._id);

            const handleConnect = () => {
                console.log('[SocketInitializer] Socket connected/reconnected. Joining rooms...');
                if (conversations.length > 0) {
                    const convoIds = conversations.map((c) => c._id);
                    joinConversationRooms(convoIds);
                }
            };

            socket.on('connect', handleConnect);

            socket.on('online_users', (userIds: string[]) => {
                console.log('Online users updated:', userIds);
                // Đảm bảo là mảng string
                const safeUserIds = userIds.map((id) => id.toString());
                setOnlineUsers(safeUserIds);
            });

            socket.on('new_message', (data: any) => {
                console.log('New message received:', data);
                if (data.message) {
                    addMessage(data.message);
                }

                // Nếu đang ở trong cuộc trò chuyện đó thì mark as read luôn
                if (activeConvoRef.current === data.conversationId) {
                    markConversationAsRead(data.conversationId);
                }
            });

            socket.on('conversation_updated', (data: any) => {
                console.log('Conversation updated:', data);
                if (data.action === 'add_members' && data.conversation) {
                    // Nếu là hành động thêm thành viên, ta update toàn bộ convo
                    addOrUpdateConversation(data.conversation);
                    joinConversationRooms([data.conversationId]);
                } else if (data.action === 'member_kicked') {
                    removeParticipantLocally(data.conversationId, data.kickedUserId);
                } else if (data.action === 'role_updated') {
                    updateParticipantRoleLocally(data.conversationId, data.targetUserId, data.role);
                } else if (data.type === 'group_profile_update') {
                    // Nếu nhóm thay đổi tên hoặc ảnh
                    updateGroupProfileLocally(data.conversationId, data.groupName, data.avatarUrl);
                } else {
                    updateConversationMeta(data.conversationId, {
                        lastMessage: data.lastMessage,
                        lastMessageAt: data.lastMessageAt,
                        unreadCounts: data.unreadCounts,
                    });
                }
            });

            socket.on('conversation_created', (data: any) => {
                console.log('New conversation created:', data);
                addOrUpdateConversation(data);
                joinConversationRooms([data._id]);
            });

            socket.on('message_recalled', (data: any) => {
                console.log('Message recalled:', data);
                updateMessageLocally(data.conversationId, data.messageId, (msg) => ({
                    ...msg,
                    isRecalled: true,
                    content: 'Tin nhắn đã thu hồi',
                    attachments: [],
                }));
            });

            socket.on('message_deleted_for_me', (_data: any) => {
                // Xóa khỏi UI cá nhân
                // Bạn có thể implement removeMessageLocally hoặc dùng updateMessageLocally trả về null/filter
            });

            socket.on('message_read', (data: any) => {
                console.log('Message read event:', data);
                updateMessageLocally(data.conversationId, data.messageId, (msg) => {
                    const currentSeen = msg.seenBy || [];
                    if (!currentSeen.includes(data.readBy)) {
                        return {
                            ...msg,
                            seenBy: [...currentSeen, data.readBy],
                            readAt: data.readAt,
                        };
                    }
                    return msg;
                });
            });

            socket.on('message_edited', (data: any) => {
                console.log('Message edited event:', data);
                updateMessageLocally(data.conversationId, data.messageId, (msg) => ({
                    ...msg,
                    content: data.content,
                    editedAt: data.editedAt,
                }));
            });

            socket.on('typing', (data: any) => {
                setTypingStatus(data.conversationId, data.userId, data.isTyping);
            });

            socket.on('group_active_call', (data: any) => {
                console.log('[SocketInitializer] Active group call detected:', data);
                setAvailableGroupCall(data.conversationId, {
                    callType: data.callType,
                    callerInfo: data.callerInfo,
                });
            });

            socket.on('group_call_ended', (data: any) => {
                console.log('[SocketInitializer] Group call ended:', data.conversationId);
                setAvailableGroupCall(data.conversationId, null);
            });

            socket.on('group_participants_updated', (data: any) => {
                console.log('[SocketInitializer] Group participants updated:', data.conversationId);
                if (data.participants.length === 0) {
                    setAvailableGroupCall(data.conversationId, null);
                }

                // If it's the active conversation, keep participants list fresh
                if (data.conversationId === activeConvoRef.current) {
                    setParticipants(data.participants);
                }
            });

            // ─── Friend request socket events ─────────────────────
            socket.on('new_friend_request', (data: any) => {
                console.log('[SocketInitializer] New friend request:', data);
                const senderName = data.request?.from?.displayName || 'Ai đó';
                toast.info(`📩 ${senderName} đã gửi lời mời kết bạn cho bạn!`, {
                    duration: 5000,
                });
                fetchFriendRequests();
            });

            socket.on('friend_request_accepted', (data: any) => {
                console.log('[SocketInitializer] Friend request accepted:', data);
                const friendName = data.newFriend?.displayName || 'Người dùng';
                toast.success(`🎉 ${friendName} đã chấp nhận lời mời kết bạn!`, {
                    duration: 5000,
                });
                fetchFriends();
                fetchFriendRequests();
            });

            socket.on('friend_request_declined', (data: any) => {
                console.log('[SocketInitializer] Friend request declined:', data);
                toast.info('Lời mời kết bạn của bạn đã bị từ chối');
                fetchFriendRequests();
            });

            socket.on('friend_request_cancelled', (data: any) => {
                console.log('[SocketInitializer] Friend request cancelled:', data);
                fetchFriendRequests();
            });

            socket.on('friend_removed', (data: any) => {
                console.log('[SocketInitializer] Friend removed:', data);
                toast.info('Một người bạn đã hủy kết bạn với bạn');
                fetchFriends();
            });

            socket.on('user_info_updated', (data: any) => {
                console.log('[SocketInitializer] User info updated:', data);
                if (data.userId) {
                    updateUserInfo(data.userId, {
                        avatarUrl: data.avatarUrl,
                        displayName: data.displayName,
                    });
                }
            });
            // If socket is already connected, join rooms immediately
            if (socket.connected) {
                handleConnect();
            }

            return () => {
                socket.off('connect', handleConnect);
                socket.off('online_users');
                socket.off('new_message');
                socket.off('conversation_updated');
                socket.off('conversation_created');
                socket.off('message_recalled');
                socket.off('group_active_call');
                socket.off('group_call_ended');
                socket.off('group_participants_updated');
                socket.off('new_friend_request');
                socket.off('friend_request_accepted');
                socket.off('friend_request_declined');
                socket.off('friend_request_cancelled');
                socket.off('friend_removed');
                socket.off('user_info_updated');
            };
        }
    }, [
        accessToken,
        user?._id,
        conversations.length,
        addOrUpdateConversation,
        addMessage,
        setOnlineUsers,
        updateConversationMeta,
        markConversationAsRead,
        updateMessageLocally,
        setAvailableGroupCall,
        setParticipants,
        fetchFriendRequests,
        fetchFriends,
        updateUserInfo,
    ]);

    // Dedicated effect for socket logout cleanup
    useEffect(() => {
        if (!accessToken || !user?._id) {
            disconnectSocket();
        }
    }, [accessToken, user?._id]);

    return null;
};

export default SocketInitializer;
