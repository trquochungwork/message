import mongoose from 'mongoose';
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        hashedPassword: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        //* Tên hiển thị người dùng
        displayName: {
            type: String,
            required: true,
            trim: true,
        },
        avatarUrl: {
            type: String, // *Link CND để hiển thị hình
        },
        avatarId: {
            type: String, //* Cloudinary public_id để xóa hình
        },
        bio: {
            type: String,
            maxlength: 500,
        },
        phone: {
            type: String,
            unique: true,
            sparse: true, //* cho phép null, Không được trùng
        },
    },
    { timestamps: true }
);
const User = mongoose.model('User', userSchema);
export default User;
