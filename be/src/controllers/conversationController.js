import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { io } from '../server.js';
import { uploadToCloudinary } from '../libs/cloudinary.js';
import fs from 'fs';

export const creatConversation = async (req, res) => {
    try {
        const { type, name, memberIds } = req.body;
        const userId = req.user._id;
        if (
            !type ||
            (type === 'group' && !name) ||
            !memberIds ||
            !Array.isArray(memberIds) ||
            memberIds.length === 0
        ) {
            return res.status(400).json({ message: 'Tên nhóm và danh sách thành viên bắt buộc' });
        }
        let conversation;
        if (type === 'direct') {
            const participantId = memberIds[0];
            conversation = await Conversation.findOne({
                type: 'direct',
                'participants.userId': { $all: [userId, participantId] },
            });
            if (!conversation) {
                conversation = new Conversation({
                    type: 'direct',
                    participants: [{ userId }, { userId: participantId }],
                    lastMessageAt: new Date(),
                });
                await conversation.save();
            }
        }
        if (type === 'group') {
            conversation = new Conversation({
                type: 'group',
                participants: [
                    { userId, role: 'owner' },
                    ...memberIds.map((id) => ({ userId: id, role: 'member' })),
                ],
                group: {
                    name,
                    createdBy: userId,
                },
                lastMessageAt: new Date(),
            });
            await conversation.save();
        }
        if (!conversation) {
            return res.status(400).json({ message: 'Conversation type không hợp lệ' });
        }
        await conversation.populate([
            { path: 'participants.userId', select: 'displayName avatarUrl' },
            { path: 'seenBy', select: 'displayName avatarUrl' },
            { path: 'lastMessage.senderId', select: 'displayName avatarUrl' },
        ]);
        const participants = (conversation.participants || []).map((p) => ({
            _id: (p.userId?._id || p.userId || '').toString(),
            displayName: p.userId?.displayName || 'Người dùng',
            nickname: p.nickname || null,
            role: p.role || 'member',
            avatarUrl: p.userId?.avatarUrl ?? null,
            joinedAt: p.joinedAt,
        }));
        const formatted = {
            ...conversation.toObject(),
            unreadCounts: Object.fromEntries(conversation.unreadCounts || new Map()),
            participants,
        };

        // Phát sự kiện Socket cho tất cả các thành viên (bao gồm cả người tạo)
        const participantRooms = conversation.participants.map((p) => {
            const id = p.userId?._id ? p.userId._id.toString() : p.userId.toString();
            return `user_${id}`;
        });
        io.to(participantRooms).emit('conversation_created', formatted);

        return res.status(201).json({ conversation: formatted });
    } catch (error) {
        console.error('Lỗi khi tạo creatConversation', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;
        const conversation = await Conversation.find({
            'participants.userId': userId,
            // Lọc bỏ conversation mà user này đã "xóa" (ẩn)
            'deletedBy.userId': { $ne: userId },
        })
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .populate({
                path: 'participants.userId',
                select: 'displayName avatarUrl',
            })
            .populate({
                path: 'lastMessage.senderId',
                select: 'displayName avatarUrl',
            })
            .populate({
                path: 'seenBy',
                select: 'displayName avatarUrl',
            });
        const formatted = conversation.map((covo) => {
            const participants = (covo.participants || []).map((p) => ({
                _id: (p.userId?._id || p.userId || '').toString(),
                displayName: p.userId?.displayName || 'Người dùng',
                nickname: p.nickname || null,
                role: p.role || 'member',
                avatarUrl: p.userId?.avatarUrl ?? null,
                joinedAt: p.joinedAt,
            }));
            return {
                ...covo.toObject(),
                unreadCounts: Object.fromEntries(covo.unreadCounts || new Map()),
                participants,
            };
        });
        return res.status(200).json({ conversations: formatted });
    } catch (error) {
        console.error('Lỗi xảy ra khi lấy conversation ', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, cursor } = req.query;
        const query = {
            conversationId,
            deletedFor: { $ne: req.user._id },
        };
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) };
        }
        let messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit) + 1);
        let nextCursor = null;
        if (messages.length > Number(limit)) {
            const nextMessage = messages[messages.length - 1];
            nextCursor = nextMessage.createdAt.toISOString();
            messages.pop();
        }
        messages = messages.reverse();
        return res.status(200).json({ messages, nextCursor });
    } catch (error) {
        console.error('Lỗi xả ra khi lấy message', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id.toString();
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Không tìm thấy conversation' });
        }
        const isMember = conversation.participants.some((p) => p.userId.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
        }
        await Conversation.updateOne(
            { _id: conversationId },
            {
                $set: { [`unreadCounts.${userId}`]: 0 },
                $addToSet: { seenBy: userId },
            }
        );

        // Đánh dấu đã xem trên tin nhắn cụ thể
        await Message.updateMany(
            { conversationId, senderId: { $ne: userId }, seenBy: { $ne: userId } },
            { $addToSet: { seenBy: userId } }
        );

        return res.status(200).json({ message: 'Đã đọc' });
    } catch (error) {
        console.error('Lỗi markAsRead', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const deleteConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id.toString();

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Không tìm thấy conversation' });
        }

        // Kiểm tra user có phải thành viên không
        const isMember = conversation.participants.some((p) => p.userId.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ message: 'Bạn không có quyền xóa cuộc trò chuyện này' });
        }

        // Nếu là nhóm và người xóa là trưởng nhóm -> xóa hoàn toàn nhóm và tin nhắn
        const myParticipant = conversation.participants.find((p) => p.userId.toString() === userId);
        if (conversation.type === 'group' && myParticipant && myParticipant.role === 'owner') {
            // Lấy tất cả room socket trước khi xóa
            const participantRooms = conversation.participants.map(
                (p) => `user_${p.userId.toString()}`
            );

            // Xóa hết tin nhắn của cuộc trò chuyện
            await Message.deleteMany({ conversationId });
            // Xóa cuộc trò chuyện
            await Conversation.findByIdAndDelete(conversationId);

            // Emit thông báo tới mọi người rằng nhóm đã bị giải tán
            io.to(participantRooms).emit('conversation_deleted', {
                conversationId,
                groupName: conversation.group?.name,
            });

            return res.status(200).json({ message: 'Đã giải tán nhóm thành công' });
        }

        // Soft delete: chỉ ẩn cho user này, không xóa thật khỏi DB
        const alreadyDeleted = conversation.deletedBy.some((d) => d.userId.toString() === userId);
        if (!alreadyDeleted) {
            await Conversation.updateOne(
                { _id: conversationId },
                { $push: { deletedBy: { userId, deletedAt: new Date() } } }
            );
        }

        return res.status(200).json({ message: 'Đã xóa cuộc trò chuyện khỏi danh sách' });
    } catch (error) {
        console.error('Lỗi deleteConversation', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const updateNickname = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { targetUserId, nickname } = req.body;
        const myId = req.user._id.toString();

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
        }

        // Kiểm tra mình có trong nhóm không
        const isMember = conversation.participants.some((p) => p.userId.toString() === myId);
        if (!isMember) {
            return res.status(403).json({ message: 'Bạn không có quyền' });
        }

        // Tìm participant cần đổi nickname
        const participant = conversation.participants.find(
            (p) => p.userId.toString() === targetUserId
        );
        if (!participant) {
            return res.status(404).json({ message: 'Thành viên không tồn tại trong nhóm' });
        }

        participant.nickname = nickname ? nickname.trim() : null;
        await conversation.save();

        // Emit sự kiện socket để cập nhật real-time
        io.to(`conv_${conversationId}`).emit('conversation_updated', {
            conversationId,
            type: 'nickname_update',
            targetUserId,
            nickname: participant.nickname,
        });

        return res.status(200).json({
            message: 'Cập nhật biệt danh thành công',
            nickname: participant.nickname,
        });
    } catch (error) {
        console.error('Lỗi updateNickname', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const addMemberToGroup = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { memberIds } = req.body;
        const myId = req.user._id.toString();

        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ message: 'Cần cung cấp danh sách thành viên hợp lệ' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
        }

        if (conversation.type !== 'group') {
            return res.status(400).json({ message: 'Chỉ có thể thêm thành viên vào nhóm chat' });
        }

        // Kiểm tra quyền: người gọi phải nằm trong nhóm và là admin/owner
        const myParticipant = conversation.participants.find((p) => p.userId.toString() === myId);
        if (!myParticipant) {
            return res
                .status(403)
                .json({ message: 'Bạn không có quyền thêm thành viên vào nhóm này' });
        }
        if (myParticipant.role !== 'owner' && myParticipant.role !== 'admin') {
            return res
                .status(403)
                .json({ message: 'Chỉ nhóm trưởng hoặc phó nhóm mới được thêm thành viên' });
        }

        // Lọc những member chưa có trong nhóm
        const newMembers = memberIds.filter(
            (id) => !conversation.participants.some((p) => p.userId.toString() === id)
        );

        if (newMembers.length === 0) {
            return res.status(400).json({ message: 'Các thành viên này đã có trong nhóm' });
        }

        // Thêm member mới
        newMembers.forEach((id) => {
            conversation.participants.push({ userId: id, role: 'member' });
        });

        await conversation.save();

        // Populate lại conversation để emit data
        await conversation.populate([
            { path: 'participants.userId', select: 'displayName avatarUrl' },
            { path: 'seenBy', select: 'displayName avatarUrl' },
            { path: 'lastMessage.senderId', select: 'displayName avatarUrl' },
        ]);

        const participants = (conversation.participants || []).map((p) => ({
            _id: (p.userId?._id || p.userId || '').toString(),
            displayName: p.userId?.displayName || 'Người dùng',
            nickname: p.nickname || null,
            role: p.role || 'member',
            avatarUrl: p.userId?.avatarUrl ?? null,
            joinedAt: p.joinedAt,
        }));

        const formatted = {
            ...conversation.toObject(),
            unreadCounts: Object.fromEntries(conversation.unreadCounts || new Map()),
            participants,
        };

        // Báo cho các mem cũ & mới
        const participantRooms = conversation.participants.map((p) => {
            const id = p.userId?._id ? p.userId._id.toString() : p.userId.toString();
            return `user_${id}`;
        });

        io.to(participantRooms).emit('conversation_updated', {
            conversationId,
            action: 'add_members',
            conversation: formatted,
        });

        // Những thành viên mới chưa join room socket của conversation này.
        // Khi client nhận sự kiện sẽ tự update và join room qua socket nếu cần. Hoặc load lại.

        return res
            .status(200)
            .json({ message: 'Thêm thành viên thành công', conversation: formatted });
    } catch (error) {
        console.error('Lỗi addMemberToGroup', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const updateGroupProfile = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { name } = req.body;
        const myId = req.user._id.toString();

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
        }

        if (conversation.type !== 'group') {
            return res.status(400).json({ message: 'Chỉ có thể cập nhật thông tin nhóm' });
        }

        const isMember = conversation.participants.some((p) => p.userId.toString() === myId);
        if (!isMember) {
            return res.status(403).json({ message: 'Bạn không có quyền' });
        }

        let isUpdated = false;

        if (name && name.trim()) {
            conversation.group.name = name.trim();
            isUpdated = true;
        }

        if (req.file) {
            const result = await uploadToCloudinary(
                req.file.path,
                req.file.originalname,
                req.file.mimetype
            );
            conversation.group.avatarUrl = result.secure_url;
            isUpdated = true;
            fs.unlinkSync(req.file.path);
        }

        if (isUpdated) {
            await conversation.save();

            const participantRooms = conversation.participants.map((p) => {
                const id = p.userId?._id ? p.userId._id.toString() : p.userId.toString();
                return `user_${id}`;
            });

            // Gửi cả info updated
            io.to(participantRooms).emit('conversation_updated', {
                conversationId,
                type: 'group_profile_update',
                groupName: conversation.group.name,
                avatarUrl: conversation.group.avatarUrl,
            });
        }

        return res.status(200).json({
            message: 'Cập nhật thành công',
            groupName: conversation.group.name,
            avatarUrl: conversation.group.avatarUrl,
        });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const kickMember = async (req, res) => {
    try {
        const { conversationId, memberId } = req.params;
        const myId = req.user._id.toString();

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
        }

        if (conversation.type !== 'group') {
            return res.status(400).json({ message: 'Chỉ có thể kick khỏi nhóm' });
        }

        const myParticipant = conversation.participants.find((p) => p.userId.toString() === myId);
        const targetParticipant = conversation.participants.find(
            (p) => p.userId.toString() === memberId
        );

        if (!myParticipant || !targetParticipant) {
            return res.status(404).json({ message: 'Không tìm thấy thành viên' });
        }

        if (myParticipant.role !== 'owner' && myParticipant.role !== 'admin') {
            return res.status(403).json({ message: 'Bạn không có quyền kick người dùng' });
        }

        if (targetParticipant.role === 'owner') {
            return res.status(403).json({ message: 'Không thể kick trưởng nhóm' });
        }

        if (myParticipant.role === 'admin' && targetParticipant.role === 'admin') {
            return res.status(403).json({ message: 'Phó nhóm không thể kick phó nhóm khác' });
        }

        conversation.participants = conversation.participants.filter(
            (p) => p.userId.toString() !== memberId
        );
        await conversation.save();

        const participantRooms = conversation.participants.map(
            (p) => `user_${p.userId.toString()}`
        );
        participantRooms.push(`user_${memberId}`); // Báo cho người bị kick

        io.to(participantRooms).emit('conversation_updated', {
            conversationId,
            action: 'member_kicked',
            kickedUserId: memberId,
        });

        return res.status(200).json({ message: 'Đã kick người dùng khỏi nhóm' });
    } catch (error) {
        console.error('Lỗi kickMember', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const updateMemberRole = async (req, res) => {
    try {
        const { conversationId, memberId } = req.params;
        const { role } = req.body;
        const myId = req.user._id.toString();

        if (!['admin', 'member'].includes(role)) {
            return res.status(400).json({ message: 'Quyền không hợp lệ' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
        }

        if (conversation.type !== 'group') {
            return res.status(400).json({ message: 'Chỉ có thể sửa quyền trong nhóm' });
        }

        const myParticipant = conversation.participants.find((p) => p.userId.toString() === myId);
        const targetParticipant = conversation.participants.find(
            (p) => p.userId.toString() === memberId
        );

        if (!myParticipant || !targetParticipant) {
            return res.status(404).json({ message: 'Không tìm thấy thành viên' });
        }

        if (myParticipant.role !== 'owner') {
            return res
                .status(403)
                .json({ message: 'Chỉ nhóm trưởng mới có quyền thay đổi vai trò' });
        }

        if (targetParticipant.role === 'owner') {
            return res.status(403).json({ message: 'Không thể thay đổi quyền của nhóm trưởng' });
        }

        targetParticipant.role = role;
        await conversation.save();

        const participantRooms = conversation.participants.map(
            (p) => `user_${p.userId.toString()}`
        );

        io.to(participantRooms).emit('conversation_updated', {
            conversationId,
            action: 'role_updated',
            targetUserId: memberId,
            role,
        });

        return res.status(200).json({ message: 'Đã cập nhật quyền thành công' });
    } catch (error) {
        console.error('Lỗi updateMemberRole', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
