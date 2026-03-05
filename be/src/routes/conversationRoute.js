import { Router } from 'express';
import { checkFrendship } from '../middlewares/friendMiddleware.js';
import {
    creatConversation,
    getConversations,
    getMessages,
    markAsRead,
    deleteConversation,
    updateNickname,
    addMemberToGroup,
    updateGroupProfile,
    kickMember,
    updateMemberRole,
} from '../controllers/conversationController.js';
import { upload } from '../middlewares/uploadMiddleware.js';
const router = Router();
router.post('/', checkFrendship, creatConversation);
router.get('/', getConversations);
router.get('/:conversationId/messages', getMessages);
router.post('/:conversationId/read', markAsRead);
router.post('/:conversationId/members', addMemberToGroup);
router.delete('/:conversationId/members/:memberId', kickMember);
router.put('/:conversationId/members/:memberId/role', updateMemberRole);
router.put('/:conversationId/group-profile', upload.single('avatar'), updateGroupProfile);
router.delete('/:conversationId', deleteConversation);
router.put('/:conversationId/nickname', updateNickname);
export default router;
