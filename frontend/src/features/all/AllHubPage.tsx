import React from 'react';
import { FileSpreadsheet, StickyNote, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { NotesPage } from '../notes/NotesPage';
import { ContactsPage } from '../contacts/ContactsPage';
import { SheetsPage } from '../sheets/SheetsPage';

type AllTab = 'notes' | 'contacts' | 'sheets';

const ALL_TABS: Array<{ key: AllTab; label: string; icon: React.ElementType }> = [
    { key: 'notes', label: 'Notes', icon: StickyNote },
    { key: 'contacts', label: 'Contacts', icon: Users },
    { key: 'sheets', label: 'Sheets', icon: FileSpreadsheet },
];

function parseTab(value: string | null): AllTab {
    if (value === 'contacts' || value === 'sheets' || value === 'notes') {
        return value;
    }
    return 'notes';
}

export function AllHubPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = parseTab(searchParams.get('tab'));

    const switchTab = (tab: AllTab) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', tab);
        setSearchParams(next, { replace: true });
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0 border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 w-fit overflow-x-auto">
                        {ALL_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => switchTab(tab.key)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                                    activeTab === tab.key
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                )}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {activeTab === 'notes' && <NotesPage />}
                    {activeTab === 'contacts' && <ContactsPage />}
                    {activeTab === 'sheets' && <SheetsPage />}
                </div>
            </div>
        </div>
    );
}
