import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ChatWindowLayout from '../components/chat/ChatWindowLayout.tsx';
import { AppSidebar } from '../components/sidebar/app-sidebar.tsx';
import { SidebarProvider } from '../components/ui/sidebar.tsx';
import SocketInitializer from '../components/chat/SocketInitializer.tsx';
import CallManager from '../components/chat/CallManager.tsx';
import { useChatStore } from '../stores/useChatStore.ts';

const ChatAppPage = () => {
    const { id } = useParams();
    const setActiveConversation = useChatStore((s) => s.setActiveConversation);

    useEffect(() => {
        // Nếu có id trên URL, set làm active. Nếu không, set null (trang chủ)
        setActiveConversation(id || null);
    }, [id, setActiveConversation]);

    return (
        <SidebarProvider>
            <SocketInitializer />
            <CallManager />
            <AppSidebar />
            <div className='flex h-screen w-full p-0 md:p-2'>
                <ChatWindowLayout />
            </div>
        </SidebarProvider>
    );
};

export default ChatAppPage;
