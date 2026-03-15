import { Dialog } from './Dialog';
import { Button } from './Button';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    variant?: 'primary' | 'danger';
}

export function ConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false,
    variant = 'primary'
}: ConfirmationDialogProps) {
    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={title}>
            <div className="mt-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
                <Button
                    variant="ghost"
                    onClick={onClose}
                    disabled={isLoading}
                    className="dark:text-slate-400"
                >
                    {cancelText}
                </Button>
                <Button
                    variant={variant === 'danger' ? 'danger' : 'primary'}
                    onClick={onConfirm}
                    isLoading={isLoading}
                    className={variant === 'primary' ? 'bg-brand-600 hover:bg-brand-700 text-white' : ''}
                >
                    {confirmText}
                </Button>
            </div>
        </Dialog>
    );
}
