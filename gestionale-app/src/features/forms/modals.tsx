import { useEffect, useMemo, useRef, useState } from 'react';
import type { Client, Contract, Project } from '../../types/models';
import { DropdownPanel } from '../../components/motion/DropdownPanel';

export const AREA_OPTIONS = ['CDA', 'Marketing', 'IT', 'Commerciale'];
export const CLIENT_STATUS_OPTIONS = [
    'Prospect', 'In Contatto', 'In Negoziazione', 'Attivo', 'Chiuso', 'Perso',
];
export const PROJECT_STATUS_OPTIONS = [
    'Pianificato', 'In Corso', 'In Revisione', 'Completato', 'Sospeso',
];
export const CONTRACT_TYPE_OPTIONS = ['Contratto', 'Fattura', 'Preventivo'];
export const CONTRACT_STATUS_OPTIONS = ['Bozza', 'Inviato', 'Firmato', 'Pagato', 'Annullato'];

export function EditClientForm({
    client, onSubmit,
}: { client: Client; onSubmit: (data: Record<string, unknown>) => void }) {
    const [data, setData] = useState({
        name: client.name,
        contactPerson: client.contactPerson || '',
        email: client.email || '',
        phone: client.phone || '',
        status: client.status,
        area: client.area || 'Marketing',
    });
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.name || !data.email) return;
        onSubmit({ ...data, expectedVersion: client.version });
    };
    return (
        <form onSubmit={submit} className="space-y-4">
            <h3 className="text-lg font-semibold text-ink">Modifica Cliente</h3>
            <FormField label="Azienda" required value={data.name} onChange={v => setData({ ...data, name: v })} />
            <FormField label="Referente" value={data.contactPerson} onChange={v => setData({ ...data, contactPerson: v })} />
            <FormField label="Email" type="email" required value={data.email} onChange={v => setData({ ...data, email: v })} />
            <FormField label="Telefono" value={data.phone} onChange={v => setData({ ...data, phone: v })} />
            <FormSelect label="Area" value={data.area} options={AREA_OPTIONS} onChange={v => setData({ ...data, area: v })} />
            <FormSelect label="Stato" value={data.status} options={CLIENT_STATUS_OPTIONS} onChange={v => setData({ ...data, status: v })} />
            <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary">Salva modifiche</button>
            </div>
        </form>
    );
}

export function AddClientForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => void }) {
    const [data, setData] = useState({
        name: '', contactPerson: '', email: '', phone: '',
        status: 'Prospect', area: 'Marketing',
    });
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.name || !data.email) return;
        onSubmit(data);
    };
    return (
        <form onSubmit={submit} className="space-y-4">
            <h3 className="text-lg font-semibold text-ink">Nuovo Cliente</h3>
            <FormField label="Azienda" required value={data.name} onChange={v => setData({ ...data, name: v })} />
            <FormField label="Referente" value={data.contactPerson} onChange={v => setData({ ...data, contactPerson: v })} />
            <FormField label="Email" type="email" required value={data.email} onChange={v => setData({ ...data, email: v })} />
            <FormField label="Telefono" value={data.phone} onChange={v => setData({ ...data, phone: v })} />
            <FormSelect label="Area" value={data.area} options={AREA_OPTIONS} onChange={v => setData({ ...data, area: v })} />
            <FormSelect label="Stato" value={data.status} options={CLIENT_STATUS_OPTIONS} onChange={v => setData({ ...data, status: v })} />
            <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary">Salva Cliente</button>
            </div>
        </form>
    );
}

