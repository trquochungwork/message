import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useChatStore } from '../../stores/useChatStore.ts';
import { useAuthStore } from '../../stores/useAuthStores.ts';
import type { Conversation } from '../../types/chat.ts';
import UserAvatar from './UserAvatar.tsx';
import StatusBadge from './StatusBadge.tsx';
import {
    Send,
    Phone,
    Video,
    MoreVertical,
    Trash2,
    UserMinus,
    Paperclip,
    ArrowDown,
    ShieldOff,
    ShieldX,
    Shield,
    Edit2,
    Smile,
    RotateCcw,
    MoreHorizontal,
    UserPlus,
    Settings,
    ArrowLeft,
    Mic,
} from 'lucide-react';
import { useCallStore } from '../../stores/useCallStore.ts';

import AudioPlayer from './AudioPlayer.tsx';
import VoiceRecorder from './VoiceRecorder.tsx';

import { cn, formatMessageTime } from '../../lib/utils.ts';
import { Button } from '../ui/button.tsx';
import { useSidebar, SidebarTrigger } from '../ui/sidebar.tsx';
import ConfirmDialog from '../ui/ConfirmDialog.tsx';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { Input } from '../ui/input.tsx';
import { chatService } from '../../services/chatSevice.ts';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu.tsx';
import AddMemberModal from './AddMemberModal.tsx';
import GroupSettingsModal from './GroupSettingsModal.tsx';

// ─── Message Item ─────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
const getMediaUrl = (url: string) => (url?.startsWith('http') ? url : `${API_BASE}${url}`);

const formatAttachmentSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MessageItem = memo(
    ({
        message,
        isOwn,
        showAvatar,
        senderName,
        senderAvatarUrl,
        otherUser,
        canRecall,
    }: {
        message: import('../../types/chat.ts').Message;
        isOwn: boolean;
        showAvatar: boolean;
        senderName?: string;
        senderAvatarUrl?: string | null;
        otherUser?: import('../../types/chat.ts').Participant | null;
        canRecall?: boolean;
    }) => {
        const { deleteMessageForMe, recallMessage } = useChatStore();

        const isEdited = !!message.editedAt;
        const timeLabel = formatMessageTime(new Date(message.createdAt));
        const fullTime = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(new Date(message.createdAt));

        const isRecalled = message.isRecalled;

        // Thu hồi chỉ trong ngày gửi (giờ VN)
        const toDateKey = (d: Date) =>
            new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(d);
        const canRecallToday = toDateKey(new Date(message.createdAt)) === toDateKey(new Date());
        const attachments = message.attachments || [];
        const images = attachments.filter((a) => a.mimeType.startsWith('image/'));
        const videos = attachments.filter((a) => a.mimeType.startsWith('video/'));
        const files = attachments.filter(
            (a) =>
                !a.mimeType.startsWith('image/') &&
                !a.mimeType.startsWith('video/') &&
                !a.mimeType.startsWith('audio/')
        );
        const hasAttachments = attachments.length > 0;
        const displayedSenderName = isOwn ? 'Bạn' : (senderName ?? '?');

        return (
            <div className={cn('flex items-end gap-2 group relative', isOwn && 'flex-row-reverse')}>
                <div className='size-8 shrink-0'>
                    {showAvatar && (
                        <UserAvatar
                            type='chat'
                            name={displayedSenderName}
                            avatarUrl={senderAvatarUrl || undefined}
                            previewable={!isRecalled}
                        />
                    )}
                </div>

                <div
                    className={cn(
                        'flex flex-col gap-0.5 max-w-[85%] md:max-w-[70%]',
                        isOwn ? 'items-end' : 'items-start'
                    )}
                >
                    {showAvatar && displayedSenderName && (
                        <span className='text-xs text-muted-foreground px-1 mb-0.5'>
                            {displayedSenderName}
                        </span>
                    )}

                    {/* Images */}
                    {!isRecalled && images.length > 0 && (
                        <div
                            className={cn(
                                'flex flex-wrap gap-1 mb-0.5',
                                images.length === 1 ? '' : 'max-w-[320px]'
                            )}
                        >
                            {images.map((img, i) => (
                                <a
                                    key={i}
                                    href={getMediaUrl(img.url)}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='block rounded-xl overflow-hidden hover:opacity-90 transition-opacity shadow-sm'
                                >
                                    <img
                                        src={getMediaUrl(img.url)}
                                        alt={img.fileName}
                                        className={cn(
                                            'object-cover rounded-xl',
                                            images.length === 1
                                                ? 'max-h-64 max-w-full'
                                                : 'h-32 w-32'
                                        )}
                                        loading='lazy'
                                    />
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Videos */}
                    {!isRecalled &&
                        videos.map((vid, i) => (
                            <div key={i} className='mb-0.5 rounded-xl overflow-hidden shadow-sm'>
                                <video
                                    src={getMediaUrl(vid.url)}
                                    controls
                                    className='max-h-64 w-auto max-w-full block rounded-xl bg-black/5'
                                    preload='metadata'
                                />
                            </div>
                        ))}

                    {/* Audio Messages */}
                    {!isRecalled && message.messageType === 'audio' && (
                        <div className='mb-0.5 max-w-full'>
                            <AudioPlayer url={getMediaUrl(attachments[0]?.url)} isOwn={isOwn} />
                        </div>
                    )}

                    {/* Files */}
                    {!isRecalled && files.length > 0 && (
                        <div className='flex flex-col gap-0.5 mb-0.5'>
                            {files.map((file, i) => (
                                <a
                                    key={i}
                                    href={getMediaUrl(file.url)}
                                    download={file.fileName}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors border shadow-sm',
                                        isOwn
                                            ? 'bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary-foreground'
                                            : 'bg-muted/60 border-border/40 hover:bg-muted text-foreground'
                                    )}
                                >
                                    <div className='size-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0'>
                                        <span className='text-[10px] font-bold text-primary uppercase'>
                                            {file.fileName.split('.').pop()}
                                        </span>
                                    </div>
                                    <div className='flex-1 min-w-0 mx-1'>
                                        <p className='text-sm font-medium truncate leading-none mb-1'>
                                            {file.fileName}
                                        </p>
                                        <p className='text-[10px] text-muted-foreground leading-none'>
                                            {formatAttachmentSize(file.size)}
                                        </p>
                                    </div>
                                    <ArrowDown className='size-4 text-muted-foreground shrink-0' />
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Text content or media-only Dropdown */}
                    {(message.content || hasAttachments) && message.messageType !== 'call' && (
                        <div className='flex items-center gap-2 group/menu'>
                            {!isOwn && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            className='h-8 w-8 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 transition-opacity'
                                        >
                                            <MoreHorizontal className='size-4 text-muted-foreground' />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='start'>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                deleteMessageForMe(
                                                    message.conversationId,
                                                    message._id
                                                )
                                            }
                                        >
                                            <Trash2 className='mr-2 h-4 w-4 shrink-0' />
                                            <div className='flex flex-col'>
                                                <span>Gỡ đối với bạn</span>
                                                <span className='text-[10px] text-muted-foreground font-normal leading-tight max-w-[200px] whitespace-normal'>
                                                    Tin nhắn sẽ bị gỡ khỏi thiết bị của bạn, nhưng
                                                    vẫn hiển thị với các thành viên khác
                                                </span>
                                            </div>
                                        </DropdownMenuItem>
                                        {!isRecalled && canRecall && canRecallToday && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    recallMessage(
                                                        message.conversationId,
                                                        message._id
                                                    )
                                                }
                                                className='text-red-500'
                                            >
                                                <RotateCcw className='mr-2 h-4 w-4' />
                                                Thu hồi
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {message.content ? (
                                <div
                                    className={cn(
                                        'px-4 py-2 rounded-2xl text-sm message-bounce shadow-bubble leading-relaxed wrap-break-word relative group/content',
                                        isOwn
                                            ? 'chat-bubble-sent rounded-br-sm'
                                            : 'chat-bubble-received rounded-bl-sm',
                                        hasAttachments && 'mt-0.5',
                                        isRecalled &&
                                            'text-muted-foreground border border-border bg-transparent shadow-none italic opacity-70'
                                    )}
                                >
                                    {isRecalled ? 'Tin nhắn đã thu hồi' : message.content}
                                    {isEdited && !isRecalled && (
                                        <span className='text-[9px] opacity-70 ml-1 italic block text-right'>
                                            (đã chỉnh sửa)
                                        </span>
                                    )}
                                </div>
                            ) : isRecalled ? (
                                <div
                                    className={cn(
                                        'px-4 py-2 rounded-2xl text-sm message-bounce shadow-bubble leading-relaxed wrap-break-word',
                                        isOwn
                                            ? 'chat-bubble-sent rounded-br-sm'
                                            : 'chat-bubble-received rounded-bl-sm',
                                        hasAttachments && 'mt-0.5',
                                        'text-muted-foreground border border-border bg-transparent shadow-none italic opacity-70'
                                    )}
                                >
                                    Tin nhắn đã thu hồi
                                </div>
                            ) : null}

                            {isOwn && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            className='h-8 w-8 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 transition-opacity'
                                        >
                                            <MoreHorizontal className='size-4 text-muted-foreground' />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='end'>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                deleteMessageForMe(
                                                    message.conversationId,
                                                    message._id
                                                )
                                            }
                                        >
                                            <Trash2 className='mr-2 h-4 w-4 shrink-0' />
                                            <div className='flex flex-col'>
                                                <span>Gỡ đối với bạn</span>
                                                <span className='text-[10px] text-muted-foreground font-normal leading-tight max-w-[200px] whitespace-normal'>
                                                    Tin nhắn sẽ bị gỡ khỏi thiết bị của bạn, nhưng
                                                    vẫn hiển thị với các thành viên khác
                                                </span>
                                            </div>
                                        </DropdownMenuItem>
                                        {!isRecalled && canRecall && canRecallToday && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    recallMessage(
                                                        message.conversationId,
                                                        message._id
                                                    )
                                                }
                                                className='text-red-500'
                                            >
                                                <RotateCcw className='mr-2 h-4 w-4' />
                                                Thu hồi
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    )}

                    {/* Call Message */}
                    {message.messageType === 'call' && message.callInfo && (
                        <div
                            className={cn(
                                'flex flex-col gap-3 p-3 rounded-2xl w-56 text-sm message-bounce shadow-bubble border border-border/30',
                                isOwn
                                    ? 'bg-card dark:bg-zinc-800/80 text-card-foreground rounded-br-sm'
                                    : 'bg-card dark:bg-zinc-800/80 text-card-foreground rounded-bl-sm'
                            )}
                        >
                            <div className='flex items-center gap-3'>
                                <div
                                    className={cn(
                                        'size-10 rounded-full flex items-center justify-center shrink-0',
                                        message.callInfo.status === 'missed' ||
                                            message.callInfo.status === 'rejected'
                                            ? 'bg-red-500/10 text-red-500' // Giảm opacity màu nền cho light mode đẹp hơn
                                            : 'bg-primary/10 text-primary'
                                    )}
                                >
                                    {message.callInfo.callType === 'video' ? (
                                        <Video className='size-5' />
                                    ) : (
                                        <Phone className='size-5' />
                                    )}
                                </div>
                                <div className='flex flex-col min-w-0 flex-1'>
                                    <span
                                        className={cn(
                                            'font-semibold truncate',
                                            (message.callInfo.status === 'missed' ||
                                                message.callInfo.status === 'rejected') &&
                                                'text-red-500'
                                        )}
                                    >
                                        {message.content}
                                    </span>
                                    <span className='text-xs opacity-70'>
                                        {message.callInfo.status === 'ended' &&
                                        message.callInfo.duration > 0
                                            ? `${Math.floor(message.callInfo.duration / 60)} phút ${message.callInfo.duration % 60} giây`
                                            : timeLabel}
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant='secondary'
                                size='sm'
                                className='w-full rounded-xl font-medium shadow-none h-8 transition-smooth bg-muted hover:bg-muted/80 text-foreground'
                                disabled={!otherUser}
                                onClick={() => {
                                    if (otherUser) {
                                        window.dispatchEvent(
                                            new CustomEvent('start_webrtc_call', {
                                                detail: {
                                                    targetUser: otherUser,
                                                    callType: message.callInfo?.callType || 'audio',
                                                },
                                            })
                                        );
                                    }
                                }}
                            >
                                Gọi lại
                            </Button>
                        </div>
                    )}

                    {/* Nếu không có content và không có attachments thì fallback */}
                    {!message.content && !hasAttachments && message.messageType !== 'call' && (
                        <div
                            className={cn(
                                'px-4 py-2 rounded-2xl text-sm message-bounce shadow-bubble leading-relaxed',
                                isOwn
                                    ? 'chat-bubble-sent rounded-br-sm'
                                    : 'chat-bubble-received rounded-bl-sm'
                            )}
                        >
                            <span className='text-muted-foreground italic'>Tin nhắn trống</span>
                        </div>
                    )}

                    {/* Thời gian & Read receipts */}
                    <div
                        className={cn(
                            'flex items-center gap-1.5 px-1 opacity-0 group-hover:opacity-100 transition-smooth select-none',
                            isOwn ? 'flex-row-reverse' : 'flex-row'
                        )}
                    >
                        <span
                            title={fullTime}
                            className='text-[10px] text-muted-foreground cursor-default'
                        >
                            {timeLabel}
                        </span>
                        {isOwn && !isRecalled && message.seenBy && message.seenBy.length > 0 && (
                            <span className='text-[10px] text-primary font-medium'>Đã xem</span>
                        )}
                    </div>
                </div>
            </div>
        );
    }
);

MessageItem.displayName = 'MessageItem';

// ─── Date Separator ───────────────────────────────────────────────────────────
const DateSeparator = memo(({ date }: { date: Date }) => {
    const VN_TZ = 'Asia/Ho_Chi_Minh';
    const now = new Date();

    const todayVN = new Intl.DateTimeFormat('en-CA', {
        timeZone: VN_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
    const dateVN = new Intl.DateTimeFormat('en-CA', {
        timeZone: VN_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestVN = new Intl.DateTimeFormat('en-CA', {
        timeZone: VN_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(yest);

    let label: string;
    if (dateVN === todayVN) {
        label = 'Hôm nay';
    } else if (dateVN === yestVN) {
        label = 'Hôm qua';
    } else {
        const [y, m, d] = dateVN.split('-');
        label = `${d}/${m}/${y}`;
    }

    return (
        <div className='flex items-center gap-3 my-2 px-4'>
            <div className='flex-1 h-px bg-border/50' />
            <span className='text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted/60 select-none'>
                {label}
            </span>
            <div className='flex-1 h-px bg-border/50' />
        </div>
    );
});

DateSeparator.displayName = 'DateSeparator';

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyChat = () => (
    <div className='flex flex-col items-center justify-center h-full w-full gap-6 text-center p-8 relative'>
        <div className='absolute top-4 left-4 z-50 bg-background/80 hover:bg-background shadow-md border border-border/50 rounded-lg p-1 transition-all'>
            <SidebarTrigger className='size-8' />
        </div>
        <div className='size-24 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow'>
            <span className='text-4xl'>💬</span>
        </div>
        <div>
            <h2 className='text-xl font-bold text-foreground mb-2'>Chào mừng đến với Message</h2>
            <p className='text-muted-foreground text-sm max-w-xs'>
                Chọn một cuộc trò chuyện để bắt đầu nhắn tin, hoặc kết bạn mới để mở rộng mạng lưới
                của bạn.
            </p>
        </div>
    </div>
);

// ─── Chat Header ──────────────────────────────────────────────────────────────
const ChatHeader = ({
    convo,
    isOnline,
    currentUserId,
}: {
    convo: Conversation;
    isOnline: boolean;
    currentUserId: string;
}) => {
    const { friends, deleteConversation, blockUser, unblockUser, blockedUsers } = useChatStore();
    const [menuOpen, setMenuOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { unfriend, updateNickname } = useChatStore();
    const [showNicknameDialog, setShowNicknameDialog] = useState(false);
    const [nicknameValue, setNicknameValue] = useState('');
    const [showAddMember, setShowAddMember] = useState(false);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [showNicknameEmoji, setShowNicknameEmoji] = useState(false);
    const nicknameEmojiRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (nicknameEmojiRef.current && !nicknameEmojiRef.current.contains(e.target as Node)) {
                setShowNicknameEmoji(false);
            }
        };
        if (showNicknameEmoji) {
            document.addEventListener('mousedown', handler);
        }
        return () => document.removeEventListener('mousedown', handler);
    }, [showNicknameEmoji]);

    const isDirect = convo.type === 'direct';
    const otherUser = isDirect
        ? convo.participants.find((p) => p._id?.toString() !== currentUserId)
        : null;

    const myParticipant = convo.participants?.find((p: any) => p._id === currentUserId);
    const isOwnerOrAdmin =
        myParticipant && (myParticipant.role === 'owner' || myParticipant.role === 'admin');

    // Fallback: nếu participant chưa có displayName, tìm trong friends store
    const friendFallback =
        isDirect && otherUser?._id
            ? friends.find((f) => f._id.toString() === otherUser._id?.toString())
            : null;

    const name = isDirect
        ? otherUser?.nickname ||
          otherUser?.displayName ||
          friendFallback?.displayName ||
          'Người dùng'
        : (convo.group?.name ?? 'Nhóm');
    const avatarUrl = isDirect
        ? (otherUser?.avatarUrl ?? friendFallback?.avatarUrl ?? undefined)
        : (convo.group?.avatarUrl ?? undefined);

    const isBlocked = otherUser?._id
        ? blockedUsers.some((b) => b._id?.toString() === otherUser._id?.toString())
        : false;

    // Đóng menu khi click ra ngoài
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    const handleDelete = async () => {
        await deleteConversation(convo._id);
        setShowDeleteConfirm(false);
    };

    const handleBlock = async () => {
        if (!otherUser?._id) return;
        if (isBlocked) {
            await unblockUser(otherUser._id.toString());
        } else {
            await blockUser(otherUser._id.toString());
        }
        setShowBlockConfirm(false);
    };

    const handleUnfriend = async () => {
        if (!otherUser?._id) return;
        await unfriend(otherUser._id.toString());
    };

    const handleUpdateNickname = async () => {
        if (!otherUser?._id) return;
        await updateNickname(convo._id, otherUser._id.toString(), nicknameValue);
    };

    const { isMobile, toggleSidebar } = useSidebar();
    const { availableGroupCalls, status, conversationId } = useCallStore();
    const availableGroupCall = availableGroupCalls[convo._id];

    return (
        <>
            <div className='flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3 border-b border-border/50 glass-strong relative z-50'>
                {isMobile ? (
                    <Button
                        variant='ghost'
                        size='icon'
                        onClick={toggleSidebar}
                        className='size-8 text-muted-foreground'
                    >
                        <ArrowLeft className='size-5' />
                    </Button>
                ) : (
                    <SidebarTrigger />
                )}
                <div className='relative'>
                    <UserAvatar type='sidebar' name={name} avatarUrl={avatarUrl} previewable />
                    {isDirect && <StatusBadge status={isOnline ? 'online' : 'offline'} />}
                </div>
                <div className='flex-1 min-w-0'>
                    <h3 className='font-semibold text-foreground truncate'>{name}</h3>
                    <p className='text-xs text-muted-foreground'>
                        {isDirect
                            ? isOnline
                                ? '● Đang hoạt động'
                                : 'Offline'
                            : `${convo.participants.length} thành viên`}
                    </p>
                </div>
                <div className='flex items-center gap-1'>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='text-muted-foreground hover:text-foreground disabled:opacity-50'
                        disabled={(!isDirect && convo.type !== 'group') || !currentUserId}
                        onClick={() => {
                            if (availableGroupCall) {
                                // Nếu có cuộc gọi nhóm đang diễn ra, tham gia luôn
                                window.dispatchEvent(
                                    new CustomEvent('start_webrtc_call', {
                                        detail: {
                                            targetUser: {
                                                _id: convo._id,
                                                displayName: convo.group?.name || name,
                                                avatarUrl: avatarUrl,
                                            },
                                            callType: availableGroupCall.callType,
                                            isGroup: true,
                                            conversationId: convo._id,
                                        },
                                    })
                                );
                                return;
                            }
                            if (isDirect && otherUser) {
                                window.dispatchEvent(
                                    new CustomEvent('start_webrtc_call', {
                                        detail: {
                                            targetUser: otherUser,
                                            callType: 'audio',
                                            conversationId: convo._id,
                                        },
                                    })
                                );
                            } else if (convo.type === 'group') {
                                window.dispatchEvent(
                                    new CustomEvent('start_webrtc_call', {
                                        detail: {
                                            targetUser: {
                                                _id: convo._id,
                                                displayName: convo.group?.name || 'Nhóm',
                                                avatarUrl: convo.group?.avatarUrl,
                                            },
                                            callType: 'audio',
                                            isGroup: true,
                                            conversationId: convo._id,
                                        },
                                    })
                                );
                            }
                        }}
                    >
                        <Phone className='size-4' />
                    </Button>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='text-muted-foreground hover:text-foreground disabled:opacity-50'
                        disabled={(!isDirect && convo.type !== 'group') || !currentUserId}
                        onClick={() => {
                            if (availableGroupCall) {
                                window.dispatchEvent(
                                    new CustomEvent('start_webrtc_call', {
                                        detail: {
                                            targetUser: {
                                                _id: convo._id,
                                                displayName: convo.group?.name || name,
                                                avatarUrl: avatarUrl,
                                            },
                                            callType: 'video',
                                            isGroup: true,
                                            conversationId: convo._id,
                                        },
                                    })
                                );
                                return;
                            }
                            if (isDirect && otherUser) {
                                window.dispatchEvent(
                                    new CustomEvent('start_webrtc_call', {
                                        detail: {
                                            targetUser: otherUser,
                                            callType: 'video',
                                            conversationId: convo._id,
                                        },
                                    })
                                );
                            } else if (convo.type === 'group') {
                                window.dispatchEvent(
                                    new CustomEvent('start_webrtc_call', {
                                        detail: {
                                            targetUser: {
                                                _id: convo._id,
                                                displayName: convo.group?.name || 'Nhóm',
                                                avatarUrl: convo.group?.avatarUrl,
                                            },
                                            callType: 'video',
                                            isGroup: true,
                                            conversationId: convo._id,
                                        },
                                    })
                                );
                            }
                        }}
                    >
                        <Video className='size-4' />
                    </Button>

                    {/* Dropdown menu ba chấm */}
                    <div className='relative' ref={menuRef}>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='text-muted-foreground hover:text-foreground'
                            onClick={() => setMenuOpen((prev) => !prev)}
                        >
                            <MoreVertical className='size-4' />
                        </Button>

                        {menuOpen && (
                            <div className='absolute right-0 top-10 z-50 min-w-[200px] rounded-xl border border-border/60 bg-background/95 backdrop-blur-md shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-100'>
                                {isDirect && otherUser?._id && (
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            setShowBlockConfirm(true);
                                        }}
                                        className={cn(
                                            'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-muted/60',
                                            isBlocked ? 'text-green-500' : 'text-orange-500'
                                        )}
                                    >
                                        {isBlocked ? (
                                            <>
                                                <Shield className='size-4' />
                                                Bỏ chặn người dùng
                                            </>
                                        ) : (
                                            <>
                                                <ShieldOff className='size-4' />
                                                Chặn người dùng
                                            </>
                                        )}
                                    </button>
                                )}
                                {!isDirect && (
                                    <>
                                        {isOwnerOrAdmin && (
                                            <button
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    setShowAddMember(true);
                                                }}
                                                className='w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors border-b border-border/40'
                                            >
                                                <UserPlus className='size-4' />
                                                Thêm thành viên
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                setShowGroupSettings(true);
                                            }}
                                            className='w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors border-b border-border/40'
                                        >
                                            <Settings className='size-4' />
                                            Cài đặt nhóm
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setShowDeleteConfirm(true);
                                    }}
                                    className='w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors'
                                >
                                    <Trash2 className='size-4' />
                                    {isOwnerOrAdmin && myParticipant?.role === 'owner'
                                        ? 'Giải tán nhóm'
                                        : 'Xóa cuộc trò chuyện'}
                                </button>
                                {isDirect && otherUser?._id && (
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            setShowUnfriendConfirm(true);
                                        }}
                                        className='w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors'
                                    >
                                        <UserMinus className='size-4' />
                                        Hủy kết bạn
                                    </button>
                                )}
                                {isDirect && otherUser?._id && (
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            setNicknameValue(otherUser.nickname || '');
                                            setShowNicknameDialog(true);
                                        }}
                                        className='w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors border-t border-border/40'
                                    >
                                        <Edit2 className='size-4' />
                                        Đổi biệt danh
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {availableGroupCall && !(status !== 'idle' && conversationId === convo._id) && (
                <div className='flex items-center justify-between px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 animate-in slide-in-from-top duration-300'>
                    <div className='flex items-center gap-3'>
                        <div className='relative flex items-center justify-center size-8 bg-emerald-500/20 rounded-full'>
                            <div className='absolute inset-0 bg-emerald-500/30 rounded-full animate-ping' />
                            {availableGroupCall.callType === 'video' ? (
                                <Video className='size-4 text-emerald-500 relative' />
                            ) : (
                                <Phone className='size-4 text-emerald-500 relative' />
                            )}
                        </div>
                        <div className='flex flex-col'>
                            <span className='text-xs font-bold text-emerald-600 dark:text-emerald-400'>
                                Cuộc gọi{' '}
                                {availableGroupCall.callType === 'video' ? 'video' : 'thoại'} nhóm
                            </span>
                            <span className='text-[10px] text-emerald-500/70'>Đang diễn ra...</span>
                        </div>
                    </div>
                    <Button
                        size='sm'
                        className='bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-5 h-8 text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20'
                        onClick={() => {
                            window.dispatchEvent(
                                new CustomEvent('start_webrtc_call', {
                                    detail: {
                                        targetUser: {
                                            _id: convo._id,
                                            displayName: convo.group?.name || 'Nhóm',
                                            avatarUrl: avatarUrl,
                                        },
                                        callType: availableGroupCall.callType,
                                        isGroup: true,
                                        conversationId: convo._id,
                                    },
                                })
                            );
                        }}
                    >
                        Tham gia
                    </Button>
                </div>
            )}

            <ConfirmDialog
                open={showNicknameDialog}
                onOpenChange={setShowNicknameDialog}
                onConfirm={handleUpdateNickname}
                title='Đổi biệt danh'
                description={`Đặt biệt danh mới cho ${
                    otherUser?.displayName || friendFallback?.displayName
                }.`}
                confirmText='Lưu'
                variant='default'
            >
                <div className='mt-3 relative flex items-center gap-2'>
                    <div className='relative flex-1'>
                        <Input
                            value={nicknameValue}
                            onChange={(e) => setNicknameValue(e.target.value)}
                            placeholder='Nhập biệt danh...'
                            autoFocus
                        />
                    </div>
                    <div className='relative' ref={nicknameEmojiRef}>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='shrink-0 text-muted-foreground hover:text-primary'
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowNicknameEmoji((p) => !p);
                            }}
                            type='button'
                            title='Thêm biểu tượng cảm xúc'
                        >
                            <Smile className='size-5' />
                        </Button>
                        {showNicknameEmoji && (
                            <div className='absolute bottom-full right-0 mb-2 z-50 shadow-xl'>
                                <EmojiPicker
                                    onEmojiClick={(data: any) => {
                                        setNicknameValue((prev) => prev + data.emoji);
                                        setShowNicknameEmoji(false);
                                    }}
                                    theme={'auto' as EmojiTheme}
                                    searchDisabled
                                    skinTonesDisabled
                                />
                            </div>
                        )}
                    </div>
                </div>
            </ConfirmDialog>

            {/* Dialog xác nhận xóa */}
            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                onConfirm={handleDelete}
                title='Xóa cuộc trò chuyện'
                description={`Bạn có chắc muốn xóa toàn bộ cuộc trò chuyện với ${name}? Tất cả tin nhắn sẽ bị xóa vĩnh viễn.`}
                confirmText='Xóa'
                variant='destructive'
            />

            {/* Dialog xác nhận chặn/bỏ chặn */}
            {isDirect && otherUser?._id && (
                <ConfirmDialog
                    open={showBlockConfirm}
                    onOpenChange={setShowBlockConfirm}
                    onConfirm={handleBlock}
                    title={isBlocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng'}
                    description={
                        isBlocked
                            ? `Bỏ chặn ${name}? Họ có thể nhắn tin cho bạn trở lại.`
                            : `Chặn ${name}? Bạn và họ sẽ không thể nhắn tin cho nhau.`
                    }
                    confirmText={isBlocked ? 'Bỏ chặn' : 'Chặn'}
                    variant={isBlocked ? 'default' : 'destructive'}
                />
            )}

            {/* Dialog xác nhận hủy kết bạn */}
            {isDirect && otherUser?._id && (
                <ConfirmDialog
                    open={showUnfriendConfirm}
                    onOpenChange={setShowUnfriendConfirm}
                    onConfirm={handleUnfriend}
                    title='Hủy kết bạn'
                    description={`Bạn có chắc muốn hủy kết bạn với ${name}?`}
                    confirmText='Hủy kết bạn'
                    variant='destructive'
                />
            )}

            <AddMemberModal
                open={showAddMember}
                onOpenChange={setShowAddMember}
                conversationId={convo._id}
            />

            <GroupSettingsModal
                open={showGroupSettings}
                onOpenChange={setShowGroupSettings}
                convo={convo}
            />
        </>
    );
};

// ─── Message Input ────────────────────────────────────────────────────────────
const FilePreviewItem = ({
    file,
    onRemove,
    formatSize,
}: {
    file: File;
    onRemove: () => void;
    formatSize: (n: number) => string;
}) => {
    const [url, setURL] = useState<string>('');

    useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setURL(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    return (
        <div className='relative group/file rounded-lg overflow-hidden border border-border/40 bg-background/80'>
            {isImage ? (
                <img src={url} alt={file.name} className='h-20 w-20 object-cover' />
            ) : isVideo ? (
                <video src={url} className='h-20 w-20 object-cover' muted preload='metadata' />
            ) : (
                <div className='h-20 w-28 flex flex-col items-center justify-center gap-1 p-2'>
                    <span className='text-xs font-medium text-muted-foreground truncate w-full text-center'>
                        {file.name.split('.').pop()?.toUpperCase()}
                    </span>
                    <span className='text-[10px] text-muted-foreground truncate w-full text-center'>
                        {file.name.length > 12 ? file.name.slice(0, 10) + '...' : file.name}
                    </span>
                    <span className='text-[10px] text-muted-foreground'>
                        {formatSize(file.size)}
                    </span>
                </div>
            )}
            <button
                onClick={onRemove}
                className='absolute top-0.5 right-0.5 size-5 rounded-full bg-destructive text-white flex items-center justify-center text-xs opacity-100 md:opacity-0 md:group-hover/file:opacity-100 transition-opacity'
            >
                ✕
            </button>
        </div>
    );
};

const MessageInput = ({
    onSend,
    onChange,
    disabled,
    initialValue = '',
    placeholder = 'Nhập tin nhắn...',
}: {
    onSend: (content: string, files?: File[]) => void;
    onChange?: (content: string) => void;
    disabled?: boolean;
    initialValue?: string;
    placeholder?: string;
}) => {
    const [value, setValue] = useState(initialValue);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [showEmoji, setShowEmoji] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
                setShowEmoji(false);
            }
        };
        if (showEmoji) {
            document.addEventListener('mousedown', handler);
        }
        return () => document.removeEventListener('mousedown', handler);
    }, [showEmoji]);

    const handleSend = () => {
        const trimmed = value.trim();
        if (!trimmed && selectedFiles.length === 0) return;
        if (disabled) return;
        onSend(trimmed, selectedFiles.length > 0 ? selectedFiles : undefined);
        setValue('');
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setSelectedFiles((prev) => [...prev, ...files]);
        }
        // Reset input để cho phép chọn lại cùng file
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className='px-2 py-2 md:px-4 md:py-3 border-t border-border/50 glass-strong'>
            {/* File preview */}
            {selectedFiles.length > 0 && (
                <div className='flex flex-wrap gap-2 mb-2 p-2 rounded-xl bg-muted/40 border border-border/40'>
                    {selectedFiles.map((file, i) => (
                        <FilePreviewItem
                            key={`${file.name}-${file.size}-${i}`}
                            file={file}
                            formatSize={formatFileSize}
                            onRemove={() => removeFile(i)}
                        />
                    ))}
                </div>
            )}

            {isRecording ? (
                <VoiceRecorder
                    onSend={(file) => {
                        onSend('', [file]);
                        setIsRecording(false);
                    }}
                    onCancel={() => setIsRecording(false)}
                />
            ) : (
                <div className='flex items-end gap-2 rounded-2xl border border-border bg-background/80 px-3 py-2 shadow-soft focus-within:ring-2 focus-within:ring-primary/30 transition-smooth relative'>
                    {/* Emoji Picker Button */}
                    <div className='relative flex items-center justify-center -mb-1' ref={emojiRef}>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='shrink-0 size-8 text-muted-foreground hover:text-primary mb-1'
                            onClick={() => setShowEmoji((p) => !p)}
                            type='button'
                            title='Thêm biểu tượng cảm xúc'
                        >
                            <Smile className='size-5' />
                        </Button>
                        {showEmoji && (
                            <div className='absolute bottom-full left-0 mb-3 z-50 shadow-xl'>
                                <EmojiPicker
                                    onEmojiClick={(data: any) => {
                                        setValue((prev) => prev + data.emoji);
                                        setShowEmoji(false);
                                    }}
                                    theme={'auto' as EmojiTheme}
                                    searchDisabled
                                    skinTonesDisabled
                                />
                            </div>
                        )}
                    </div>

                    {/* File picker button */}
                    <div className='flex items-center justify-center -mb-1'>
                        <input
                            ref={fileInputRef}
                            type='file'
                            multiple
                            className='hidden'
                            onChange={handleFileChange}
                            accept='image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.tar,.gz,.txt,.csv,.json,.mp3,.wav,.ogg'
                        />
                        <Button
                            variant='ghost'
                            size='icon'
                            className='shrink-0 size-8 text-muted-foreground hover:text-primary mb-1'
                            onClick={() => fileInputRef.current?.click()}
                            type='button'
                            title='Đính kèm file (Ảnh, Video, Zip, ...)'
                        >
                            <Paperclip className='size-5' />
                        </Button>
                    </div>

                    {/* Voice recorder toggle button */}
                    <div className='flex items-center justify-center -mb-1'>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='shrink-0 size-8 text-muted-foreground hover:text-primary mb-1'
                            onClick={() => setIsRecording(true)}
                            type='button'
                            title='Gửi tin nhắn thoại'
                            disabled={disabled}
                        >
                            <Mic className='size-5' />
                        </Button>
                    </div>

                    <textarea
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            onChange?.(e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        rows={1}
                        className='flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none max-h-32 overflow-y-auto leading-5 py-1'
                        style={{ minHeight: '24px' }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                        }}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={(!value.trim() && selectedFiles.length === 0) || disabled}
                        size='icon'
                        className='shrink-0 size-8 bg-gradient-primary hover:opacity-90 transition-smooth disabled:opacity-40 rounded-xl'
                    >
                        <Send className='size-4' />
                    </Button>
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ChatWindowLayout = () => {
    const { user } = useAuthStore();
    const {
        activeConversationId,
        conversations,
        messages,
        onlineUsers,
        blockedUsers,
        sendMessage,
        fetchMoreMessages,
        fetchMessages,
        markConversationAsRead,
        loading,
        fetchConversations,
        fetchFriends,
        fetchFriendRequests,
        fetchBlockedUsers,
        typingUsers,
        sendTypingStatus,
        markMessageRead,
    } = useChatStore();

    const typingTimeoutRef = useRef<any>(null);

    const { isMobile, setOpenMobile } = useSidebar();

    // Auto open sidebar on mobile if no conversation is active
    useEffect(() => {
        if (isMobile && !activeConversationId) {
            setOpenMobile(true);
        }
    }, [isMobile, activeConversationId, setOpenMobile]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollDown, setShowScrollDown] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [theyBlockedMe, setTheyBlockedMe] = useState(false);
    const [lastOpenedConvoId, setLastOpenedConvoId] = useState<string | null>(null);

    const activeConvo = conversations.find((c) => c._id === activeConversationId) ?? null;
    const messageData = activeConversationId ? messages[activeConversationId] : null;
    const messageList = messageData?.items ?? [];

    // Khai báo sớm để dùng trong useEffects
    const otherUser = activeConvo?.participants.find((p) => p._id?.toString() !== user?._id);
    const otherUserId = otherUser?._id;

    // Auto scroll to bottom on new messages
    const scrollToBottom = useCallback((smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    // INIT INITIAL DATA ON MOUNT
    useEffect(() => {
        if (user) {
            fetchConversations();
            fetchFriends();
            fetchFriendRequests();
            fetchBlockedUsers();
        }
    }, [user?._id]);

    useEffect(() => {
        scrollToBottom(false);
    }, [activeConversationId]);

    // KEY FIX: Fetch messages khi:
    // 1. activeConversationId thay đổi (user click conversation)
    // 2. conversations load xong (sau page reload - conversations.length thay đổi từ 0 → n)
    useEffect(() => {
        if (activeConversationId && conversations.length > 0) {
            // Track last opened conversation
            if (activeConversationId !== lastOpenedConvoId) {
                setLastOpenedConvoId(activeConversationId);
            }

            if (!messages[activeConversationId]) {
                fetchMessages(activeConversationId);
            }
            markConversationAsRead(activeConversationId);
        }
    }, [activeConversationId, conversations.length, user?._id, messageList.length]);

    // Kiểm tra block status khi mở conversation
    useEffect(() => {
        setTheyBlockedMe(false);
        if (!activeConvo || activeConvo.type !== 'direct' || !user) return;
        const otherP = activeConvo.participants.find((p) => p._id?.toString() !== user._id);
        if (!otherP?._id) return;

        chatService
            .checkBlockStatus(otherP._id.toString())
            .then((res) => {
                if (res?.theyBlockedMe) {
                    setTheyBlockedMe(true);
                }
            })
            .catch(() => {});
    }, [activeConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Lắng nghe real-time block/unblock từ user khác
    useEffect(() => {
        const handler = (e: Event) => {
            const { userId, blocked } = (e as CustomEvent).detail;
            // Chỉ cập nhật nếu đang chat với người đó
            if (otherUserId && userId === otherUserId.toString()) {
                setTheyBlockedMe(blocked);
            }
        };
        const callEndHandler = () => {
            // Delay for store update and message fetch
            setTimeout(() => {
                scrollToBottom(true);
            }, 600);
        };
        window.addEventListener('block_status_changed', handler);
        window.addEventListener('call_ended', callEndHandler);
        return () => {
            window.removeEventListener('block_status_changed', handler);
            window.removeEventListener('call_ended', callEndHandler);
        };
    }, [otherUserId, scrollToBottom]); // eslint-disable-line react-hooks/exhaustive-deps

    // IntersectionObserver for read receipts
    useEffect(() => {
        if (!activeConversationId || messageList.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const messageId = entry.target.getAttribute('data-message-id');
                        const msg = messageList.find((m) => m._id === messageId);
                        // Only mark as read if not own and not already seen by me
                        if (
                            msg &&
                            msg.senderId !== user?._id &&
                            !msg.seenBy?.includes(user?._id || '')
                        ) {
                            // Delay slightly to ensure user actually "reads" it
                            setTimeout(() => {
                                // Re-check if still intersecting after 2s
                                if (entry.isIntersecting) {
                                    markMessageRead(msg._id);
                                }
                            }, 2000);
                        }
                    }
                });
            },
            { threshold: 0.5 }
        );

        // Observe elements with data-message-id
        const msgElements = document.querySelectorAll('[data-message-id]');
        msgElements.forEach((el) => observer.observe(el));

        return () => {
            msgElements.forEach((el) => observer.unobserve(el));
            observer.disconnect();
        };
    }, [activeConversationId, messageList, user?._id, markMessageRead]);

    useEffect(() => {
        if (messageList.length > 0) {
            const container = messagesContainerRef.current;
            if (!container) return;
            const isNearBottom =
                container.scrollHeight - container.scrollTop - container.clientHeight < 200;
            if (isNearBottom) scrollToBottom();
        }
    }, [messageList.length]);

    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const distanceFromBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight;
        setShowScrollDown(distanceFromBottom > 300);

        // Load more when near top
        if (container.scrollTop < 100 && messageData?.hasMore && !loading) {
            fetchMoreMessages(activeConversationId!);
        }
    };

    const handleSend = async (content: string, files?: File[]) => {
        if (!activeConvo || !user || isSending) return;

        setIsSending(true);
        try {
            if (activeConvo.type === 'direct') {
                const otherU = activeConvo.participants.find((p) => p._id?.toString() !== user._id);
                await sendMessage(activeConvo._id, content, 'direct', otherU?._id, files);
            } else {
                await sendMessage(activeConvo._id, content, 'group', undefined, files);
            }
            scrollToBottom();

            // Typing off
            sendTypingStatus(activeConvo._id, false);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
        } finally {
            setIsSending(false);
        }
    };

    const handleInputChange = (_content: string) => {
        if (!activeConvo) return;

        // Typing indicator logic
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        sendTypingStatus(activeConvo._id, true);

        typingTimeoutRef.current = setTimeout(() => {
            if (activeConvo) {
                sendTypingStatus(activeConvo._id, false);
            }
            typingTimeoutRef.current = null;
        }, 3000);
    };

    // Determine if other user is online
    const isOtherOnline = otherUserId ? onlineUsers.includes(otherUserId.toString()) : false;

    // Kiểm tra trạng thái chặn
    const iBlockedThem = otherUserId
        ? blockedUsers.some((b) => b._id?.toString() === otherUserId.toString())
        : false;

    const isBlocked = iBlockedThem || theyBlockedMe;

    if (!activeConvo) {
        return (
            <div className='flex-1 flex items-center justify-center h-full rounded-none md:rounded-2xl overflow-hidden glass-strong border-0 md:border border-border/30'>
                <EmptyChat />
            </div>
        );
    }

    // Render messages với date separator giữa các ngày
    const renderMessages = () => {
        const VN_TZ = 'Asia/Ho_Chi_Minh';
        const getDateKey = (d: Date) =>
            new Intl.DateTimeFormat('en-CA', {
                timeZone: VN_TZ,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(d);

        const items: React.ReactNode[] = [];
        let lastDateKey = '';

        messageList.forEach((msg, index) => {
            const msgDate = new Date(msg.createdAt);
            const dateKey = getDateKey(msgDate);

            // Thêm date separator khi sang ngày mới
            if (dateKey !== lastDateKey) {
                items.push(<DateSeparator key={`sep-${dateKey}`} date={msgDate} />);
                lastDateKey = dateKey;
            }

            const isOwn = msg.senderId === user?._id;
            const prevMsg = messageList[index - 1];
            // Reset showAvatar khi sang ngày mới hoặc người gửi khác
            const prevDateKey = prevMsg ? getDateKey(new Date(prevMsg.createdAt)) : '';
            const showAvatar =
                !prevMsg || prevMsg.senderId !== msg.senderId || prevDateKey !== dateKey;
            const senderParticipant = activeConvo.participants.find(
                (p) => p._id?.toString() === msg.senderId
            );

            const senderName = isOwn
                ? 'Bạn'
                : senderParticipant?.nickname || senderParticipant?.displayName;

            const senderAvatarUrl = isOwn ? user?.avatarUrl : senderParticipant?.avatarUrl;

            const otherUserItem =
                activeConvo.type === 'direct'
                    ? activeConvo.participants.find((p) => p._id?.toString() !== user?._id)
                    : null;

            const myParticipant = activeConvo.participants.find(
                (p) => p._id?.toString() === user?._id
            );
            const canRecall =
                isOwn ||
                (activeConvo.type === 'group' &&
                    myParticipant &&
                    (myParticipant.role === 'owner' || myParticipant.role === 'admin'));

            items.push(
                <div key={msg._id} data-message-id={msg._id}>
                    <MessageItem
                        message={msg}
                        isOwn={isOwn}
                        showAvatar={showAvatar}
                        senderName={senderName}
                        senderAvatarUrl={senderAvatarUrl}
                        otherUser={otherUserItem}
                        canRecall={canRecall}
                    />
                </div>
            );
        });

        return items;
    };

    return (
        <div className='flex-1 flex flex-col h-full rounded-none md:rounded-2xl overflow-hidden border-0 md:border border-border/30 shadow-soft relative'>
            {/* Header */}
            <ChatHeader
                convo={activeConvo}
                isOnline={isOtherOnline}
                currentUserId={user?._id ?? ''}
            />

            {/* Messages area */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className='flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-gradient-purple'
            >
                <div className='flex-1' />
                {/* Load more indicator */}
                {messageData?.hasMore && (
                    <div className='text-center py-2'>
                        <span className='text-xs text-muted-foreground'>
                            Cuộn lên để xem thêm...
                        </span>
                    </div>
                )}

                {/* No messages */}
                {messageList.length === 0 && !loading && (
                    <div className='flex flex-col items-center justify-center flex-1 gap-3 text-center'>
                        <div className='size-16 rounded-full bg-primary/10 flex items-center justify-center'>
                            <span className='text-2xl'>👋</span>
                        </div>
                        <p className='text-muted-foreground text-sm'>Hãy gửi tin nhắn đầu tiên!</p>
                    </div>
                )}

                {/* Messages */}
                {renderMessages()}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollDown && (
                <button
                    onClick={() => scrollToBottom()}
                    className='absolute bottom-24 right-8 size-10 rounded-full bg-primary text-white shadow-glow flex items-center justify-center hover:scale-110 transition-bounce z-10'
                >
                    <ArrowDown className='size-4' />
                </button>
            )}

            {/* Message Input */}
            {isBlocked ? (
                <div className='px-4 py-3 border-t border-border/50 glass-strong'>
                    <div className='flex items-center justify-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/30 px-4 py-3'>
                        <ShieldX className='size-4 text-orange-500 shrink-0' />
                        <p className='text-sm text-orange-500 font-medium'>
                            {iBlockedThem
                                ? 'Bạn đã chặn người dùng này.'
                                : 'Bạn không thể nhắn tin cho người dùng này.'}
                        </p>
                        {iBlockedThem && otherUserId && (
                            <Button
                                variant='outline'
                                size='sm'
                                className='ml-2 text-green-600 border-green-500/50 hover:bg-green-500/10 hover:text-green-500 shrink-0'
                                onClick={async () => {
                                    await useChatStore
                                        .getState()
                                        .unblockUser(otherUserId.toString());
                                    setTheyBlockedMe(false);
                                }}
                            >
                                Bỏ chặn
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <div className='flex flex-col'>
                    {/* Typing indicator */}
                    {activeConversationId && typingUsers[activeConversationId]?.length > 0 && (
                        <div className='px-4 py-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300'>
                            <p className='text-[10px] text-muted-foreground flex items-center gap-1.5 italic'>
                                <span className='flex gap-0.5'>
                                    <span className='size-1 rounded-full bg-primary/40 animate-bounce' />
                                    <span className='size-1 rounded-full bg-primary/40 animate-bounce [animation-delay:0.2s]' />
                                    <span className='size-1 rounded-full bg-primary/40 animate-bounce [animation-delay:0.4s]' />
                                </span>
                                {typingUsers[activeConversationId].length === 1
                                    ? 'Đang nhập tin nhắn...'
                                    : 'Nhiều người đang nhập tin nhắn...'}
                            </p>
                        </div>
                    )}

                    <MessageInput
                        onSend={handleSend}
                        onChange={handleInputChange}
                        disabled={isSending}
                        placeholder='Nhập tin nhắn...'
                    />
                </div>
            )}
        </div>
    );
};

export default ChatWindowLayout;
