import { useEffect, useState } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { messagesAPI } from '../../services/api';
import type { CitableDocument } from '../../types/models';

interface DocumentPickerProps {
    chatId: string;
    onPick: (doc: CitableDocument) => void;
    onClose: () => void;
}

export function DocumentPicker({ chatId, onPick, onClose }: DocumentPickerProps) {
    const [q, setQ] = useState('');
    const [items, setItems] = useState<CitableDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const t = window.setTimeout(() => {
            setLoading(true);
            messagesAPI
                .getDocuments(chatId, q)
                .then((rows: CitableDocument[]) => {
                    if (!cancelled) setItems(rows);
                })
                .catch((e: Error) => {
                    if (!cancelled) setError(e.message);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }, q ? 200 : 0);
        return () => {
            cancelled = true;
            window.clearTimeout(t);
        };
    }, [chatId, q]);

    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 bento-panel p-2 z-20 max-h-64 flex flex-col">
            <div className="flex items-center gap-2 px-1 pb-2">
                <Search className="w-3.5 h-3.5 text-ink-subtle flex-shrink-0" aria-hidden="true" />
                <input
                    className="input !py-1 !text-xs flex-1"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cerca documenti dell’area…"
                    aria-label="Cerca documenti"
                    autoFocus
                />
                <button type="button" className="icon-btn !w-7 !h-7" onClick={onClose} aria-label="Chiudi">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="overflow-y-auto scrollbar-thin space-y-0.5">
                {loading && <p className="px-2 py-2 text-[11px] text-ink-subtle">Caricamento…</p>}
                {error && <p className="px-2 py-2 text-[11px] text-rose-400">{error}</p>}
                {!loading && !items.length && (
                    <p className="px-2 py-2 text-[11px] text-ink-subtle">Nessun documento visibile.</p>
                )}
                {items.map((doc) => (
                    <button
                        key={doc.id}
                        type="button"
                        onClick={() => onPick(doc)}
                        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left
                                   hover:bg-surface-inset/70 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-grad-brand">
                            <FileText className="w-4 h-4 text-white" aria-hidden="true" />
                        </div>
                        <span className="min-w-0">
                            <span className="block text-xs font-semibold text-ink truncate">{doc.title}</span>
                            <span className="block text-[10px] text-ink-subtle truncate">{doc.projectName}</span>
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
