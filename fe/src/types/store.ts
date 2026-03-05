import type { User } from './user.ts';
import type { Conversation, Message } from './chat.ts';

export interface AuthState {
    accessToken: string | null;
    user: User | null;
    loading: boolean;
    language: 'vi' | 'en';
    setLanguage: (lang: 'vi' | 'en') => void;
    clearState: () => void;
    setAccessToken: (accessToken: string) => void;
    signUp: (
        username: string,
        password: string,
        email: string,
        firstName: string,
        lastName: string,
        phone?: string
    ) => Promise<void>;
    signIn: (identifier: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    fetchMe: () => Promise<void>;
    refresh: () => Promise<void>;
    updateDisplayName: (name: string) => Promise<void>;
    updateAvatar: (file: File) => Promise<void>;
    updateProfile: (data: { displayName?: string; bio?: string; phone?: string }) => Promise<void>;
}

export interface ChatState {
    conversations: Conversation[];
    messages: Record<string, { items: Message[]; hasMore: boolean; nextCursor: string | null }>;
    activeConversationId: string | null;
    friends: User[];
    friendRequests: { sent: any[]; received: any[] };
    blockedUsers: any[];
    onlineUsers: string[];
    loading: boolean;
    sidebarSearchQuery: string;
    typingUsers: Record<string, string[]>; // conversationId -> array of userIds

    reset: () => void;
    setSidebarSearchQuery: (query: string) => void;
    setActiveConversation: (id: string | null) => void;
    fetchConversations: () => Promise<void>;
    addOrUpdateConversation: (convo: Conversation) => void;
    updateConversationMeta: (conversationId: string, data: Partial<Conversation>) => void;
    markConversationAsRead: (conversationId: string) => Promise<void>;
    fetchFriends: () => Promise<void>;
    unfriend: (friendId: string) => Promise<void>;
    fetchFriendRequests: () => Promise<void>;
    sendFriendRequest: (username: string, message?: string) => Promise<void>;
    acceptFriendRequest: (requestId: string) => Promise<void>;
    declineFriendRequest: (requestId: string) => Promise<void>;
    cancelFriendRequest: (requestId: string) => Promise<void>;
    deleteConversation: (conversationId: string) => Promise<void>;
    kickMember: (conversationId: string, memberId: string) => Promise<void>;
    updateMemberRole: (
        conversationId: string,
        memberId: string,
        role: 'admin' | 'member'
    ) => Promise<void>;
    removeConversationLocally: (conversationId: string) => void;
    updateGroupProfileLocally: (
        conversationId: string,
        name: string,
        avatarUrl?: string | null
    ) => void;
    removeParticipantLocally: (conversationId: string, memberId: string) => void;
    updateParticipantRoleLocally: (
        conversationId: string,
        memberId: string,
        role: 'admin' | 'member'
    ) => void;
    fetchMessages: (conversationId: string) => Promise<void>;
    addMessage: (msg: Message) => void;
    appendMessage: (conversationId: string, message: Message) => void;
    fetchMoreMessages: (conversationId: string) => Promise<void>;
    sendMessage: (
        conversationId: string,
        content: string,
        type: 'direct' | 'group',
        recipientId?: string,
        files?: File[]
    ) => Promise<void>;
    updateMessageLocally: (
        conversationId: string,
        messageId: string,
        updateFn: (msg: Message) => Message
    ) => void;
    deleteMessageForMe: (conversationId: string, messageId: string) => Promise<void>;
    recallMessage: (conversationId: string, messageId: string) => Promise<void>;
    editMessage: (conversationId: string, messageId: string, content: string) => Promise<void>;
    markMessageRead: (messageId: string) => Promise<void>;
    setTypingStatus: (conversationId: string, userId: string, isTyping: boolean) => void;
    sendTypingStatus: (conversationId: string, isTyping: boolean) => void;
    setOnlineUsers: (userIds: string[]) => void;
    fetchBlockedUsers: () => Promise<void>;
    blockUser: (userId: string) => Promise<void>;
    unblockUser: (userId: string) => Promise<void>;
    updateUserInfo: (userId: string, data: { avatarUrl?: string; displayName?: string }) => void;
    setNickname: (conversationId: string, targetUserId: string, nickname: string | null) => void;
    updateNickname: (
        conversationId: string,
        targetUserId: string,
        nickname: string | null
    ) => Promise<void>;
}
