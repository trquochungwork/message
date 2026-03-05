import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import BlockedUser from '../models/BlockedUser.js';
import { updateConversationAftercreateMessage } from '../utils/messageHelper.js';
import { io } from '../server.js';
import { uploadToCloudinary } from '../libs/cloudinary.js';
import fs from 'fs';

export const sendDirectMessage = async (req, res) => {
    try {
        console.log('--- SendDirectMessage Start ---');

        const { recipientId, content, conversationId } = req.body;
        console.log(`Payload: conversationId=${conversationId}, recipientId=${recipientId}`);
        const senderId = req.user._id;
        const files = req.files || [];
        console.log(`Sender: ${senderId}, Recipient: ${recipientId}, Files: ${files.length}`);

        if (!content && files.length === 0) {
            console.log('Reject: No content and no files');
            return res.status(400).json({ message: 'Thiếu nội dung hoặc file' });
        }
        if (!recipientId) return res.status(400).json({ message: 'Thiếu recipientId' });

        // Kiểm tra block: nếu ai chặn ai thì không cho gửi
        const [senderBlocked, recipientBlocked] = await Promise.all([
            BlockedUser.exists({ blockerId: senderId, blockedId: recipientId }),
            BlockedUser.exists({ blockerId: recipientId, blockedId: senderId }),
        ]);
        if (senderBlocked) {
            return res
                .status(403)
                .json({ message: 'Bạn đã chặn người dùng này. Hãy bỏ chặn để nhắn tin.' });
        }
        if (recipientBlocked) {
            return res.status(403).json({ message: 'Bạn không thể nhắn tin cho người dùng này.' });
        }

        let conversation = null;

        if (conversationId) {
            conversation = await Conversation.findById(conversationId);
        }

        if (!conversation) {
            conversation = await Conversation.create({
                type: 'direct',
                participants: [
                    { userId: senderId, joinedAt: new Date() },
                    { userId: recipientId, joinedAt: new Date() },
                ],
                lastMessageAt: new Date(),
                unreadCounts: new Map(),
            });
        }

        console.log('Processing attachments...');
        const attachments = await Promise.all(
            files.map(async (f) => {
                console.log(`Uploading file: ${f.originalname} (${f.size} bytes)`);
                try {
                    const result = await uploadToCloudinary(f.path, f.originalname, f.mimetype);
                    const finalUrl = result.secure_url || result.url;
                    if (!finalUrl) throw new Error('Cloudinary returned success but no URL');

                    fs.unlink(f.path, (err) => {
                        if (err) console.error('Error deleting temp file:', err);
                    });

                    return {
                        url: finalUrl,
                        fileName: f.originalname,
                        mimeType: f.mimetype,
                        size: f.size,
                    };
                } catch (error) {
                    console.error('Cloudinary failed, using local fallback:', error.message);
                    // Đảm bảo URL local là chuỗi hợp lệ
                    const localUrl = `/uploads/${f.filename || 'placeholder'}`;
                    return {
                        url: localUrl,
                        fileName: f.originalname,
                        mimeType: f.mimetype,
                        size: f.size,
                    };
                }
            })
        );
        console.log('Attachments processed:', attachments.length);

        console.log('Creating message record...');

        // Xác định loại tin nhắn
        let messageType = 'text';
        if (attachments.length > 0) {
            const firstMime = attachments[0].mimeType;
            if (firstMime.startsWith('image/')) messageType = 'image';
            else if (firstMime.startsWith('video/')) messageType = 'video';
            else if (firstMime.startsWith('audio/')) messageType = 'audio';
            else messageType = 'file';
        }

        const messageData = {
            conversationId: conversation._id,
            senderId,
            content: content || null,
            attachments,
            messageType,
        };

        const message = new Message(messageData);
        try {
            await message.save();
        } catch (valErr) {
            console.error('CRITICAL: Message validation FAILED:', valErr.errors || valErr);
            throw valErr;
        }

        console.log('Message created SUCCESS:', message._id);

        // ... rest of the logic ...
        updateConversationAftercreateMessage(conversation, message, senderId);
        // Khi có tin nhắn mới, bỏ ẩn cho tất cả user đã "xóa" conversation
        conversation.deletedBy = [];
        await conversation.save();

        console.log('Broadcasting events...');
        //* Emit socket event tới tất cả trong conversation room
        io.to(`conv_${conversation._id}`).emit('new_message', {
            message: message.toObject(),
            conversationId: conversation._id.toString(),
        });

        //* Emit conversation update tới tất cả participants (refetch để có populate đầy đủ)
        const updatedConvo = await Conversation.findById(conversation._id)
            .populate({ path: 'participants.userId', select: 'displayName avatarUrl' })
            .populate({ path: 'lastMessage.senderId', select: 'displayName avatarUrl' });

        if (!updatedConvo) {
            console.log('Returning 201 (no updatedConvo)');
            return res.status(201).json({ message });
        }

        //* Gửi event tới từng user trong cuộc trò chuyện (đảm bảo real-time hơn cả conv_ room)
        updatedConvo.participants.forEach((p) => {
            if (p.userId?._id) {
                // Tin nhắn mới
                const entries = updatedConvo.unreadCounts
                    ? Array.from(updatedConvo.unreadCounts.entries())
                    : [];
                const formattedUnread = Object.fromEntries(
                    entries.map(([k, v]) => [k.toString(), v])
                );

                io.to(`user_${p.userId._id}`).emit('new_message', {
                    message: message.toObject(),
                    conversationId: conversation._id.toString(),
                    unreadCounts: formattedUnread,
                });
                // Cập nhật sidebar
                io.to(`user_${p.userId._id}`).emit('conversation_updated', {
                    conversationId: conversation._id.toString(),
                    lastMessage: updatedConvo.lastMessage,
                    lastMessageAt: updatedConvo.lastMessageAt,
                    unreadCounts: formattedUnread,
                });
            }
        });

        console.log('--- SendDirectMessage Done ---');
        return res.status(201).json({ message });
    } catch (error) {
        console.error('FATAL ERROR in SendDirectMessage:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
    }
};

export const sendGroupMessage = async (req, res) => {
    try {
        const { conversationId, content } = req.body;
        console.log(`--- SendGroupMessage Start --- convoId=${conversationId}`);
        const senderId = req.user._id;
        const conversation = req.conversation;
        const files = req.files || [];

        if (!content && files.length === 0)
            return res.status(400).json({ message: 'Thiếu nội dung hoặc file' });

        const attachments = await Promise.all(
            files.map(async (f) => {
                try {
                    const result = await uploadToCloudinary(f.path, f.originalname, f.mimetype);
                    const finalUrl = result.secure_url || result.url;
                    if (!finalUrl) throw new Error('Cloudinary returned success but no URL');

                    fs.unlink(f.path, () => {});

                    return {
                        url: finalUrl,
                        fileName: f.originalname,
                        mimeType: f.mimetype,
                        size: f.size,
                    };
                } catch (error) {
                    console.error('Lỗi upload Cloudinary (Group), dùng link local:', error);
                    const localUrl = `/uploads/${f.filename || 'placeholder'}`;
                    return {
                        url: localUrl,
                        fileName: f.originalname,
                        mimeType: f.mimetype,
                        size: f.size,
                    };
                }
            })
        );

        // Xác định loại tin nhắn
        let messageType = 'text';
        if (attachments.length > 0) {
            const firstMime = attachments[0].mimeType;
            if (firstMime.startsWith('audio/')) messageType = 'audio';
            else if (firstMime.startsWith('image/')) messageType = 'image';
            else if (firstMime.startsWith('video/')) messageType = 'video';
            else messageType = 'file';
        }

        const message = new Message({
            conversationId: conversationId.toString(), // Chắc chắn là string để Mongoose cast
            senderId,
            content: content || null,
            attachments,
            messageType,
        });

        try {
            await message.save();
        } catch (valErr) {
            console.error('CRITICAL: Group Message validation FAILED:', valErr.errors || valErr);
            throw valErr;
        }

        updateConversationAftercreateMessage(conversation, message, senderId);
        console.log(`Group lastMessage after update: ${conversation.lastMessage}`);
        // Khi có tin nhắn mới, bỏ ẩn cho tất cả user đã "xóa" conversation
        conversation.deletedBy = [];
        await conversation.save();
        console.log('Group conversation saved with new lastMessage');

        const entries = conversation.unreadCounts
            ? Array.from(conversation.unreadCounts.entries())
            : [];
        const formattedUnread = Object.fromEntries(entries.map(([k, v]) => [k.toString(), v]));

        //* Gửi event tới từng user trong group (đảm bảo real-time nhất)
        conversation.participants.forEach((p) => {
            const pid = p.userId?._id || p.userId;
            if (pid) {
                // Tin nhắn mới
                io.to(`user_${pid}`).emit('new_message', {
                    message: message.toObject(),
                    conversationId: conversation._id.toString(),
                    unreadCounts: formattedUnread,
                });

                // Cập nhật sidebar
                io.to(`user_${pid}`).emit('conversation_updated', {
                    conversationId: conversation._id.toString(),
                    lastMessage: conversation.lastMessage,
                    lastMessageAt: conversation.lastMessageAt,
                    unreadCounts: formattedUnread,
                });
            }
        });

        return res.status(201).json({ message });
    } catch (error) {
        console.error('Lỗi xảy ra khi gửi tin nhắn nhóm:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
    }
};

export const logCallMessage = async (req, res) => {
    try {
        const { recipientId, conversationId, callType, callStatus, callDuration } = req.body;
        const senderId = req.user._id;

        if (!conversationId && !recipientId) {
            return res.status(400).json({ message: 'Missing conversationId or recipientId' });
        }

        let conversation = null;

        if (conversationId) {
            conversation = await Conversation.findById(conversationId);
        } else if (recipientId) {
            // Tìm conversation direct
            conversation = await Conversation.findOne({
                type: 'direct',
                'participants.userId': { $all: [senderId, recipientId] },
            });

            // Nếu chưa có đoạn chat thì tạo mới
            if (!conversation) {
                conversation = await Conversation.create({
                    type: 'direct',
                    participants: [
                        { userId: senderId, joinedAt: new Date() },
                        { userId: recipientId, joinedAt: new Date() },
                    ],
                    lastMessageAt: new Date(),
                    unreadCounts: new Map(),
                });
            }
        }

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        let defaultText = '';
        if (callStatus === 'missed') defaultText = 'Cuộc gọi nhỡ';
        if (callStatus === 'rejected') defaultText = 'Đã từ chối cuộc gọi';
        if (callStatus === 'ended') defaultText = 'Cuộc gọi thoại';

        const message = await Message.create({
            conversationId: conversation._id,
            senderId,
            content: defaultText,
            messageType: 'call',
            callInfo: {
                status: callStatus,
                duration: callDuration || 0,
                callType: callType,
            },
        });

        const senderString = senderId.toString();
        const msgJson = message.toJSON();

        // Populate displayName/AvatarUrl for real-time frontend compatibility if needed
        await message.populate('senderId', 'displayName avatarUrl');

        const populatedMsg = {
            ...msgJson,
            conversationId: msgJson.conversationId?.toString() || conversation._id.toString(),
            senderId: senderString,
            sender: message.senderId, // Attached sender info
        };

        // Realtime sync via socket
        updateConversationAftercreateMessage(conversation, message, senderId);
        conversation.deletedBy = [];
        await conversation.save();

        const updatedConvo = await Conversation.findById(conversation._id)
            .populate({ path: 'participants.userId', select: 'displayName avatarUrl' })
            .populate({ path: 'lastMessage.senderId', select: 'displayName avatarUrl' });

        const payloadNewMessage = {
            message: populatedMsg,
            conversationId: conversation._id.toString(),
        };

        const payloadUpdatedConvo = {
            conversationId: conversation._id.toString(),
            lastMessage: updatedConvo.lastMessage,
            lastMessageAt: updatedConvo.lastMessageAt,
            unreadCounts: Object.fromEntries(updatedConvo.unreadCounts || new Map()),
        };

        // Notify ALL participants in their personal rooms (most reliable)
        updatedConvo.participants.forEach((p) => {
            const pid = p.userId?._id || p.userId;
            if (pid) {
                const pidStr = pid.toString();
                // We exclude unreadCounts if we want to be exact, but SocketInitializer handles it
                io.to(`user_${pidStr}`).emit('new_message', {
                    ...payloadNewMessage,
                    unreadCounts: payloadUpdatedConvo.unreadCounts,
                });
                io.to(`user_${pidStr}`).emit('conversation_updated', payloadUpdatedConvo);
            }
        });

        // Also emit to the conversation room as a fallback
        io.to(`conv_${conversation._id}`).emit('new_message', payloadNewMessage);
        io.to(`conv_${conversation._id}`).emit('conversation_updated', payloadUpdatedConvo);

        return res.status(201).json({ message: populatedMsg });
    } catch (error) {
        console.error('Lỗi xảy ra khi lưu lịch sử cuộc gọi:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
    }
};

export const deleteMessageForMe = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });

        if (!message.deletedFor.includes(userId)) {
            message.deletedFor.push(userId);
            await message.save();
        }

        io.to(`user_${userId}`).emit('message_deleted_for_me', {
            messageId,
            conversationId: message.conversationId,
        });

        return res.status(200).json({ message: 'Xóa tin nhắn thành công (chỉ với bạn)' });
    } catch (error) {
        console.error('Lỗi xóa tin nhắn cho mình:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
    }
};

