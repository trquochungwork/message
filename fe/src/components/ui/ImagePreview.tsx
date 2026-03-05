import { Dialog, DialogContent } from './dialog';
import { X, Download } from 'lucide-react';

interface ImagePreviewProps {
    src?: string | null;
    alt?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ImagePreview({ src, alt, isOpen, onClose }: ImagePreviewProps) {
    if (!src) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className='max-w-[95vw] max-h-[95vh] p-0 bg-transparent border-none shadow-none flex items-center justify-center overflow-hidden'>
                <div className='relative group max-w-full max-h-full'>
                    <img
                        src={src}
                        alt={alt || 'Preview'}
                        className='max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200'
                    />

                    {/* Controls */}
                    <div className='absolute -top-12 left-0 right-0 flex items-center justify-between px-2'>
                        <div className='text-white text-sm font-medium truncate max-w-[200px] bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md'>
                            {alt || 'Hình ảnh'}
                        </div>
                        <div className='flex items-center gap-2'>
                            <a
                                href={src}
                                download
                                target='_blank'
                                rel='noreferrer'
                                className='size-9 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-md'
                                title='Tải xuống'
                            >
                                <Download className='size-5' />
                            </a>
                            <button
                                onClick={onClose}
                                className='size-9 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-md'
                                title='Đóng'
                            >
                                <X className='size-5' />
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