export function EditProjectForm({
    project, clients, onSubmit,
}: { project: Project; clients: Client[]; onSubmit: (data: Record<string, unknown>) => void }) {
    const [data, setData] = useState({
        name: project.name,
        area: project.area || 'IT',
        status: project.status,
        clientId: project.clientId || '',
    });
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.name.trim()) return;
        onSubmit({ ...data, expectedVersion: project.version });
    };
    return (
        <form onSubmit={submit} className="space-y-4">
            <h3 className="text-lg font-semibold text-ink">Modifica Progetto</h3>
            <FormField label="Nome" required value={data.name} onChange={v => setData({ ...data, name: v })} />
            <FormSelect
                label="Cliente"
                value={data.clientId}
                options={clients.map(c => ({ value: c.id, label: c.name }))}
                onChange={v => setData({ ...data, clientId: v })}
            />
            <FormSelect label="Area" value={data.area} options={AREA_OPTIONS} onChange={v => setData({ ...data, area: v })} />
            <FormSelect label="Stato" value={data.status} options={PROJECT_STATUS_OPTIONS} onChange={v => setData({ ...data, status: v })} />
            <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary">Salva modifiche</button>
            </div>
        </form>
    );
}

export function AddProjectForm({
    clients, onSubmit,
}: { clients: Client[]; onSubmit: (data: Record<string, unknown>) => void }) {
    const [data, setData] = useState({ name: '', area: 'IT', status: 'Pianificato' });
    const [clientName, setClientName] = useState('');
    const [clientId, setClientId] = useState('');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.name.trim() || !clientName.trim()) return;
        onSubmit({ ...data, clientName: clientName.trim(), clientId: clientId || undefined });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <h3 className="text-lg font-semibold text-ink">Nuovo Progetto</h3>
            <FormField label="Nome" required value={data.name} onChange={v => setData({ ...data, name: v })} />
            <ClientCombobox clients={clients} value={clientName} onChange={(name, id) => { setClientName(name); setClientId(id || ''); }} />
            <FormSelect label="Area" value={data.area} options={AREA_OPTIONS} onChange={v => setData({ ...data, area: v })} />
            <FormSelect label="Stato" value={data.status} options={PROJECT_STATUS_OPTIONS} onChange={v => setData({ ...data, status: v })} />
            <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary">Salva Progetto</button>
            </div>
        </form>
    );
}

function ClientCombobox({
    clients, value, onChange,
}: { clients: Client[]; value: string; onChange: (name: string, matchedId: string | null) => void }) {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const wrapRef = useRef<HTMLDivElement>(null);
    const norm = (s: string) => s.trim().toLowerCase();
    const filtered = useMemo(() => {
        const q = norm(value);
        if (!q) return clients;
        return clients.filter(c => norm(c.name).includes(q));
    }, [clients, value]);
    const exactMatch = useMemo(() => clients.find(c => norm(c.name) === norm(value)) || null, [clients, value]);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);
    useEffect(() => { setHighlight(0); }, [value]);

    const pickClient = (c: Client) => { onChange(c.name, c.id); setOpen(false); };

    return (
        <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">
                Cliente<span className="text-rose-400 ml-0.5">*</span>
            </label>
            <div className="relative" ref={wrapRef}>
                <input
                    type="text" value={value} className="input"
                    onChange={e => { onChange(e.target.value, null); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder="Nome cliente…" autoComplete="off"
                />
                <DropdownPanel
                    open={open && (filtered.length > 0 || Boolean(value.trim() && !exactMatch))}
                    triggerRef={wrapRef}
                    origin="top"
                    align="stretch"
                    role="listbox"
                    className="max-h-60 overflow-y-auto rounded-lg border border-line/60 bg-surface-inset shadow-lg"
                >
                    <ul>
                        {filtered.map((c, i) => (
                            <li key={c.id} onMouseDown={e => { e.preventDefault(); pickClient(c); }}
                                className={`px-3 py-1.5 text-sm cursor-pointer ${i === highlight ? 'bg-brand-600/15 text-ink' : 'text-ink-muted'}`}>
                                {c.name}
                            </li>
                        ))}
                    </ul>
                </DropdownPanel>
            </div>
        </div>
    );
}

export function EditContractForm({
    contract, clients, projects, onSubmit,
}: {
    contract: Contract;
    clients: Client[];
    projects: Project[];
    onSubmit: (data: Record<string, unknown>) => void;
}) {
    const [data, setData] = useState({
        type: contract.type,
        clientId: contract.clientId || '',
        projectId: contract.projectId || '',
        amount: contract.amount,
        status: contract.status,
        date: contract.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    });
    const availableProjects = useMemo(
        () => projects.filter(p => p.clientId === data.clientId),
        [projects, data.clientId],
    );

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.clientId || data.amount <= 0) return;
        onSubmit({ ...data, expectedVersion: contract.version });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <h3 className="text-lg font-semibold text-ink">Modifica Documento</h3>
            <FormSelect
                label="Tipo"
                value={data.type}
                options={CONTRACT_TYPE_OPTIONS}
                onChange={v => setData({ ...data, type: v as Contract['type'] })}
            />
            <FormSelect label="Cliente" value={data.clientId}
                options={clients.map(c => ({ value: c.id, label: c.name }))}
                onChange={v => setData({ ...data, clientId: v })} />
            <FormSelect label="Progetto" value={data.projectId}
                options={availableProjects.map(p => ({ value: p.id, label: p.name }))}
                onChange={v => setData({ ...data, projectId: v })} />
            <FormField label="Importo (€)" type="number" required value={String(data.amount)}
                onChange={v => setData({ ...data, amount: Number(v) })} />
            <FormField label="Data" type="date" required value={data.date} onChange={v => setData({ ...data, date: v })} />
            <FormSelect label="Stato" value={data.status} options={CONTRACT_STATUS_OPTIONS} onChange={v => setData({ ...data, status: v })} />
            <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary">Salva modifiche</button>
            </div>
        </form>
    );
}

