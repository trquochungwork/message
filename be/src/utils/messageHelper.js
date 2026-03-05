export const updateConversationAftercreateMessage = (conversation, message, senderId) => {
    try {
        const time = message?.createdAt || new Date();
        const attachments = message?.attachments || [];
        const content = message?.content || (attachments.length > 0 ? '📎 Đã gửi file' : null);

        // Cập nhật từng trường một cách trực tiếp thay vì set() để tránh các vấn đề về casting / validation phức tạp của Mongoose Map
        conversation.seenBy = [];
        conversation.lastMessageAt = time;
        conversation.lastMessage = {
            _id: message?._id?.toString(),
            content,
            senderId: senderId,
            createdAt: time,
        };

        if (conversation.participants && Array.isArray(conversation.participants)) {
            // Đảm bảo unreadCounts là Map (Mongoose Map)
            if (!conversation.unreadCounts || typeof conversation.unreadCounts.set !== 'function') {
                conversation.unreadCounts = new Map();
            }

            conversation.participants.forEach((p) => {
                if (p.userId) {
                    const memberId = p.userId.toString();
                    const senderIdStr = senderId.toString();
                    const isSender = memberId === senderIdStr;

                    const prevCount = conversation.unreadCounts.get(memberId) || 0;
                    conversation.unreadCounts.set(memberId, isSender ? 0 : prevCount + 1);
                }
            });
        }
    } catch (error) {
        console.error('Lỗi trong updateConversationAftercreateMessage:', error);
    }
};
