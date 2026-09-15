/** Query @ al cursore: dopo spazio o inizio riga, senza spazi nella parte dopo @. */
export function mentionQueryAt(text: string, caret: number): { start: number; query: string } | null {
    if (caret < 0 || caret > text.length) return null;
    const before = text.slice(0, caret);
    const match = before.match(/(^|[\s])@([^\s@]*)$/);
    if (!match) return null;
    const query = match[2];
    const start = before.length - query.length - 1;
    return { start, query };
}

export function insertMention(
    text: string,
    caret: number,
    start: number,
    displayName: string,
): { text: string; caret: number } {
    const label = `@${displayName} `;
    const next = `${text.slice(0, start)}${label}${text.slice(caret)}`;
    return { text: next, caret: start + label.length };
}

export function mentionsStillInBody<T extends { name: string; handle?: string | null }>(
    body: string,
    people: T[],
): T[] {
    return people.filter((p) => {
        if (body.includes(`@${p.name}`)) return true;
        if (p.handle && body.includes(`@${p.handle}`)) return true;
        return false;
    });
}

export function filterMentionCandidates<T extends { id?: string; name: string; handle?: string | null }>(
    people: T[],
    query: string,
    excludeId?: string | null,
): T[] {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
        if (excludeId && p.id === excludeId) return false;
        if (!q) return true;
        const handle = (p.handle || '').toLowerCase();
        return p.name.toLowerCase().includes(q) || handle.includes(q);
    });
}
