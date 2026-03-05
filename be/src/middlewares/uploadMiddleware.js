import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../public/uploads');

// Tạo thư mục nếu chưa có
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (_req, file, cb) => {
    // Cho phép hầu hết các loại file thông dụng
    const allowed =
        /jpeg|jpg|png|gif|webp|svg|bmp|ico|mp4|avi|mkv|mov|wmv|flv|mp3|wav|ogg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|tar|gz|7zip|txt|csv|json|xml/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const mimetype = file.mimetype.toLowerCase();

    if (
        allowed.test(ext) ||
        mimetype.startsWith('image/') ||
        mimetype.startsWith('video/') ||
        mimetype.startsWith('audio/')
    ) {
        cb(null, true);
    } else {
        cb(new Error(`Loại file .${ext} không được hỗ trợ`), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});