export const recallMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });

        const conversation = await Conversation.findById(message.conversationId);
        if (!conversation)
            return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });

        const myParticipant = conversation.participants.find(
            (p) => p.userId.toString() === userId.toString()
        );
        const isMyMessage = message.senderId.toString() === userId.toString();

        let canRecall = false;
        if (isMyMessage) {
            canRecall = true;
        } else if (conversation.type === 'group' && myParticipant) {
            if (myParticipant.role === 'owner' || myParticipant.role === 'admin') {
                canRecall = true;
            }
        }

        if (!canRecall) {
            return res.status(403).json({ message: 'Bạn không có quyền thu hồi tin nhắn này' });
        }

        // ── Kiểm tra thời gian: chỉ thu hồi trong ngày gửi (giờ VN) ──
        const VN_TZ = 'Asia/Ho_Chi_Minh';
        const toDateKey = (date) =>
            new Intl.DateTimeFormat('en-CA', {
                timeZone: VN_TZ,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(date);

        const sentDateKey = toDateKey(new Date(message.createdAt));
        const todayKey = toDateKey(new Date());

        if (sentDateKey !== todayKey) {
            return res.status(400).json({
                message: 'Chỉ có thể thu hồi tin nhắn trong ngày gửi',
            });
        }

        message.isRecalled = true;
        message.content = 'Tin nhắn đã thu hồi';
        message.attachments = [];
        // Chuyển loại tin nhắn về text vì content bây giờ là chữ báo thu hồi
        message.messageType = 'text';
        await message.save();

        if (conversation) {
            // Nếu là message cuối cùng thì update lastMessage trong conversation để sidebar cập nhật nội dung mới
            const lastMsgId =
                conversation.lastMessage?._id?.toString() || conversation.lastMessage?.toString();
            if (lastMsgId === messageId) {
                conversation.lastMessage = {
                    _id: message._id.toString(),
                    content: 'Tin nhắn đã thu hồi',
                    senderId: message.senderId,
                    createdAt: message.createdAt,
                };
                await conversation.save();
            }

            conversation.participants.forEach((p) => {
                const pid = p.userId?._id || p.userId;
                if (pid) {
                    io.to(`user_${pid}`).emit('message_recalled', {
                        messageId,
                        conversationId: conversation._id.toString(),
                    });
                }
            });
            io.to(`conv_${conversation._id}`).emit('message_recalled', {
                messageId,
                conversationId: conversation._id.toString(),
            });
        }

        return res.status(200).json({ message: 'Thu hồi tin nhắn thành công' });
    } catch (error) {
        console.error('Lỗi thu hồi tin nhắn:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
    }
};

export const markMessageRead = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });

        if (!message.seenBy.includes(userId)) {
            message.seenBy.push(userId);
            if (!message.readAt) message.readAt = new Date();
            await message.save();

            // Emit tới sender là đã đọc
            io.to(`user_${message.senderId}`).emit('message_read', {
                messageId,
                conversationId: message.conversationId,
                readBy: userId,
                readAt: message.readAt,
            });
        }

        return res.status(200).json({ message: 'Đã đánh dấu đã đọc' });
    } catch (error) {
        console.error('Lỗi đánh dấu đã đọc:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
    }
};

