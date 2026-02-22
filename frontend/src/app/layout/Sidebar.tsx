import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, History, Settings, Bot } from 'lucide-react';
import { cn } from '../../utils/cn';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Planner', href: '/planner', icon: Calendar },
    { name: 'History', href: '/history', icon: History },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    return (
        <div className="hidden md:flex md:flex-shrink-0">
            <div className="flex flex-col w-64 border-r border-slate-200 bg-white shadow-sm">
                <div className="flex items-center h-16 px-6 border-b border-slate-200">
                    <div className="flex items-center space-x-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg">
                            <Bot className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-slate-900 tracking-tight">Agentic AI</span>
                    </div>
                </div>
                <div className="flex flex-col flex-1 mt-6 overflow-y-auto">
                    <nav className="flex-1 px-4 space-y-1">
                        {navigation.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                className={({ isActive }) =>
                                    cn(
                                        'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                                        isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    )
                                }
                            >
                                <item.icon
                                    className={cn(
                                        'mr-3 flex-shrink-0 h-5 w-5 transition-colors',
                                        'group-hover:text-slate-900'
                                    )}
                                />
                                {item.name}
                            </NavLink>
                        ))}
                    </nav>
                </div>
                <div className="p-4 border-t border-slate-200">
                    <div className="flex items-center p-3 rounded-lg bg-slate-50">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-700">AK</span>
                        </div>
                        <div className="ml-3 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">Arun Kumar</p>
                            <p className="text-xs text-slate-500 truncate">Personal Planner</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
