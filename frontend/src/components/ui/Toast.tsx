import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    duration?: number;
    onClose: () => void;
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="h-5 w-5 text-green-500" />,
        error: <AlertCircle className="h-5 w-5 text-red-500" />,
        info: <Info className="h-5 w-5 text-blue-500" />,
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        info: 'bg-blue-50 border-blue-200',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
                'flex items-center p-4 rounded-lg border shadow-lg max-w-sm pointer-events-auto',
                bgColors[type]
            )}
        >
            <div className="flex-shrink-0">{icons[type]}</div>
            <div className="ml-3 text-sm font-medium text-slate-800">{message}</div>
            <button
                onClick={onClose}
                className="ml-auto pl-3 rounded-md focus:outline-none hover:opacity-70 transition-opacity"
            >
                <X className="h-4 w-4 text-slate-400" />
            </button>
        </motion.div>
    );
}

// Simple Toast Provider/Hook could be added here, but for now we'll use a direct implementation in features
