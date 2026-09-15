import { CheckSquare, Calendar, MoreHorizontal, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { useState, type CSSProperties } from 'react';
import { AvatarGroup } from '../ui/AvatarGroup';
import { PriorityBadge } from '../ui/PriorityBadge';
import { openNotice } from '../../utils/notice';
import type { Task } from '../../types/models';

interface TaskCardProps {
    task: Task;
    isOverlay?: boolean;
    onDelete?: (id: string) => void;
}

function formatRange(start?: string | null, due?: string | null) {
    const fmt = (d: string) =>
        new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    if (start && due) return `${fmt(start)} – ${fmt(due)}`;
    if (due) return `Scadenza ${fmt(due)}`;
    if (start) return `Da ${fmt(start)}`;
    return null;
}

export function TaskCard({ task, isOverlay = false, onDelete }: TaskCardProps) {
    if (isOverlay) {
        return <TaskCardFace task={task} isOverlay />;
    }
    return <SortableTaskCard task={task} onDelete={onDelete} />;
}

function SortableTaskCard({ task, onDelete }: { task: Task; onDelete?: (id: string) => void }) {
    const [hovered, setHovered] = useState(false);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: 'task', task },
    });

    return (
        <TaskCardFace
            task={task}
            onDelete={onDelete}
            hovered={hovered}
            onHoverChange={setHovered}
            innerRef={setNodeRef}
            style={{
                transform: CSS.Translate.toString(transform),
                transition,
                opacity: isDragging ? 0 : 1,
            }}
            listeners={listeners}
            attributes={attributes}
        />
    );
}

function TaskCardFace({
    task,
    isOverlay = false,
    onDelete,
    hovered = false,
    onHoverChange,
    innerRef,
    style,
    listeners,
    attributes,
}: {
    task: Task;
    isOverlay?: boolean;
    onDelete?: (id: string) => void;
    hovered?: boolean;
    onHoverChange?: (hovered: boolean) => void;
    innerRef?: (node: HTMLElement | null) => void;
    style?: CSSProperties;
    listeners?: DraggableSyntheticListeners;
    attributes?: DraggableAttributes;
}) {
    const done = task.subtasks.filter(s => s.completed).length;
    const range = formatRange(task.startDate, task.dueDate);
    const subtitle = task.sprintName
        ? `Sprint / ${task.sprintName}`
        : (task.projectName || 'Progetto');

    const cardClass = [
        'group bento-panel--task p-3.5 select-none',
        isOverlay
            ? 'shadow-raised ring-1 ring-brand-600/35 cursor-grabbing'
            : 'cursor-grab active:cursor-grabbing hover:border-brand-600/25 transition-colors',
    ].join(' ');

    return (
        <div
            ref={innerRef}
            style={style}
            className={cardClass}
            {...(attributes ?? {})}
            {...(listeners ?? {})}
            onMouseEnter={() => onHoverChange?.(true)}
            onMouseLeave={() => onHoverChange?.(false)}
        >
            <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="text-sm font-semibold text-ink leading-snug truncate">
                    {task.title}
                </h4>
                <div className="flex items-center gap-0.5 -mr-1 -mt-1">
                    {onDelete && hovered && (
                        <button
                            type="button"
                            className="icon-btn !w-6 !h-6 text-ink-subtle hover:text-rose-300"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(task.id);
                            }}
                            aria-label="Elimina task"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                    {!isOverlay && (
                        <button
                            type="button"
                            className="icon-btn !w-6 !h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation();
                                openNotice(task.title, 'Dettaglio task in arrivo.');
                            }}
                            aria-label="Più opzioni"
                        >
                            <MoreHorizontal className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            <p className="text-xs text-ink-subtle truncate mb-2.5">
                {subtitle}
                {task.subtasks.length > 0 && (
                    <span className="ml-1.5 opacity-70">[{done}/{task.subtasks.length}]</span>
                )}
            </p>

            {range && (
                <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-3">
                    <Calendar className="w-3 h-3 text-ink-subtle" />
                    <span className="tabular-nums">{range}</span>
                </div>
            )}

            <div className="flex items-center justify-between gap-2">
                <AvatarGroup users={task.assignees} max={3} size="xs" />
                <PriorityBadge priority={task.priority} showIcon={false} />
            </div>

            {task.subtasks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-line/40 flex items-center gap-1.5 text-xs text-ink-muted">
                    <CheckSquare className="w-3 h-3 text-ink-subtle" />
                    <span>
                        {task.subtasks.length} {task.subtasks.length === 1 ? 'sotto-task' : 'sotto-task'}
                    </span>
                </div>
            )}
        </div>
    );
}
