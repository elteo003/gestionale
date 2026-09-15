import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, HelpCircle, Settings } from 'lucide-react';
import { AppShell } from '../layout/AppShell';
import { UtilityView } from '../components/UtilityView';
import { useAuth } from './AuthProvider';
import { useProjects } from '../features/data/hooks';
import { openNotice as notify } from '../utils/notice';
import { canAccessView, resolvePermissions } from '../lib/permissions';
import { showNotice } from '../utils/notice';
import { SHARE_PROJECT_EVENT, SHARE_PROJECT_FLAG } from '../components/dashboard/ShareProjectDialog';

const VIEW_TITLES: Record<string, string> = {
    dashboard: 'Dashboard',
    clienti: 'Gestione Clienti',
    progetti: 'Gestione Progetti',
    contabilita: 'Contabilità',
    calendario: 'Calendario',
    tasks: 'Le mie attività',
    inbox: 'Inbox',
    reports: 'Report',
    notifiche: 'Notifiche',
    help: 'Aiuto',
    settings: 'Impostazioni',
    admin: 'Amministrazione',
    recruiting: 'Recruiting',
};

function pathToView(pathname: string): string {
    const segment = pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
    return segment === '' ? 'dashboard' : segment;
}

export function AuthenticatedLayout() {
    const { user, logout } = useAuth();
    const permissions = resolvePermissions(user);
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { data: projects = [] } = useProjects({ enabled: permissions.viewProjects });

    const activeView = pathToView(location.pathname);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    useEffect(() => {
        if (!projects.length) return;
        const fromUrl = searchParams.get('project');
        if (fromUrl && projects.some((p) => p.id === fromUrl)) {
            setActiveProjectId((current) => (current === fromUrl ? current : fromUrl));
            return;
        }
        setActiveProjectId((current) => current && projects.some((p) => p.id === current)
            ? current
            : projects[0].id);
    }, [projects, searchParams]);

    const selectProject = (id: string) => {
        setActiveProjectId(id);
        if (pathToView(location.pathname) === 'dashboard') {
            navigate(`/dashboard?project=${id}`, { replace: true });
        }
    };

    const title = VIEW_TITLES[activeView] || 'Gestionale';

    const setActiveView = (view: string) => {
        if (!canAccessView(user, view)) {
            showNotice('warning', 'Sezione non disponibile', 'Non hai i permessi per questa area.');
            return;
        }
        if (view === 'dashboard') {
            const q = activeProjectId ? `?project=${activeProjectId}` : '';
            const path = `/dashboard${q}`;
            if (`${location.pathname}${location.search}` !== path) navigate(path);
            return;
        }
        const path = `/${view}`;
        if (location.pathname !== path) navigate(path);
    };

    const openNotice = (noticeTitle: string, message?: string) => {
        notify(noticeTitle, message || 'Sezione collegata all’interfaccia.');
    };

    const utilityOutlet = useMemo(() => {
        switch (activeView) {
            case 'notifiche':
                return (
                    <UtilityView
                        icon={Bell}
                        title="Notifiche"
                        subtitle="Aggiornamenti e reminder."
                        primaryLabel="Dashboard"
                        onPrimary={() => navigate('/dashboard')}
                        cards={[
                            ['Task', 'Spostamenti kanban e assegnazioni.'],
                            ['Documenti', 'Stato fatture e contratti.'],
                            ['Calendario', 'Eventi e RSVP.'],
                        ]}
                    />
                );
            case 'help':
                return (
                    <UtilityView
                        icon={HelpCircle}
                        title="Help"
                        subtitle="Guida rapida."
                        primaryLabel="Nuovo progetto"
                        onPrimary={() => navigate('/progetti')}
                        cards={[
                            ['Dashboard', 'Kanban, attività, calendario.'],
                            ['Clienti', 'Anagrafiche commerciali.'],
                            ['Progetti', 'Todo e stato per cliente.'],
                        ]}
                    />
                );
            case 'settings':
                return (
                    <UtilityView
                        icon={Settings}
                        title="Impostazioni"
                        subtitle="Preferenze account."
                        primaryLabel="Tema"
                        onPrimary={() =>
                            openNotice('Tema', 'Usa sole/luna nella barra laterale.')}
                        cards={[
                            ['Account', user?.name || 'Utente'],
                            ['Workspace', 'GESTIONALE JEINS'],
                            ['API', import.meta.env.VITE_API_URL || 'localhost:3000'],
                        ]}
                    />
                );
            default:
                return null;
        }
    }, [activeView, navigate, user?.name]);

    return (
        <AppShell
            user={user}
            onLogout={logout}
            activeView={activeView}
            setActiveView={setActiveView}
            projects={projects}
            activeProjectId={activeProjectId}
            setActiveProjectId={selectProject}
            onAddProject={permissions.viewProjects ? () => navigate('/progetti') : undefined}
            onQuickAction={openNotice}
            onShareProject={() => {
                sessionStorage.setItem(SHARE_PROJECT_FLAG, '1');
                setActiveView('dashboard');
                window.dispatchEvent(new Event(SHARE_PROJECT_EVENT));
            }}
            title={title}
            showProjectSidebar={
                permissions.viewProjects && (activeView === 'dashboard' || activeView === 'progetti')
            }
        >
            {utilityOutlet ?? <Outlet context={{ activeProjectId, user, projects }} />}
        </AppShell>
    );
}
