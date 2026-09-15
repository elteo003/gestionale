import { AppProviders } from './app/providers';
import { AuthProvider } from './app/AuthProvider';
import { NotificationProvider } from './features/notifications/NotificationProvider';
import { AppRoutes } from './app/router';

export default function App() {
    return (
        <AppProviders>
            <AuthProvider>
                <NotificationProvider>
                    <AppRoutes />
                </NotificationProvider>
            </AuthProvider>
        </AppProviders>
    );
}
