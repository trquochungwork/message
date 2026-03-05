import { Router } from 'express';
import {
    authMe,
    test,
    searchUsers,
    updateProfile,
    updateAvatar,
} from '../controllers/userController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = Router();
router.get('/me', protectedRoute, authMe);
router.patch('/me', protectedRoute, updateProfile);
router.patch('/me/avatar', protectedRoute, upload.single('avatar'), updateAvatar);
router.get('/search', protectedRoute, searchUsers);
router.get('/test', test);
export default router;
