import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { AuthGuard } from './layout/AuthGuard';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { LandingPage } from '../features/landing/LandingPage';
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
import { NotesPage } from '../features/notes/NotesPage';
import { InsightsPage } from '../features/insights/InsightsPage';
import { GoogleConnectPage } from '../features/google-connect/GoogleConnectPage';
import { PrivacyPage } from '../features/legal/PrivacyPage';
import { TermsPage } from '../features/legal/TermsPage';

// Helper — wrap protected pages inside AuthGuard + AppLayout
const Protected = ({ children }: { children: React.ReactNode }) => (
    <AuthGuard>
        <AppLayout>{children}</AppLayout>
    </AuthGuard>
);

const router = createBrowserRouter([
    // ── Public routes ──
    { path: '/', element: <LandingPage /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    { path: '/privacy', element: <PrivacyPage /> },
    { path: '/terms', element: <TermsPage /> },

    // ── Protected routes ──
    { path: '/dashboard', element: <Protected><DashboardPage /></Protected> },
    { path: '/planner', element: <Protected><PlannerPage /></Protected> },
    { path: '/history', element: <Protected><HistoryPage /></Protected> },
    { path: '/calendar', element: <Protected><CalendarPage /></Protected> },
    { path: '/email', element: <Protected><SmartInboxPage /></Protected> },
    { path: '/tasks', element: <Protected><TasksPage /></Protected> },
    { path: '/contacts', element: <Protected><ContactsPage /></Protected> },
    { path: '/maps', element: <Protected><MapsPage /></Protected> },
    { path: '/sheets', element: <Protected><SheetsPage /></Protected> },
    { path: '/chatbot', element: <Protected><ChatbotPage /></Protected> },
    { path: '/voice-assistant', element: <Protected><VoiceAssistantPage /></Protected> },
    { path: '/settings', element: <Protected><SettingsPage /></Protected> },
    { path: '/notes', element: <Protected><NotesPage /></Protected> },
    { path: '/insights', element: <Protected><InsightsPage /></Protected> },
    { path: '/google-connect', element: <Protected><GoogleConnectPage /></Protected> },
    {
        path: '*',
        element: (
            <Protected>
                <div className="h-[60vh] flex flex-col items-center justify-center">
                    <h1 className="text-6xl font-black text-slate-200 dark:text-slate-800">404</h1>
                    <p className="text-xl text-slate-500 mt-4">Page not found</p>
                </div>
            </Protected>
        ),
    },
]);

export function Router() {
    return <RouterProvider router={router} />;
}
