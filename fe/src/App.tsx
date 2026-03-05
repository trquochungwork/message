import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import SignInPage from './pages/SignInPage.tsx';
import SignUpPage from './pages/SignUpPage.tsx';
import ChatAppPage from './pages/ChatAppPage.tsx';
import { Toaster } from 'sonner';
import ProtectedRoute from './components/auth/ProtectedRoute.tsx';
import PublicRoute from './components/auth/PublicRoute.tsx';

function App() {
    return (
        <>
            <Toaster richColors />
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route element={<PublicRoute />}>
                        <Route path='/signin' element={<SignInPage />} />
                        <Route path='/signup' element={<SignUpPage />} />
                    </Route>
                    {/* Protected Routes */}

                    {/* Todo tạo projected */}
                    <Route element={<ProtectedRoute />}>
                        <Route path='/' element={<ChatAppPage />} />
                        <Route path='/chat/:id' element={<ChatAppPage />} />
                        <Route path='/group/:id' element={<ChatAppPage />} />
                    </Route>
                    {/* Catch-all route */}
                    <Route path='*' element={<Navigate to='/' replace />} />
                </Routes>
            </BrowserRouter>
        </>
    );
}

export default App;
