import { useState } from 'react';
import { UserPlus, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog.tsx';
import { Button } from '../ui/button.tsx';
import { useChatStore } from '../../stores/useChatStore.ts';
import { chatService } from '../../services/chatSevice.ts';
import UserAvatar from './UserAvatar.tsx';
import { toast } from 'sonner';

interface AddMemberModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversationId: string;
}

const AddMemberModal = ({ open, onOpenChange, conversationId }: AddMemberModalProps) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);
    const { friends, conversations, addOrUpdateConversation } = useChatStore();

    // Lọc những friend chưa có trong nhóm
    const currentConvo = conversations.find((c) => c._id === conversationId);

    // Nếu chưa load xong hoặc không phải group (đề phòng)
    if (!currentConvo || currentConvo.type !== 'group') {
        return null;
    }

    const currentMemberIds = new Set(currentConvo.participants.map((p) => p._id.toString()));

    const validFriends = friends.filter((f) => !currentMemberIds.has(f._id));

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleAdd = async () => {
        if (selectedIds.size === 0) {
            toast.error('Vui lòng chọn ít nhất một thành viên');
            return;
        }
        try {
            setAdding(true);
            const res = await chatService.addMemberToGroup(conversationId, Array.from(selectedIds));
            addOrUpdateConversation(res.conversation);
            toast.success('Đã thêm thành viên vào nhóm');
            onOpenChange(false);
            setSelectedIds(new Set());
        } catch (error: unknown) {
            const msg =
                (error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Lỗi khi thêm thành viên';
            toast.error(msg);
        } finally {
            setAdding(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <span className='size-8 rounded-full bg-gradient-primary flex items-center justify-center'>
                            <UserPlus className='size-4 text-white' />
                        </span>
                        Thêm thành viên
                    </DialogTitle>
                </DialogHeader>

                {/* Members */}
                <div className='mt-2'>
                    <label className='text-xs font-medium text-muted-foreground mb-1.5 block'>
                        Thêm bạn bè ({selectedIds.size} đã chọn)
                    </label>
                    {validFriends.length === 0 ? (
                        <div className='text-center py-6 text-muted-foreground text-sm'>
                            Tất cả bạn bè của bạn đã ở trong nhóm.
                        </div>
                    ) : (
                        <div className='flex flex-col gap-1 max-h-60 overflow-y-auto'>
                            {validFriends.map((friend) => {
                                const selected = selectedIds.has(friend._id);
                                return (
                                    <button
                                        key={friend._id}
                                        onClick={() => toggleSelect(friend._id)}
                                        className={`flex items-center gap-3 p-2 rounded-xl transition-smooth text-left w-full ${
                                            selected
                                                ? 'bg-primary/10 ring-1 ring-primary/30'
                                                : 'hover:bg-muted/50'
                                        }`}
                                    >
                                        <UserAvatar
                                            type='chat'
                                            name={friend.displayName}
                                            avatarUrl={friend.avatarUrl}
                                        />
                                        <div className='flex-1 min-w-0'>
                                            <p className='text-sm font-medium truncate'>
                                                {friend.displayName}
                                            </p>
                                            <p className='text-xs text-muted-foreground truncate'>
                                                @{friend.username}
                                            </p>
                                        </div>
                                        <div
                                            className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-smooth ${
                                                selected
                                                    ? 'bg-primary border-primary'
                                                    : 'border-border'
                                            }`}
                                        >
                                            {selected && <Check className='size-3 text-white' />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant='outline' onClick={() => onOpenChange(false)} disabled={adding}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleAdd}
                        disabled={adding || selectedIds.size === 0}
                        className='bg-gradient-primary hover:opacity-90 text-white'
                    >
                        {adding ? (
                            <span className='flex items-center gap-2'>
                                <span className='size-4 border-2 border-white/50 border-t-white rounded-full animate-spin' />
                                Đang thêm...
                            </span>
                        ) : (
                            <span className='flex items-center gap-2'>
                                <UserPlus className='size-4' /> Thêm vào nhóm
                            </span>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddMemberModal;
