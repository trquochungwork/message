import { create } from 'zustand';

export type CallStatus = 'idle' | 'calling' | 'receiving' | 'connected';
export type CallType = 'audio' | 'video';

export interface RemoteUser {
    _id: string;
    displayName: string;
    avatarUrl?: string | null;
}

interface CallState {
    status: CallStatus;
    type: CallType | null;
    remoteUser: RemoteUser | null;
    incomingOffer: RTCSessionDescriptionInit | null; // Signalling offer
    callerSocketId: string | null;
    isGroup: boolean;
    conversationId: string | null;
    participants: RemoteUser[];
    isSharingScreen: boolean;
    isRemoteSharingScreen: boolean;
    sharingUserId: string | null;
    isInitiator: boolean;
    availableGroupCalls: Record<string, { callType: CallType; callerInfo: RemoteUser }>;

    setAvailableGroupCall: (
        convoId: string,
        callData: { callType: CallType; callerInfo: RemoteUser } | null
    ) => void;

    initiateCall: (
        user: RemoteUser,
        type: CallType,
        isGroup?: boolean,
        conversationId?: string
    ) => void;
    receiveCall: (
        user: RemoteUser,
        type: CallType,
        offer: RTCSessionDescriptionInit | null,
        callerSocketId: string,
        isGroup?: boolean,
        conversationId?: string
    ) => void;
    setParticipants: (users: RemoteUser[] | ((prev: RemoteUser[]) => RemoteUser[])) => void;
    toggleSharingScreen: (isSharing: boolean, userId?: string | null) => void;
    toggleRemoteSharingScreen: (isSharing: boolean, userId?: string | null) => void;
    markConnected: () => void;
    reset: () => void;
}

export const useCallStore = create<CallState>((set) => ({
    status: 'idle',
    type: null,
    remoteUser: null,
    incomingOffer: null,
    callerSocketId: null,
    isGroup: false,
    conversationId: null,
    participants: [],
    isSharingScreen: false,
    isRemoteSharingScreen: false,
    sharingUserId: null,
    isInitiator: false,
    availableGroupCalls: {},

    setAvailableGroupCall: (convoId, callData) =>
        set((state) => {
            const newCalls = { ...state.availableGroupCalls };
            if (callData) {
                newCalls[convoId] = callData;
            } else {
                delete newCalls[convoId];
            }
            return { availableGroupCalls: newCalls };
        }),

    initiateCall: (user, type, isGroup = false, conversationId) =>
        set({
            status: 'calling',
            remoteUser: user,
            type,
            incomingOffer: null,
            callerSocketId: null,
            isGroup,
            conversationId: conversationId || null,
            isInitiator: true,
        }),

    receiveCall: (user, type, offer, socketId, isGroup = false, conversationId) =>
        set({
            status: 'receiving',
            remoteUser: user,
            type: type,
            incomingOffer: offer,
            callerSocketId: socketId,
            isGroup,
            conversationId: conversationId || null,
            isInitiator: false,
        }),

    setParticipants: (updater) =>
        set((state) => ({
            participants: typeof updater === 'function' ? updater(state.participants) : updater,
        })),
    toggleSharingScreen: (isSharing, userId = null) =>
        set({ isSharingScreen: isSharing, sharingUserId: isSharing ? userId : null }),
    toggleRemoteSharingScreen: (isSharing, userId = null) =>
        set({ isRemoteSharingScreen: isSharing, sharingUserId: isSharing ? userId : null }),

    markConnected: () => set({ status: 'connected' }),

    reset: () =>
        set({
            status: 'idle',
            type: null,
            remoteUser: null,
            incomingOffer: null,
            callerSocketId: null,
            isGroup: false,
            conversationId: null,
            participants: [],
            isSharingScreen: false,
            isRemoteSharingScreen: false,
            sharingUserId: null,
            isInitiator: false,
        }),
}));
