import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStores.ts';
import { useEffect, useState } from 'react';
import LoadingScreen from '../ui/LoadingScreen.tsx';

const PublicRoute = () => {
    const { accessToken, user, refresh, fetchMe } = useAuthStore();
    const [starting, setStarting] = useState(true);

    useEffect(() => {
        const init = async () => {
            if (!accessToken) {
                try {
                    await refresh();
                } catch {
                    // Ignore error on public pages
                }
            }
            if (accessToken && !user) {
                try {
                    await fetchMe();
                } catch {
                    // Ignore error
                }
            }
            setStarting(false);
        };

        init();
    }, []);

    if (starting) {
        return <LoadingScreen />;
    }

    // Nếu đã đăng nhập, chuyển hướng về trang chủ
    if (accessToken) {
        return <Navigate to='/' replace />;
    }

    return <Outlet />;
};

export default PublicRoute;
