import { useEffect, useState } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { BentoCell } from '../motion/BentoCell';
import { MotionDialog } from '../motion/MotionDialog';
import { ShareProjectDialog, SHARE_PROJECT_EVENT, SHARE_PROJECT_FLAG } from './ShareProjectDialog';
import { TodayRail } from './TodayRail';
import { Plus, X } from 'lucide-react';
import { openNotice } from '../../utils/notice';
import { resolvePermissions } from '../../lib/permissions';
import {
    tasksAPI, sprintsAPI, activitiesAPI,
    eventsAPI, usersAPI,
} from '../../services/api';
import type {
    Task, BoardColumn, Sprint, Activity,
    User, Project,
} from '../../types/models';

interface DashboardViewProps {
    activeProjectId: string | null;
    currentUser: User | null;
    projects?: Project[];
}

export function DashboardView({ activeProjectId, currentUser, projects = [] }: DashboardViewProps) {
    const [columns, setColumns] = useState<BoardColumn[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [hasRealTasks, setHasRealTasks] = useState(false);
    const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [events, setEvents] = useState<{ id: string; title: string; startTime: string; endTime?: string }[]>([]);
    const [members, setMembers] = useState<User[]>([]);
    const [taskComposerColumnId, setTaskComposerColumnId] = useState<string | null>(null);
    const [shareOpen, setShareOpen] = useState(false);

    useEffect(() => {
        const openShare = () => {
            sessionStorage.removeItem(SHARE_PROJECT_FLAG);
            setShareOpen(true);
        };
        if (sessionStorage.getItem(SHARE_PROJECT_FLAG) === '1') openShare();
        window.addEventListener(SHARE_PROJECT_EVENT, openShare);
        return () => window.removeEventListener(SHARE_PROJECT_EVENT, openShare);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const safe = async <T,>(p: Promise<T>, fb: T): Promise<T> => {
                    try { return await p; } catch { return fb; }
                };

                const [colsRaw, tasksRaw, sprint, acts, evs, users] = await Promise.all([
                    activeProjectId ? safe(tasksAPI.getColumns(activeProjectId), []) : Promise.resolve([]),
                    safe(tasksAPI.getAll(activeProjectId ? { projectId: activeProjectId } : {}), []),
                    safe(sprintsAPI.getActive(activeProjectId || undefined), null),
                    safe(activitiesAPI.getAll({
                        projectId: activeProjectId || undefined,
                        limit: 20,
                    }), []),
                    safe(eventsAPI.getAll({}), []),
                    safe(usersAPI.getAll(), []),
                ]);

                if (cancelled) return;

                const cols: BoardColumn[] = (colsRaw as BoardColumn[]).length
                    ? (colsRaw as BoardColumn[])
                    : DEFAULT_COLUMNS;

                const realTasks = tasksRaw as Task[];
                const hydratedTasks =
                    realTasks.length > 0
                        ? realTasks
                        : import.meta.env.PROD
                          ? []
                          : mockTasks(
                                cols,
                                (users as User[]).length ? (users as User[]) : mockMembers,
                            );

                setColumns(cols);
                setHasRealTasks(realTasks.length > 0);
                setTasks(hydratedTasks);
                setActiveSprint(sprint as Sprint | null);
                setActivities(acts as Activity[]);
                setEvents(evs as { id: string; title: string; startTime: string; endTime?: string }[]);
                setMembers(users as User[]);
            } catch (err) {
                console.error('Errore loading dashboard:', err);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [activeProjectId]);

    const displayTasks: Task[] = tasks;

    const useDemoFallback = !import.meta.env.PROD;
    const displayActivities =
        activities.length ? activities : useDemoFallback ? mockActivities(members) : [];
    const displayEvents = events.length ? events : useDemoFallback ? mockEvents() : [];

    const handleMoveTask = async (taskId: string, targetColumnId: string, targetPosition: number) => {
        let movedTask: Task | undefined;
        let reindexedTargetTasks: Task[] = [];

        setTasks(prev => {
            const moving = prev.find(t => t.id === taskId);
            if (!moving) return prev;
            movedTask = moving;
            const sourceColumnId = moving.columnId;

            const sourceList = prev
                .filter(t => t.columnId === sourceColumnId && t.id !== taskId)
                .sort((a, b) => a.position - b.position);

            const targetList = sourceColumnId === targetColumnId
                ? sourceList
                : prev
                    .filter(t => t.columnId === targetColumnId && t.id !== taskId)
                    .sort((a, b) => a.position - b.position);

            const clampedPos = Math.max(0, Math.min(targetPosition, targetList.length));
            const updatedMoved: Task = { ...moving, columnId: targetColumnId, position: clampedPos };
            targetList.splice(clampedPos, 0, updatedMoved);

            const reindexed = new Map<string, Task>();
            targetList.forEach((t, idx) => {
                reindexed.set(t.id, { ...t, position: idx });
            });
            if (sourceColumnId !== targetColumnId) {
                sourceList.forEach((t, idx) => {
                    reindexed.set(t.id, { ...t, position: idx });
                });
            }
            reindexedTargetTasks = Array.from(reindexed.values());

            return prev.map(t => reindexed.get(t.id) || t);
        });

        if (!movedTask) return;

        if (!hasRealTasks || !activeProjectId) return;

        try {
            await tasksAPI.move(
                taskId,
                targetColumnId,
                reindexedTargetTasks.find(t => t.id === taskId)?.position ?? targetPosition,
            );
        } catch (err) {
            console.error('Errore move task:', err);
        }
    };

    const handleSortColumnByPriority = (columnId: string) => {
        const order: Record<string, number> = { 'Alta': 0, 'Media': 1, 'Bassa': 2 };
        setTasks(prev => {
            const inColumn = prev
                .filter(t => t.columnId === columnId)
                .sort((a, b) => {
                    const pa = order[a.priority] ?? 99;
                    const pb = order[b.priority] ?? 99;
                    if (pa !== pb) return pa - pb;
                    return a.position - b.position;
                });
            const newPositions = new Map(inColumn.map((t, idx) => [t.id, idx]));
            return prev.map(t =>
                newPositions.has(t.id) ? { ...t, position: newPositions.get(t.id)! } : t
            );
        });
        openNotice('Ordinata per priorità', 'Alta → Media → Bassa nella colonna.');
    };

    const handleAddTask = async (columnId: string) => {
        setTaskComposerColumnId(columnId);
    };

    const createTask = async (title: string, columnId: string) => {
        const columnTasks = displayTasks.filter(t => t.columnId === columnId);
        const optimistic: Task = {
            id: `local-${Date.now()}`,
            projectId: activeProjectId || 'demo',
            projectName: activeProjectId ? undefined : 'Project Board',
            columnId,
            columnName: cols.find(c => c.id === columnId)?.name,
            sprintId: activeSprint?.id || null,
            sprintName: activeSprint?.name || undefined,
            title,
            description: null,
            coverUrl: null,
            priority: 'Media',
            storyPoints: 3,
            startDate: null,
            dueDate: null,
            position: columnTasks.length,
            subtasks: [],
            assignees: currentUser ? [currentUser] : [],
            createdAt: new Date().toISOString(),
        };

        setTasks(prev => [...prev, optimistic]);
        setTaskComposerColumnId(null);

        if (!activeProjectId) return;

        try {
            const created = await tasksAPI.create({
                projectId: activeProjectId,
                columnId,
                sprintId: activeSprint?.id || null,
                title: optimistic.title,
                priority: optimistic.priority,
                storyPoints: optimistic.storyPoints,
                position: optimistic.position,
            }) as Task;
            setTasks(prev => prev.map(t => t.id === optimistic.id ? created : t));
        } catch (err) {
            console.error('Errore creazione task:', err);
            openNotice(
                'Task creato localmente',
                'Visibile in questa sessione; salvataggio sul server non riuscito.',
            );
        }
    };

    const cols = columns.length ? columns : DEFAULT_COLUMNS;
    const showPreview = useDemoFallback && (!hasRealTasks || !activities.length);
    const projectName = projects.find((p) => p.id === activeProjectId)?.name || 'Progetto';
    const canManageShare = resolvePermissions(currentUser).manageProjects;

    const reloadActivities = async () => {
        try {
            const acts = await activitiesAPI.getAll({
                projectId: activeProjectId || undefined,
                limit: 20,
            });
            setActivities(acts as Activity[]);
        } catch {
            /* keep current feed */
        }
    };

    return (
        <>
        <div className="dashboard-bento">
            <BentoCell className="bento-kanban">
                <KanbanBoard
                    columns={cols}
                    tasks={displayTasks}
                    onMoveTask={handleMoveTask}
                    onAddTask={handleAddTask}
                    onSortColumnByPriority={handleSortColumnByPriority}
                    banner={showPreview ? 'Anteprima: dati dimostrativi finché il progetto non ha contenuti reali.' : null}
                    onShare={() => setShareOpen(true)}
                />
            </BentoCell>

            <ShareProjectDialog
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                projectId={activeProjectId}
                projectName={projectName}
                canManage={canManageShare}
                currentUser={currentUser}
                onChanged={reloadActivities}
            />

            <TaskComposerDialog
                open={!!taskComposerColumnId}
                columnName={cols.find(c => c.id === taskComposerColumnId)?.name || 'Task'}
                onClose={() => setTaskComposerColumnId(null)}
                onSubmit={(title) => {
                    if (taskComposerColumnId) createTask(title, taskComposerColumnId);
                }}
            />

            <BentoCell className="bento-activity">
                <TodayRail activities={displayActivities} events={displayEvents} />
            </BentoCell>
        </div>
        </>
    );
}

function TaskComposerDialog({
    open, columnName, onClose, onSubmit,
}: {
    open: boolean;
    columnName: string;
    onClose: () => void;
    onSubmit: (title: string) => void;
}) {
    const [title, setTitle] = useState('');
    const trimmed = title.trim();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!trimmed) return;
        onSubmit(trimmed);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <MotionDialog
            open={open}
            onClose={onClose}
            className="relative w-full max-w-md rounded-[28px] border border-line/70 bg-surface-raised/95 p-5 shadow-raised"
            labelledBy="task-composer-title"
        >
            <form onSubmit={submit}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-brand-400 font-semibold">
                            Nuovo task
                        </p>
                        <h3 id="task-composer-title" className="text-lg font-semibold text-ink mt-1">
                            Aggiungi a {columnName}
                        </h3>
                        <p className="text-xs text-ink-subtle mt-1">
                            Scrivi un titolo chiaro. Invio salva, Esc chiude.
                        </p>
                    </div>
                    <button type="button" className="icon-btn !w-8 !h-8" onClick={onClose} aria-label="Chiudi">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="mt-5">
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                        Titolo
                    </label>
                    <input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Es. Preparare proposta cliente"
                        className="input !py-3"
                    />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                    <button type="button" className="btn-ghost px-3 py-2" onClick={onClose}>
                        Annulla
                    </button>
                    <button type="submit" disabled={!trimmed} className="btn-primary px-4 py-2">
                        <Plus className="w-4 h-4" />
                        Crea task
                    </button>
                </div>
            </form>
        </MotionDialog>
    );
}

