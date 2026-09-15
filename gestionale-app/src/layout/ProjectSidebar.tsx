import { Plus, FolderKanban, Share2, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { SidebarCalendar } from './SidebarCalendar';
import type { Project } from '../types/models';

interface ProjectSidebarProps {
    projects: Project[];
    activeProjectId: string | null;
    onSelectProject: (id: string) => void;
    onAddProject?: () => void;
    onNavigate?: (view: string) => void;
    onQuickAction?: (title: string, message?: string) => void;
    onShareProject?: () => void;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
}

export function ProjectSidebar({
    projects, activeProjectId, onSelectProject, onAddProject, onNavigate, onQuickAction, onShareProject,
    collapsed = false, onToggleCollapsed,
}: ProjectSidebarProps) {
    return (
        <aside
            className={`hidden lg:flex flex-shrink-0 flex-col bg-surface-raised border-r border-line/40 overflow-hidden
                        ${collapsed ? 'w-12' : 'w-[17.5rem]'}`}
        >
            {collapsed ? (
                <div className="flex flex-col items-center pt-3 gap-2">
                    <button
                        type="button"
                        className="icon-btn !w-8 !h-8"
                        aria-label="Nuovo progetto"
                        onClick={() => onAddProject?.()}
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        className="icon-btn !w-8 !h-8"
                        aria-label="Apri menu progetti"
                        title="Apri menu"
                        aria-expanded={false}
                        onClick={onToggleCollapsed}
                    >
                        <ChevronsRight className="w-4 h-4 text-ink-muted" />
                    </button>
                </div>
            ) : (
                <>
                    <div className="px-3 pt-4 pb-3 flex items-center gap-1.5">
                        <button
                            type="button"
                            className="icon-btn !w-7 !h-7"
                            aria-label="Nuovo progetto"
                            onClick={() => onAddProject?.()}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                        <h2 className="text-sm font-semibold text-ink tracking-tight flex-1 min-w-0 truncate">
                            Progetto attivo
                        </h2>
                        <button
                            type="button"
                            className="icon-btn !w-7 !h-7"
                            aria-label="Nascondi menu progetti"
                            title="Nascondi menu"
                            aria-expanded={true}
                            onClick={onToggleCollapsed}
                        >
                            <ChevronsLeft className="w-4 h-4 text-ink-muted" />
                        </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 scrollbar-thin">
                        {projects.length === 0 ? (
                            <div className="rounded-xl border border-line/40 bg-surface-inset/50 px-3 py-4">
                                <p className="text-xs text-ink-subtle leading-relaxed">
                                    Nessun progetto. Creane uno per popolare la board.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => onAddProject?.()}
                                    className="mt-3 w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-xs
                                               text-brand-400 hover:text-brand-300 hover:bg-brand-950/30 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span className="font-medium">Nuovo progetto</span>
                                </button>
                            </div>
                        ) : (
                            <ul className="space-y-0.5">
                                {projects.map((proj) => {
                                    const active = activeProjectId === proj.id;
                                    return (
                                        <li key={proj.id}>
                                            <button
                                                type="button"
                                                onClick={() => onSelectProject(proj.id)}
                                                aria-current={active ? 'true' : undefined}
                                                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition
                                                    ${active
                                                        ? 'bg-surface-inset text-ink'
                                                        : 'text-ink-muted hover:bg-surface-inset/60 hover:text-ink'}`}
                                            >
                                                <FolderKanban className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-brand-400' : 'text-ink-subtle'}`} />
                                                <span className="truncate font-medium">{proj.name}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <div className="px-3 pb-3">
                        <button
                            type="button"
                            onClick={() => onShareProject?.()}
                            className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-xl text-xs
                                       border border-line/50 bg-surface-inset/50 text-ink hover:bg-surface-inset transition-colors"
                        >
                            <Share2 className="w-3.5 h-3.5 text-brand-400" />
                            <span className="font-medium">Condividi documenti</span>
                        </button>
                    </div>

                    <SidebarCalendar
                        onOpenCalendar={() => onNavigate?.('calendario')}
                        onQuickAction={onQuickAction}
                    />
                </>
            )}
        </aside>
    );
}
