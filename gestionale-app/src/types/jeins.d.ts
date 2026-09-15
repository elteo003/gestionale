export {};

declare global {
    interface Window {
        jeins?: {
            isDesktop?: boolean;
            apiUrl?: string;
            setAuthToken?: (token: string) => Promise<void> | void;
            clearAuth?: () => Promise<void> | void;
            onNavigate?: (handler: (url: string) => void) => (() => void) | void;
        };
    }
}