// --- Fallback / mock data (per popolare la dashboard quando il DB è vuoto) ---

const DEFAULT_COLUMNS: BoardColumn[] = [
    { id: 'col-progress', projectId: 'demo', name: 'In corso',      accent: 'emerald', position: 0 },
    { id: 'col-design',   projectId: 'demo', name: 'In design',     accent: 'emerald', position: 1 },
    { id: 'col-review',   projectId: 'demo', name: 'In revisione',  accent: 'emerald', position: 2 },
    { id: 'col-done',     projectId: 'demo', name: 'Completati',    accent: 'emerald', position: 3 },
];

const mockMembers: User[] = [
    { id: 'u1', name: 'Marco Rossi',    color: '#1a7a55', handle: '@marco' },
    { id: 'u2', name: 'Laura Bianchi',  color: '#3ba876', handle: '@laura' },
    { id: 'u3', name: 'Giulia Verdi',   color: '#145c42', handle: '@giulia' },
    { id: 'u4', name: 'Paolo Neri',     color: '#5fc494', handle: '@paolo' },
    { id: 'u5', name: 'Sara Colombo',   color: '#0f3d2e', handle: '@sara' },
];

function mockTasks(columns: BoardColumn[], members: User[]): Task[] {
    const team = members.length >= 2 ? members.slice(0, 5) : mockMembers;
    const today = new Date();
    const iso = (offset: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() + offset);
        return d.toISOString().split('T')[0];
    };
    const samples: Partial<Task>[] = [
        { title: 'Affinare navigazione dashboard', priority: 'Alta',  startDate: iso(-2), dueDate: iso(5),  columnId: columns[0]?.id, sprintName: 'Sprint 7', subtasksCount: 2 } as any,
        { title: 'Migliorare responsive del board', priority: 'Alta', columnId: columns[0]?.id, sprintName: 'Sprint 7' } as any,
        { title: 'Audit accessibilità dashboard', priority: 'Media', startDate: iso(0), dueDate: iso(8), columnId: columns[0]?.id, sprintName: 'Sprint 7' } as any,
        { title: 'Micro-interazioni coerenti', priority: 'Bassa', columnId: columns[0]?.id, sprintName: 'Sprint 7' } as any,

        { title: 'Toggle tema chiaro/scuro', priority: 'Bassa', startDate: iso(0), dueDate: iso(7), columnId: columns[1]?.id, sprintName: 'Sprint 7' } as any,
        { title: 'Ruoli e permessi utente', priority: 'Media', startDate: iso(-6), dueDate: iso(0), columnId: columns[1]?.id, sprintName: 'Sprint 7', subtasksCount: 2 } as any,
        { title: 'Stati vuoti onboarding', priority: 'Media', columnId: columns[1]?.id, sprintName: 'Sprint 7' } as any,
        { title: 'Scala spaziatura token', priority: 'Bassa', columnId: columns[1]?.id, sprintName: 'Sprint 7' } as any,
        { title: 'Specifiche drawer notifiche', priority: 'Media', columnId: columns[1]?.id, sprintName: 'Sprint 7' } as any,

        { title: 'Feedback visivo azioni', priority: 'Media', startDate: iso(-1), dueDate: iso(4), columnId: columns[2]?.id, sprintName: 'Sprint 7', subtasksCount: 2 } as any,
        { title: 'Linee guida motion', priority: 'Media', columnId: columns[2]?.id, sprintName: 'Sprint 7' } as any,
        { title: 'Review stakeholder v3', priority: 'Alta', startDate: iso(2), dueDate: iso(3), columnId: columns[2]?.id, sprintName: 'Sprint 7' } as any,

        { title: 'Stati vuoti moduli', priority: 'Bassa', columnId: columns[3]?.id, sprintName: 'Sprint 6' } as any,
        { title: 'Pacchetto handoff cliente', priority: 'Media', columnId: columns[3]?.id, sprintName: 'Sprint 6' } as any,
    ];
    return samples.map((s, i) => ({
        id: `mock-${i}`,
        projectId: 'demo',
        projectName: 'Board progetto',
        columnId: s.columnId || columns[0]?.id || null,
        sprintId: null,
        sprintName: (s as any).sprintName || 'Sprint 2',
        title: s.title!,
        description: null,
        coverUrl: null,
        priority: (s.priority as any) || 'Media',
        storyPoints: 3,
        startDate: (s as any).startDate || null,
        dueDate: (s as any).dueDate || null,
        position: i,
        subtasks: Array.from({ length: (s as any).subtasksCount || 0 }, (_, k) => ({
            id: `mock-st-${i}-${k}`,
            taskId: `mock-${i}`,
            text: `Subtask ${k + 1}`,
            completed: k === 0,
            position: k,
        })),
        assignees: [team[i % team.length], team[(i + 1) % team.length]].filter(Boolean) as User[],
        columnName: columns.find(c => c.id === (s.columnId || columns[0]?.id))?.name,
    }));
}

