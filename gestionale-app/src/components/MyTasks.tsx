import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle, Circle, Clock, ListTodo, Loader2 } from 'lucide-react';
import { tasksAPI } from '../services/api.ts';
import { Card } from './ui/Card';
import { PriorityBadge } from './ui/PriorityBadge';
import { Pressable } from './motion/Pressable';
import { showNotice } from '../utils/notice';

interface MyTasksProps {
    user: { id?: string; user_id?: string } | null;
}

type TaskStatus = 'Da Fare' | 'In Corso' | 'In Revisione' | 'Completato';
type TaskPriority = 'Bassa' | 'Media' | 'Alta';

interface MyTask {
    id: string;
    description?: string;
    title?: string;
    projectName?: string;
    projectArea?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    updatedAt?: string;
}

const STATUS_TONE: Record<TaskStatus, string> = {
    Completato: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    'In Corso': 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    'In Revisione': 'bg-sky-500/10 text-sky-300 border-sky-500/25',
    'Da Fare': 'bg-rose-500/10 text-rose-300 border-rose-500/25',
};

function statusIcon(status: TaskStatus) {
    switch (status) {
        case 'Completato':
            return <CheckCircle className="w-4 h-4 text-emerald-400" />;
        case 'In Corso':
            return <Clock className="w-4 h-4 text-amber-400" />;
        case 'In Revisione':
            return <AlertCircle className="w-4 h-4 text-sky-400" />;
        default:
            return <Circle className="w-4 h-4 text-rose-400" />;
    }
}

function Panel({ children }: { children: ReactNode }) {
    return <div className="bento-panel p-8">{children}</div>;
}

export default function MyTasks({ user }: MyTasksProps) {
    const [tasks, setTasks] = useState<MyTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const userId = user?.id || user?.user_id;

    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const myTasks = await tasksAPI.getMyTasks();
            setTasks(Array.isArray(myTasks) ? myTasks : []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Errore nel caricamento dei tuoi task');
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user && userId) {
            void loadTasks();
        } else {
            setLoading(false);
            setError('Utente non autenticato');
        }
    }, [user, userId, loadTasks]);

    const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
        const previous = tasks;
        setTasks((prev) =>
            prev.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)),
        );
        try {
            await tasksAPI.updateTaskStatus(taskId, newStatus);
        } catch (err: unknown) {
            setTasks(previous);
            showNotice(
                'error',
                'Stato non aggiornato',
                err instanceof Error ? err.message : 'Riprova tra poco.',
            );
        }
    };

    if (!user || !userId) {
        return (
            <Panel>
                <p className="text-rose-400 text-sm">Effettua il login per vedere i tuoi task.</p>
            </Panel>
        );
    }

    if (loading) {
        return (
            <Panel>
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-ink-muted">
                    <Loader2
                        className="w-6 h-6 text-brand-400 spin-fast"
                        aria-hidden="true"
                    />
                    <p className="text-sm">Caricamento dei tuoi task…</p>
                </div>
            </Panel>
        );
    }

    if (error) {
        return (
            <Panel>
                <div className="flex flex-col items-center text-center py-8">
                    <p className="text-rose-400 font-medium">Errore</p>
                    <p className="text-ink-muted text-sm mt-2">{error}</p>
                    <Pressable onClick={() => void loadTasks()} className="btn-primary mt-5 min-h-11 min-w-[7.5rem]">
                        Riprova
                    </Pressable>
                </div>
            </Panel>
        );
    }

    if (tasks.length === 0) {
        return (
            <Card
                variant="panel"
                title="Le mie attività"
                subtitle="I lavori assegnati dal tuo responsabile appariranno qui"
                className="!h-auto"
            >
                <div className="flex flex-col items-center text-center py-10 text-ink-muted">
                    <ListTodo className="w-8 h-8 text-ink-subtle mb-3" aria-hidden="true" />
                    <p className="text-sm">Nessun task assegnato</p>
                </div>
            </Card>
        );
    }

    return (
        <Card
            variant="panel"
            title="Le mie attività"
            subtitle={`${tasks.length} ${tasks.length === 1 ? 'lavoro assegnato' : 'lavori assegnati'}`}
            className="!h-auto"
            padding="md"
        >
            <ul className="space-y-3">
                {tasks.map((task) => {
                    if (!task?.id) return null;
                    const status = task.status || 'Da Fare';
                    const priority = task.priority || 'Media';
                    const label = task.description || task.title || 'Task senza titolo';

                    return (
                        <li
                            key={task.id}
                            className="bento-panel--task p-4 hover:border-brand-600/25 transition-colors duration-150 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        {statusIcon(status)}
                                        <h3 className="text-sm font-semibold text-ink tracking-tight truncate">
                                            {label}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-ink-muted truncate">
                                        {task.projectName || 'Progetto'}
                                        <span className="text-ink-subtle mx-1.5">·</span>
                                        {task.projectArea || 'Area'}
                                    </p>
                                </div>
                                <PriorityBadge priority={priority} label={priority} />
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-3 border-t border-line/40">
                                <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                                    Stato
                                    <select
                                        value={status}
                                        onChange={(e) =>
                                            void handleStatusChange(task.id, e.target.value as TaskStatus)
                                        }
                                        className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer
                                                    bg-surface-inset focus:outline-none focus:ring-2 focus:ring-brand-600/35
                                                    transition-colors duration-150 ease
                                                    ${STATUS_TONE[status]}`}
                                    >
                                        <option value="Da Fare">Da Fare</option>
                                        <option value="In Corso">In Corso</option>
                                        <option value="In Revisione">In Revisione</option>
                                        <option value="Completato">Completato</option>
                                    </select>
                                </label>
                                {task.updatedAt && (
                                    <span className="text-[11px] text-ink-subtle tabular-nums">
                                        {new Date(task.updatedAt).toLocaleDateString('it-IT')}
                                    </span>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
