import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './dialog.tsx';
import { Button } from './button.tsx';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    children?: React.ReactNode;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    variant = 'default',
    children,
}) => {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (loading) return;
        try {
            setLoading(true);
            await onConfirm();
        } catch (error) {
            console.error('ConfirmDialog Error:', error);
        } finally {
            // Chỉ đóng dialog, không set lại loading = false ngay
            // vì animation đóng có thể gây ra race condition click nhảy đúp
            onOpenChange(false);
        }
    };

    // Reset loading khi dialog bị ẩn (để tái sử dụng lần sau)
    React.useEffect(() => {
        if (!open) {
            setLoading(false);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {children}
                <DialogFooter className='flex sm:justify-end gap-2 mt-4'>
                    <Button variant='ghost' onClick={() => onOpenChange(false)} disabled={loading}>
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={loading}
                        className='min-w-[80px]'
                    >
                        {loading ? <Loader2 className='size-4 animate-spin' /> : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ConfirmDialog;
