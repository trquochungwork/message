import { X, Check, UserX } from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore.ts';
import UserAvatar from './UserAvatar.tsx';
import { Button } from '../ui/button.tsx';

const FriendRequestsPanel = ({ onClose }: { onClose: () => void }) => {
    const { friendRequests, acceptFriendRequest, declineFriendRequest } = useChatStore();
    const { received } = friendRequests;

    if (received.length === 0) return null;

    return (
        <div className='mb-2 rounded-xl border border-border bg-card p-3 shadow-soft'>
            <div className='flex items-center justify-between mb-2'>
                <h3 className='text-sm font-semibold'>Lời mời kết bạn</h3>
                <button
                    onClick={onClose}
                    className='text-muted-foreground hover:text-foreground transition-smooth'
                >
                    <X className='size-3.5' />
                </button>
            </div>
            <div className='flex flex-col gap-2 max-h-48 overflow-y-auto'>
                {received.map((req) => (
                    <div
                        key={req._id}
                        className='flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 transition-smooth'
                    >
                        <UserAvatar
                            type='chat'
                            name={req.from?.displayName ?? '?'}
                            avatarUrl={req.from?.avatarUrl}
                        />
                        <div className='flex-1 min-w-0'>
                            <p className='text-xs font-semibold truncate'>
                                {req.from?.displayName}
                            </p>
                            <p className='text-xs text-muted-foreground truncate'>
                                @{req.from?.username}
                            </p>
                        </div>
                        <div className='flex gap-1'>
                            <Button
                                size='icon'
                                className='size-6 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary'
                                variant='ghost'
                                onClick={() => acceptFriendRequest(req._id)}
                                title='Chấp nhận'
                            >
                                <Check className='size-3' />
                            </Button>
                            <Button
                                size='icon'
                                className='size-6 text-muted-foreground hover:text-destructive'
                                variant='ghost'
                                onClick={() => declineFriendRequest(req._id)}
                                title='Từ chối'
                            >
                                <UserX className='size-3' />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FriendRequestsPanel;
