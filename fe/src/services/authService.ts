import api from '@/lib/axios.ts';
export const authService = {
    signUp: async (
        username: string,
        password: string,
        email: string,
        firstName: string,
        lastName: string,
        phone?: string
    ) => {
        const res = await api.post(
            'auth/signup',
            {
                username,
                password,
                email,
                firstName,
                lastName,
                phone,
            },
            { withCredentials: true }
        );
        return res.data;
    },
    signIn: async (identifier: string, password: string) => {
        const res = await api.post(
            'auth/signin',
            {
                identifier,
                password,
            },
            { withCredentials: true }
        );
        return res.data.accessToken;
    },
    signOut: async () => {
        return api.post('auth/signout', {}, { withCredentials: true });
    },
    fetchMe: async () => {
        const res = await api.get('users/me', { withCredentials: true });
        return res.data.user;
    },
    refresh: async () => {
        const res = await api.post('auth/refresh', { withCredentials: true });
        return res.data.accessToken;
    },
    updateDisplayName: async (name: string) => {
        const res = await api.patch('users/me', { displayName: name }, { withCredentials: true });
        return res.data.user;
    },
    updateAvatar: async (file: File) => {
        const formData = new FormData();
        formData.append('avatar', file);
        const res = await api.patch('users/me/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: true,
        });
        return res.data.user;
    },
    updateProfile: async (data: { displayName?: string; bio?: string; phone?: string }) => {
        const res = await api.patch('users/me', data, { withCredentials: true });
        return res.data.user;
    },
};
