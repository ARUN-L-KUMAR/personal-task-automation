import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PlannerPage } from '../features/planner/PlannerPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { SmartInboxPage } from '../features/email/SmartInboxPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { ChatbotPage } from '../features/chatbot/ChatbotPage';
import { VoiceAssistantPage } from '../features/voice/VoiceAssistantPage';
import { MapsPage } from '../features/maps/MapsPage';
import { SheetsPage } from '../features/sheets/SheetsPage';
import { ContactsPage } from '../features/contacts/ContactsPage';

// Placeholder components for other pages (to be built in Sprints 2 & 3)
const ComingSoon = ({ title }: { title: string }) => (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
            <Bot className="h-8 w-8" />
        </div>
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">This module is part of the next sprint. Stay tuned!</p>
        </div>
    </div>
);

const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <AppLayout>
                <DashboardPage />
            </AppLayout>
        ),
    },
    {
        path: '/planner',
        element: (
            <AppLayout>
                <PlannerPage />
            </AppLayout>
        ),
    },
    {
        path: '/history',
        element: (
            <AppLayout>
                <HistoryPage />
            </AppLayout>
        ),
    },
    {
        path: '/calendar',
        element: (
            <AppLayout>
                <CalendarPage />
            </AppLayout>
        ),
    },
    {
        path: '/email',
        element: (
            <AppLayout>
                <SmartInboxPage />
            </AppLayout>
        ),
    },
    {
        path: '/tasks',
        element: (
            <AppLayout>
                <TasksPage />
            </AppLayout>
        ),
    },
    {
        path: '/contacts',
        element: (
            <AppLayout>
                <ContactsPage />
            </AppLayout>
        ),
    },
    {
        path: '/maps',
        element: (
            <AppLayout>
                <MapsPage />
            </AppLayout>
        ),
    },
    {
        path: '/sheets',
        element: (
            <AppLayout>
                <SheetsPage />
            </AppLayout>
        ),
    },
    {
        path: '/chatbot',
        element: (
            <AppLayout>
                <ChatbotPage />
            </AppLayout>
        ),
    },
    {
        path: '/voice-assistant',
        element: (
            <AppLayout>
                <VoiceAssistantPage />
            </AppLayout>
        ),
    },
    {
        path: '/settings',
        element: (
            <AppLayout>
                <SettingsPage />
            </AppLayout>
        ),
    },
    {
        path: '*',
        element: (
            <AppLayout>
                <div className="h-[60vh] flex flex-col items-center justify-center">
                    <h1 className="text-6xl font-black text-slate-200 dark:text-slate-800">404</h1>
                    <p className="text-xl text-slate-500 mt-4">Page not found</p>
                </div>
            </AppLayout>
        ),
    },
]);

export function Router() {
    return <RouterProvider router={router} />;
}