export function AddContractForm({
    clients, projects, onSubmit,
}: { clients: Client[]; projects: Project[]; onSubmit: (data: Record<string, unknown>) => void }) {
    const [data, setData] = useState({
        type: 'Contratto', clientId: clients[0]?.id || '',
        projectId: '', amount: 0, status: 'Bozza',
        date: new Date().toISOString().split('T')[0],
    });
    const availableProjects = useMemo(
        () => projects.filter(p => p.clientId === data.clientId),
        [projects, data.clientId],
    );
    useEffect(() => {
        if (availableProjects.length && !availableProjects.find(p => p.id === data.projectId)) {
            setData(d => ({ ...d, projectId: availableProjects[0].id }));
        }
    }, [data.clientId, availableProjects, data.projectId]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.clientId || data.amount <= 0) return;
        onSubmit(data);
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <h3 className="text-lg font-semibold text-ink">Nuovo Documento</h3>
            <FormSelect label="Tipo" value={data.type} options={CONTRACT_TYPE_OPTIONS} onChange={v => setData({ ...data, type: v })} />
            <FormSelect label="Cliente" value={data.clientId}
                options={clients.map(c => ({ value: c.id, label: c.name }))}
                onChange={v => setData({ ...data, clientId: v })} />
            <FormSelect label="Progetto" value={data.projectId}
                options={availableProjects.map(p => ({ value: p.id, label: p.name }))}
                onChange={v => setData({ ...data, projectId: v })} />
            <FormField label="Importo (€)" type="number" required value={String(data.amount)}
                onChange={v => setData({ ...data, amount: Number(v) })} />
            <FormField label="Data" type="date" required value={data.date} onChange={v => setData({ ...data, date: v })} />
            <FormSelect label="Stato" value={data.status} options={CONTRACT_STATUS_OPTIONS} onChange={v => setData({ ...data, status: v })} />
            <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary">Salva Documento</button>
            </div>
        </form>
    );
}

function FormField({
    label, value, onChange, type = 'text', required = false,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
    return (
        <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">
                {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
            </label>
            <input type={type} value={value} required={required} onChange={e => onChange(e.target.value)} className="input" />
        </div>
    );
}

function FormSelect({
    label, value, options, onChange,
}: {
    label: string; value: string; onChange: (v: string) => void;
    options: (string | { value: string; label: string })[];
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} className="input appearance-none">
                {options.map(o => {
                    const v = typeof o === 'string' ? o : o.value;
                    const l = typeof o === 'string' ? o : o.label;
                    return <option key={v} value={v}>{l}</option>;
                })}
            </select>
        </div>
    );
}
