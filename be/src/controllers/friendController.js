import Friend from '../models/Friend.js';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';
import { io } from '../server.js';

export const sendFriendRequest = async (req, res) => {
    try {
        const { to, message } = req.body;
        const from = req.user._id;
        if (from.toString() === to.toString()) {
            return res
                .status(400)
                .json({ message: 'Không thể gửi lời mời kết bạn cho chính mình !' });
        }
        const userExits = await User.exists({ _id: to });
        if (!userExits) {
            return res.status(404).json({
                message: 'Người dùng không hợp lệ !',
            });
        }
        let userA = from.toString();
        let userB = to.toString();
        if (userA > userB) {
            [userA, userB] = [userB, userA];
        }
        const [alreadyFriends, existingRequest] = await Promise.all([
            Friend.findOne({ userA, userB }),
            FriendRequest.findOne({
                $or: [
                    { from, to },
                    { from: to, to: from },
                ],
            }),
        ]);
        if (alreadyFriends) {
            return res.status(400).json({
                message: 'Hai người đã là bạn bè',
            });
        }
        if (existingRequest) {
            return res.status(400).json({
                message: 'Đã có lời mời kết bạn đang chờ',
            });
        }
        const request = await FriendRequest.create({
            from,
            to,
            message,
        });

        // Tìm thông tin người gửi để gửi socket real-time
        const sender = await User.findById(from).select('displayName username avatarUrl').lean();

        // Phát socket đến người nhận
        io.to(`user_${to}`).emit('new_friend_request', {
            request: {
                ...request.toObject(),
                from: sender,
            },
        });

        return res.status(201).json({ message: 'Gửi lời mời kết bạn thành công ', request });
    } catch (error) {
        console.error('Lỗi khi gửi yêu cầu kết bạn ', error);
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
export const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id.toString();

        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ message: 'Không tìm thấy lời mời kết bạn' });
        }

        if (request.to.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Không có quyền chấp nhận lời mời' });
        }

        let userA = request.from.toString();
        let userB = request.to.toString();
        if (userA > userB) [userA, userB] = [userB, userA];

        await Friend.create({ userA, userB });
        await FriendRequest.findByIdAndDelete(requestId);

        const fromUser = await User.findById(request.from)
            .select('_id displayName avatarUrl')
            .lean();

        // Phát socket thông báo cho người gửi (request.from) là đã được chấp nhận
        const acceptingUser = await User.findById(userId)
            .select('_id displayName avatarUrl')
            .lean();
        io.to(`user_${request.from}`).emit('friend_request_accepted', {
            newFriend: acceptingUser,
        });

        return res.status(200).json({
            message: 'Chấp nhận lời mời kết bạn thành công',
            newFriend: fromUser,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const declineFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;
        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ message: 'Không tìm thấy lời mời kết bạn' });
        }
        if (request.to.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền từ chối lời mời này ' });
        }
        await FriendRequest.findByIdAndDelete(requestId);

        // Phát socket thông báo cho người gửi là yêu cầu bị từ chối
        io.to(`user_${request.from}`).emit('friend_request_declined', {
            declinedBy: userId,
        });

        //return res.sendStatus(204);
        return res.status(200).json({ message: 'Từ chối kết bạn thành công' });
    } catch (error) {
        console.error('Lỗi khi từ chối lời mời kết bạn ', error);
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

export const cancelFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;
        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ message: 'Không tìm thấy lời mời kết bạn' });
        }
        if (request.from.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền hủy lời mời này' });
        }
        await FriendRequest.findByIdAndDelete(requestId);

        // Thông báo cho người nhận rằng lời mời đã bị hủy
        io.to(`user_${request.to}`).emit('friend_request_cancelled', {
            cancelledBy: userId,
            requestId,
        });

        return res.status(200).json({ message: 'Đã hủy lời mời kết bạn' });
    } catch (error) {
        console.error('Lỗi khi hủy lời mời kết bạn ', error);
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
export const getAllFriends = async (req, res) => {
    try {
        const userId = req.user._id;
        const friendship = await Friend.find({
            $or: [
                {
                    userA: userId,
                },
                {
                    userB: userId,
                },
            ],
        })
            .populate('userA', 'displayName avatarUrl')
            .populate('userB', 'displayName avatarUrl')
            .lean();
        if (!friendship.length) {
            return res.status(200).json({ friends: [] });
        }
        const friends = friendship.map((f) =>
            f.userA._id.toString() === userId.toString() ? f.userB : f.userA
        );
        res.status(200).json({ friends });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách bạn bè ', error);
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
export const getFriendsRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const populateFields = '_id username displayName avatarUrl';
        const [sent, received] = await Promise.all([
            FriendRequest.find({ from: userId }).populate('to', populateFields),
            FriendRequest.find({ to: userId }).populate('from', populateFields),
        ]);
        res.status(200).json({ sent, received });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách yêu cầu kết bạn ', error);
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
export const unfriend = async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.user._id.toString();

        let userA = userId;
        let userB = friendId;
        if (userA > userB) [userA, userB] = [userB, userA];

        const deleted = await Friend.findOneAndDelete({ userA, userB });

        if (!deleted) {
            return res.status(404).json({ message: 'Không tìm thấy quan hệ bạn bè' });
        }

        // Phát socket thông báo cho người kia là đã bị hủy kết bạn
        io.to(`user_${friendId}`).emit('friend_removed', {
            removedBy: userId,
        });

        return res.status(200).json({ message: 'Đã hủy kết bạn thành công' });
    } catch (error) {
        console.error('Lỗi khi hủy kết bạn', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
