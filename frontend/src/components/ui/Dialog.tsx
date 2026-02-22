import { Fragment } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function Dialog({ isOpen, onClose, title, children, className }: DialogProps) {
    return (
        <Transition show={isOpen} as={Fragment}>
            <HeadlessDialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <HeadlessDialog.Panel
                                className={cn(
                                    'w-full max-w-md transform overflow-hidden rounded-xl bg-white p-6 text-left align-middle shadow-xl transition-all',
                                    className
                                )}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    {title && (
                                        <HeadlessDialog.Title as="h3" className="text-lg font-semibold text-slate-900">
                                            {title}
                                        </HeadlessDialog.Title>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-500 focus:outline-none"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                {children}
                            </HeadlessDialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </HeadlessDialog>
        </Transition>
    );
}
