import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const isVideo = file.mimetype.startsWith('video/');
        const isAudio = file.mimetype.startsWith('audio/');

        let resource_type = 'auto';
        if (isVideo) resource_type = 'video';
        else if (isAudio)
            resource_type = 'video'; // Cloudinary handles audio as video resource type
        else if (!file.mimetype.startsWith('image/')) resource_type = 'raw';

        return {
            folder: 'message_app',
            resource_type: resource_type,
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
        };
    },
});

/**
 * Upload file lên Cloudinary, hỗ trợ file lớn (>100MB)
 */
const uploadToCloudinary = async (filePath, originalName, mimetype) => {
    console.log(`Cloudinary: Starting upload for ${originalName} (${mimetype})`);
    try {
        const isVideo = mimetype.startsWith('video/');
        const isAudio = mimetype.startsWith('audio/');
        const isImage = mimetype.startsWith('image/');

        let resource_type = 'auto';
        if (isVideo || isAudio) resource_type = 'video';
        else if (isImage) resource_type = 'image';
        else resource_type = 'raw';

        const public_id = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9]/g, '_')}`;

        const options = {
            folder: 'message_app',
            resource_type: resource_type,
            public_id: public_id,
        };

        console.log(`Cloudinary: resource_type=${resource_type}, public_id=${public_id}`);

        // Nếu file > 20MB thì dùng upload_large, ngược lại dùng upload thường
        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;

        let result;
        if (fileSizeInBytes > 20 * 1024 * 1024) {
            console.log('Cloudinary: Using upload_large (file > 20MB)');
            result = await cloudinary.uploader.upload_large(filePath, {
                ...options,
                chunk_size: 6000000,
            });
        } else {
            console.log('Cloudinary: Using standard upload');
            result = await cloudinary.uploader.upload(filePath, options);
        }

        return result;
    } catch (error) {
        console.error('Cloudinary: Upload error detail:', error);
        throw error;
    }
};

export { cloudinary, storage, uploadToCloudinary };
