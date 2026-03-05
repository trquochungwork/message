import api from '../lib/axios';
import type { ConversationResponse, Message } from '../types/chat';
import type { Friend, FriendRequest, User } from '../types/user';

export const chatService = {
    // ─── Conversations ───────────────────────────────
    async fetchConversations(): Promise<ConversationResponse> {
        const res = await api.get<ConversationResponse>('/conversations');
        return res.data;
    },

    async createConversation(type: 'direct' | 'group', memberIds: string[], name?: string) {
        // Với direct: gửi thêm recipientId để checkFrendship middleware dùng đúng nhánh
        const body =
            type === 'direct'
                ? { type, recipientId: memberIds[0], memberIds }
                : { type, memberIds, name };
        const res = await api.post('/conversations', body);
        return res.data.conversation;
    },

    async addMemberToGroup(conversationId: string, memberIds: string[]) {
        const res = await api.post(`/conversations/${conversationId}/members`, { memberIds });
        return res.data;
    },

    async updateGroupProfile(conversationId: string, name?: string, avatarFile?: File) {
        const formData = new FormData();
        if (name) formData.append('name', name);
        if (avatarFile) formData.append('avatar', avatarFile);

        const res = await api.put(`/conversations/${conversationId}/group-profile`, formData);
        return res.data;
    },

    async kickMember(conversationId: string, memberId: string) {
        const res = await api.delete(`/conversations/${conversationId}/members/${memberId}`);
        return res.data;
    },

    async updateMemberRole(conversationId: string, memberId: string, role: 'admin' | 'member') {
        const res = await api.put(`/conversations/${conversationId}/members/${memberId}/role`, {
            role,
        });
        return res.data;
    },

    async markAsRead(conversationId: string) {
        await api.post(`/conversations/${conversationId}/read`);
    },

    async deleteConversation(conversationId: string) {
        await api.delete(`/conversations/${conversationId}`);
    },

    async updateNickname(conversationId: string, targetUserId: string, nickname: string | null) {
        const res = await api.put(`/conversations/${conversationId}/nickname`, {
            targetUserId,
            nickname,
        });
        return res.data;
    },

    // ─── Messages ─────────────────────────────────────
    async fetchMessages(
        conversationId: string,
        limit = 50,
        cursor?: string | null
    ): Promise<{ messages: Message[]; nextCursor: string | null }> {
        const params: Record<string, string | number> = { limit };
        if (cursor) params.cursor = cursor;
        const res = await api.get(`/conversations/${conversationId}/messages`, { params });
        return res.data;
    },

    async sendDirectMessage(
        recipientId: string,
        content: string,
        conversationId?: string,
        files?: File[]
    ) {
        const formData = new FormData();
        formData.append('recipientId', recipientId);
        if (content) formData.append('content', content);
        if (conversationId) formData.append('conversationId', conversationId);
        if (files) {
            files.forEach((f) => formData.append('files', f));
        }
        const res = await api.post('/messages/direct', formData);
        return res.data.message as Message;
    },

    async sendGroupMessage(conversationId: string, content: string, files?: File[]) {
        const formData = new FormData();
        formData.append('conversationId', conversationId);
        if (content) formData.append('content', content);
        if (files) {
            files.forEach((f) => formData.append('files', f));
        }
        const res = await api.post('/messages/group', formData);
        return res.data.message as Message;
    },

    async deleteMessageForMe(messageId: string) {
        const res = await api.delete(`/messages/${messageId}/me`);
        return res.data;
    },

    async recallMessage(messageId: string) {
        const res = await api.delete(`/messages/${messageId}/everyone`);
        return res.data;
    },

    async markMessageRead(messageId: string) {
        await api.patch(`/messages/${messageId}/read`);
    },

    async editMessage(messageId: string, content: string) {
        const res = await api.patch(`/messages/${messageId}/edit`, { content });
        return res.data;
    },

    // ─── Friends ──────────────────────────────────────
    async getFriends(): Promise<{ friends: Friend[] }> {
        const res = await api.get('/friends');
        return res.data;
    },

    async getFriendRequests(): Promise<{ sent: FriendRequest[]; received: FriendRequest[] }> {
        const res = await api.get('/friends/requests');
        return res.data;
    },

    async sendFriendRequest(to: string, message?: string) {
        const res = await api.post('/friends/requests', { to, message });
        return res.data;
    },

    async acceptFriendRequest(requestId: string) {
        const res = await api.post(`/friends/requests/${requestId}/accept`);
        return res.data;
    },

    async declineFriendRequest(requestId: string) {
        const res = await api.post(`/friends/requests/${requestId}/decline`);
        return res.data;
    },

    async cancelFriendRequest(requestId: string) {
        const res = await api.delete(`/friends/requests/${requestId}`);
        return res.data;
    },

    // ─── Users ────────────────────────────────────────
    async searchUsers(q: string): Promise<{ users: User[] }> {
        const res = await api.get('/users/search', { params: { q } });
        return res.data;
    },

    async unfriend(friendId: string) {
        const res = await api.delete(`/friends/${friendId}`);
        return res.data;
    },

    // ─── Block / Unblock ──────────────────────────────
    async blockUser(blockedId: string) {
        const res = await api.post('/blocks', { blockedId });
        return res.data;
    },

    async unblockUser(blockedId: string) {
        const res = await api.delete(`/blocks/${blockedId}`);
        return res.data;
    },

    async getBlockedUsers(): Promise<{ blocked: any[] }> {
        const res = await api.get('/blocks');
        return res.data;
    },

    async checkBlockStatus(
        userId: string
    ): Promise<{ iBlockedThem: boolean; theyBlockedMe: boolean }> {
        const res = await api.get(`/blocks/${userId}/status`);
        return res.data;
    },
};
export const logCallHistory = async (data: {
    recipientId?: string;
    conversationId?: string | null;
    callType: 'audio' | 'video';
    callStatus: 'missed' | 'ended' | 'rejected' | 'busy';
    callDuration: number;
}) => {
    const res = await api.post('/messages/call-log', data);
    return res.data;
};
