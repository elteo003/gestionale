import { Avatar } from '../ui/Avatar';
import type { User } from '../../types/models';

interface MentionPickerProps {
    people: User[];
    activeIndex: number;
    onHover: (index: number) => void;
    onPick: (person: User) => void;
}

export function MentionPicker({ people, activeIndex, onHover, onPick }: MentionPickerProps) {
    if (!people.length) {
        return (
            <p className="px-2 py-1.5 text-[11px] text-ink-subtle">Nessun risultato.</p>
        );
    }

    return (
        <div
            className="max-h-56 overflow-y-auto scrollbar-thin"
            role="listbox"
            aria-label="Persone da citare"
        >
            {people.map((person, index) => (
                <button
                    key={person.id}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => onHover(index)}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        onPick(person);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-left ${
                        index === activeIndex ? 'bg-brand-500/15' : 'hover:bg-surface-inset/70'
                    }`}
                >
                    <Avatar name={person.name} src={person.avatarUrl} color={person.color} size="sm" />
                    <span className="min-w-0">
                        <span className="block text-xs font-semibold text-ink truncate">{person.name}</span>
                        <span className="block text-[10px] text-ink-subtle truncate">
                            @{person.handle || person.name.split(' ')[0]?.toLowerCase()}
                            {person.role ? ` · ${person.role}` : ''}
                        </span>
                    </span>
                </button>
            ))}
        </div>
    );
}