export const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        if (!content) return res.status(400).json({ message: 'Nội dung không được để trống' });

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền sửa tin nhắn này' });
        }

        if (message.isRecalled) {
            return res.status(400).json({ message: 'Không thể sửa tin nhắn đã thu hồi' });
        }

        message.content = content;
        message.editedAt = new Date();
        await message.save();

        const conversation = await Conversation.findById(message.conversationId);
        if (conversation) {
            // Cập nhật lastMessage nếu cần
            if (conversation.lastMessage && conversation.lastMessage._id.toString() === messageId) {
                conversation.lastMessage.content = content;
                await conversation.save();
            }

            // Gửi socket event tới mọi người trong conversation
            io.to(`conv_${conversation._id}`).emit('message_edited', {
                messageId,
                conversationId: conversation._id,
                content,
                editedAt: message.editedAt,
            });

            // Gửi tới user private rooms để chắc chắn sync UI
            conversation.participants.forEach((p) => {
                const pid = p.userId?._id || p.userId;
                if (pid) {
                    io.to(`user_${pid}`).emit('message_edited', {
                        messageId,
                        conversationId: conversation._id,
                        content,
                        editedAt: message.editedAt,
                    });
                }
            });
        }

        return res
            .status(200)
            .json({ message: 'Sửa tin nhắn thành công', editedAt: message.editedAt });
    } catch (error) {
        console.error('Lỗi sửa tin nhắn:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
    }
};
