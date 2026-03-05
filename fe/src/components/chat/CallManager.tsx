import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../../stores/useAuthStores.ts';
import { useCallStore } from '../../stores/useCallStore.ts';
import type { RemoteUser } from '../../stores/useCallStore.ts';
import { useSocket } from '../../services/socketService.ts';
import { logCallHistory } from '../../services/chatSevice.ts';
import {
    PhoneOff,
    PhoneCall,
    Video,
    VideoOff,
    Mic,
    MicOff,
    Users,
    Monitor,
    Maximize2,
    Minimize2,
} from 'lucide-react';
import { Button } from '../ui/button.tsx';
import UserAvatar from './UserAvatar.tsx';
import { cn } from '../../lib/utils.ts';
import { toast } from 'sonner';

const STUN_SERVERS = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const RemoteVideo = ({
    stream,
    user,
    isMuted,
    isFull,
    lastUpdate,
    objectFit,
    hideLabel,
}: {
    stream?: MediaStream;
    user?: RemoteUser;
    isMuted?: boolean;
    isFull?: boolean;
    lastUpdate?: number;
    objectFit?: 'cover' | 'contain';
    hideLabel?: boolean;
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            const videoTracks = stream.getVideoTracks();
            console.log(
                `[RemoteVideo] Stream for ${user?.displayName}: tracks=${stream.getTracks().length}, video=${videoTracks.length}, id=${stream.id}`
            );

            // Re-assign srcObject and play
            if (videoRef.current.srcObject !== stream) {
                videoRef.current.srcObject = stream;
            }

            videoRef.current.play().catch((e) => {
                if (e.name !== 'AbortError') console.warn('[RemoteVideo] Play error:', e);
            });

            const handleTrackEvent = (e: any) => {
                console.log(
                    `[RemoteVideo] Track ${e.track.kind} ${e.type} for ${user?.displayName}`
                );
                // Re-sync and play
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                }
            };

            stream.addEventListener('addtrack', handleTrackEvent);
            stream.addEventListener('removetrack', handleTrackEvent);

            return () => {
                stream.removeEventListener('addtrack', handleTrackEvent);
                stream.removeEventListener('removetrack', handleTrackEvent);
            };
        }
    }, [stream, lastUpdate, user?.displayName]);

    const hasVideo = stream && stream.getVideoTracks().length > 0;

    return (
        <div
            className={cn(
                'relative w-full h-full bg-[#0a0a0a] overflow-hidden transition-all duration-700 group',
                !isFull && 'rounded-2xl border border-white/5 shadow-2xl hover:border-white/10'
            )}
        >
            <video
                ref={videoRef}
                key={`vid-${lastUpdate}`}
                autoPlay
                playsInline
                className={cn(
                    'w-full h-full transition-all duration-700',
                    objectFit === 'contain' ? 'object-contain' : 'object-cover',
                    (isMuted || !hasVideo) && 'opacity-0 scale-105 blur-lg'
                )}
            />

            {/* No Video or Muted View */}
            {(isMuted || !hasVideo) && (
                <div className='absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] z-10'>
                    {/* messenger style pulsing bg */}
                    <div className='absolute inset-0 overflow-hidden pointer-events-none'>
                        <div className='absolute inset-0 bg-linear-to-b from-transparent via-primary/5 to-transparent' />
                        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] aspect-square bg-primary/10 rounded-full blur-[120px]' />
                    </div>

                    <div className='relative flex flex-col items-center justify-center'>
                        <div className='relative'>
                            <div className='absolute inset-[-40%] bg-primary/20 rounded-full blur-[80px]' />
                            <UserAvatar
                                type='chat'
                                name={user?.displayName || 'Unknown'}
                                avatarUrl={user?.avatarUrl ?? undefined}
                                className={cn(
                                    'border-0 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative z-10 box-content ring-8 ring-white/5',
                                    isFull ? 'size-48 md:size-64 text-7xl' : 'size-40 text-6xl'
                                )}
                            />
                        </div>
                    </div>
                </div>
            )}

            {!hideLabel && (
                <div className='absolute bottom-4 left-4 right-4 flex items-center justify-between z-30 transition-all duration-500'>
                    <div className='flex items-center gap-2.5 px-3.5 py-1.5 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg group-hover:bg-black/60'>
                        <div className='relative'>
                            <div className='size-2 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)]' />
                        </div>
                        <span className='text-[11px] text-white font-black tracking-wide truncate max-w-[120px]'>
                            {user?.displayName}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

const CallManager = () => {
    const { user } = useAuthStore();
    const socket = useSocket();
    const {
        status,
        type,
        remoteUser,
        receiveCall,
        markConnected,
        reset,
        isGroup,
        participants,
        setParticipants,
        conversationId,
        incomingOffer,
        isSharingScreen,
        sharingUserId,
        toggleSharingScreen,
        toggleRemoteSharingScreen,
        setAvailableGroupCall,
    } = useCallStore();

    const [showParticipants, setShowParticipants] = useState(false);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Synchronize mute state with call type at start
    useEffect(() => {
        if (status !== 'idle') {
            const currentCallType = useCallStore.getState().type;
            setIsVideoMuted(currentCallType === 'audio');
            setIsAudioMuted(false);
            console.log(
                `[Call] Initializing mute states: video=${currentCallType === 'audio'}, audio=false`
            );
        }
    }, [status]);

    const [controlsVisible, setControlsVisible] = useState(true);
    const controlsTimerRef = useRef<any>(null);

    const resetControlsTimer = useCallback(() => {
        setControlsVisible(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);

        // Don't auto-hide if it's an incoming call (user needs to decide)
        if (status === 'receiving') return;

        controlsTimerRef.current = setTimeout(() => {
            setControlsVisible(false);
        }, 3000);
    }, [status]);

    useEffect(() => {
        const handleActivity = () => resetControlsTimer();
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('mousedown', handleActivity);
        window.addEventListener('touchstart', handleActivity);
        resetControlsTimer();

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        };
    }, [resetControlsTimer]);

    const [remoteVideoMutes, setRemoteVideoMutes] = useState<Record<string, boolean>>({});
    const [remoteAudioMutes, setRemoteAudioMutes] = useState<Record<string, boolean>>({});

    const localVideoFloatingRef = useRef<HTMLVideoElement>(null);
    const localVideoGridRef = useRef<HTMLVideoElement>(null);
    const localVideoShareRef = useRef<HTMLVideoElement>(null);

    const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const [streamsUpdate, setStreamsUpdate] = useState<Record<string, number>>({});
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const callStartTimeRef = useRef<number>(0);

    // Sync Local Video Ref
    useEffect(() => {
        // Camera previews (Sidebar / Floating)
        const cameraRefs = [localVideoFloatingRef, localVideoGridRef];
        cameraRefs.forEach((ref) => {
            if (ref.current) {
                if (ref.current.srcObject !== localStream) {
                    ref.current.srcObject = localStream;
                }
                if (localStream) {
                    ref.current.play().catch((e) => {
                        if (e.name !== 'AbortError')
                            console.warn('[LocalVideo] Camera Play error:', e);
                    });
                }
            }
        });

        // Screen share preview (Main area)
        if (localVideoShareRef.current) {
            const shareStream = isSharingScreen ? screenStream : null;
            if (localVideoShareRef.current.srcObject !== shareStream) {
                localVideoShareRef.current.srcObject = shareStream;
            }
            if (shareStream) {
                localVideoShareRef.current.play().catch((e) => {
                    if (e.name !== 'AbortError') console.warn('[LocalVideo] Share Play error:', e);
                });
            }
        }
    }, [isSharingScreen, localStream, screenStream]);

    const cleanupCall = useCallback(
        async (finalStatus?: 'missed' | 'rejected' | 'ended') => {
            const currentCall = useCallStore.getState();

            let actualStatus = finalStatus;
            let duration = 0;

            if (callStartTimeRef.current > 0) {
                duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
            } else if (finalStatus === 'ended' || !finalStatus) {
                // Nếu là ended (hoặc mặc định) mà chưa bao giờ bắt đầu tính giờ (timer=0),
                // thì thực chất đây là một cuộc gọi nhỡ (chưa có ai tham gia/trả lời).
                actualStatus = 'missed';
            }

            // Log history ONLY for the initiator to avoid duplicate messages
            if (
                actualStatus &&
                currentCall.isInitiator &&
                (currentCall.remoteUser || currentCall.isGroup)
            ) {
                console.log(
                    `[LOG] Initiator logging call history: status=${actualStatus}, duration=${duration}`
                );
                try {
                    await logCallHistory({
                        recipientId: currentCall.remoteUser?._id,
                        conversationId: currentCall.conversationId,
                        callType: currentCall.type || 'video',
                        callStatus: actualStatus as any,
                        callDuration: duration,
                    });
                } catch (err) {
                    console.warn('Lỗi lưu lịch sử cuộc gọi:', err);
                }
            }

            reset();
            callStartTimeRef.current = 0;
            setIsAudioMuted(false);
            setIsVideoMuted(false);
            setRemoteVideoMutes({});
            setRemoteAudioMutes({});
            setRemoteStreams({});
            setStreamsUpdate({});
            setShowParticipants(false);

            pcsRef.current.forEach((pc) => pc.close());
            pcsRef.current.clear();

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((t) => t.stop());
                localStreamRef.current = null;
            }

            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((t) => t.stop());
                screenStreamRef.current = null;
            }

            setRemoteStreams({});
            setLocalStream(null);
            setScreenStream(null);
            const refs = [localVideoFloatingRef, localVideoGridRef, localVideoShareRef];
            refs.forEach((ref) => {
                if (ref.current) ref.current.srcObject = null;
            });

            // Trigger scroll to bottom in chat window after small delay for the message to be added
            window.dispatchEvent(new CustomEvent('call_ended'));
        },
        [reset]
    );

    const setupMedia = async (callType: 'audio' | 'video') => {
        // Only return if we already have the requested tracks
        if (localStreamRef.current) {
            const hasVideo = localStreamRef.current.getVideoTracks().length > 0;
            if (callType === 'audio' || (callType === 'video' && hasVideo)) {
                return localStreamRef.current;
            }
        }
        try {
            console.log(`[Media] Requesting ${callType} devices...`);
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: callType === 'video' ? { width: 1280, height: 720 } : false,
            });

            if (localStreamRef.current) {
                // Merge tracks
                stream.getTracks().forEach((track) => {
                    const existing = localStreamRef.current
                        ?.getTracks()
                        .find((t) => t.kind === track.kind);
                    if (!existing) {
                        // New track (e.g. adding video to audio call)
                        // If we are requesting 'video', make sure the new video track is enabled
                        if (track.kind === 'video' && callType === 'video') {
                            track.enabled = true;
                            setIsVideoMuted(false);
                        }
                        localStreamRef.current?.addTrack(track);
                    } else {
                        // Existing track kind
                        if (track.kind === 'audio') existing.enabled = !isAudioMuted;
                        if (track.kind === 'video' && callType === 'video') {
                            existing.enabled = true;
                            setIsVideoMuted(false);
                        }
                    }
                });
            } else {
                localStreamRef.current = stream;
                // First time getting stream, initialize states based on call type
                const initialVideoMuted = callType === 'audio';
                setIsAudioMuted(false);
                setIsVideoMuted(initialVideoMuted);

                stream.getAudioTracks().forEach((t) => (t.enabled = true));
                stream.getVideoTracks().forEach((t) => (t.enabled = !initialVideoMuted));
            }

            setLocalStream(localStreamRef.current);
            return localStreamRef.current;
        } catch (err) {
            console.error('[Media] getUserMedia error:', err);
            // Non-blocking fallback
            if (callType === 'video') {
                setIsVideoMuted(true);
            }
            return localStreamRef.current;
        }
    };

    const replaceVideoTrack = useCallback(
        async (newTrack: MediaStreamTrack | null) => {
            for (const [id, pc] of pcsRef.current.entries()) {
                // Find existing video sender more reliably
                const sender = pc.getSenders().find((s) => {
                    // If it has a track, check if it's video
                    if (s.track) return s.track.kind === 'video';
                    // If track is null, it might still be our video sender
                    // Check transceiver if available (standard in modern browsers)
                    const transceiver = pc.getTransceivers().find((t) => t.sender === s);
                    return transceiver?.receiver?.track?.kind === 'video';
                });

                if (sender) {
                    console.log(`[WebRTC] Replacing track for ${id}`);
                    await sender.replaceTrack(newTrack);
                } else if (newTrack) {
                    console.log(`[WebRTC] Adding NEW track to PC for ${id}`);
                    // Use the existing stream if possible to keep track/stream mapping consistent
                    const streamToUse = localStreamRef.current || new MediaStream([newTrack]);
                    if (!localStreamRef.current) localStreamRef.current = streamToUse;
                    pc.addTrack(newTrack, streamToUse);
                }

                // Renegotiate - essential when adding tracks
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket?.emit('call_user', {
                        targetId: id,
                        signalData: offer,
                        callerInfo: {
                            _id: user?._id,
                            displayName: user?.displayName,
                            avatarUrl: user?.avatarUrl,
                        },
                        callType: 'video',
                        isGroup: isGroup,
                        conversationId: conversationId,
                        isNegotiation: true,
                    });
                } catch (err) {
                    console.error('[WebRTC] Renegotiation error:', err);
                }
            }
        },
        [socket, user, isGroup, conversationId]
    );

    const stopScreenShare = useCallback(async () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
            setScreenStream(null);
        }

        // Return to local camera track if available
        const cameraTrack = !isVideoMuted
            ? localStreamRef.current?.getVideoTracks()[0] || null
            : null;
        await replaceVideoTrack(cameraTrack);

        const refs = [localVideoFloatingRef, localVideoGridRef, localVideoShareRef];
        refs.forEach((ref) => {
            if (ref.current) ref.current.srcObject = localStreamRef.current;
        });

        toggleSharingScreen(false, null);
        socket?.emit('screen_share_status', {
            isSharing: false,
            userId: user?._id,
            conversationId,
            targetId: !isGroup ? remoteUser?._id : null,
        });
    }, [
        replaceVideoTrack,
        toggleSharingScreen,
        user?._id,
        conversationId,
        socket,
        isVideoMuted,
        isGroup,
        remoteUser?._id,
    ]);

    const toggleScreenShare = async () => {
        if (!isSharingScreen) {
            try {
                let stream: MediaStream;
                try {
                    // Try with audio first
                    stream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            cursor: 'always',
                            frameRate: 15,
                        } as any,
                        audio: true,
                    });
                } catch (err: any) {
                    // If audio fails (e.g. not supported or denied), try video only
                    console.warn(
                        '[WebRTC] getDisplayMedia with audio failed, falling back to video only:',
                        err.name
                    );
                    if (err.name === 'NotAllowedError') throw err; // Re-throw to handle in outer catch (user cancel)

                    stream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            cursor: 'always',
                            frameRate: 15,
                        } as any,
                    });
                }

                screenStreamRef.current = stream;
                setScreenStream(stream);
                const screenTrack = stream.getVideoTracks()[0];
                if (screenTrack) {
                    if ('contentHint' in screenTrack) {
                        (screenTrack as any).contentHint = 'detail';
                    }
                }

                await replaceVideoTrack(screenTrack);

                toggleSharingScreen(true, user?._id);
                socket?.emit('screen_share_status', {
                    isSharing: true,
                    userId: user?._id,
                    conversationId,
                    targetId: !isGroup ? remoteUser?._id : null,
                });

                screenTrack.onended = () => {
                    stopScreenShare();
                };
            } catch (err: any) {
                if (err.name === 'NotAllowedError') {
                    console.log('[WebRTC] Screen share cancelled by user');
                    return;
                }
                console.error('Lỗi chia sẻ màn hình:', err);
                toast.error('Không thể chia sẻ màn hình');
            }
        } else {
            stopScreenShare();
        }
    };

    const createPeerConnection = useCallback(
        (targetId: string) => {
            if (pcsRef.current.has(targetId)) return pcsRef.current.get(targetId)!;

            const pid = String(targetId);
            const myId = String(user?._id);

            const pc = new RTCPeerConnection(STUN_SERVERS);

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket?.emit('ice_candidate', {
                        targetId: pid,
                        candidate: event.candidate,
                        fromId: myId,
                    });
                }
            };

            pc.onconnectionstatechange = () => {
                console.log(`Kết nối với ${pid} thay đổi: ${pc.connectionState}`);
            };

            pc.ontrack = (event) => {
                console.log(`Nhận track từ ${pid}:`, event.track.kind, event.streams[0]?.id);
                const stream = event.streams[0];
                if (stream) {
                    setRemoteStreams((prev) => {
                        const existingStream = prev[pid] || new MediaStream();

                        // Thêm track vào stream hiện tại nếu chưa có
                        const track = event.track;
                        if (!existingStream.getTracks().find((t) => t.id === track.id)) {
                            existingStream.addTrack(track);
                        }

                        // Cũng đảm bảo các track khác từ stream mới được thêm vào
                        stream.getTracks().forEach((t) => {
                            if (!existingStream.getTracks().find((ext) => ext.id === t.id)) {
                                existingStream.addTrack(t);
                            }
                        });

                        return { ...prev, [pid]: existingStream };
                    });
                    setStreamsUpdate((prev) => ({ ...prev, [pid]: Date.now() }));
                }
            };

            pcsRef.current.set(pid, pc);
            return pc;
        },
        [socket, user?._id]
    );

    const addLocalTracksToPC = useCallback((pc: RTCPeerConnection) => {
        const currentCall = useCallStore.getState();
        const sharing = currentCall.isSharingScreen;
        const screenStream = screenStreamRef.current;
        const cameraStream = localStreamRef.current;

        if (!cameraStream) {
            console.warn('[WebRTC] No camera stream available to add tracks');
            return;
        }

        const senders = pc.getSenders();

        // 1. Luôn thêm Audio từ camera stream
        const audioTrack = cameraStream.getAudioTracks()[0];
        if (audioTrack) {
            const alreadyAdded = senders.find((s) => s.track?.kind === 'audio');
            if (!alreadyAdded) {
                console.log('[WebRTC] Adding audio track to PC');
                pc.addTrack(audioTrack, cameraStream);
            }
        }

        // 2. Thêm Video (Screen hoặc Camera)
        let videoTrack = null;
        let streamToUse = null;

        if (sharing && screenStream) {
            videoTrack = screenStream.getVideoTracks()[0];
            streamToUse = screenStream;
            console.log('[WebRTC] Sharing screen, using screen track for new PC');
        } else {
            videoTrack = cameraStream.getVideoTracks()[0];
            streamToUse = cameraStream;
            console.log('[WebRTC] Not sharing, using camera track for new PC');
        }

        if (videoTrack) {
            const alreadyAdded = senders.find((s) => s.track?.kind === 'video');
            if (!alreadyAdded) {
                console.log(`[WebRTC] Adding video track (${sharing ? 'screen' : 'camera'}) to PC`);
                pc.addTrack(videoTrack, streamToUse!);
            }
        }
    }, []);

    const startWebRTC = useCallback(
        async (targetId: string, callType: 'audio' | 'video', isInitiator: boolean) => {
            console.log(`[WebRTC] Starting PC with ${targetId}, initiator=${isInitiator}`);

            // Create PC immediately to handle incoming signals
            const pc = createPeerConnection(targetId);

            // Fetch media and ensure tracks are added before offer
            try {
                const stream = await setupMedia(callType);
                if (stream) addLocalTracksToPC(pc);
            } catch (mediaErr) {
                console.error('[WebRTC] Media setup failed:', mediaErr);
            }

            if (isInitiator) {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    console.log(`Gửi offer cho ${targetId}`);
                    socket?.emit('call_user', {
                        targetId,
                        signalData: offer,
                        callType,
                        isGroup: useCallStore.getState().isGroup,
                        conversationId: useCallStore.getState().conversationId,
                        callerInfo: {
                            _id: user?._id,
                            displayName: user?.displayName,
                            avatarUrl: user?.avatarUrl,
                        },
                    });
                } catch (err) {
                    console.error('Lỗi offer:', err);
                }
            }
        },
        [createPeerConnection, user, socket, addLocalTracksToPC]
    );

    // Initial listeners attachment
    useEffect(() => {
        if (!socket) return;

        const handleIncoming = async (data: any) => {
            console.log('Nhận tín hiệu incoming_call:', data);
            const currentCall = useCallStore.getState();

            if (
                currentCall.status === 'connected' ||
                (currentCall.isGroup && currentCall.status !== 'idle') ||
                data.isNegotiation
            ) {
                const targetId = String(data.callerId || data.callerInfo?._id);
                const pc = createPeerConnection(targetId);

                setupMedia(currentCall.type || 'audio').then((stream) => {
                    if (stream) addLocalTracksToPC(pc);
                });

                if (data.signal) {
                    try {
                        console.log(`[WebRTC] Negotiating with ${targetId}: ${data.signal.type}`);
                        await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
                        if (data.signal.type === 'offer') {
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            socket.emit('answer_call', {
                                targetId: targetId,
                                signalData: answer,
                            });
                        }
                    } catch (err) {
                        console.error('[WebRTC] Signal handling error:', err);
                    }
                }
                return;
            }

            const currentStatus = currentCall.status as string;

            if (currentStatus === 'idle') {
                if (data.isNegotiation) return;
            } else {
                if (!data.isNegotiation && currentStatus !== 'connected') {
                    socket.emit('reject_call', { callerId: data.callerId });
                    return;
                }
            }

            receiveCall(
                data.callerInfo,
                data.callType,
                data.signal,
                data.callerId,
                data.isGroup,
                data.conversationId
            );
        };

        const handleAnswered = async (data: any) => {
            console.log('Nhận tín hiệu call_answered từ:', data.callerId);
            const pc = pcsRef.current.get(String(data.callerId));
            if (pc && data.signal) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
                markConnected();
                callStartTimeRef.current = Date.now();
            }
        };

        const handleIceCandidate = async (data: any) => {
            const pc = pcsRef.current.get(String(data.fromId));
            if (pc && data.candidate) {
                await pc
                    .addIceCandidate(new RTCIceCandidate(data.candidate))
                    .catch((e) => console.warn('Lỗi ICE:', e));
            }
        };

        const handleEnded = (data: any) => {
            console.log('Nhận tín hiệu call_ended từ:', data.fromId);
            const targetId = String(data.fromId);

            // Clean up WebRTC for this specific person
            if (targetId && pcsRef.current.has(targetId)) {
                const pc = pcsRef.current.get(targetId);
                pc?.close();
                pcsRef.current.delete(targetId);
                setRemoteStreams((prev) => {
                    const updated = { ...prev };
                    delete updated[targetId];
                    return updated;
                });
            }

            // In 1-on-1 call, if the only remote person ends, we close the call
            const currentCall = useCallStore.getState();
            if (!currentCall.isGroup && currentCall.status !== 'idle') {
                if (String(currentCall.remoteUser?._id) === targetId) {
                    cleanupCall('ended');
                }
            }
        };

        const handleGroupCallEnded = (data: any) => {
            console.log('Cuộc gọi nhóm kết thúc:', data.conversationId);
            const currentCall = useCallStore.getState();
            if (currentCall.isGroup && currentCall.conversationId === data.conversationId) {
                cleanupCall('ended');
            }
        };

        const handleRejected = (_data: any) => {
            toast.error('Cuộc gọi bị từ chối');
            cleanupCall('rejected');
        };

        const handleParticipantsUpdated = async (data: any) => {
            console.log('Danh sách b tham gia cập nhật:', data.participants);
            setParticipants(data.participants);

            // Bắt đầu tính giờ cuộc gọi nhóm khi có ít nhất 1 người khác tham gia
            if (data.participants.length > 1 && callStartTimeRef.current === 0) {
                console.log('[Media] Group call started: someone joined.');
                callStartTimeRef.current = Date.now();
            }

            // Sync screen share state for new joiners
            if (data.sharingUserId !== undefined) {
                const isMe = String(data.sharingUserId) === String(user?._id);
                useCallStore.setState({
                    sharingUserId: data.sharingUserId,
                    isSharingScreen: isMe && !!data.sharingUserId,
                    isRemoteSharingScreen: !isMe && !!data.sharingUserId,
                });
            }

            if (data.participants.length === 0) {
                setAvailableGroupCall(data.conversationId, null);
                return;
            }

            // Ensure isGroup is true if we have participants and it's a group context
            if (data.participants.length > 0) {
                useCallStore.setState({ isGroup: true });
            }

            const currentCall = useCallStore.getState();
            if (currentCall.status === 'connected') {
                const participantIds = data.participants.map((p: any) => String(p._id));
                const myId = String(user?._id);

                // Clean up stale PCs for people who are no longer in the list
                for (const pid of Array.from(pcsRef.current.keys())) {
                    if (!participantIds.includes(pid)) {
                        console.log(`[Rejoin] Cleaning up stale PC for ${pid}`);
                        const pc = pcsRef.current.get(pid);
                        pc?.close();
                        pcsRef.current.delete(pid);
                        setRemoteStreams((prev) => {
                            const next = { ...prev };
                            delete next[pid];
                            return next;
                        });
                    }
                }

                for (const p of data.participants) {
                    const peerId = String(p._id);

                    if (peerId !== myId) {
                        const existingPC = pcsRef.current.get(peerId);
                        const isFailed =
                            existingPC &&
                            (existingPC.connectionState === 'failed' ||
                                existingPC.connectionState === 'disconnected');

                        if (!existingPC || isFailed) {
                            if (isFailed) {
                                console.log(`[Rejoin] Replacing failed PC for ${p.displayName}`);
                                existingPC?.close();
                                pcsRef.current.delete(peerId);
                            }

                            const shouldIInitiate = myId < peerId;
                            if (shouldIInitiate) {
                                console.log(`[GLARE] Tôi gọi ${p.displayName}`);
                                await startWebRTC(peerId, currentCall.type || 'video', true);
                            }
                        }
                    }
                }
            }
        };

        const handleUserLeft = (data: any) => {
            const pid = String(data.userId);
            console.log(`User ${pid} left group call`);
            if (pcsRef.current.has(pid)) {
                const pc = pcsRef.current.get(pid);
                pc?.close();
                pcsRef.current.delete(pid);
                setRemoteStreams((prev) => {
                    const next = { ...prev };
                    delete next[pid];
                    return next;
                });
            }
            setParticipants((prev) => prev.filter((p) => String(p._id) !== pid));
        };

        const handleUserJoined = (data: any) => {
            toast.info(`${data.user.displayName} đã tham gia`);
        };

        const handleScreenShareStatus = (data: any) => {
            const currentCall = useCallStore.getState();
            if (data.conversationId === currentCall.conversationId) {
                if (String(data.userId) !== String(user?._id)) {
                    toggleRemoteSharingScreen(data.isSharing, data.userId);
                    setStreamsUpdate((prev) => ({ ...prev, [String(data.userId)]: Date.now() }));
                    if (data.isSharing) {
                        const sharer =
                            currentCall.participants.find(
                                (p) => String(p._id) === String(data.userId)
                            ) ||
                            (currentCall.remoteUser &&
                            String(currentCall.remoteUser._id) === String(data.userId)
                                ? currentCall.remoteUser
                                : null);
                        const sharerName = sharer?.displayName || 'Ai đó';
                        toast.info(`${sharerName} đang chia sẻ màn hình`);
                    }
                }
            }
        };

        socket.on('incoming_call', handleIncoming);
        socket.on('call_answered', handleAnswered);
        socket.on('ice_candidate', handleIceCandidate);
        socket.on('call_ended', handleEnded);
        socket.on('call_rejected', handleRejected);
        socket.on('group_call_ended', handleGroupCallEnded);
        socket.on('group_participants_updated', handleParticipantsUpdated);
        socket.on('user_joined_group_call', handleUserJoined);
        socket.on('user_left_group_call', handleUserLeft);
        socket.on('screen_share_status', handleScreenShareStatus);
        socket.on('remote_video_toggled', ({ userId, isMuted }) => {
            setRemoteVideoMutes((prev) => ({ ...prev, [userId || 'default']: isMuted }));
        });
        socket.on('remote_audio_toggled', ({ userId, isMuted }) => {
            setRemoteAudioMutes((prev) => ({ ...prev, [userId || 'default']: isMuted }));
        });

        return () => {
            socket.off('incoming_call', handleIncoming);
            socket.off('call_answered', handleAnswered);
            socket.off('ice_candidate', handleIceCandidate);
            socket.off('call_ended', handleEnded);
            socket.off('call_rejected', handleRejected);
            socket.off('group_call_ended', handleGroupCallEnded);
            socket.off('group_participants_updated', handleParticipantsUpdated);
            socket.off('user_joined_group_call', handleUserJoined);
            socket.off('user_left_group_call', handleUserLeft);
            socket.off('screen_share_status', handleScreenShareStatus);
            socket.off('remote_video_toggled');
            socket.off('remote_audio_toggled');
        };
    }, [
        socket,
        receiveCall,
        createPeerConnection,
        markConnected,
        cleanupCall,
        setParticipants,
        setAvailableGroupCall,
        startWebRTC,
        addLocalTracksToPC,
        toggleRemoteSharingScreen,
        user,
    ]);

    useEffect(() => {
        const handleStartCall = async (e: Event) => {
            const {
                targetUser,
                callType,
                isGroup: group,
                conversationId: convoId,
            } = (e as CustomEvent).detail;
            if (useCallStore.getState().status !== 'idle' || !socket) return;

            console.log('Phát lệnh gọi điện:', { targetUser, callType, group });
            useCallStore.getState().initiateCall(targetUser, callType, group, convoId);

            if (group) {
                const availableCalls = useCallStore.getState().availableGroupCalls;
                const isExisting =
                    availableCalls[convoId] || (conversationId === convoId && status !== 'idle');

                if (isExisting) {
                    console.log('Tham gia cuộc gọi nhóm đang diễn ra:', convoId);
                    socket.emit('join_group_call', {
                        conversationId: convoId,
                        userInfo: {
                            _id: user?._id,
                            displayName: user?.displayName,
                            avatarUrl: user?.avatarUrl,
                        },
                    });
                } else {
                    socket.emit('start_group_call', {
                        conversationId: convoId,
                        callType,
                        callerInfo: {
                            _id: user?._id,
                            displayName: user?.displayName,
                            avatarUrl: user?.avatarUrl,
                        },
                        groupInfo: targetUser,
                    });
                }
                markConnected();
                await setupMedia(callType);
            } else {
                await startWebRTC(targetUser._id, callType, true);
            }
        };
        window.addEventListener('start_webrtc_call', handleStartCall);
        return () => window.removeEventListener('start_webrtc_call', handleStartCall);
    }, [user, startWebRTC, markConnected, socket]);

    const acceptCall = async () => {
        if (!type || !socket) return;

        markConnected();
        callStartTimeRef.current = Date.now();
        await setupMedia(type);

        if (isGroup && conversationId) {
            console.log('Tham gia cuộc gọi nhóm:', conversationId);
            socket.emit('join_group_call', {
                conversationId,
                userInfo: {
                    _id: user?._id,
                    displayName: user?.displayName,
                    avatarUrl: user?.avatarUrl,
                },
            });
            // The server will broadcast group_participants_updated
            // which will trigger startWebRTC for everyone via handleParticipantsUpdated
        } else if (remoteUser && incomingOffer) {
            const pc = createPeerConnection(remoteUser._id);
            addLocalTracksToPC(pc);

            await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('answer_call', {
                targetId: remoteUser._id,
                signalData: answer,
            });
        }
    };

    const endCall = async () => {
        if (isGroup && conversationId) {
            socket?.emit('leave_group_call', { conversationId });
            await cleanupCall('ended');
        } else if (remoteUser) {
            socket?.emit('end_call', { targetId: remoteUser._id });
            await cleanupCall(status === 'calling' ? 'missed' : 'ended');
        } else {
            await cleanupCall();
        }
    };

    const toggleAudio = async () => {
        let currentStream = localStreamRef.current;
        if (!currentStream || currentStream.getAudioTracks().length === 0) {
            console.log('[Media] No audio track, requesting...');
            currentStream = await setupMedia('audio');
            if (!currentStream) return;
        }

        const track = currentStream.getAudioTracks()[0];
        if (track) {
            const newEnabledState = !track.enabled;
            track.enabled = newEnabledState;
            setIsAudioMuted(!newEnabledState);
            console.log(`[Media] Mic toggled: ${newEnabledState ? 'ON' : 'OFF'}`);

            socket?.emit('toggle_audio', {
                targetId: isGroup ? undefined : remoteUser?._id,
                conversationId: isGroup ? conversationId : undefined,
                isMuted: !newEnabledState,
            });
        }
    };

    const toggleVideo = async () => {
        let currentStream = localStreamRef.current;
        let videoTrack = currentStream?.getVideoTracks()[0];

        // If no video track exists (audio-only call initially), request it
        if (!videoTrack) {
            try {
                console.log('[Media] No video track, requesting...');
                currentStream = await setupMedia('video');
                if (!currentStream) return;
                videoTrack = currentStream.getVideoTracks()[0];

                if (videoTrack) {
                    await replaceVideoTrack(videoTrack);
                }
            } catch (err) {
                console.error('Lỗi bật camera:', err);
                toast.error('Không thể truy cập Camera');
                return;
            }
        }

        if (videoTrack) {
            const newEnabledState = !videoTrack.enabled;
            videoTrack.enabled = newEnabledState;
            setIsVideoMuted(!newEnabledState);
            console.log(`[Media] Camera toggled: ${newEnabledState ? 'ON' : 'OFF'}`);

            socket?.emit('toggle_video', {
                targetId: isGroup ? undefined : remoteUser?._id,
                conversationId: isGroup ? conversationId : undefined,
                isMuted: !newEnabledState,
            });
        }
    };

    if (status === 'idle') return null;

    return (
        <div className='fixed inset-0 z-1000 flex flex-col w-screen h-screen bg-[#0a0a0f] overflow-hidden animate-in fade-in duration-700'>
            {/* Ambient Background Glows - Ultra Premium */}
            <div className='absolute inset-0 overflow-hidden pointer-events-none'>
                <div className='absolute -top-[20%] -left-[15%] w-[70%] h-[70%] bg-violet-600/15 rounded-full blur-[200px] opacity-60' />
                <div className='absolute -bottom-[20%] -right-[15%] w-[70%] h-[70%] bg-emerald-600/10 rounded-full blur-[200px] opacity-50' />
                <div className='absolute top-[30%] left-1/2 -translate-x-1/2 w-[50%] h-[50%] bg-blue-600/8 rounded-full blur-[180px] opacity-40' />
            </div>

            <div className='relative flex flex-col w-screen h-screen overflow-hidden'>
                {/* Dynamic Ambient Blur Backdrop */}
                <div className='absolute inset-0 -z-10 overflow-hidden'>
                    <div
                        className='absolute inset-0 scale-[1.5] blur-[120px] opacity-15 transition-all duration-1000'
                        style={{
                            backgroundImage: `url(${remoteUser?.avatarUrl || '/default-avatar.png'})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />
                    <div className='absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/80 via-transparent to-[#0a0a0f]/90' />
                </div>

                {/* Header (Messenger Style) - Hidden on mobile when not connected, hidden when fullscreen */}
                <div
                    className={cn(
                        'absolute top-8 left-8 right-8 z-50 flex items-center justify-between transition-all duration-700',
                        isFullscreen && 'hidden',
                        controlsVisible
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 -translate-y-8 pointer-events-none',
                        status !== 'connected' && 'hidden md:flex'
                    )}
                >
                    <div className='flex items-center gap-5 p-3 pr-6 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.3)] group/header cursor-default transition-all hover:bg-white/10 hover:border-white/20'>
                        <div className='relative ml-1'>
                            <UserAvatar
                                type='chat'
                                name={remoteUser?.displayName || '?'}
                                avatarUrl={remoteUser?.avatarUrl}
                                className='size-14 ring-4 ring-white/10 shadow-2xl transition-all duration-500 group-hover/header:scale-105 group-hover/header:rotate-6'
                            />
                            {status === 'connected' && (
                                <div className='absolute -bottom-1 -right-1 size-4 bg-emerald-500 border-4 border-[#0d0d0d] rounded-full shadow-lg' />
                            )}
                        </div>
                        <div className='flex flex-col gap-0.5'>
                            <div className='flex items-center gap-2'>
                                <span className='text-white font-black text-[17px] tracking-tight'>
                                    {remoteUser?.displayName}
                                </span>
                                <div className='flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full'>
                                    <div className='size-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)]' />
                                    <span className='text-[8px] font-black text-emerald-500 uppercase tracking-widest'>
                                        Bảo mật
                                    </span>
                                </div>
                            </div>
                            <div className='flex items-center gap-2'>
                                <span className='text-[10px] text-white/40 font-black uppercase tracking-widest flex items-center gap-2'>
                                    {isGroup
                                        ? participants.length <= 1
                                            ? 'Đang tìm mọi người...'
                                            : `Gọi nhóm • ${participants.length} đang tham gia`
                                        : 'Cuộc gọi riêng'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Initial Call Screens (Calling/Receiving) - Premium Redesign */}
                {status !== 'connected' && (
                    <div className='flex-1 flex flex-col items-center justify-center w-full z-10 animate-in fade-in duration-700 px-6'>
                        <div className='flex flex-col items-center gap-8'>
                            {/* Avatar with Ripple Rings */}
                            <div
                                className='relative flex items-center justify-center'
                                style={{ width: '200px', height: '200px' }}
                            >
                                {/* Ripple animations - pointer-events-none to not block clicks */}
                                {status === 'receiving' && (
                                    <>
                                        {/* Smooth expanding rings - no ping, use keyframe scale */}
                                        <div
                                            className='absolute inset-[-15px] rounded-full border-2 border-emerald-500/30 pointer-events-none'
                                            style={{
                                                animation: 'rippleOut 2.4s ease-out infinite',
                                            }}
                                        />
                                        <div
                                            className='absolute inset-[-38px] rounded-full border border-emerald-500/18 pointer-events-none'
                                            style={{
                                                animation: 'rippleOut 2.4s ease-out 0.6s infinite',
                                            }}
                                        />
                                        <div
                                            className='absolute inset-[-60px] rounded-full border border-emerald-500/10 pointer-events-none'
                                            style={{
                                                animation: 'rippleOut 2.4s ease-out 1.2s infinite',
                                            }}
                                        />
                                    </>
                                )}
                                {status === 'calling' && (
                                    <>
                                        <div
                                            className='absolute inset-[-15px] rounded-full border-2 border-blue-500/30 pointer-events-none'
                                            style={{
                                                animation: 'rippleOut 2.4s ease-out infinite',
                                            }}
                                        />
                                        <div
                                            className='absolute inset-[-38px] rounded-full border border-blue-500/18 pointer-events-none'
                                            style={{
                                                animation: 'rippleOut 2.4s ease-out 0.6s infinite',
                                            }}
                                        />
                                        <div
                                            className='absolute inset-[-60px] rounded-full border border-blue-500/10 pointer-events-none'
                                            style={{
                                                animation: 'rippleOut 2.4s ease-out 1.2s infinite',
                                            }}
                                        />
                                    </>
                                )}
                                {/* Glow behind avatar */}
                                <div
                                    className={cn(
                                        'absolute inset-[-40%] rounded-full blur-[100px] pointer-events-none',
                                        status === 'receiving'
                                            ? 'bg-emerald-500/25'
                                            : 'bg-blue-500/25'
                                    )}
                                    style={{ animationDuration: '3s' }}
                                />
                                {/* Static soft ring */}
                                <div
                                    className={cn(
                                        'absolute inset-[-4px] rounded-full pointer-events-none',
                                        status === 'receiving'
                                            ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/5'
                                            : 'bg-gradient-to-b from-blue-500/20 to-blue-500/5'
                                    )}
                                />
                                {/* Avatar */}
                                <UserAvatar
                                    type='chat'
                                    name={remoteUser?.displayName || '?'}
                                    avatarUrl={remoteUser?.avatarUrl || undefined}
                                    className='size-44 md:size-48 ring-[3px] ring-white/20 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative z-10'
                                />
                            </div>

                            {/* Name & Status */}
                            <div className='text-center space-y-4'>
                                <h1 className='text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-none'>
                                    {remoteUser?.displayName}
                                </h1>
                                <div className='flex items-center justify-center gap-2'>
                                    <div
                                        className={cn(
                                            'flex items-center gap-2.5 px-5 py-2 rounded-full text-[15px] font-medium',
                                            status === 'receiving'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'size-2.5 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)]',
                                                status === 'receiving'
                                                    ? 'bg-emerald-400'
                                                    : 'bg-blue-400'
                                            )}
                                        />
                                        <span>
                                            {status === 'calling'
                                                ? 'Đang gọi...'
                                                : isGroup
                                                  ? 'Cuộc gọi nhóm đến'
                                                  : 'Cuộc gọi đến'}
                                        </span>
                                    </div>
                                </div>
                                {/* Call type indicator */}
                                <p className='text-white/25 text-[11px] font-semibold uppercase tracking-[0.2em] mt-1'>
                                    {type === 'video' ? '📹 Video Call' : '📞 Audio Call'}
                                    {isGroup &&
                                        ` • ${participants.length > 0 ? participants.length + ' thành viên' : 'Nhóm'}`}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className={cn(
                        'flex-1 w-full h-full transition-all duration-700 overflow-hidden',
                        status === 'connected'
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 scale-95 pointer-events-none'
                    )}
                >
                    <div
                        className={cn(
                            'w-full h-full flex flex-col relative',
                            sharingUserId ? 'lg:flex-row gap-2' : 'lg:flex-row gap-0',
                            !sharingUserId &&
                                isGroup &&
                                'flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 p-2 sm:p-4'
                        )}
                    >
                        {/* Main Sharing Area */}
                        {sharingUserId && (
                            <div
                                id='sharing-container'
                                className={cn(
                                    'flex-1 min-h-0 lg:flex-1 lg:h-full bg-black relative rounded-2xl border border-white/5 transition-all duration-500',
                                    isFullscreen &&
                                        'fixed inset-0 z-[200] h-screen w-screen rounded-none border-0'
                                )}
                            >
                                {/* Video content - overflow hidden only here */}
                                <div className='absolute inset-0 overflow-hidden rounded-[inherit]'>
                                    {String(sharingUserId) === String(user?._id) ? (
                                        <div className='relative w-full h-full bg-zinc-950'>
                                            <video
                                                ref={localVideoShareRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className='w-full h-full object-contain'
                                            />
                                        </div>
                                    ) : (
                                        (() => {
                                            const sharerId = String(sharingUserId);
                                            const sharer =
                                                participants.find(
                                                    (p) => String(p._id) === sharerId
                                                ) ||
                                                (remoteUser && String(remoteUser._id) === sharerId
                                                    ? remoteUser
                                                    : null);
                                            return (
                                                <RemoteVideo
                                                    key={`sharing-${sharerId}-${streamsUpdate[sharerId]}`}
                                                    stream={remoteStreams[sharerId]}
                                                    user={sharer || undefined}
                                                    isMuted={false}
                                                    isFull={true}
                                                    lastUpdate={streamsUpdate[sharerId]}
                                                    objectFit='contain'
                                                    hideLabel={true}
                                                />
                                            );
                                        })()
                                    )}
                                </div>

                                {/* Sharing Overlay - outside overflow-hidden */}
                                <div className='absolute bottom-4 left-4 flex items-center gap-3 px-4 py-2 bg-zinc-900/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl z-30'>
                                    <div className='flex gap-0.5 items-end h-3 mb-0.5'>
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className='w-1 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                                                style={{
                                                    height: `${30 + Math.random() * 70}%`,
                                                    animationDelay: `${i * 0.15}s`,
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <span className='text-[11px] text-white font-bold tracking-tight'>
                                        {String(sharingUserId) === String(user?._id)
                                            ? 'Bạn đang trình bày'
                                            : `${participants.find((p) => String(p._id) === String(sharingUserId))?.displayName || remoteUser?.displayName || 'Người dùng'} đang trình bày`}
                                    </span>
                                </div>

                                {/* Fullscreen Toggle Button - uses onPointerDown to fire before window mousedown listener */}
                                <button
                                    type='button'
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setIsFullscreen((prev) => !prev);
                                    }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                    }}
                                    className={cn(
                                        'absolute size-12 flex items-center justify-center bg-black/60 hover:bg-black/80 backdrop-blur-xl rounded-full text-white transition-all z-[210] border border-white/20 cursor-pointer',
                                        isFullscreen ? 'top-6 right-6' : 'top-4 right-4'
                                    )}
                                >
                                    {isFullscreen ? (
                                        <Minimize2 className='size-5' />
                                    ) : (
                                        <Maximize2 className='size-5' />
                                    )}
                                </button>
                            </div>
                        )}

                        <div
                            className={cn(
                                'no-scrollbar shrink-0 pb-20',
                                isFullscreen && 'hidden',
                                sharingUserId
                                    ? 'grid grid-cols-2 lg:flex lg:flex-col lg:w-72 lg:h-full lg:pr-2 gap-2 p-2 mt-2 max-h-[25vh] sm:max-h-[30vh] lg:max-h-full overflow-y-auto'
                                    : !isGroup
                                      ? 'absolute inset-0 z-0'
                                      : 'contents'
                            )}
                        >
                            {/* Local Video */}
                            {Boolean(sharingUserId || isGroup) && (
                                <div
                                    className={cn(
                                        'relative bg-zinc-950/60 rounded-2xl md:rounded-xl overflow-hidden border border-white/5 shadow-2xl group',
                                        sharingUserId ? 'aspect-square' : 'w-full flex-1 min-h-0'
                                    )}
                                >
                                    <video
                                        ref={localVideoGridRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className={cn(
                                            'w-full h-full object-cover mirror transition-all duration-700',
                                            isVideoMuted && 'grayscale blur-3xl opacity-20'
                                        )}
                                    />
                                    {isVideoMuted && (
                                        <div className='absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/60'>
                                            <div className='relative'>
                                                <div className='absolute inset-[-30%] bg-white/5 rounded-full blur-2xl' />
                                                <UserAvatar
                                                    type='chat'
                                                    name={user?.displayName || 'Bạn'}
                                                    avatarUrl={user?.avatarUrl}
                                                    className='size-40 border-4 border-white/10 shadow-2xl transition-transform hover:scale-105 duration-500'
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {/* Mute toggle indicator - VIP Styled */}
                                    <div className='absolute bottom-4 left-4 right-4 flex items-center justify-between z-30 transition-all duration-500'>
                                        <div className='flex items-center gap-2.5 px-3.5 py-1.5 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg'>
                                            <div className='size-2 bg-white rounded-full' />
                                            <span className='text-[11px] text-white font-black tracking-wide'>
                                                Bạn
                                            </span>
                                        </div>
                                        <div className='flex gap-1.5'>
                                            {isAudioMuted && (
                                                <div className='p-2 bg-red-500/20 backdrop-blur-xl rounded-xl border border-red-500/30 shadow-lg'>
                                                    <MicOff className='size-3.5 text-red-500' />
                                                </div>
                                            )}
                                            {isVideoMuted && (
                                                <div className='p-2 bg-red-500/20 backdrop-blur-xl rounded-xl border border-red-500/30 shadow-lg'>
                                                    <VideoOff className='size-3.5 text-red-500' />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Remote Videos */}
                            {(isGroup && Array.isArray(participants)
                                ? participants.filter((p) => p._id !== user?._id)
                                : [remoteUser].filter(Boolean)
                            ).map((participant) => {
                                const pid = String(participant!._id);

                                return (
                                    <div
                                        key={`${pid}-${streamsUpdate[pid]}`}
                                        className={cn(
                                            'relative bg-zinc-950/60 rounded-2xl overflow-hidden border border-white/5 shadow-2xl group transition-all duration-500',
                                            sharingUserId
                                                ? 'aspect-square'
                                                : !isGroup
                                                  ? 'absolute inset-0 w-full h-full bg-black'
                                                  : 'flex-1 min-h-0'
                                        )}
                                    >
                                        <RemoteVideo
                                            stream={
                                                String(sharingUserId) === pid
                                                    ? undefined
                                                    : remoteStreams[pid]
                                            }
                                            user={participant || undefined}
                                            isMuted={remoteVideoMutes[pid]}
                                            isFull={!sharingUserId}
                                            lastUpdate={streamsUpdate[pid]}
                                            hideLabel={true}
                                        />

                                        {/* VIP Participant Label Overlay */}
                                        <div className='absolute bottom-4 left-4 right-4 flex items-center justify-between z-30 transition-all duration-500'>
                                            <div className='flex items-center gap-2.5 px-3.5 py-1.5 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg group-hover:bg-black/60'>
                                                <div className='relative'>
                                                    <div className='size-2 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)]' />
                                                </div>
                                                <span className='text-[11px] text-white font-black tracking-wide truncate max-w-[120px]'>
                                                    {participant?.displayName}
                                                </span>
                                            </div>
                                            <div className='flex gap-1.5'>
                                                {remoteAudioMutes[pid] && (
                                                    <div className='p-2 bg-red-500/20 backdrop-blur-xl rounded-xl border border-red-500/30 shadow-lg shadow-red-500/10'>
                                                        <MicOff className='size-3.5 text-red-500' />
                                                    </div>
                                                )}
                                                {(remoteVideoMutes[pid] ||
                                                    (!!remoteStreams[pid] &&
                                                        remoteStreams[pid]
                                                            .getVideoTracks()
                                                            .every((t) => !t.enabled))) && (
                                                    <div className='p-2 bg-red-500/20 backdrop-blur-xl rounded-xl border border-red-500/30 shadow-lg shadow-red-500/10'>
                                                        <VideoOff className='size-3.5 text-red-500' />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ALWAYS render remote streams as hidden videos for audio support */}
                <div className='hidden'>
                    {Object.entries(remoteStreams).map(([id, stream]) => (
                        <video
                            key={`audio-${id}`}
                            autoPlay
                            playsInline
                            ref={(el) => {
                                if (el) el.srcObject = stream;
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Floating Local Video for 1-on-1 Calls (Messenger Style) */}
            {!isGroup && !sharingUserId && (
                <div className='absolute bottom-48 sm:bottom-32 right-4 sm:right-6 w-28 sm:w-32 h-40 sm:h-44 lg:w-72 lg:h-96 z-40 animate-in fade-in zoom-in slide-in-from-bottom-10 duration-700'>
                    <div className='relative w-full h-full bg-[#121212] border border-white/10 rounded-4xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] group transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]'>
                        <video
                            ref={localVideoFloatingRef}
                            autoPlay
                            playsInline
                            muted
                            className={cn(
                                'w-full h-full object-cover mirror transition-all duration-700',
                                isVideoMuted && 'opacity-0 scale-95'
                            )}
                        />
                        {isVideoMuted && (
                            <div
                                className='absolute inset-0 flex items-center justify-center bg-[#1a1a1a] cursor-pointer group/preview transition-all duration-500 hover:bg-[#222]'
                                onClick={toggleVideo}
                            >
                                <div className='relative flex flex-col items-center justify-center'>
                                    <div className='relative'>
                                        <div className='absolute inset-[-20%] bg-primary/20 rounded-full blur-2xl opacity-0 group-hover/preview:opacity-100 transition-opacity' />
                                        <UserAvatar
                                            type='chat'
                                            name={user?.displayName || 'Bạn'}
                                            avatarUrl={user?.avatarUrl}
                                            className='size-20 lg:size-28 ring-4 ring-white/5 shadow-2xl relative z-10 transition-transform duration-500 group-hover/preview:scale-105'
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        {!isVideoMuted && (
                            <div
                                className='absolute top-2 right-2 z-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'
                                onClick={toggleVideo}
                            >
                                <Button
                                    size='icon'
                                    variant='secondary'
                                    className='size-8 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60'
                                >
                                    <VideoOff className='size-4 text-white' />
                                </Button>
                            </div>
                        )}
                        <div className='absolute bottom-4 left-4 right-4 flex items-center justify-between z-30 transition-all duration-500'>
                            <div className='flex items-center gap-2.5 px-3.5 py-1.5 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg'>
                                <div className='size-2 bg-white rounded-full' />
                                <span className='text-[11px] text-white font-black tracking-wide'>
                                    {status === 'connected' ? 'Bạn' : 'Đang kết nối...'}
                                </span>
                            </div>
                            <div className='flex gap-1.5'>
                                {isAudioMuted && (
                                    <div className='p-2 bg-red-500/20 backdrop-blur-xl rounded-xl border border-red-500/30 shadow-lg'>
                                        <MicOff className='size-3.5 text-red-500' />
                                    </div>
                                )}
                                {isVideoMuted && (
                                    <div className='p-2 bg-red-500/20 backdrop-blur-xl rounded-xl border border-red-500/30 shadow-lg'>
                                        <VideoOff className='size-3.5 text-red-500' />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Controls - Messenger Style Capsules */}
            <div
                className={cn(
                    'fixed bottom-0 left-0 right-0 z-[60] transition-all duration-700 pb-10 pt-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent',
                    isFullscreen && 'hidden',
                    controlsVisible
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-12 pointer-events-none'
                )}
            >
                <div className='flex justify-center'>
                    {status === 'receiving' ? (
                        <div className='flex items-center justify-center gap-20 md:gap-28 w-full max-w-md mx-auto px-10 animate-in slide-in-from-bottom-12 duration-700'>
                            {/* Decline */}
                            <div className='flex flex-col items-center gap-3'>
                                <Button
                                    onClick={() => {
                                        socket?.emit('reject_call', { callerId: remoteUser?._id });
                                        cleanupCall('rejected');
                                    }}
                                    className='size-[72px] rounded-full bg-gradient-to-b from-red-400 to-red-600 text-white hover:from-red-300 hover:to-red-500 border-0 transition-all duration-300 hover:scale-110 active:scale-90 shadow-[0_8px_40px_rgba(239,68,68,0.4)] group relative z-10'
                                >
                                    <PhoneOff className='size-8 group-hover:rotate-[135deg] transition-transform duration-500' />
                                </Button>
                                <span className='text-[13px] font-semibold text-white/50 tracking-wide'>
                                    Từ chối
                                </span>
                            </div>

                            {/* Accept */}
                            <div className='flex flex-col items-center gap-3'>
                                <div className='relative'>
                                    {/* Glowing rings (no ping blink) */}
                                    <div
                                        className='absolute inset-[-10px] rounded-full border-2 border-emerald-400/30 pointer-events-none'
                                        style={{ animation: 'rippleOut 2s ease-out infinite' }}
                                    />
                                    <div
                                        className='absolute inset-[-22px] rounded-full border border-emerald-400/15 pointer-events-none'
                                        style={{ animation: 'rippleOut 2s ease-out 0.5s infinite' }}
                                    />
                                    <Button
                                        onClick={acceptCall}
                                        className='size-[80px] rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 text-white hover:from-emerald-300 hover:to-emerald-500 border-0 transition-all duration-300 hover:scale-110 active:scale-90 shadow-[0_8px_50px_rgba(16,185,129,0.5)] relative z-10 group'
                                    >
                                        {type === 'video' ? (
                                            <Video className='size-9 fill-white relative z-10 group-hover:scale-110 transition-transform' />
                                        ) : (
                                            <PhoneCall className='size-9 fill-white relative z-10 group-hover:scale-110 transition-transform' />
                                        )}
                                    </Button>
                                </div>
                                <span className='text-[13px] font-semibold text-emerald-400 tracking-wide'>
                                    Trả lời
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className='flex items-center gap-2 md:gap-4 p-2 md:p-3.5 bg-zinc-950/40 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.6)] group/bar transition-all hover:bg-zinc-950/60 hover:border-white/20'>
                            <Button
                                onClick={toggleAudio}
                                variant='ghost'
                                className={cn(
                                    'size-12 md:size-14 rounded-full transition-all duration-500 border-0 relative overflow-hidden group/btn',
                                    isAudioMuted
                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                        : 'bg-white/5 text-white hover:bg-white/10'
                                )}
                            >
                                <div className='absolute inset-0 bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none' />
                                {isAudioMuted ? (
                                    <MicOff className='size-5 md:size-6 transition-all group-hover/btn:scale-110' />
                                ) : (
                                    <Mic className='size-5 md:size-6 fill-current transition-all group-hover/btn:scale-110 group-hover/btn:-rotate-6' />
                                )}
                            </Button>

                            {(!isGroup || type === 'video') && (
                                <Button
                                    onClick={toggleVideo}
                                    variant='ghost'
                                    className={cn(
                                        'size-12 md:size-14 rounded-full transition-all duration-500 border-0 relative overflow-hidden group/btn',
                                        isVideoMuted
                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                            : 'bg-white/5 text-white hover:bg-white/10'
                                    )}
                                >
                                    <div className='absolute inset-0 bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none' />
                                    {isVideoMuted ? (
                                        <VideoOff className='size-5 md:size-6 transition-all group-hover/btn:scale-110' />
                                    ) : (
                                        <Video className='size-5 md:size-6 fill-current transition-all group-hover/btn:scale-110 group-hover/btn:rotate-6' />
                                    )}
                                </Button>
                            )}

                            <Button
                                onClick={toggleScreenShare}
                                variant='ghost'
                                className={cn(
                                    'size-12 md:size-14 rounded-full transition-all duration-500 border-0 relative overflow-hidden group/btn',
                                    isSharingScreen
                                        ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-[0_0_30px_rgba(59,130,246,0.5)]'
                                        : 'bg-white/5 text-white hover:bg-white/10'
                                )}
                            >
                                <Monitor className='size-5 md:size-6 transition-all group-hover/btn:scale-110' />
                            </Button>

                            {isGroup && (
                                <Button
                                    onClick={() => setShowParticipants(!showParticipants)}
                                    variant='ghost'
                                    className={cn(
                                        'size-12 md:size-14 rounded-full transition-all duration-500 border-0 relative overflow-hidden group/btn',
                                        showParticipants
                                            ? 'bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                                            : 'bg-white/5 text-white hover:bg-white/10'
                                    )}
                                >
                                    <Users className='size-5 md:size-6 transition-all group-hover/btn:scale-110' />
                                </Button>
                            )}

                            <div className='w-px h-8 bg-white/10 mx-0.5 md:mx-1' />

                            <Button
                                onClick={endCall}
                                className='size-12 md:size-14 rounded-full bg-red-500 text-white shadow-[0_0_40px_rgba(239,68,68,0.4)] transition-all hover:scale-110 hover:bg-red-600 active:scale-90 border-0 group/end'
                            >
                                <PhoneOff className='size-5 md:size-6 fill-white group-hover:rotate-135 transition-all duration-500' />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar */}
            {showParticipants && isGroup && (
                <div className='absolute right-4 top-4 bottom-28 w-72 bg-zinc-950/80 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl overflow-y-auto z-50 animate-in slide-in-from-right-10 duration-500'>
                    <div className='flex items-center justify-between mb-6'>
                        <h3 className='text-xs font-bold text-white/40 uppercase tracking-[0.2em]'>
                            Thành viên ({participants.length})
                        </h3>
                    </div>
                    <div className='space-y-5'>
                        {participants.map((p) => (
                            <div
                                key={p._id}
                                className='flex items-center justify-between group/user'
                            >
                                <div className='flex items-center gap-3'>
                                    <div className='relative'>
                                        <UserAvatar
                                            type='chat'
                                            name={p.displayName}
                                            avatarUrl={p.avatarUrl || undefined}
                                            className='size-10 border border-white/5'
                                        />
                                        {remoteStreams[p._id] && (
                                            <span className='absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-zinc-950 rounded-full' />
                                        )}
                                    </div>
                                    <span className='text-sm font-medium text-white/90 truncate max-w-[120px]'>
                                        {p.displayName} {p._id === user?._id && '(Bạn)'}
                                    </span>
                                </div>
                                <div className='flex items-center gap-2'>
                                    {remoteAudioMutes[p._id] && (
                                        <MicOff className='size-4 text-red-500' />
                                    )}
                                    {remoteVideoMutes[p._id] && (
                                        <VideoOff className='size-4 text-red-500' />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallManager;
