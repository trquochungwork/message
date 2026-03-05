import express from 'express';
import dotenv from 'dotenv';
import { connectBD } from './libs/db.js';
import authRoute from './routes/authRoute.js';
import userRoute from './routes/userRoute.js';
import friendRoute from './routes/friendRoute.js';
import messageRoute from './routes/messageRoute.js';
import conversationRoute from './routes/conversationRoute.js';
import blockRoute from './routes/blockRoute.js';
import cookieParser from 'cookie-parser';
import { protectedRoute } from './middlewares/authMiddleware.js';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        credentials: true,
    },
});

//* middleware
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);

//* Socket.io logic
const userSockets = new Map(); // userId -> socketId
const groupCalls = new Map(); // conversationId -> participants[]

io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
    if (userId) {
        userSockets.set(userId, socket.id);
        socket.join(`user_${userId}`);
        console.log(`User ${userId} connected as ${socket.id}`);
        io.emit('online_users', Array.from(userSockets.keys()));
    }

    socket.on('join_conversations', (conversationIds) => {
        conversationIds.forEach((id) => {
            socket.join(`conv_${id}`);
            if (groupCalls.has(id)) {
                const callData = groupCalls.get(id);
                if (callData.participants.size === 0) {
                    groupCalls.delete(id);
                } else {
                    socket.emit('group_active_call', {
                        conversationId: id,
                        callType: callData.callType,
                        callerInfo: callData.groupInfo || callData.callerInfo,
                        participants: Array.from(callData.participants.values()),
                    });
                }
            }
        });
    });

    // --- Voice/Video Call (1-on-1) ---
    socket.on('call_user', (data) => {
        const targetSocket = userSockets.get(data.targetId);
        if (targetSocket) {
            console.log(`[Call] Forwarding call from ${userId} to target ${data.targetId}`);
            io.to(targetSocket).emit('incoming_call', {
                signal: data.signalData,
                callerId: userId,
                callerInfo: data.callerInfo,
                callType: data.callType,
                isGroup: data.isGroup,
                conversationId: data.conversationId,
            });
        } else {
            console.warn(
                `[Call] Target ${data.targetId} not found in userSockets. Available:`,
                Array.from(userSockets.keys())
            );
            // Optional: emit back to caller that target is offline
            socket.emit('call_error', { message: 'Người dùng không trực tuyến' });
        }
    });

    socket.on('answer_call', (data) => {
        const targetSocket = userSockets.get(data.targetId);
        if (targetSocket) {
            io.to(targetSocket).emit('call_answered', {
                signal: data.signalData,
                callerId: userId, // fromId
            });
        }
    });

    socket.on('reject_call', (data) => {
        const targetSocket = userSockets.get(data.callerId);
        if (targetSocket) {
            io.to(targetSocket).emit('call_rejected', {
                fromId: userId,
            });
        }
    });

    socket.on('ice_candidate', (data) => {
        const targetSocket = userSockets.get(data.targetId);
        if (targetSocket) {
            io.to(targetSocket).emit('ice_candidate', {
                candidate: data.candidate,
                fromId: userId,
            });
        }
    });

    socket.on('end_call', (data) => {
        const targetSocket = userSockets.get(data.targetId);
        if (targetSocket) {
            io.to(targetSocket).emit('call_ended', {
                fromId: userId,
            });
        }
    });
    // --- Group Call ---
    socket.on('start_group_call', (data) => {
        const { conversationId, callType, callerInfo, groupInfo } = data;
        console.log(`User ${userId} khởi tạo cuộc gọi nhóm trong ${conversationId}`);

        socket.join(`conv_${conversationId}`);
        socket.to(`conv_${conversationId}`).emit('group_active_call', {
            conversationId,
            callType,
            callerInfo: groupInfo || callerInfo,
            initiatorInfo: callerInfo,
            participants: [callerInfo],
        });

        // Also broadcast as a ringing invitation
        socket.to(`conv_${conversationId}`).emit('incoming_call', {
            callerId: userId, // initiator
            callerInfo: groupInfo || callerInfo, // show group info if available
            initiatorInfo: callerInfo, // keep track of who started it
            callType,
            isGroup: true,
            conversationId,
            signal: null,
            fromId: socket.id,
        });

        if (!groupCalls.has(conversationId)) {
            groupCalls.set(conversationId, {
                callType,
                callerInfo,
                groupInfo,
                participants: new Map(),
            });
        }
        groupCalls.get(conversationId).participants.set(userId, callerInfo);

        const participants = Array.from(groupCalls.get(conversationId).participants.values());
        console.log(`Cuộc gọi nhóm ${conversationId} bắt đầu, participants:`, participants.length);
        socket.emit('group_participants_updated', {
            conversationId,
            participants,
        });
    });

    socket.on('join_group_call', (data) => {
        const { conversationId, userInfo } = data;
        console.log(`User ${userId} tham gia cuộc gọi nhóm trong ${conversationId}`);

        socket.join(`conv_${conversationId}`);
        if (groupCalls.has(conversationId)) {
            const callData = groupCalls.get(conversationId);
            callData.participants.set(userId, userInfo);

            const participants = Array.from(callData.participants.values());
            console.log(`Danh sách thành viên nhóm ${conversationId}:`, participants.length);

            // Thông báo cho TẤT CẢ mọi người, bao gồm sharingUserId hiện tại
            io.to(`conv_${conversationId}`).emit('group_participants_updated', {
                conversationId,
                participants,
                sharingUserId: callData.sharingUserId || null,
            });
        } else {
            console.warn(`Cuộc gọi nhóm ${conversationId} không tồn tại để join!`);
        }
    });

    socket.on('leave_group_call', (data) => {
        const { conversationId } = data;
        if (groupCalls.has(conversationId)) {
            const callData = groupCalls.get(conversationId);
            callData.participants.delete(userId);
            const remaining = Array.from(callData.participants.values());

            if (remaining.length === 0) {
                console.log(`Cuộc gọi nhóm ${conversationId} kết thúc (không còn ai)`);
                groupCalls.delete(conversationId);
                io.to(`conv_${conversationId}`).emit('group_call_ended', { conversationId });
            } else {
                io.to(`conv_${conversationId}`).emit('user_left_group_call', {
                    conversationId,
                    userId,
                });
                io.to(`conv_${conversationId}`).emit('group_participants_updated', {
                    conversationId,
                    participants: remaining,
                });
            }
        }
    });

    // --- Media Controls ---
    socket.on('toggle_video', (data) => {
        const { targetId, conversationId, isMuted } = data;
        if (targetId) {
            const targetSocket = userSockets.get(targetId);
            if (targetSocket) {
                io.to(targetSocket).emit('remote_video_toggled', { userId, isMuted });
            }
        } else if (conversationId) {
            socket.to(`conv_${conversationId}`).emit('remote_video_toggled', {
                userId,
                isMuted,
            });
        }
    });

    socket.on('toggle_audio', (data) => {
        const { targetId, conversationId, isMuted } = data;
        if (targetId) {
            const targetSocket = userSockets.get(targetId);
            if (targetSocket) {
                io.to(targetSocket).emit('remote_audio_toggled', { userId, isMuted });
            }
        } else if (conversationId) {
            socket.to(`conv_${conversationId}`).emit('remote_audio_toggled', {
                userId,
                isMuted,
            });
        }
    });

    socket.on('screen_share_status', (data) => {
        const { targetId, conversationId, isSharing, userId: sharingUserId } = data;

        // Persist sharing state in groupCalls map
        if (conversationId && groupCalls.has(conversationId)) {
            const callData = groupCalls.get(conversationId);
            callData.sharingUserId = isSharing ? sharingUserId || userId : null;
        }

        if (targetId) {
            const targetSocket = userSockets.get(targetId);
            if (targetSocket) {
                io.to(targetSocket).emit('screen_share_status', {
                    isSharing,
                    userId: sharingUserId,
                    conversationId,
                });
            }
        } else if (conversationId) {
            socket.to(`conv_${conversationId}`).emit('screen_share_status', {
                userId: sharingUserId || userId,
                isSharing,
                conversationId,
            });
        }
    });

    socket.on('typing', (data) => {
        const { conversationId, isTyping } = data;
        socket.to(`conv_${conversationId}`).emit('typing', {
            userId,
            conversationId,
            isTyping,
        });
    });

    socket.on('disconnect', () => {
        if (userId) {
            // Auto leave any group calls regardless of whether it's the primary socket
            groupCalls.forEach((callData, convoId) => {
                if (callData.participants.has(userId)) {
                    // One small check: only leave if this socket was the one that joined the call?
                    // Actually, since we only support one participant entry per userId,
                    // and rooms are socket-based, we should probably check if this socket is still
                    // in the conversation room. But simpler to just leave.
                    callData.participants.delete(userId);
                    const remaining = Array.from(callData.participants.values());

                    if (remaining.length === 0) {
                        groupCalls.delete(convoId);
                        io.to(`conv_${convoId}`).emit('group_call_ended', {
                            conversationId: convoId,
                        });
                    } else {
                        io.to(`conv_${convoId}`).emit('user_left_group_call', {
                            conversationId: convoId,
                            userId,
                        });
                        io.to(`conv_${convoId}`).emit('group_participants_updated', {
                            conversationId: convoId,
                            participants: remaining,
                        });
                    }
                }
            });

            if (userSockets.get(userId) === socket.id) {
                userSockets.delete(userId);
                console.log(`User ${userId} disconnected (primary)`);
                io.emit('online_users', Array.from(userSockets.keys()));
            } else {
                console.log(`User ${userId} closed an inactive tab/socket`);
            }
        }
    });
});

//* publicRoutes
app.use('/api/auth', authRoute);

//* privateRoutes
app.use(protectedRoute);
app.use('/api/users', userRoute);
app.use('/api/friends', friendRoute);
app.use('/api/messages', messageRoute);
app.use('/api/conversations', conversationRoute);
app.use('/api/blocks', blockRoute);

connectBD().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running at: ${PORT}`);
    });
});
