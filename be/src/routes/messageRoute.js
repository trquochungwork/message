import { Router } from 'express';
import {
    sendDirectMessage,
    sendGroupMessage,
    logCallMessage,
    deleteMessageForMe,
    recallMessage,
    markMessageRead,
    editMessage,
} from '../controllers/messageController.js';
import { checkFrendship, checkGroupMembership } from '../middlewares/friendMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = Router();

// Chuyển upload lên trước middleware check để multer kịp parse req.body (vì gửi FormData)
router.post('/direct', upload.array('files', 10), checkFrendship, sendDirectMessage);
router.post('/group', upload.array('files', 10), checkGroupMembership, sendGroupMessage);
router.post('/call-log', logCallMessage);

router.patch('/:messageId/read', markMessageRead);
router.patch('/:messageId/edit', editMessage);

router.delete('/:messageId/me', deleteMessageForMe);
router.delete('/:messageId/everyone', recallMessage);

export default router;
