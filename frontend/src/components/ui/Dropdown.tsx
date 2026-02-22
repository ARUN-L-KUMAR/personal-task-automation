import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DropdownItem {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'default' | 'danger';
}

interface DropdownProps {
    trigger: React.ReactNode;
    items: DropdownItem[];
    className?: string;
}

export function Dropdown({ trigger, items, className }: DropdownProps) {
    return (
        <Menu as="div" className={cn('relative inline-block text-left', className)}>
            <div>
                <Menu.Button as={Fragment}>{trigger}</Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-slate-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="px-1 py-1">
                        {items.map((item, index) => (
                            <Menu.Item key={index}>
                                {({ active }) => (
                                    <button
                                        onClick={item.onClick}
                                        className={cn(
                                            'group flex w-full items-center rounded-md px-2 py-2 text-sm',
                                            active ? (item.variant === 'danger' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700') : 'text-slate-700',
                                            item.variant === 'danger' && !active && 'text-red-500'
                                        )}
                                    >
                                        {item.icon && <span className="mr-2">{item.icon}</span>}
                                        {item.label}
                                    </button>
                                )}
                            </Menu.Item>
                        ))}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
