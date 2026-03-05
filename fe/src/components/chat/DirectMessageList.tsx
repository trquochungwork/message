import { useChatStore } from '../../stores/useChatStore.ts';
import DirectMessageCard from './DirectMessageCard.tsx';

const DirectMessageList = () => {
    const { conversations } = useChatStore();
    if (!conversations) return null;
    const directConversations = conversations.filter(
        (convo) => convo.type?.toLowerCase() === 'direct'
    );

    return (
        <div className='flex flex-col overflow-y-auto p-2 space-y-2'>
            {directConversations.map((convo) => (
                <DirectMessageCard key={convo._id} convo={convo} />
            ))}
        </div>
    );
};

export default DirectMessageList;
