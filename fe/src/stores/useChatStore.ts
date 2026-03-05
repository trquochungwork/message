import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatState } from '../types/store.ts';
import { chatService } from '../services/chatSevice.ts';
import { getSocket } from '../services/socketService.ts';
import { toast } from 'sonner';
import type { Conversation, Message } from '../types/chat.ts';

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            conversations: [],
            messages: {},
            activeConversationId: null,
            friends: [],
            friendRequests: { sent: [], received: [] },
            blockedUsers: [],
            onlineUsers: [],
            loading: false,
            sidebarSearchQuery: '',
            typingUsers: {},

            // ── Conversations ──────────────────────────────────────
            reset: () => {
                set({
                    conversations: [],
                    messages: {},
                    activeConversationId: null,
                    friends: [],
                    friendRequests: { sent: [], received: [] },
                    blockedUsers: [],
                    onlineUsers: [],
                    loading: false,
                    typingUsers: {},
                });
            },

            setSidebarSearchQuery: (query) => set({ sidebarSearchQuery: query }),

            setActiveConversation: (id) => {
                set({ activeConversationId: id });
                if (id) {
                    // Auto load messages nếu chưa có
                    const { messages, fetchMessages, markConversationAsRead } = get();
                    if (!messages[id]) {
                        fetchMessages(id);
                    }
                    markConversationAsRead(id);
                }
            },

            fetchConversations: async () => {
                try {
                    set({ loading: true });
                    const { conversations } = await chatService.fetchConversations();
                    set({ conversations, loading: false });
                } catch (error) {
                    console.error('Lỗi xảy ra khi fetchConversations', error);
                    set({ loading: false });
                }
            },

            addOrUpdateConversation: (convo: Conversation) => {
                set((state) => {
                    // Xóa convo cũ nếu có (tránh duplicate) rồi push mới lên đầu
                    const otherConvos = state.conversations.filter((c) => c._id !== convo._id);
                    return { conversations: [convo, ...otherConvos] };
                });
            },

            updateConversationMeta: (conversationId, data) => {
                set((state) => {
                    // Nếu đang ở trong conversation này thì force unreadCounts = {}
                    const finalData =
                        state.activeConversationId === conversationId
                            ? { ...data, unreadCounts: {} }
                            : data;

                    return {
                        conversations: state.conversations
                            .map((c) => (c._id === conversationId ? { ...c, ...finalData } : c))
                            .sort(
                                (a, b) =>
                                    new Date(b?.lastMessageAt || 0).getTime() -
                                    new Date(a?.lastMessageAt || 0).getTime()
                            ),
                    };
                });
            },

            markConversationAsRead: async (conversationId: string) => {
                try {
                    await chatService.markAsRead(conversationId);
                    // Reset unread count locally
                    const { conversations } = get();
                    const convo = conversations.find((c) => c._id === conversationId);
                    if (convo) {
                        // We'll reset unread for current user - don't know userId here
                        // The store will be updated via socket or next fetch
                        set((state) => ({
                            conversations: state.conversations.map((c) =>
                                c._id === conversationId ? { ...c, unreadCounts: {} } : c
                            ),
                        }));
                    }
                } catch (error) {
                    console.error('Lỗi markConversationAsRead', error);
                }
            },

            updateGroupProfileLocally: (
                conversationId: string,
                name: string,
                avatarUrl?: string | null
            ) => {
                set((state) => ({
                    conversations: state.conversations.map((c) => {
                        if (c._id === conversationId && c.type === 'group') {
                            return {
                                ...c,
                                group: {
                                    ...c.group,
                                    name,
                                    avatarUrl: avatarUrl || c.group.avatarUrl,
                                },
                            };
                        }
                        return c;
                    }),
                }));
            },

            updateGroupProfile: async (conversationId: string, name: string, avatarFile?: File) => {
                if (get().loading) return;
                try {
                    set({ loading: true });
                    const data = await chatService.updateGroupProfile(
                        conversationId,
                        name,
                        avatarFile
                    );
                    get().updateGroupProfileLocally(conversationId, data.groupName, data.avatarUrl);
                    toast.success('Cập nhật thông tin nhóm thành công');
                } catch (error) {
                    console.error('Lỗi updateGroupProfile', error);
                    toast.error('Cập nhật thất bại');
                    throw error;
                } finally {
                    set({ loading: false });
                }
            },

            deleteConversation: async (conversationId: string) => {
                try {
                    await chatService.deleteConversation(conversationId);
                    set((state) => ({
                        conversations: state.conversations.filter((c) => c._id !== conversationId),
                        activeConversationId:
                            state.activeConversationId === conversationId
                                ? null
                                : state.activeConversationId,
                        messages: Object.fromEntries(
                            Object.entries(state.messages).filter(([k]) => k !== conversationId)
                        ),
                    }));
                    toast.success('Đã xóa cuộc trò chuyện');
                } catch (error) {
                    console.error('Failed to delete conv:', error);
                    toast.error('Xoá cuộc trò chuyện thất bại');
                }
            },

            kickMember: async (conversationId: string, memberId: string) => {
                set({ loading: true });
                try {
                    await chatService.kickMember(conversationId, memberId);
                    toast.success('Đã kick thành viên');
                } catch (error: any) {
                    toast.error(error?.response?.data?.message || 'Lỗi kick thành viên');
                    throw error;
                } finally {
                    set({ loading: false });
                }
            },

            updateMemberRole: async (
                conversationId: string,
                memberId: string,
                role: 'admin' | 'member'
            ) => {
                set({ loading: true });
                try {
                    await chatService.updateMemberRole(conversationId, memberId, role);
                    toast.success('Đã cập nhật quyền');
                } catch (error: any) {
                    toast.error(error?.response?.data?.message || 'Lỗi cập nhật quyền');
                    throw error;
                } finally {
                    set({ loading: false });
                }
            },

            removeConversationLocally: (conversationId: string) => {
                set((state) => ({
                    conversations: state.conversations.filter((c) => c._id !== conversationId),
                    activeConversationId:
                        state.activeConversationId === conversationId
                            ? null
                            : state.activeConversationId,
                    messages: Object.fromEntries(
                        Object.entries(state.messages).filter(([k]) => k !== conversationId)
                    ),
                }));
            },

            removeParticipantLocally: (conversationId: string, memberId: string) => {
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c._id === conversationId
                            ? {
                                  ...c,
                                  participants: c.participants.filter((p) => p._id !== memberId),
                              }
                            : c
                    ),
                }));
            },

            updateParticipantRoleLocally: (
                conversationId: string,
                memberId: string,
                role: 'admin' | 'member'
            ) => {
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c._id === conversationId
                            ? {
                                  ...c,
                                  participants: c.participants.map((p) =>
                                      p._id === memberId ? { ...p, role } : p
                                  ),
                              }
                            : c
                    ),
                }));
            },

            // ── Messages ───────────────────────────────────────────
            fetchMessages: async (conversationId: string) => {
                try {
                    set({ loading: true });
                    const { messages, nextCursor } =
                        await chatService.fetchMessages(conversationId);
                    set((state) => ({
                        messages: {
                            ...state.messages,
                            [conversationId]: {
                                items: messages,
                                hasMore: nextCursor !== null,
                                nextCursor,
                            },
                        },
                        loading: false,
                    }));
                } catch (error) {
                    console.error('Lỗi fetchMessages', error);
                    set({ loading: false });
                }
            },

            addMessage: (msg: Message) => {
                const { conversationId } = msg;
                set((state) => {
                    const convoMessages = state.messages[conversationId] || {
                        items: [],
                        hasMore: false,
                        nextCursor: null,
                    };
                    // Tránh duplicate
                    if (convoMessages.items.find((m) => m._id === msg._id)) return state;

                    return {
                        messages: {
                            ...state.messages,
                            [conversationId]: {
                                ...convoMessages,
                                items: [...convoMessages.items, msg],
                            },
                        },
                    };
                });
            },

            fetchMoreMessages: async (conversationId: string) => {
                const { messages } = get();
                const current = messages[conversationId];
                if (!current || !current.hasMore || !current.nextCursor) return;
                try {
                    const { messages: older, nextCursor } = await chatService.fetchMessages(
                        conversationId,
                        50,
                        current.nextCursor
                    );
                    set((state) => ({
                        messages: {
                            ...state.messages,
                            [conversationId]: {
                                items: [...older, ...state.messages[conversationId].items],
                                hasMore: nextCursor !== null,
                                nextCursor,
                            },
                        },
                    }));
                } catch (error) {
                    console.error('Lỗi fetchMoreMessages', error);
                }
            },

            appendMessage: (conversationId: string, message: Message) => {
                set((state) => {
                    const current = state.messages[conversationId];
                    // Tránh duplicate
                    if (current?.items.some((m) => m._id === message._id)) return state;
                    return {
                        messages: {
                            ...state.messages,
                            [conversationId]: {
                                ...(current ?? { hasMore: false, nextCursor: null }),
                                items: [...(current?.items ?? []), message],
                            },
                        },
                    };
                });
            },

            sendMessage: async (conversationId, content, type, recipientId, files) => {
                try {
                    let message: Message;
                    if (type === 'direct' && recipientId) {
                        message = await chatService.sendDirectMessage(
                            recipientId,
                            content,
                            conversationId,
                            files
                        );
                    } else {
                        message = await chatService.sendGroupMessage(
                            conversationId,
                            content,
                            files
                        );
                    }
                    // Socket sẽ broadcast lại, nhưng append ngay để UX nhanh hơn
                    get().appendMessage(conversationId, message);
                } catch (error: any) {
                    console.error('Lỗi sendMessage detail:', error.response?.data || error);
                    const errorMsg =
                        error.response?.data?.message || 'Gửi tin nhắn thất bại. Vui lòng thử lại!';
                    toast.error(errorMsg);
                }
            },

            updateMessageLocally: (conversationId, messageId, updateFn) => {
                set((state) => {
                    const current = state.messages[conversationId];
                    if (!current) return state;
                    const items = current.items.map((msg) =>
                        msg._id === messageId ? updateFn(msg) : msg
                    );
                    return {
                        messages: {
                            ...state.messages,
                            [conversationId]: { ...current, items },
                        },
                    };
                });
            },

            deleteMessageForMe: async (conversationId, messageId) => {
                try {
                    await chatService.deleteMessageForMe(messageId);
                    set((state) => {
                        const current = state.messages[conversationId];
                        if (!current) return state;
                        return {
                            messages: {
                                ...state.messages,
                                [conversationId]: {
                                    ...current,
                                    items: current.items.filter((msg) => msg._id !== messageId),
                                },
                            },
                        };
                    });
                    toast.success('Đã xóa tin nhắn', { id: `del-me-${messageId}` });
                } catch (error) {
                    toast.error('Gặp lỗi khi xóa tin nhắn');
                }
            },

            recallMessage: async (conversationId, messageId) => {
                try {
                    await chatService.recallMessage(messageId);
                    get().updateMessageLocally(conversationId, messageId, (msg) => ({
                        ...msg,
                        isRecalled: true,
                        content: 'Tin nhắn đã thu hồi',
                        attachments: [],
                    }));
                    toast.success('Đã thu hồi tin nhắn', { id: `recall-${messageId}` });
                } catch (error: any) {
                    const msg = error.response?.data?.message || 'Gặp lỗi khi thu hồi tin nhắn';
                    toast.error(msg);
                }
            },

            editMessage: async (conversationId, messageId, content) => {
                try {
                    const { editedAt } = await chatService.editMessage(messageId, content);
                    get().updateMessageLocally(conversationId, messageId, (msg) => ({
                        ...msg,
                        content,
                        editedAt,
                    }));
                } catch (error: any) {
                    const msg = error.response?.data?.message || 'Gặp lỗi khi sửa tin nhắn';
                    toast.error(msg);
                    throw error;
                }
            },

            markMessageRead: async (messageId) => {
                try {
                    await chatService.markMessageRead(messageId);
                    // Update locally logic if needed, but usually handled by socket
                } catch (error) {
                    console.error('Lỗi markMessageRead', error);
                }
            },

            setTypingStatus: (conversationId, userId, isTyping) => {
                set((state) => {
                    const currentTyping = state.typingUsers[conversationId] || [];
                    let nextTyping: string[];

                    if (isTyping) {
                        if (currentTyping.includes(userId)) return state;
                        nextTyping = [...currentTyping, userId];
                    } else {
                        nextTyping = currentTyping.filter((id) => id !== userId);
                    }

                    return {
                        typingUsers: {
                            ...state.typingUsers,
                            [conversationId]: nextTyping,
                        },
                    };
                });
            },

            sendTypingStatus: (conversationId, isTyping) => {
                const socket = getSocket();
                if (socket?.connected) {
                    socket.emit('typing', { conversationId, isTyping });
                }
            },

            // ── Friends ────────────────────────────────────────────
            fetchFriends: async () => {
                try {
                    const { friends } = await chatService.getFriends();
                    // Loại bỏ duplicate nếu có từ server (tránh lỗi key React)
                    const uniqueFriends = Array.from(
                        new Map((friends ?? []).map((f: any) => [f._id, f])).values()
                    );
                    set({ friends: uniqueFriends });
                } catch (error) {
                    console.error('Lỗi fetchFriends', error);
                }
            },

            fetchFriendRequests: async () => {
                try {
                    const data = await chatService.getFriendRequests();
                    set({ friendRequests: data });
                } catch (error) {
                    console.error('Lỗi fetchFriendRequests', error);
                }
            },

            sendFriendRequest: async (to: string, message?: string) => {
                try {
                    await chatService.sendFriendRequest(to, message);
                    toast.success('Đã gửi lời mời kết bạn!');
                    get().fetchFriendRequests();
                } catch (error: unknown) {
                    const errMsg =
                        (error as { response?: { data?: { message?: string } } })?.response?.data
                            ?.message ?? 'Lỗi khi gửi lời mời kết bạn';
                    toast.error(errMsg);
                }
            },

            acceptFriendRequest: async (requestId: string) => {
                try {
                    await chatService.acceptFriendRequest(requestId);
                    toast.success('Đã chấp nhận lời mời kết bạn!');
                    await get().fetchFriends();
                    await get().fetchFriendRequests();
                } catch (error) {
                    toast.error('Lỗi khi chấp nhận lời mời');
                    console.error(error);
                }
            },

            declineFriendRequest: async (requestId: string) => {
                try {
                    await chatService.declineFriendRequest(requestId);
                    toast.success('Đã từ chối lời mời kết bạn');
                    get().fetchFriendRequests();
                } catch (error) {
                    toast.error('Lỗi khi từ chối lời mời');
                    console.error(error);
                }
            },

            cancelFriendRequest: async (requestId: string) => {
                try {
                    await chatService.cancelFriendRequest(requestId);
                    toast.success('Đã hủy lời mời kết bạn');
                    get().fetchFriendRequests();
                } catch (error) {
                    toast.error('Lỗi khi hủy lời mời kết bạn');
                    console.error(error);
                }
            },

            unfriend: async (friendId: string) => {
                try {
                    await chatService.unfriend(friendId);
                    toast.success('Đã hủy kết bạn');
                    await get().fetchFriends();
                } catch (error) {
                    toast.error('Lỗi khi hủy kết bạn');
                    console.error(error);
                }
            },

            // ── Online users ───────────────────────────────────────
            setOnlineUsers: (userIds: string[]) => {
                set({ onlineUsers: userIds });
            },

            // ── Block / Unblock ──────────────────────────────────────
            fetchBlockedUsers: async () => {
                try {
                    const { blocked } = await chatService.getBlockedUsers();
                    set({ blockedUsers: blocked.map((b) => b.blockedId) ?? [] });
                } catch (error) {
                    console.error('Lỗi fetchBlockedUsers', error);
                }
            },

            blockUser: async (userId: string) => {
                try {
                    await chatService.blockUser(userId);
                    toast.success('Đã chặn người dùng');
                    get().fetchBlockedUsers();
                } catch (error) {
                    console.error('Lỗi blockUser', error);
                    toast.error('Không thể chặn người dùng');
                }
            },

            unblockUser: async (userId: string) => {
                try {
                    await chatService.unblockUser(userId);
                    toast.success('Đã bỏ chặn người dùng');
                    get().fetchBlockedUsers();
                } catch (error) {
                    console.error('Lỗi unblockUser', error);
                    toast.error('Không thể bỏ chặn');
                }
            },

            updateUserInfo: (
                userId: string,
                data: { avatarUrl?: string; displayName?: string }
            ) => {
                set((state) => ({
                    conversations: state.conversations.map((c) => ({
                        ...c,
                        participants: c.participants.map((p: any) => {
                            const pId = p._id || p.userId?._id || p.userId;
                            if (pId === userId) {
                                return { ...p, ...data };
                            }
                            return p;
                        }),
                        lastMessage:
                            c.lastMessage?.sender?._id === userId
                                ? {
                                      ...c.lastMessage,
                                      sender: { ...c.lastMessage.sender, ...data },
                                  }
                                : c.lastMessage,
                    })),
                    friends: state.friends.map((f) => (f._id === userId ? { ...f, ...data } : f)),
                }));
            },

            setNickname: (conversationId, targetUserId, nickname) => {
                set((state) => ({
                    conversations: state.conversations.map((c) => {
                        if (c._id === conversationId) {
                            return {
                                ...c,
                                participants: c.participants.map((p: any) => {
                                    const pId = p.userId?._id || p.userId || p._id;
                                    if (pId === targetUserId) {
                                        return { ...p, nickname };
                                    }
                                    return p;
                                }),
                            };
                        }
                        return c;
                    }),
                }));
            },

            updateNickname: async (conversationId, targetUserId, nickname) => {
                if (get().loading) return;

                // Tránh lỗi gọi lặp vô hạn nếu vì lý do nào đó component render loop
                const now = Date.now();
                const lastUpdated = (get() as any)._lastNicknameUpdate || 0;
                if (now - lastUpdated < 1500) {
                    console.log('Skipping duplicate nickname request');
                    return;
                }

                try {
                    set({ loading: true, _lastNicknameUpdate: now } as any);
                    await chatService.updateNickname(conversationId, targetUserId, nickname);
                    get().setNickname(conversationId, targetUserId, nickname);
                    toast.success('Cập nhật biệt danh thành công', {
                        id: `nickname-${conversationId}`,
                    }); // Dùng id để không bị hiện đè nhiều thông báo
                } catch (error) {
                    console.error('Lỗi updateNickname', error);
                    toast.error('Cập nhật biệt danh thất bại', {
                        id: `nickname-err-${conversationId}`,
                    });
                } finally {
                    set({ loading: false });
                }
            },
        }),
        {
            name: 'chat-storage',
            partialize: (state) => ({
                conversations: state.conversations,
            }),
        }
    )
);
