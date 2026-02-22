import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function Header() {
    return (
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-sm z-10">
            <div className="flex items-center md:hidden">
                <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                </Button>
            </div>

            <div className="flex-1 max-w-sm ml-4 md:ml-0">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        placeholder="Search tasks, plans..."
                    />
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-slate-600" />
                    <span className="absolute top-2.5 right-2.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                </Button>
                <div className="h-8 w-px bg-slate-200 mx-2"></div>
                <p className="hidden md:block text-sm font-medium text-slate-700">Welcome, Arun</p>
            </div>
        </header>
    );
}
