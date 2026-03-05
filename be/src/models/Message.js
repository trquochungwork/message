import mongoose from 'mongoose';
const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
            index: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            trim: true,
        },
        messageType: {
            type: String,
            enum: ['text', 'image', 'video', 'file', 'call', 'audio'],
            default: 'text',
        },
        callInfo: {
            status: { type: String, enum: ['missed', 'ended', 'rejected', 'busy'] },
            duration: { type: Number, default: 0 },
            callType: { type: String, enum: ['audio', 'video'] },
        },
        imgUrl: {
            type: String,
        },
        attachments: [
            {
                url: { type: String, required: true },
                fileName: { type: String, required: true },
                mimeType: { type: String, required: true },
                size: { type: Number, required: true },
            },
        ],
        isRecalled: { type: Boolean, default: false },
        deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        readAt: { type: Date },
        editedAt: { type: Date },
    },
    { timestamps: true }
);
messageSchema.index({ conversationId: 1, createdAt: -1 });
const Message = mongoose.model('Message', messageSchema);
export default Message;
