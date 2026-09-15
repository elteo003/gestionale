import { useOutletContext } from 'react-router-dom';
import { DashboardView } from '../components/dashboard/DashboardView';
import type { Project, User } from '../types/models';

export function DashboardPage() {
    const { activeProjectId, user, projects } = useOutletContext<{
        activeProjectId: string | null;
        user: User | null;
        projects: Project[];
    }>();

    return (
        <DashboardView
            activeProjectId={activeProjectId}
            currentUser={user}
            projects={projects || []}
        />
    );
}
