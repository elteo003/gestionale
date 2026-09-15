import { describe, it, expect } from 'vitest';
import {
    filterMentionCandidates,
    insertMention,
    mentionQueryAt,
    mentionsStillInBody,
} from './mentionQuery';

describe('mentionQueryAt', () => {
    it('rileva @ a inizio e dopo spazio', () => {
        expect(mentionQueryAt('@ma', 3)).toEqual({ start: 0, query: 'ma' });
        expect(mentionQueryAt('ciao @an', 8)).toEqual({ start: 5, query: 'an' });
        expect(mentionQueryAt('ciao ma', 7)).toBeNull();
        expect(mentionQueryAt('mail@x', 6)).toBeNull();
    });
});

describe('insertMention', () => {
    it('sostituisce la query con @Nome e spazio', () => {
        const r = insertMention('ciao @ma', 8, 5, 'Mario Rossi');
        expect(r.text).toBe('ciao @Mario Rossi ');
        expect(r.caret).toBe('ciao @Mario Rossi '.length);
    });
});

describe('mentionsStillInBody', () => {
    it('tiene solo chi è ancora nel testo', () => {
        const people = [
            { id: '1', name: 'Mario Rossi', handle: 'mario' },
            { id: '2', name: 'Luca', handle: null },
        ];
        expect(mentionsStillInBody('@Mario Rossi ok', people).map((p) => p.id)).toEqual(['1']);
    });
});

describe('filterMentionCandidates', () => {
    it('filtra per nome o handle ed esclude se stessi', () => {
        const people = [
            { id: '1', name: 'Mario Rossi', handle: 'mario' },
            { id: '2', name: 'Anna', handle: 'anna' },
        ];
        expect(filterMentionCandidates(people, 'mar', '2').map((p) => p.id)).toEqual(['1']);
    });
});
