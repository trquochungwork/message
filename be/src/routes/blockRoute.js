import { Router } from 'express';
import {
    blockUser,
    unblockUser,
    getBlockedUsers,
    checkBlockStatus,
} from '../controllers/blockController.js';

const router = Router();

router.post('/', blockUser);
router.delete('/:blockedId', unblockUser);
router.get('/', getBlockedUsers);
router.get('/:userId/status', checkBlockStatus);

export default router;
