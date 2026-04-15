import { AlertCircle } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';

interface NoticeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    actionText?: string;
}

export function NoticeDialog({
    isOpen,
    onClose,
    title,
    message,
    actionText = 'OK',
}: NoticeDialogProps) {
    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
            <div className="mt-1 flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                    <AlertCircle className="h-4.5 w-4.5" />
                </div>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
            </div>

            <div className="mt-6 flex justify-end">
                <Button onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white">
                    {actionText}
                </Button>
            </div>
        </Dialog>
    );
}
