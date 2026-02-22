import { Dialog } from './Dialog';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary';
    isLoading?: boolean;
}

export function ConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary',
    isLoading = false,
}: ConfirmationDialogProps) {
    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <AlertCircle className={`h-6 w-6 ${variant === 'danger' ? 'text-red-500' : 'text-blue-500'}`} />
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                        {cancelText}
                    </Button>
                    <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} isLoading={isLoading}>
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
