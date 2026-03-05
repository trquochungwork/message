import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const listeners = new Set<(s: Socket | null) => void>();

const notifyListeners = () => {
    listeners.forEach((l) => l(socket));
};

export const getSocket = () => socket;

export const useSocket = () => {
    const [currentSocket, setCurrentSocket] = useState<Socket | null>(socket);

    useEffect(() => {
        const handler = (s: Socket | null) => setCurrentSocket(s);
        listeners.add(handler);
        return () => {
            listeners.delete(handler);
        };
    }, []);

    return currentSocket;
};

export const connectSocket = (userId: string): Socket => {
    if (socket?.connected && (socket as any).userId === userId) {
        return socket;
    }

    if (socket) {
        socket.disconnect();
    }

    socket = io(import.meta.env.MODE === 'development' ? 'http://localhost:3000' : '/', {
        auth: { userId },
        query: { userId },
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
    });

    (socket as any).userId = userId;
    notifyListeners();

    socket.on('connect', () => {
        // console.log('Socket connected:', socket?.id);
        notifyListeners();
    });

    socket.on('disconnect', () => {
        notifyListeners();
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        notifyListeners();
    }
};

export const joinConversationRooms = (conversationIds: string[]) => {
    if (socket?.connected) {
        socket.emit('join_conversations', conversationIds);
    }
};
