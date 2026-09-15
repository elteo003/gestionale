export type ApiSection = 'dashboard' | 'clients' | 'projects' | 'contracts' | 'events';

export function getApiUrl(): string {
    const url =
        localStorage.getItem('customApiUrl') ||
        import.meta.env.VITE_API_URL ||
        'http://localhost:3000';
    return url.replace(/\/+$/, '');
}

export function getWsUrl(): string {
    return `${getApiUrl().replace(/^http/i, 'ws')}/ws`;
}

export function getSectionFromEndpoint(endpoint: string): ApiSection | undefined {
    if (endpoint.includes('/api/auth')) return undefined;
    if (endpoint.includes('/api/clients')) return 'clients';
    if (endpoint.includes('/api/projects')) return 'projects';
    if (endpoint.includes('/api/contracts')) return 'contracts';
    if (endpoint.includes('/api/events')) return 'events';
    if (endpoint.includes('/api/users') || endpoint.includes('/health')) return 'dashboard';
    return undefined;
}

/** Mock attivo solo in development e solo se esplicitamente abilitato. */
export function shouldUseMockData(section?: ApiSection, endpoint?: string): boolean {
    if (import.meta.env.PROD) return false;
    if (endpoint?.includes('/api/auth')) return false;
    if (!section) return false;

    const globalMock = localStorage.getItem('useMockData') === 'true';
    const mockSections = JSON.parse(localStorage.getItem('mockDataSections') || '{}');
    if (!globalMock) return mockSections[section] === true;
    if (mockSections[section] === false) return false;
    return mockSections[section] === true || globalMock;
}

export function clearAuthSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

export function notifyUnauthorized(): void {
    clearAuthSession();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

export class ConcurrentModificationError extends Error {
    status = 409;
    conflictData: unknown;

    constructor(message: string, conflictData: unknown) {
        super(message);
        this.name = 'ConcurrentModificationError';
        this.conflictData = conflictData;
    }
}

async function tryRefreshSession(): Promise<boolean> {
    try {
        const res = await fetch(`${getApiUrl()}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (data.token) localStorage.setItem('token', data.token);
        return true;
    } catch {
        return false;
    }
}

export async function apiCall(
    endpoint: string,
    options: RequestInit = {},
    fetchMock?: (endpoint: string, options: RequestInit) => Promise<unknown>,
    retried = false,
): Promise<any> {
    const section = getSectionFromEndpoint(endpoint);
    if (fetchMock && shouldUseMockData(section, endpoint)) {
        return fetchMock(endpoint, options);
    }

    const token = localStorage.getItem('token');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = `${getApiUrl()}${cleanEndpoint}`;

    const config: RequestInit = {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
        const response = await fetch(fullUrl, { ...config, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));

            // 401 = sessione scaduta; 403 = permessi insufficienti (non fare logout)
            if (
                response.status === 401 &&
                !retried &&
                !endpoint.includes('/api/auth/login') &&
                !endpoint.includes('/api/auth/register') &&
                !endpoint.includes('/api/auth/refresh')
            ) {
                const refreshed = await tryRefreshSession();
                if (refreshed) {
                    return apiCall(endpoint, options, fetchMock, true);
                }
                notifyUnauthorized();
            } else if (response.status === 401) {
                notifyUnauthorized();
            }

            if (response.status === 409 && error.error === 'CONCURRENT_MODIFICATION') {
                throw new ConcurrentModificationError(
                    error.message || 'Conflitto di modifica',
                    error,
                );
            }

            throw new Error(error.error || `Errore ${response.status}`);
        }

        return await response.json();
    } catch (error: unknown) {
        clearTimeout(timeoutId);
        const err = error as { name?: string; message?: string };

        if (
            err.name === 'AbortError' ||
            err.message === 'Failed to fetch' ||
            err.name === 'TypeError'
        ) {
            const isTimeout = err.name === 'AbortError';
            const networkError = new Error(
                `Impossibile raggiungere il backend.${isTimeout ? ' Timeout.' : ''} URL: ${getApiUrl()}`,
            );
            networkError.name = 'NetworkError';
            throw networkError;
        }
        throw error;
    }
}
