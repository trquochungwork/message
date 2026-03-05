import { useNavigate } from 'react-router-dom';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { Input } from '../ui/input.tsx';
import { Moon, Sun, LogOut, Bell, Settings, UserPlus, Image as ImageIcon } from 'lucide-react';
import { Switch } from '../ui/switch.tsx';
import CreateNewChat from '../chat/CreateNewChat.tsx';
import NewGroupChatModal from '../chat/NewGroupChatModal.tsx';
import GroupChatList from '../chat/GroupChatList.tsx';
import AddFriendModal from '../chat/AddFriendModal.tsx';
import FriendList from '../chat/FriendList.tsx';
import FriendRequestsPanel from '../chat/FriendRequestsPanel.tsx';
import { useThemeStore } from '../../stores/useThemeStrores.ts';
import { useAuthStore } from '../../stores/useAuthStores.ts';
import { useChatStore } from '../../stores/useChatStore.ts';
import UserAvatar from '../chat/UserAvatar.tsx';
import UserSettingsModal from '../chat/UserSettingsModal.tsx';
import { Button } from '../ui/button.tsx';
import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu.tsx';
import { ImagePreview } from '../ui/ImagePreview.tsx';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useThemeStore();
    const { user, signOut, language } = useAuthStore();
    const { friendRequests } = useChatStore();
    const [showRequests, setShowRequests] = useState(false);
    const [showOwnAvatarPreview, setShowOwnAvatarPreview] = useState(false);
    const { setOpenMobile } = useSidebar();

    const pendingCount = friendRequests.received.length;

    const handleLogoClick = (e: React.MouseEvent) => {
        e.preventDefault();
        navigate('/');
        setOpenMobile(false);
    };

    const t = (key: string) => {
        const translations: any = {
            vi: {
                searchPlaceholder: 'Tìm bạn bè, nhóm...',
                groupChat: 'nhóm chat',
                friends: 'bạn bè',
                addFriend: 'Kết bạn',
                friendRequests: 'lời mời kết bạn',
                settings: 'Cài đặt',
                logout: 'Đăng xuất',
                viewAvatar: 'Xem ảnh đại diện',
            },
            en: {
                searchPlaceholder: 'Search friends, groups...',
                groupChat: 'GROUP CHATS',
                friends: 'FRIENDS',
                addFriend: 'Add Friend',
                friendRequests: 'friend requests',
                settings: 'Settings',
                logout: 'Log out',
                viewAvatar: 'View Avatar',
            },
        };
        return translations[language][key] || key;
    };

    return (
        <Sidebar variant='inset' {...props}>
            {/* //*header */}
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size='lg' asChild className='bg-gradient-primary'>
                            <div onClick={handleLogoClick} className='cursor-pointer'>
                                <div className='flex w-full items-center px-2 justify-between'>
                                    <h1 className='text-xl font-bold text-white uppercase tracking-wider'>
                                        Message
                                    </h1>
                                    <div
                                        className='flex items-center gap-2'
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Sun className='size-4 text-white/80' />
                                        <Switch
                                            checked={isDark}
                                            onCheckedChange={toggleTheme}
                                            className='data-[state=checked]:bg-background/80'
                                        />
                                        <Moon className='size-4 text-white/80' />
                                    </div>
                                </div>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* //*content */}
            <SidebarContent>
                {/* //* Search Bar */}
                <div className='px-4 py-2 relative'>
                    <Input
                        type='text'
                        placeholder={t('searchPlaceholder')}
                        value={useChatStore((s) => s.sidebarSearchQuery)}
                        onChange={(e) =>
                            useChatStore.getState().setSidebarSearchQuery(e.target.value)
                        }
                        className='w-full h-8 pl-8 pr-3 text-xs rounded-lg border-border/50 bg-background/50 focus-visible:ring-primary/30 transition-shadow'
                    />
                    <div className='absolute left-6 top-1/2 -translate-y-1/2'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='14'
                            height='14'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='text-muted-foreground'
                        >
                            <circle cx='11' cy='11' r='8'></circle>
                            <line x1='21' y1='21' x2='16.65' y2='16.65'></line>
                        </svg>
                    </div>
                </div>

                {/* //* New Chat */}
                <SidebarGroup>
                    <SidebarContent>
                        <CreateNewChat />
                    </SidebarContent>
                </SidebarGroup>

                {/* //*Group Chat */}
                <SidebarGroup className='cursor-default'>
                    <SidebarGroupLabel className='uppercase'>{t('groupChat')}</SidebarGroupLabel>
                    <SidebarGroupAction title='Tạo Nhóm' className='cursor-pointer'>
                        <NewGroupChatModal />
                    </SidebarGroupAction>
                    <SidebarGroupContent>
                        <GroupChatList />
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* //*Direct Message */}
                <SidebarGroup className='cursor-default'>
                    <div className='flex items-center justify-between pr-2 mb-1'>
                        <SidebarGroupLabel className='uppercase p-0 h-auto data-[collapsible=icon]:hidden'>
                            {t('friends')}
                        </SidebarGroupLabel>
                        <AddFriendModal>
                            <button className='flex items-center gap-1.5 px-2 h-7 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors border border-primary/20 rounded-lg group-data-[collapsible=icon]:hidden shadow-sm'>
                                <UserPlus className='size-3.5' />
                                <span className='text-[10px] font-bold uppercase whitespace-nowrap'>
                                    {t('addFriend')}
                                </span>
                            </button>
                        </AddFriendModal>
                    </div>
                    <SidebarGroupContent>
                        <FriendList />
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* //*footer */}
            <SidebarFooter className='border-t border-border/50 p-3'>
                {/* Friend requests button */}
                {pendingCount > 0 && (
                    <button
                        onClick={() => setShowRequests((v) => !v)}
                        className='flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-smooth mb-2'
                    >
                        <Bell className='size-4' />
                        <span>
                            {pendingCount} {t('friendRequests')}
                        </span>
                    </button>
                )}

                {/* Friend requests panel */}
                {showRequests && <FriendRequestsPanel onClose={() => setShowRequests(false)} />}

                {/* User info + logout */}
                {user && (
                    <div className='flex items-center gap-2'>
                        <div className='relative group/avatar'>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className='cursor-pointer hover:opacity-80 transition-opacity'>
                                        <UserAvatar
                                            type='chat'
                                            name={user.displayName}
                                            avatarUrl={user.avatarUrl}
                                        />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='start' side='top' className='w-48'>
                                    <DropdownMenuItem onClick={() => setShowOwnAvatarPreview(true)}>
                                        <ImageIcon className='size-4 mr-2' />
                                        {t('viewAvatar')}
                                    </DropdownMenuItem>
                                    <UserSettingsModal>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Settings className='size-4 mr-2' />
                                            {t('settings')}
                                        </DropdownMenuItem>
                                    </UserSettingsModal>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className='flex-1 min-w-0'>
                            <p className='text-sm font-semibold truncate'>{user.displayName}</p>
                            <p className='text-xs text-muted-foreground truncate'>
                                @{user.username}
                            </p>
                        </div>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='shrink-0 text-muted-foreground hover:text-destructive transition-smooth'
                            onClick={signOut}
                            title={t('logout')}
                        >
                            <LogOut className='size-4' />
                        </Button>
                    </div>
                )}
            </SidebarFooter>

            {/* Custom Avatar Preview for User */}
            {user?.avatarUrl && (
                <ImagePreview
                    src={user.avatarUrl}
                    alt={user.displayName}
                    isOpen={showOwnAvatarPreview}
                    onClose={() => setShowOwnAvatarPreview(false)}
                />
            )}

            {/* Dialog đổi tên hiển thị - REMOVED since it's now in UserSettingsModal */}
        </Sidebar>
    );
}
