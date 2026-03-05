import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/stores/useAuthStores';
import { useThemeStore } from '@/stores/useThemeStrores';
import { User, Settings, Globe, Palette, Camera, Save, Loader2 } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { cn } from '@/lib/utils';

interface UserSettingsModalProps {
    children: React.ReactNode;
}

type TabType = 'profile' | 'appearance' | 'language';

export default function UserSettingsModal({ children }: UserSettingsModalProps) {
    const { user, updateProfile, updateAvatar, language, setLanguage } = useAuthStore();
    const { isDark, toggleTheme } = useThemeStore();

    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        displayName: user?.displayName || '',
        bio: user?.bio || '',
        phone: user?.phone || '',
    });

    const handleSaveProfile = async () => {
        try {
            setLoading(true);
            await updateProfile(formData);
        } catch (error) {
            // Error handled in store
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await updateAvatar(file);
        }
    };

    const t = (key: string) => {
        const translations: any = {
            vi: {
                settings: 'Cài đặt',
                profile: 'Hồ sơ',
                appearance: 'Giao diện',
                language: 'Ngôn ngữ',
                displayName: 'Tên hiển thị',
                bio: 'Tiểu sử',
                phone: 'Số điện thoại',
                save: 'Lưu thay đổi',
                darkMode: 'Chế độ tối',
                lightMode: 'Chế độ sáng',
                selectLanguage: 'Chọn ngôn ngữ',
                vi: 'Tiếng Việt',
                en: 'Tiếng Anh',
                avatar: 'Ảnh đại diện',
                changeAvatar: 'Đổi ảnh',
                updating: 'Đang cập nhật...',
            },
            en: {
                settings: 'Settings',
                profile: 'Profile',
                appearance: 'Appearance',
                language: 'Language',
                displayName: 'Display Name',
                bio: 'Bio',
                phone: 'Phone Number',
                save: 'Save Changes',
                darkMode: 'Dark Mode',
                lightMode: 'Light Mode',
                selectLanguage: 'Select Language',
                vi: 'Vietnamese',
                en: 'English',
                avatar: 'Avatar',
                changeAvatar: 'Change Avatar',
                updating: 'Updating...',
            },
        };
        return translations[language][key] || key;
    };

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className='sm:max-w-[600px] h-[550px] p-0 gap-0 overflow-hidden rounded-2xl border-none shadow-2xl'>
                <div className='flex h-full'>
                    {/* Sidebar */}
                    <div className='w-1/3 bg-muted/30 border-r border-border/50 p-4 flex flex-col gap-2'>
                        <DialogHeader className='px-2 mb-4'>
                            <DialogTitle className='text-lg font-bold flex items-center gap-2'>
                                <Settings className='size-5 text-primary' />
                                {t('settings')}
                            </DialogTitle>
                        </DialogHeader>

                        <button
                            onClick={() => setActiveTab('profile')}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                                activeTab === 'profile'
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <User className='size-4' />
                            {t('profile')}
                        </button>

                        <button
                            onClick={() => setActiveTab('appearance')}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                                activeTab === 'appearance'
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Palette className='size-4' />
                            {t('appearance')}
                        </button>

                        <button
                            onClick={() => setActiveTab('language')}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                                activeTab === 'language'
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Globe className='size-4' />
                            {t('language')}
                        </button>
                    </div>

                    {/* Main Content */}
                    <div className='flex-1 p-6 overflow-y-auto bg-background custom-scrollbar'>
                        {activeTab === 'profile' && (
                            <div className='space-y-6 animate-in fade-in slide-in-from-right-4 duration-300'>
                                <div className='flex flex-col items-center gap-4 py-4'>
                                    <div className='relative group'>
                                        <UserAvatar
                                            type='chat'
                                            name={user?.displayName || ''}
                                            avatarUrl={user?.avatarUrl}
                                            className='size-24 text-2xl border-4 border-background shadow-xl'
                                        />
                                        <label
                                            htmlFor='settings-avatar-upload'
                                            className='absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white'
                                        >
                                            <Camera className='size-6' />
                                        </label>
                                        <input
                                            id='settings-avatar-upload'
                                            type='file'
                                            accept='image/*'
                                            className='hidden'
                                            onChange={handleAvatarChange}
                                        />
                                    </div>
                                    <h3 className='font-semibold text-lg'>{user?.displayName}</h3>
                                </div>

                                <div className='space-y-4'>
                                    <div className='space-y-2'>
                                        <Label htmlFor='displayName'>{t('displayName')}</Label>
                                        <Input
                                            id='displayName'
                                            value={formData.displayName}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    displayName: e.target.value,
                                                }))
                                            }
                                            className='rounded-xl border-border/50 bg-muted/20'
                                        />
                                    </div>

                                    <div className='space-y-2'>
                                        <Label htmlFor='bio'>{t('bio')}</Label>
                                        <Textarea
                                            id='bio'
                                            value={formData.bio}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    bio: e.target.value,
                                                }))
                                            }
                                            placeholder='...'
                                            className='rounded-xl border-border/50 bg-muted/20 resize-none h-24'
                                        />
                                    </div>

                                    <div className='space-y-2'>
                                        <Label htmlFor='phone'>{t('phone')}</Label>
                                        <Input
                                            id='phone'
                                            value={formData.phone}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    phone: e.target.value,
                                                }))
                                            }
                                            className='rounded-xl border-border/50 bg-muted/20'
                                        />
                                    </div>
                                </div>

                                <Button
                                    className='w-full rounded-xl h-11 font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-primary/20'
                                    onClick={handleSaveProfile}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                            {t('updating')}
                                        </>
                                    ) : (
                                        <>
                                            <Save className='mr-2 h-4 w-4' />
                                            {t('save')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className='space-y-6 animate-in fade-in slide-in-from-right-4 duration-300'>
                                <div className='p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-4'>
                                    <div className='flex items-center justify-between'>
                                        <div className='space-y-0.5'>
                                            <Label className='text-base'>{t('darkMode')}</Label>
                                            <p className='text-xs text-muted-foreground'>
                                                {isDark ? t('darkMode') : t('lightMode')}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={isDark}
                                            onCheckedChange={toggleTheme}
                                            className='data-[state=checked]:bg-primary'
                                        />
                                    </div>
                                </div>

                                <div className='grid grid-cols-2 gap-4'>
                                    <button
                                        onClick={() => !isDark && toggleTheme()}
                                        className={cn(
                                            'p-4 rounded-2xl border transition-all space-y-3 text-left',
                                            isDark
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-border/50 hover:bg-muted/50'
                                        )}
                                    >
                                        <div className='size-8 rounded-full bg-slate-900 flex items-center justify-center text-white'>
                                            <Globe className='size-4' />
                                        </div>
                                        <span className='font-medium block'>{t('darkMode')}</span>
                                    </button>
                                    <button
                                        onClick={() => isDark && toggleTheme()}
                                        className={cn(
                                            'p-4 rounded-2xl border transition-all space-y-3 text-left',
                                            !isDark
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-border/50 hover:bg-muted/50'
                                        )}
                                    >
                                        <div className='size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 border'>
                                            <Globe className='size-4' />
                                        </div>
                                        <span className='font-medium block'>{t('lightMode')}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'language' && (
                            <div className='space-y-6 animate-in fade-in slide-in-from-right-4 duration-300'>
                                <div className='space-y-4'>
                                    <div
                                        onClick={() => setLanguage('vi')}
                                        className={cn(
                                            'flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer',
                                            language === 'vi'
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-border/50 hover:bg-muted/50'
                                        )}
                                    >
                                        <div className='flex items-center gap-4'>
                                            <div className='size-10 rounded-full bg-background border flex items-center justify-center text-lg overflow-hidden'>
                                                🇻🇳
                                            </div>
                                            <div className='space-y-0.5'>
                                                <p className='font-semibold text-sm'>Tiếng Việt</p>
                                                <p className='text-xs text-muted-foreground'>
                                                    Vietnamese
                                                </p>
                                            </div>
                                        </div>
                                        {language === 'vi' && (
                                            <div className='size-5 rounded-full bg-primary flex items-center justify-center'>
                                                <div className='size-2 rounded-full bg-background' />
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        onClick={() => setLanguage('en')}
                                        className={cn(
                                            'flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer',
                                            language === 'en'
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-border/50 hover:bg-muted/50'
                                        )}
                                    >
                                        <div className='flex items-center gap-4'>
                                            <div className='size-10 rounded-full bg-background border flex items-center justify-center text-lg overflow-hidden'>
                                                🇺🇸
                                            </div>
                                            <div className='space-y-0.5'>
                                                <p className='font-semibold text-sm'>English</p>
                                                <p className='text-xs text-muted-foreground'>
                                                    Tiếng Anh
                                                </p>
                                            </div>
                                        </div>
                                        {language === 'en' && (
                                            <div className='size-5 rounded-full bg-primary flex items-center justify-center'>
                                                <div className='size-2 rounded-full bg-background' />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
