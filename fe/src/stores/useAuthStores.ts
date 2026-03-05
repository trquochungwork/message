import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { authService } from '../services/authService.ts';
import type { AuthState } from '../types/store.ts';

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            accessToken: null,
            user: null,
            loading: false,
            language: 'vi',

            setLanguage: (lang) => {
                set({ language: lang });
            },

            setAccessToken: (accessToken) => {
                set({ accessToken });
            },
            clearState: () => {
                set({ accessToken: null, user: null, loading: false });
            },

            signUp: async (username, password, email, firstName, lastName, phone) => {
                try {
                    set({ loading: true });
                    await authService.signUp(username, password, email, firstName, lastName, phone);
                    toast.success('Đăng ký thành công bạn sẽ chuyển sang trang đăng nhập.');
                } catch (error: any) {
                    console.error(error);
                    const msg = error?.response?.data?.message || 'Đăng ký không thành công';
                    toast.error(msg);
                    throw error;
                } finally {
                    set({ loading: false });
                }
            },
            signIn: async (identifier, password) => {
                try {
                    set({ loading: true });
                    const accessToken = await authService.signIn(identifier, password);
                    get().setAccessToken(accessToken);
                    await get().fetchMe();
                    toast.success('🎆 Chào mừng bạn quay lại với Message 🎉');
                } catch (error) {
                    console.error(error);
                    toast.error('Đăng nhập không thành công!');
                } finally {
                    set({ loading: false });
                }
            },
            signOut: async () => {
                try {
                    get().clearState();
                    await authService.signOut();
                    toast.success('Logout thành công ');
                } catch (error) {
                    console.error(error);
                    toast.error('Lỗi xảy ra khi logout. Vui lòng thử lại !');
                }
            },
            fetchMe: async () => {
                try {
                    set({ loading: true });
                    const user = await authService.fetchMe();
                    set({ user });
                } catch (error) {
                    console.error(error);
                    set({ user: null, accessToken: null });
                    toast.error('Lỗi Xảy ra khi lấy dữ liệu người dùng. Hãy thử lại');
                } finally {
                    set({ loading: false });
                }
            },
            refresh: async () => {
                try {
                    set({ loading: true });
                    const { user, fetchMe, setAccessToken } = get();
                    const accessToken = await authService.refresh();
                    setAccessToken(accessToken);
                    if (!user) {
                        await fetchMe();
                    }
                } catch (error) {
                    console.error(error);
                    toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại !');
                    get().clearState();
                } finally {
                    set({ loading: false });
                }
            },
            updateDisplayName: async (name: string) => {
                try {
                    set({ loading: true });
                    const user = await authService.updateDisplayName(name);
                    set({ user });
                    toast.success('Cập nhật tên hiển thị thành công!');
                } catch (error) {
                    console.error(error);
                    toast.error('Lỗi khi cập nhật tên hiển thị!');
                } finally {
                    set({ loading: false });
                }
            },
            updateAvatar: async (file: File) => {
                try {
                    set({ loading: true });
                    const user = await authService.updateAvatar(file);
                    set({ user });
                    toast.success('Cập nhật ảnh đại diện thành công!');
                } catch (error) {
                    console.error(error);
                    toast.error('Lỗi khi cập nhật ảnh đại diện!');
                } finally {
                    set({ loading: false });
                }
            },
            updateProfile: async (data: { displayName?: string; bio?: string; phone?: string }) => {
                try {
                    set({ loading: true });
                    const user = await authService.updateProfile(data);
                    set({ user });
                    toast.success('Cập nhật hồ sơ thành công!');
                } catch (error) {
                    console.error(error);
                    toast.error('Lỗi khi cập nhật hồ sơ!');
                    throw error;
                } finally {
                    set({ loading: false });
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ language: state.language }),
        }
    )
);
