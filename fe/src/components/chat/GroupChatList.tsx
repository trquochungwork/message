import { useChatStore } from '../../stores/useChatStore.ts';
import GroupChatCard from './GroupChatCard.tsx';

const GroupChatList = () => {
    const { conversations, sidebarSearchQuery } = useChatStore();
    if (!conversations) return null;

    // Filter by type and search query
    const query = (sidebarSearchQuery || '').toLowerCase();
    const groupchats = conversations.filter((convo) => {
        if (convo.type !== 'group') return false;
        if (!query) return true;
        const name = (convo as any).groupName || 'Nhóm không tên';
        return name.toLowerCase().includes(query);
    });

    if (groupchats.length === 0) {
        return (
            <div className='px-2 py-3 text-xs text-muted-foreground text-center'>
                Chưa có nhóm chat nào
            </div>
        );
    }

    return (
        <div className='flex flex-col overflow-y-auto p-2 space-y-2'>
            {groupchats.map((convo) => (
                <GroupChatCard key={convo._id} convo={convo} />
            ))}
        </div>
    );
};

export default GroupChatList;
