import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
import { queryClient } from '../lib/query/client';
import { ThemeProvider } from '../theme/ThemeProvider';
import { NoticeProvider } from './NoticeProvider';

function AppRouter({ children }: { children: ReactNode }) {
    const isDesktop = typeof window !== 'undefined' && Boolean(window.jeins?.isDesktop);
    const Router = isDesktop ? HashRouter : BrowserRouter;
    return <Router>{children}</Router>;
}

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <AppRouter>
                <ThemeProvider>
                    <MotionConfig reducedMotion="user">
                        <NoticeProvider>{children}</NoticeProvider>
                    </MotionConfig>
                </ThemeProvider>
            </AppRouter>
        </QueryClientProvider>
    );
}
