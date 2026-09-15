import { useState, type ReactNode } from 'react';
import { IconRail } from './IconRail';
import { ProjectSidebar } from './ProjectSidebar';
import { TopBar } from './TopBar';
import { PageTransition } from '../components/layout/PageTransition';
import type { Project, User } from '../types/models';

const SIDEBAR_KEY = 'jeins:project-sidebar';

function readSidebarOpen() {
    try {
        return localStorage.getItem(SIDEBAR_KEY) !== '0';
    } catch {
        return true;
    }
}

interface AppShellProps {
    user: User | null;
    onLogout: () => void;
    activeView: string;
    setActiveView: (v: string) => void;
    projects: Project[];
    activeProjectId: string | null;
    setActiveProjectId: (id: string) => void;
    onAddProject?: () => void;
    onQuickAction?: (title: string, message?: string) => void;
    onShareProject?: () => void;
    title?: string;
    showProjectSidebar?: boolean;
    children: ReactNode;
}

export function AppShell({
    user, onLogout, activeView, setActiveView,
    projects, activeProjectId, setActiveProjectId, onAddProject,
    onQuickAction, onShareProject, title, showProjectSidebar = true, children,
}: AppShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);

    const toggleSidebar = () => {
        setSidebarOpen((open) => {
            const next = !open;
            try {
                localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
            } catch {
                /* ignore */
            }
            return next;
        });
    };

    return (
        <div className="h-screen flex bg-surface text-ink overflow-hidden">
            <IconRail activeView={activeView} setActiveView={setActiveView} />
            {showProjectSidebar && (
                <ProjectSidebar
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onSelectProject={setActiveProjectId}
                    onAddProject={onAddProject}
                    onNavigate={setActiveView}
                    onQuickAction={onQuickAction}
                    onShareProject={onShareProject}
                    collapsed={!sidebarOpen}
                    onToggleCollapsed={toggleSidebar}
                />
            )}
            <div className="flex-1 flex flex-col min-w-0">
                <TopBar
                    user={user}
                    onLogout={onLogout}
                    title={title}
                    onNavigate={setActiveView}
                    onQuickAction={onQuickAction}
                />
                <main className="dashboard-canvas flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-5">
                    <PageTransition>{children}</PageTransition>
                </main>
            </div>
        </div>
    );
}
