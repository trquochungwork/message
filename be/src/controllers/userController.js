import { io } from '../server.js';

export const authMe = async (req, res) => {
    try {
        const user = req.user; //* lấy từ authMiddleware
        return res.status(200).json({ user });
    } catch (error) {
        console.log('Lỗi khi gọi authMe', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(200).json({ users: [] });
        }

        const currentUserId = req.user._id;
        const searchRegex = new RegExp(q, 'i'); // Case-insensitive search

        const User = (await import('../models/User.js')).default;

        const users = await User.find({
            $or: [
                { username: searchRegex },
                { displayName: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
            ],
        })
            .select('_id username displayName email avatarUrl phone') // Select only necesssary fields
            .limit(10); // Limit results

        return res.status(200).json({ users });
    } catch (error) {
        console.log('Lỗi trong searchUsers controller', error);
        return res.status(500).json({ message: 'Lỗi tìm kiếm người dùng' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { displayName, bio, phone } = req.body;

        const User = (await import('../models/User.js')).default;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        if (displayName) user.displayName = displayName;
        if (bio !== undefined) user.bio = bio;
        if (phone !== undefined) user.phone = phone;

        await user.save();

        //* Broadcast cập nhật profile realtime cho các user khác
        io.emit('user_info_updated', {
            userId: user._id.toString(),
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
        });

        return res.status(200).json({
            message: 'Cập nhật hồ sơ thành công',
            user: {
                _id: user._id,
                username: user.username,
                displayName: user.displayName,
                email: user.email,
                avatarUrl: user.avatarUrl,
                bio: user.bio,
                phone: user.phone,
            },
        });
    } catch (error) {
        console.error('Lỗi trong updateProfile controller:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật hồ sơ' });
    }
};

export const updateAvatar = async (req, res) => {
    try {
        const userId = req.user._id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Vui lòng chọn ảnh để tải lên' });
        }

        const User = (await import('../models/User.js')).default;
        const { uploadToCloudinary, cloudinary } = await import('../libs/cloudinary.js');
        const fs = await import('fs');

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        // Upload mới
        const result = await uploadToCloudinary(file.path, file.originalname, file.mimetype);

        // Xóa file tạm
        fs.default.unlink(file.path, (err) => {
            if (err) console.error('Lỗi khi xóa file tạm:', err);
        });

        // Xóa ảnh cũ trên Cloudinary nếu có
        if (user.avatarId) {
            try {
                await cloudinary.uploader.destroy(user.avatarId);
            } catch (err) {
                console.error('Lỗi khi xóa ảnh cũ trên Cloudinary:', err);
            }
        }

        user.avatarUrl = result.secure_url || result.url;
        user.avatarId = result.public_id;

        await user.save();

        //* Broadcast cập nhật avatar realtime cho các user khác
        io.emit('user_info_updated', {
            userId: user._id.toString(),
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
        });

        return res.status(200).json({
            message: 'Cập nhật ảnh đại diện thành công',
            user: {
                _id: user._id,
                username: user.username,
                displayName: user.displayName,
                email: user.email,
                avatarUrl: user.avatarUrl,
                avatarId: user.avatarId,
                bio: user.bio,
                phone: user.phone,
            },
        });
    } catch (error) {
        console.error('Lỗi trong updateAvatar controller:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật ảnh đại diện' });
    }
};

export const test = async (req, res) => {
    return res.sendStatus(204);
};
