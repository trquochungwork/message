import mongoose from 'mongoose';

const blockedUserSchema = new mongoose.Schema(
    {
        // Người thực hiện chặn
        blockerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Người bị chặn
        blockedId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

// Đảm bảo mỗi cặp blockerId-blockedId là duy nhất
blockedUserSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

const BlockedUser = mongoose.model('BlockedUser', blockedUserSchema);
export default BlockedUser;
