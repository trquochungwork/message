export interface User {
    _id: string;
    username: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
    bio?: string;
    phone?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Friend {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isOnline?: boolean;
}

export interface FriendRequest {
    _id: string;
    from: User;
    to: User;
    status: 'pending' | 'accepted' | 'declined';
    message?: string;
    createdAt: string;
}
