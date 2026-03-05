import { Router } from 'express';
import {
    acceptFriendRequest,
    sendFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    getAllFriends,
    getFriendsRequest,
    unfriend,
} from '../controllers/friendController.js';

const router = Router();
router.post('/requests', sendFriendRequest);
router.post('/requests/:requestId/accept', acceptFriendRequest);
router.post('/requests/:requestId/decline', declineFriendRequest);
router.delete('/requests/:requestId', cancelFriendRequest);

router.get('/', getAllFriends);
router.delete('/:friendId', unfriend);
router.get('/requests', getFriendsRequest);
export default router;
