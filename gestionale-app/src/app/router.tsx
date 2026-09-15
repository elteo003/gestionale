import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { useAuth } from './AuthProvider';
import { RequirePermission } from './RequirePermission';
import { defaultHomePath } from '../lib/permissions';
import { LoginPage } from '../pages/LoginPage';

const DashboardPage = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ClientsPage = lazy(() => import('../pages/ClientsPage').then(m => ({ default: m.ClientsPage })));
const ProjectsPage = lazy(() => import('../pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const BillingPage = lazy(() => import('../pages/BillingPage').then(m => ({ default: m.BillingPage })));
const CalendarPage = lazy(() => import('../pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const MyTasksPage = lazy(() => import('../pages/MyTasksPage').then(m => ({ default: m.MyTasksPage })));
const InboxPage = lazy(() => import('../pages/InboxPage').then(m => ({ default: m.InboxPage })));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ReportsPage = lazy(() => import('../pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const AdminPage = lazy(() => import('../pages/AdminPage').then(m => ({ default: m.AdminPage })));
const Recruiting = lazy(() => import('../components/Recruiting'));

function PageFallback() {
    return <p className="text-ink-muted animate-pulse">Caricamento…</p>;
}

function RecruitingRoute() {
    const { user } = useAuth();
    if (!user) return null;
    return <Recruiting currentUser={user} />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-surface text-ink-muted">
                Caricamento…
            </div>
        );
    }
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

function Lazy({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

function HomeRedirect() {
    const { user } = useAuth();
    return <Navigate to={defaultHomePath(user)} replace />;
}

function Guard({ perm, children }: { perm: keyof import('../lib/permissions').UserPermissions; children: React.ReactNode }) {
    return <RequirePermission perm={perm}>{children}</RequirePermission>;
}

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                element={
                    <ProtectedRoute>
                        <AuthenticatedLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<HomeRedirect />} />
                <Route path="dashboard" element={<Guard perm="viewDashboard"><Lazy><DashboardPage /></Lazy></Guard>} />
                <Route path="clienti" element={<Guard perm="viewClients"><Lazy><ClientsPage /></Lazy></Guard>} />
                <Route path="progetti" element={<Guard perm="viewProjects"><Lazy><ProjectsPage /></Lazy></Guard>} />
                <Route path="contabilita" element={<Guard perm="viewBilling"><Lazy><BillingPage /></Lazy></Guard>} />
                <Route path="calendario" element={<Guard perm="viewCalendar"><Lazy><CalendarPage /></Lazy></Guard>} />
                <Route path="tasks" element={<Guard perm="viewMyTasks"><Lazy><MyTasksPage /></Lazy></Guard>} />
                <Route path="inbox" element={<Guard perm="viewInbox"><Lazy><InboxPage /></Lazy></Guard>} />
                <Route path="reports" element={<Guard perm="viewReports"><Lazy><ReportsPage /></Lazy></Guard>} />
                <Route path="notifiche" element={<Lazy><NotificationsPage /></Lazy>} />
                <Route path="help" element={<></>} />
                <Route path="settings" element={<></>} />
                <Route path="admin" element={<Guard perm="manageUsers"><Lazy><AdminPage /></Lazy></Guard>} />
                <Route path="recruiting" element={<Guard perm="manageUsers"><Lazy><RecruitingRoute /></Lazy></Guard>} />
            </Route>
            <Route path="*" element={<HomeRedirect />} />
        </Routes>
    );
}
