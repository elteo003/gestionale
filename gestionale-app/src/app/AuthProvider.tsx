import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, usersAPI } from '../services/api';
import { clearAuthSession } from '../lib/api/client';
import type { User } from '../types/models';

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (data: User & { token?: string }) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function syncDesktopToken() {
    const token = localStorage.getItem('token');
    if (token) void window.jeins?.setAuthToken?.(token);
}

async function resolveCurrentUser(fallback: User): Promise<User> {
    try {
        return await usersAPI.getMe();
    } catch {
        return fallback;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        const me = await usersAPI.getMe();
        setUser(me);
        localStorage.setItem('user', JSON.stringify(me));
    }, []);

    const bootstrapSession = useCallback(async () => {
        try {
            const res = await authAPI.verify();
            const me = await resolveCurrentUser(res.user);
            setUser(me);
            localStorage.setItem('user', JSON.stringify(me));
            syncDesktopToken();
            return true;
        } catch {
            try {
                const refreshed = await authAPI.refresh();
                const me = await resolveCurrentUser(refreshed.user);
                if (refreshed.token) localStorage.setItem('token', refreshed.token);
                setUser(me);
                localStorage.setItem('user', JSON.stringify(me));
                syncDesktopToken();
                return true;
            } catch {
                clearAuthSession();
                setUser(null);
                return false;
            }
        }
    }, []);

    useEffect(() => {
        bootstrapSession().finally(() => setLoading(false));
    }, [bootstrapSession]);

    useEffect(() => {
        const onUnauthorized = () => {
            clearAuthSession();
            setUser(null);
            navigate('/login', { replace: true });
        };
        window.addEventListener('auth:unauthorized', onUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
    }, [navigate]);

    const login = useCallback(async (data: User & { token?: string }) => {
        if (data.token) localStorage.setItem('token', data.token);
        const me = await resolveCurrentUser(data);
        setUser(me);
        localStorage.setItem('user', JSON.stringify(me));
        syncDesktopToken();
    }, []);

    const logout = useCallback(async () => {
        try {
            await authAPI.logout();
        } catch {
            /* ignore */
        }
        clearAuthSession();
        setUser(null);
        navigate('/login', { replace: true });
    }, [navigate]);

    const value = useMemo(
        () => ({
            user,
            isAuthenticated: !!user,
            loading,
            login,
            logout,
            refreshUser,
        }),
        [user, loading, login, logout, refreshUser],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