function mockActivities(members: User[]): Activity[] {
    const team = members.length ? members : mockMembers;
    const now = Date.now();
    return [
        {
            id: 'a1', actorId: team[0].id, actorName: team[0].name, actorColor: team[0].color,
            type: 'file.uploaded',
            payload: { fileName: 'Brief cliente.pdf', size: '2,4 MB', progress: 43, target: 'Brief cliente' },
            createdAt: new Date(now - 1000 * 60 * 4).toISOString(),
        },
        {
            id: 'a2', actorId: team[1]?.id || team[0].id, actorName: team[1]?.name || team[0].name, actorColor: team[1]?.color,
            type: 'comment.added',
            payload: {
                body: 'Ottimo lavoro sullo spacing. Dove trovo il file aggiornato?',
                target: 'Feedback visivo azioni',
                reply: { author: 'laura', text: 'Link in condivisione progetto.' },
            },
            createdAt: new Date(now - 1000 * 60 * 18).toISOString(),
        },
        {
            id: 'a3', actorId: team[2]?.id || team[0].id, actorName: team[2]?.name || team[0].name, actorColor: team[2]?.color,
            type: 'comment.added',
            payload: {
                body: 'Il feed attività è molto chiaro. Possiamo usarlo anche per i clienti?',
                target: 'Dashboard JEINS',
                reply: { author: 'giulia', text: 'Sì, in roadmap.' },
            },
            createdAt: new Date(now - 1000 * 60 * 60).toISOString(),
        },
    ] as Activity[];
}

function mockEvents() {
    const today = new Date();
    const at = (h: number, m = 0) => {
        const d = new Date(today);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
    };
    return [
        { id: 'e1', title: 'Sync navigazione dashboard', startTime: at(8, 0),  endTime: at(9, 0) },
        { id: 'e2', title: 'Workshop ruoli e permessi', startTime: at(10, 30), endTime: at(11, 30) },
        { id: 'e3', title: 'Sprint review', startTime: at(12, 0), endTime: at(12, 45) },
    ];
}

