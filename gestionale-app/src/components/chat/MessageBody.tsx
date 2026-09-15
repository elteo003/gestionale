import type { MessageMention } from '../../types/models';

function escapeRe(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function MessageBody({
    text,
    mentions,
}: {
    text: string;
    mentions?: MessageMention[] | null;
}) {
    if (!text) return null;
    const names = [...(mentions || [])]
        .map((m) => m.name)
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);

    if (!names.length) {
        return <p className="mt-1.5 text-sm text-ink leading-relaxed">{text}</p>;
    }

    const re = new RegExp(`(@(?:${names.map(escapeRe).join('|')})(?=[\\s.,!?;:]|$))`, 'g');
    const parts = text.split(re);

    return (
        <p className="mt-1.5 text-sm text-ink leading-relaxed">
            {parts.map((part, i) => {
                if (part.startsWith('@') && names.some((n) => part === `@${n}`)) {
                    return (
                        <span key={i} className="text-brand-400 font-medium">
                            {part}
                        </span>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </p>
    );
}
