import BlockedUser from '../models/BlockedUser.js';
import Friend from '../models/Friend.js';
import { io } from '../server.js';

export const blockUser = async (req, res) => {
    try {
        const { blockedId } = req.body;
        const blockerId = req.user._id;

        if (blockerId.toString() === blockedId.toString()) {
            return res.status(400).json({ message: 'Bạn không thể chặn chính mình' });
        }

        // Tạo bản ghi chặn
        await BlockedUser.findOneAndUpdate(
            { blockerId, blockedId },
            { blockerId, blockedId },
            { upsert: true }
        );

        // Thông báo real-time cho user bị chặn
        io.to(`user_${blockedId}`).emit('user_blocked', {
            blockedBy: blockerId.toString(),
        });

        return res.status(200).json({ message: 'Đã chặn người dùng' });
    } catch (error) {
        console.error('Lỗi blockUser', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const unblockUser = async (req, res) => {
    try {
        const { blockedId } = req.params;
        const blockerId = req.user._id;

        await BlockedUser.findOneAndDelete({ blockerId, blockedId });

        // Thông báo real-time cho user được bỏ chặn
        io.to(`user_${blockedId}`).emit('user_unblocked', {
            unblockedBy: blockerId.toString(),
        });

        return res.status(200).json({ message: 'Đã bỏ chặn người dùng' });
    } catch (error) {
        console.error('Lỗi unblockUser', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const getBlockedUsers = async (req, res) => {
    try {
        const blockerId = req.user._id;
        const blocked = await BlockedUser.find({ blockerId }).populate(
            'blockedId',
            'displayName avatarUrl'
        );
        return res.status(200).json({ blocked });
    } catch (error) {
        console.error('Lỗi getBlockedUsers', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const checkBlockStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user._id;

        const [iBlockedThem, theyBlockedMe] = await Promise.all([
            BlockedUser.exists({ blockerId: currentUserId, blockedId: userId }),
            BlockedUser.exists({ blockerId: userId, blockedId: currentUserId }),
        ]);

        return res.status(200).json({
            iBlockedThem: !!iBlockedThem,
            theyBlockedMe: !!theyBlockedMe,
        });
    } catch (error) {
        console.error('Lỗi checkBlockStatus', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
