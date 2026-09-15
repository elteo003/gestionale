import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, ExternalLink, GitBranch, Link2, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { MotionDialog } from '../motion/MotionDialog';
import { Avatar } from '../ui/Avatar';
import { openNotice, showNotice } from '../../utils/notice';
import { projectsAPI, usersAPI } from '../../services/api';
import type { User } from '../../types/models';

export const SHARE_PROJECT_EVENT = 'jeins:open-share';
export const SHARE_PROJECT_FLAG = 'jeins:open-share';

export interface ProjectResource {
    id: string;
    projectId: string;
    title: string;
    url: string;
    createdBy?: string | null;
    createdByName?: string | null;
    createdAt: string;
}

interface TeamMember {
    id: string;
    name: string;
    email?: string;
    area?: string;
    role?: string;
    color?: string | null;
}

interface ShareProjectDialogProps {
    open: boolean;
    onClose: () => void;
    projectId: string | null;
    projectName: string;
    canManage: boolean;
    currentUser: User | null;
    onChanged?: () => void;
}

export function ShareProjectDialog({
    open, onClose, projectId, projectName, canManage, currentUser, onChanged,
}: ShareProjectDialogProps) {
    const navigate = useNavigate();
    const titleRef = useRef<HTMLInputElement>(null);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [resources, setResources] = useState<ProjectResource[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [memberId, setMemberId] = useState('');
    const [saving, setSaving] = useState(false);

    const boardUrl = projectId
        ? `${window.location.origin}/dashboard?project=${projectId}`
        : '';

    const availableUsers = useMemo(
        () => users.filter((u) => u.id && !team.some((m) => m.id === u.id)),
        [users, team],
    );

    const isEmpty = team.length === 0 && resources.length === 0;

    useEffect(() => {
        if (!open || !projectId) return;
        let cancelled = false;
        setLoading(true);

        Promise.all([
            projectsAPI.getTeam(projectId).catch(() => []),
            projectsAPI.getResources(projectId).catch(() => []),
            canManage ? usersAPI.getAll().catch(() => []) : Promise.resolve([]),
        ]).then(([teamRows, resourceRows, userRows]) => {
            if (cancelled) return;
            setTeam(Array.isArray(teamRows) ? teamRows : []);
            setResources(Array.isArray(resourceRows) ? resourceRows : []);
            setUsers(Array.isArray(userRows) ? userRows : []);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });

        return () => { cancelled = true; };
    }, [open, projectId, canManage]);

    const copyLink = async () => {
        if (!boardUrl) return;
        try {
            await navigator.clipboard.writeText(boardUrl);
            showNotice('success', 'Link copiato', 'Chi ha accesso al gestionale apre questo board.');
        } catch {
            openNotice('Copia manuale', boardUrl);
        }
    };

    const addResource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !canManage) return;
        const trimmedTitle = title.trim();
        const trimmedUrl = url.trim();
        if (!trimmedTitle || !trimmedUrl) return;
        setSaving(true);
        try {
            const created = await projectsAPI.addResource(projectId, {
                title: trimmedTitle,
                url: trimmedUrl,
            }) as ProjectResource;
            setResources((prev) => [created, ...prev]);
            setTitle('');
            setUrl('');
            onChanged?.();
            showNotice('success', 'Risorsa aggiunta', created.title);
        } catch (err) {
            showNotice('error', 'Impossibile aggiungere', (err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const removeResource = async (id: string) => {
        if (!projectId || !canManage) return;
        try {
            await projectsAPI.removeResource(projectId, id);
            setResources((prev) => prev.filter((r) => r.id !== id));
            onChanged?.();
        } catch (err) {
            showNotice('error', 'Impossibile rimuovere', (err as Error).message);
        }
    };

    const addMember = async () => {
        if (!projectId || !canManage || !memberId) return;
        setSaving(true);
        try {
            const created = await projectsAPI.addTeamMember(projectId, memberId) as { user: TeamMember };
            if (created?.user) setTeam((prev) => [...prev, created.user]);
            setMemberId('');
            onChanged?.();
            showNotice('success', 'Team aggiornato', created?.user?.name || 'Membro aggiunto');
        } catch (err) {
            showNotice('error', 'Impossibile aggiungere', (err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const removeMember = async (userId: string) => {
        if (!projectId || !canManage) return;
        try {
            await projectsAPI.removeTeamMember(projectId, userId);
            setTeam((prev) => prev.filter((m) => m.id !== userId));
            onChanged?.();
        } catch (err) {
            showNotice('error', 'Impossibile rimuovere', (err as Error).message);
        }
    };

    return (
        <MotionDialog
            open={open}
            onClose={onClose}
            labelledBy="share-project-title"
            className="relative w-full max-w-lg max-h-[min(88vh,40rem)] overflow-y-auto rounded-[28px]
                       border border-line/70 bg-surface-raised/95 p-5 shadow-raised scrollbar-thin"
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-brand-400 font-semibold">
                        Condividi
                    </p>
                    <h3 id="share-project-title" className="text-lg font-semibold text-ink mt-1">
                        {projectId ? projectName : 'Nessun progetto'}
                    </h3>
                    <p className="text-xs text-ink-subtle mt-1">
                        Team interno, link al board e documentazione.
                    </p>
                </div>
                <button type="button" className="icon-btn !w-8 !h-8" onClick={onClose} aria-label="Chiudi">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {!projectId ? (
                <div className="mt-5 rounded-xl border border-line/50 bg-surface-inset/60 p-4">
                    <p className="text-sm text-ink">Crea un progetto per condividere board e risorse col team.</p>
                    <button
                        type="button"
                        className="btn-primary mt-3 text-xs px-3 py-2"
                        onClick={() => { onClose(); navigate('/progetti'); }}
                    >
                        Vai a Progetti
                    </button>
                </div>
            ) : (
                <div className="mt-5 space-y-5">
                    {isEmpty && !loading && (
                        <div className="rounded-xl border border-line/50 bg-surface-inset p-3.5">
                            <div className="w-9 h-9 rounded-xl bg-grad-brand flex items-center justify-center mb-2.5">
                                <GitBranch className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-xs text-ink-muted leading-relaxed">
                                Condividi documentazione e aggiornamenti con il team.
                            </p>
                            {canManage && (
                                <button
                                    type="button"
                                    className="btn-primary mt-3 !text-xs !px-2.5 !py-1.5"
                                    onClick={() => titleRef.current?.focus()}
                                >
                                    Aggiungi un link
                                </button>
                            )}
                        </div>
                    )}

                    <section>
                        <h4 className="text-[11px] uppercase tracking-[0.12em] text-ink-subtle font-semibold mb-2">
                            Link al board
                        </h4>
                        <div className="flex gap-2">
                            <input
                                readOnly
                                value={boardUrl}
                                className="input !py-2 !text-xs flex-1"
                                aria-label="Link al board"
                            />
                            <button type="button" className="btn-soft !px-3" onClick={copyLink} aria-label="Copia link">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[11px] text-ink-subtle mt-1.5">
                            Funziona per chi è già autenticato nel gestionale.
                        </p>
                    </section>

                    <section>
                        <h4 className="text-[11px] uppercase tracking-[0.12em] text-ink-subtle font-semibold mb-2">
                            Documentazione
                        </h4>
                        {canManage && (
                            <form onSubmit={addResource} className="space-y-2 mb-3">
                                <input
                                    ref={titleRef}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Es. Brief cliente"
                                    className="input !py-2 !text-xs"
                                    maxLength={160}
                                />
                                <div className="flex gap-2">
                                    <input
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://…"
                                        className="input !py-2 !text-xs flex-1"
                                    />
                                    <button
                                        type="submit"
                                        disabled={saving || !title.trim() || !url.trim()}
                                        className="btn-primary !px-3"
                                        aria-label="Aggiungi risorsa"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                        )}
                        {resources.length === 0 ? (
                            <p className="text-xs text-ink-subtle italic">Nessun link ancora.</p>
                        ) : (
                            <ul className="space-y-1.5">
                                {resources.map((r) => (
                                    <li
                                        key={r.id}
                                        className="flex items-center gap-2 rounded-lg border border-line/40 bg-surface-inset/50 px-2.5 py-2"
                                    >
                                        <Link2 className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                                        <a
                                            href={r.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="min-w-0 flex-1 text-xs font-medium text-ink hover:text-brand-300 truncate"
                                        >
                                            {r.title}
                                        </a>
                                        <a
                                            href={r.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="icon-btn !w-7 !h-7"
                                            aria-label={`Apri ${r.title}`}
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                        {canManage && (
                                            <button
                                                type="button"
                                                className="icon-btn !w-7 !h-7"
                                                aria-label={`Rimuovi ${r.title}`}
                                                onClick={() => removeResource(r.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section>
                        <h4 className="text-[11px] uppercase tracking-[0.12em] text-ink-subtle font-semibold mb-2">
                            Team
                        </h4>
                        {canManage && availableUsers.length > 0 && (
                            <div className="flex gap-2 mb-3">
                                <select
                                    value={memberId}
                                    onChange={(e) => setMemberId(e.target.value)}
                                    className="input !py-2 !text-xs flex-1"
                                    aria-label="Aggiungi membro"
                                >
                                    <option value="">Aggiungi una persona…</option>
                                    {availableUsers.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name}{u.area ? ` · ${u.area}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="btn-primary !px-3"
                                    disabled={!memberId || saving}
                                    onClick={addMember}
                                    aria-label="Aggiungi al team"
                                >
                                    <UserPlus className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {team.length === 0 ? (
                            <p className="text-xs text-ink-subtle italic">
                                Nessuno assegnato. {currentUser?.name ? `Puoi partire da ${currentUser.name}.` : ''}
                            </p>
                        ) : (
                            <ul className="space-y-1.5">
                                {team.map((m) => (
                                    <li
                                        key={m.id}
                                        className="flex items-center gap-2 rounded-lg px-1 py-1"
                                    >
                                        <Avatar name={m.name} color={m.color} size="sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-ink truncate">{m.name}</p>
                                            <p className="text-[10px] text-ink-subtle truncate">
                                                {[m.role, m.area].filter(Boolean).join(' · ')}
                                            </p>
                                        </div>
                                        {canManage && (
                                            <button
                                                type="button"
                                                className="icon-btn !w-7 !h-7"
                                                aria-label={`Rimuovi ${m.name}`}
                                                onClick={() => removeMember(m.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}
        </MotionDialog>
    );
}
