import {
    LayoutGrid, FolderOpen, FileText, PieChart,
    MessageSquare, Cloud, CalendarDays, Settings,
    Sun, Moon, ListTodo,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../app/AuthProvider';
import { resolvePermissions, type UserPermissions } from '../lib/permissions';

interface IconRailProps {
    activeView: string;
    setActiveView: (view: string) => void;
}

const VIEW_PATHS: Record<string, string> = {
    clienti: '/clienti',
    dashboard: '/dashboard',
    progetti: '/progetti',
    reports: '/reports',
    calendario: '/calendario',
    inbox: '/inbox',
    contabilita: '/contabilita',
    tasks: '/tasks',
    settings: '/settings',
};

const TOP_ITEMS: { id: string; icon: typeof LayoutGrid; label: string; perm: keyof UserPermissions }[] = [
    { id: 'clienti',     icon: LayoutGrid,    label: 'Clienti',       perm: 'viewClients' },
    { id: 'dashboard',   icon: FolderOpen,    label: 'Dashboard',     perm: 'viewDashboard' },
    { id: 'progetti',    icon: FileText,      label: 'Progetti',      perm: 'viewProjects' },
    { id: 'tasks',       icon: ListTodo,      label: 'I miei lavori', perm: 'viewMyTasks' },
    { id: 'reports',     icon: PieChart,      label: 'Report',        perm: 'viewReports' },
    { id: 'calendario',  icon: CalendarDays,  label: 'Scadenze',      perm: 'viewCalendar' },
    { id: 'inbox',       icon: MessageSquare, label: 'Inbox',         perm: 'viewInbox' },
    { id: 'contabilita', icon: Cloud,         label: 'Fatturato',     perm: 'viewBilling' },
];

const BOTTOM_ITEMS = [
    { id: 'settings', icon: Settings, label: 'Impostazioni' },
];

const RAIL_STEP_PX = 40; // 36px button + 4px gap

function RailButton({
    active, onClick, label, Icon,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    Icon: typeof LayoutGrid;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="nav-rail-btn relative"
            data-active={active}
            title={label}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
        >
            <Icon className={`w-[18px] h-[18px] relative z-10 ${active ? 'text-white' : ''}`} />
        </button>
    );
}

function RailNav({
    items,
    activeView,
    onGo,
}: {
    items: { id: string; icon: typeof LayoutGrid; label: string }[];
    activeView: string;
    onGo: (id: string) => void;
}) {
    const activeIndex = items.findIndex((item) => item.id === activeView);

    return (
        <nav className="relative flex flex-col gap-1">
            {activeIndex >= 0 && (
                <span
                    className="rail-active-pill bg-grad-brand shadow-glow-brand"
                    style={{ transform: `translateY(${activeIndex * RAIL_STEP_PX}px)` }}
                    aria-hidden
                />
            )}
            {items.map((item) => (
                <RailButton
                    key={item.id}
                    active={activeView === item.id}
                    onClick={() => onGo(item.id)}
                    label={item.label}
                    Icon={item.icon}
                />
            ))}
        </nav>
    );
}

export function IconRail({ activeView, setActiveView }: IconRailProps) {
    const { user } = useAuth();
    const permissions = resolvePermissions(user);
    const navItems = TOP_ITEMS.filter(item => permissions[item.perm]);
    const { theme, toggle } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const go = (viewId: string) => {
        setActiveView(viewId);
        const path = VIEW_PATHS[viewId] || `/${viewId}`;
        if (location.pathname !== path) navigate(path);
    };

    return (
        <aside className="hidden md:flex w-[3.5rem] flex-shrink-0 flex-col items-center
                          bg-surface-sunken border-r border-line/40 py-3 gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-grad-brand flex items-center justify-center mb-2 shadow-glow-brand">
                <span className="text-white text-xs font-bold">J</span>
            </div>

            <div className="mt-2">
                <RailNav items={navItems} activeView={activeView} onGo={go} />
            </div>

            <div className="flex-1" />

            <RailNav items={BOTTOM_ITEMS} activeView={activeView} onGo={go} />

            <button
                type="button"
                onClick={toggle}
                className="nav-rail-btn mt-2"
                title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
                aria-label="Cambia tema"
            >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
        </aside>
    );
}
