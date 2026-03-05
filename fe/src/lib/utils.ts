import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatMessageTime(dateInput: string | Date | number) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatChatCardTime(dateInput: string | Date | number) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const dayDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (dayDiff === 0) {
        return new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }
    if (dayDiff === 1) {
        return 'Hôm qua';
    }
    if (dayDiff < 7) {
        return new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date);
    }
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
    }).format(date);
}
