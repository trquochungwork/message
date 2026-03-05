import React, { useState, useRef } from 'react';
import { Settings, Camera, Check, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog.tsx';
import { Button } from '../ui/button.tsx';
import { Input } from '../ui/input.tsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu.tsx';
import { useChatStore } from '../../stores/useChatStore.ts';
import { useAuthStore } from '../../stores/useAuthStores.ts';
import UserAvatar from './UserAvatar.tsx';
import { MoreVertical, ShieldCheck, ShieldAlert, UserMinus } from 'lucide-react';
import type { Conversation, Participant } from '../../types/chat.ts';

interface GroupSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    convo: Conversation;
}

const GroupSettingsModal = ({ open, onOpenChange, convo }: GroupSettingsModalProps) => {
    const { updateGroupProfile, updateNickname, kickMember, updateMemberRole, loading } =
        useChatStore();
    const { user } = useAuthStore();

    const [groupName, setGroupName] = useState(convo.group?.name || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(
        convo.group?.avatarUrl || null
    );

    const [editingNicknameId, setEditingNicknameId] = useState<string | null>(null);
    const [nicknameValue, setNicknameValue] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async () => {
        if (!groupName.trim()) return;
        await updateGroupProfile(convo._id, groupName, avatarFile || undefined);
    };

    const handleSaveNickname = async (targetUserId: string) => {
        await updateNickname(convo._id, targetUserId, nicknameValue);
        setEditingNicknameId(null);
    };

    if (convo.type !== 'group') return null;

    const myParticipant = convo.participants.find((p) => p._id === user?._id);
    const myRole = myParticipant?.role || 'member';

    const getRoleLabel = (role?: string) => {
        if (role === 'owner') return 'Trưởng nhóm';
        if (role === 'admin') return 'Phó nhóm';
        return 'Thành viên';
    };

    const getRoleColor = (role?: string) => {
        if (role === 'owner') return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
        if (role === 'admin') return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
        return 'text-muted-foreground bg-secondary';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md max-h-[80vh] overflow-y-auto'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <span className='size-8 rounded-full bg-gradient-primary flex items-center justify-center'>
                            <Settings className='size-4 text-white' />
                        </span>
                        Cài đặt nhóm
                    </DialogTitle>
                </DialogHeader>

                <div className='flex flex-col gap-6 py-4'>
                    {/* Thông tin nhóm */}
                    <div className='flex flex-col items-center gap-4'>
                        <div className='relative group'>
                            <UserAvatar
                                type='profile'
                                name={avatarPreview ? 'Group Avatar' : groupName}
                                avatarUrl={avatarPreview}
                                className='size-24'
                                previewable
                            />
                            <button
                                className='absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-md hover:scale-110 transition-transform'
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera className='size-4' />
                            </button>
                            <input
                                type='file'
                                accept='image/*'
                                className='hidden'
                                ref={fileInputRef}
                                onChange={handleAvatarChange}
                            />
                        </div>

                        <div className='flex items-center gap-2 w-full'>
                            <Input
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder='Tên nhóm...'
                                className='flex-1'
                            />
                            <Button
                                onClick={handleSaveProfile}
                                disabled={loading || !groupName.trim()}
                                variant='outline'
                            >
                                {loading ? 'Lưu...' : 'Lưu tên'}
                            </Button>
                        </div>
                    </div>

                    <div className='h-px w-full bg-border' />

                    {/* Danh sách thành viên */}
                    <div>
                        <h4 className='text-sm font-semibold mb-3'>
                            Thành viên nhóm ({convo.participants.length})
                        </h4>
                        <div className='flex flex-col gap-2'>
                            {convo.participants.map((p: Participant) => (
                                <div
                                    key={p._id}
                                    className='flex items-center justify-between p-2 rounded-lg bg-muted/30'
                                >
                                    <div className='flex items-center gap-3'>
                                        <UserAvatar
                                            type='chat'
                                            name={p.displayName}
                                            avatarUrl={p.avatarUrl}
                                            previewable
                                        />
                                        <div className='flex flex-col'>
                                            <span className='text-sm font-medium'>
                                                {p.nickname || p.displayName}
                                            </span>
                                            {p.nickname && (
                                                <span className='text-xs text-muted-foreground'>
                                                    Tên thật: {p.displayName}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {editingNicknameId === p._id ? (
                                        <div className='flex items-center gap-1'>
                                            <Input
                                                value={nicknameValue}
                                                onChange={(e) => setNicknameValue(e.target.value)}
                                                className='h-7 sm:w-24 w-16 text-xs'
                                                autoFocus
                                            />
                                            <Button
                                                size='icon'
                                                variant='ghost'
                                                className='size-7 text-primary'
                                                onClick={() => handleSaveNickname(p._id)}
                                            >
                                                <Check className='size-3' />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className='flex items-center gap-2'>
                                            <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getRoleColor(p.role)}`}
                                            >
                                                {getRoleLabel(p.role)}
                                            </span>
                                            <Button
                                                size='icon'
                                                variant='ghost'
                                                className='size-8 text-muted-foreground hover:bg-muted'
                                                onClick={() => {
                                                    setEditingNicknameId(p._id);
                                                    setNicknameValue(p.nickname || '');
                                                }}
                                                title='Đổi biệt danh'
                                            >
                                                <Edit2 className='size-3' />
                                            </Button>

                                            {/* Quyền Cài Đặt */}
                                            {p._id !== user?._id &&
                                                (myRole === 'owner' ||
                                                    (myRole === 'admin' &&
                                                        p.role === 'member')) && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size='icon'
                                                                variant='ghost'
                                                                className='size-8 text-muted-foreground'
                                                            >
                                                                <MoreVertical className='size-4' />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align='end'
                                                            className='w-48'
                                                        >
                                                            {myRole === 'owner' &&
                                                                p.role === 'member' && (
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            updateMemberRole(
                                                                                convo._id,
                                                                                p._id,
                                                                                'admin'
                                                                            )
                                                                        }
                                                                    >
                                                                        <ShieldCheck className='mr-2 size-4 text-blue-500' />
                                                                        Thăng làm Phó nhóm
                                                                    </DropdownMenuItem>
                                                                )}
                                                            {myRole === 'owner' &&
                                                                p.role === 'admin' && (
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            updateMemberRole(
                                                                                convo._id,
                                                                                p._id,
                                                                                'member'
                                                                            )
                                                                        }
                                                                    >
                                                                        <ShieldAlert className='mr-2 size-4 text-orange-500' />
                                                                        Hạ xuống Thành viên
                                                                    </DropdownMenuItem>
                                                                )}
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    kickMember(convo._id, p._id)
                                                                }
                                                                className='text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950'
                                                            >
                                                                <UserMinus className='mr-2 size-4' />
                                                                Mời khỏi nhóm
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GroupSettingsModal;
