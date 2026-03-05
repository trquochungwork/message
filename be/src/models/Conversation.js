import mongoose, { now } from 'mongoose';
const participantSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        nickname: {
            type: String,
            trim: true,
        },
        role: {
            type: String,
            enum: ['owner', 'admin', 'member'],
            default: 'member',
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);
const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
        },
        avatarUrl: {
            type: String,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { _id: false }
);
const lastMessageSchema = new mongoose.Schema(
    {
        _id: { type: String },
        content: {
            type: String,
            default: null,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        createdAt: {
            type: Date,
            default: null,
        },
    },
    { _id: false }
);
const conversationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['direct', 'group'],
            required: true,
        },
        participants: {
            type: [participantSchema],
            required: true,
        },
        group: {
            type: groupSchema,
        },
        lastMessageAt: {
            type: Date,
            default: Date.now,
        },
        seenBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        lastMessage: {
            type: lastMessageSchema,
            default: null,
        },
        unreadCounts: {
            type: Map,
            of: Number,
            default: {},
        },
        // Danh sách userId đã "xóa" (ẩn) conversation này
        deletedBy: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                deletedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);
conversationSchema.index({
    'participants.userId': 1,
    lastMessageAt: -1,
});
const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
