import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { PlannerPage } from '../features/planner/PlannerPage';
import { HistoryPage } from '../features/history/HistoryPage';

// Placeholder components for other pages
const Dashboard = () => (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center justify-center text-slate-400">
                    Stats Placeholder {i}
                </div>
            ))}
        </div>
    </div>
);

const Settings = () => (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-slate-400">
            Settings UI Placeholder (Future Integration)
        </div>
    </div>
);

const NotFound = () => (
    <div className="h-full flex flex-col items-center justify-center space-y-4">
        <h1 className="text-6xl font-black text-slate-200">404</h1>
        <p className="text-xl text-slate-500">Page not found</p>
    </div>
);

const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <AppLayout>
                <Dashboard />
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
        path: '/settings',
        element: (
            <AppLayout>
                <Settings />
            </AppLayout>
        ),
    },
    {
        path: '*',
        element: (
            <AppLayout>
                <NotFound />
            </AppLayout>
        ),
    },
]);

export function Router() {
    return <RouterProvider router={router} />;
}
