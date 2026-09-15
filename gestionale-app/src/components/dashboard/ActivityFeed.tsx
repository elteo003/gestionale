import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { StaggerItem, StaggerList } from '../motion/StaggerList';
import { ChevronDown } from 'lucide-react';
import { CiteDocument, CiteQuote } from '../chat/CitationBlocks';
import type { Activity } from '../../types/models';

interface ActivityFeedProps {
    activities: Activity[];
}

interface ActivityListProps {
    activities: Activity[];
    maxItems?: number;
}

function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}g`;
}

type ActivityType = 'file.uploaded' | 'comment.added' | 'mention' | 'task.created' | 'task.moved' | 'resource.added' | 'team.added';

const verbByType: Record<ActivityType, string> = {
    'file.uploaded': 'ha caricato un file su',
    'comment.added': 'ha commentato',
    'mention': 'ha menzionato',
    'task.created': 'ha creato',
    'task.moved': 'ha spostato',
    'resource.added': 'ha condiviso',
    'team.added': 'ha aggiunto al team',
};

export function ActivityList({ activities, maxItems }: ActivityListProps) {
    const visible = typeof maxItems === 'number' ? activities.slice(0, maxItems) : activities;

    if (visible.length === 0) {
        return (
            <div className="text-xs text-ink-subtle italic py-2">
                Nessuna attività recente.
            </div>
        );
    }

    return (
        <StaggerList className="space-y-4 pr-1">
            {visible.map((a) => {
                const type = (a.type as ActivityType) || 'comment.added';
                const verb = verbByType[type] || a.type;
                const fileName = a.payload?.fileName as string | undefined;
                const size = a.payload?.size as string | undefined;
                const progress = a.payload?.progress as number | undefined;
                const target = a.payload?.target as string | undefined;
                const body = a.payload?.body as string | undefined;
                const reply = a.payload?.reply as { author?: string; text?: string } | undefined;
                const url = a.payload?.url as string | undefined;

                return (
                    <StaggerItem key={a.id}>
                        <div className="flex items-start gap-2.5">
                            <Avatar
                                name={a.actorName || '?'}
                                src={a.actorAvatar}
                                color={a.actorColor}
                                size="sm"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-ink-muted leading-snug">
                                    <span className="font-semibold text-ink">{a.actorName || 'Qualcuno'}</span>{' '}
                                    <span>{verb}</span>
                                    {target && (
                                        <> <span className="font-semibold text-ink">{target}</span></>
                                    )}
                                </p>

                                {fileName && (
                                    <CiteDocument
                                        title={fileName}
                                        url={url}
                                        size={size}
                                        progress={progress}
                                    />
                                )}

                                {body && (
                                    <div className="mt-2 rounded-xl bg-surface-inset/60 border border-line/30 px-3 py-2">
                                        <p className="text-xs text-ink-muted leading-relaxed">{body}</p>
                                    </div>
                                )}

                                {reply && reply.text && (
                                    <CiteQuote author={reply.author} text={reply.text} />
                                )}

                                <p className="mt-1.5 text-[10px] text-ink-subtle">
                                    {timeAgo(a.createdAt)} fa
                                </p>
                            </div>
                        </div>
                    </StaggerItem>
                );
            })}
        </StaggerList>
    );
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
    return (
        <Card
            variant="panel"
            title="Attività"
            headerAction={
                <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md
                               text-xs text-ink-muted hover:text-ink hover:bg-surface-inset/60
                               transition-colors"
                >
                    Oggi <ChevronDown className="w-3 h-3" />
                </button>
            }
            bodyClassName="pt-1"
        >
            <div className="max-h-[min(64vh,40rem)] overflow-y-auto scrollbar-thin">
                <ActivityList activities={activities} />
            </div>
        </Card>
    );
}
