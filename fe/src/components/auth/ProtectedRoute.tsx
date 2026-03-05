import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStores.ts';
import { useEffect, useState } from 'react';
import LoadingScreen from '../ui/LoadingScreen.tsx';

const ProtectedRoute = () => {
    const { accessToken, user, loading, refresh, fetchMe } = useAuthStore();
    const [starting, setStarting] = useState(true);

    useEffect(() => {
        const init = async () => {
            if (!accessToken) {
                await refresh();
            }
            if (accessToken && !user) {
                await fetchMe();
            }
            setStarting(false);
        };

        init();
    }, []);

    if (starting || loading) {
        return <LoadingScreen />;
    }
    if (!accessToken) {
        return <Navigate to='/signin' replace />;
    }
    return <Outlet></Outlet>;
};

export default ProtectedRoute;
