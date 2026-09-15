import { Trash2, Mail, Phone, Plus, Pencil } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import type { Client } from '../types/models';
import { openNotice } from '../utils/notice';

const CLIENT_STATUS_OPTIONS = ['Prospect', 'In Contatto', 'In Negoziazione', 'Attivo', 'Chiuso', 'Perso'];

const statusTone: Record<string, 'violet' | 'cyan' | 'pink' | 'emerald' | 'amber' | 'rose' | 'neutral'> = {
    'Prospect': 'cyan',
    'In Contatto': 'violet',
    'In Negoziazione': 'amber',
    'Attivo': 'emerald',
    'Chiuso': 'neutral',
    'Perso': 'rose',
};

interface ClientiViewProps {
    clients: Client[];
    onUpdateStatus: (id: string, status: string) => void;
    onEdit: (client: Client) => void;
    onDelete: (id: string) => void;
    onOpenAdd: () => void;
}

export function ClientiView({ clients, onUpdateStatus, onEdit, onDelete, onOpenAdd }: ClientiViewProps) {
    return (
        <Card
            title={`Clienti (${clients.length})`}
            headerAction={
                <button onClick={onOpenAdd} className="btn-primary text-xs px-3 py-1.5">
                    <Plus className="w-3.5 h-3.5" /> Nuovo Cliente
                </button>
            }
            padding="none"
        >
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-ink-subtle border-y border-line/60">
                            <th className="text-left font-medium px-5 py-3">Azienda</th>
                            <th className="text-left font-medium px-5 py-3">Referente</th>
                            <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Contatti</th>
                            <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Area</th>
                            <th className="text-left font-medium px-5 py-3">Stato</th>
                            <th className="text-right font-medium px-5 py-3">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-12 text-center text-ink-subtle text-sm italic">
                                    Nessun cliente. Inizia aggiungendone uno con il bottone <span className="font-medium text-ink">Nuovo Cliente</span>.
                                </td>
                            </tr>
                        )}
                        {clients.map(c => (
                            <tr
                                key={c.id}
                                onClick={() => openNotice(c.name, 'Scheda cliente: dettaglio e storico progetti in arrivo.')}
                                className="border-b border-line/40 hover:bg-surface-inset/40 transition cursor-pointer"
                            >
                                <td className="px-5 py-3 text-sm font-medium text-ink">{c.name}</td>
                                <td className="px-5 py-3 text-sm text-ink-muted">{c.contactPerson || '—'}</td>
                                <td className="px-5 py-3 hidden md:table-cell">
                                    <div className="flex flex-col gap-0.5 text-xs">
                                        {c.email && (
                                            <span className="flex items-center gap-1.5 text-ink-muted">
                                                <Mail className="w-3 h-3" /> {c.email}
                                            </span>
                                        )}
                                        {c.phone && (
                                            <span className="flex items-center gap-1.5 text-ink-subtle">
                                                <Phone className="w-3 h-3" /> {c.phone}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-3 hidden lg:table-cell">
                                    {c.area && <Badge tone="violet">{c.area}</Badge>}
                                </td>
                                <td className="px-5 py-3">
                                    <select
                                        value={c.status}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => onUpdateStatus(c.id, e.target.value)}
                                        className={`text-[11px] font-medium rounded-full px-2.5 py-1
                                                    bg-surface-inset border border-line/60
                                                    focus:outline-none focus:ring-2 focus:ring-brand-500/40
                                                    text-${statusTone[c.status] === 'neutral' ? 'ink-muted' : statusTone[c.status] + '-300'}`}
                                    >
                                        {CLIENT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <div className="flex justify-end gap-1">
                                        <button
                                            onClick={() => onEdit(c)}
                                            className="icon-btn text-ink-muted hover:text-brand-300"
                                            aria-label="Modifica"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(c.id)}
                                            className="icon-btn text-rose-400 hover:bg-rose-500/10"
                                            aria-label="Elimina"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
