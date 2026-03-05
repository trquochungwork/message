import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Ẩn preloader HTML khi React đã sẵn sàng
const preloader = document.getElementById('app-preloader');
if (preloader) {
    preloader.classList.add('hide');
    setTimeout(() => preloader.remove(), 500);
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
