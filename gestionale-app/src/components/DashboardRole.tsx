import { useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Briefcase, FileText, TrendingUp, DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react';

// Componenti base
function StatCard({ title, value, icon: Icon, color, subtitle }: any) {
    const colors: any = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        orange: 'bg-orange-100 text-orange-600',
        red: 'bg-red-100 text-red-600',
        purple: 'bg-purple-100 text-purple-600',
        yellow: 'bg-yellow-100 text-yellow-600',
    };
    
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600">{title}</p>
                    <p className="text-2xl font-bold mt-2">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`${colors[color] || colors.blue} p-3 rounded-full`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}

function SimpleList({ title, items, renderItem }: any) {
    if (!items || items.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">{title}</h3>
                <p className="text-gray-500 text-sm">Nessun elemento da mostrare</p>
            </div>
        );
    }
    
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="space-y-2">
                {items.map(renderItem)}
            </div>
        </div>
    );
}

// Helper functions per calcoli KPI
function calculateKPIs(clients: any[], projects: any[], contracts: any[], users: any[], events: any[], userRole: string, userArea: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const kpis: any = {};
    
    // Presidente / CDA
    if (userRole === 'Presidente' || userRole === 'CDA' || userRole === 'Admin') {
        kpis.fatturatoTotale = contracts
            .filter(c => (c.status === 'Firmato' || c.status === 'Pagato') && new Date(c.date).getFullYear() === currentYear)
            .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        
        kpis.progettiAttivi = projects.filter(p => p.status === 'In Corso').length;
        
        kpis.nuoviClienti90gg = clients.filter(c => {
            const createdAt = new Date(c.createdAt || c.created_at);
            return createdAt >= ninetyDaysAgo;
        }).length;
        
        kpis.membriAttivi = users.length;
        
        // Fatturato per area
        kpis.fatturatoPerArea = AREA_OPTIONS.map(area => ({
            area,
            fatturato: contracts
                .filter(c => 
                    (c.status === 'Firmato' || c.status === 'Pagato') &&
                    projects.find(p => p.id === c.projectId)?.area === area
                )
                .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
        }));
        
        // Progetti per area
        kpis.progettiPerArea = AREA_OPTIONS.map(area => ({
            area,
            count: projects.filter(p => p.area === area && p.status === 'In Corso').length
        }));
        
        // Contratti chiave in negoziazione
        kpis.contrattiChiave = contracts
            .filter(c => c.status === 'Bozza' || c.status === 'Inviato')
            .sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0))
            .slice(0, 5);
    }
    
    // Tesoreria
    if (userRole === 'Tesoreria' || userRole === 'Admin') {
        kpis.incassatoAnno = contracts
            .filter(c => c.status === 'Pagato' && new Date(c.date).getFullYear() === currentYear)
            .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        
        kpis.daIncassare = contracts
            .filter(c => c.type === 'Fattura' && c.status === 'Inviato')
            .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        
        kpis.fattureScadute = contracts
            .filter(c => {
                if (c.type !== 'Fattura' || c.status !== 'Inviato') return false;
                const invoiceDate = new Date(c.date);
                const daysDiff = (now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysDiff > 30;
            })
            .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        
        kpis.preventiviDaApprovare = contracts
            .filter(c => c.type === 'Preventivo' && c.status === 'Inviato')
            .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        
        // Fatture scadute (lista)
        kpis.fattureScaduteLista = contracts
            .filter(c => {
                if (c.type !== 'Fattura' || c.status !== 'Inviato') return false;
                const invoiceDate = new Date(c.date);
                const daysDiff = (now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysDiff > 30;
            })
            .sort((a, b) => {
                const daysA = (now.getTime() - new Date(a.date).getTime()) / (1000 * 60 * 60 * 24);
                const daysB = (now.getTime() - new Date(b.date).getTime()) / (1000 * 60 * 60 * 24);
                return daysB - daysA;
            });
        
        // Progetti da fatturare
        kpis.progettiDaFatturare = projects
            .filter(p => {
                if (p.status !== 'Completato') return false;
                const hasInvoice = contracts.some(c => c.projectId === p.id && c.type === 'Fattura');
                return !hasInvoice;
            });
    }
    
    // Marketing
    if (userRole === 'Marketing' || userArea === 'Marketing' || userRole === 'Admin') {
        kpis.nuoviProspectMese = clients.filter(c => {
            if (c.status !== 'Prospect') return false;
            const createdAt = new Date(c.createdAt || c.created_at);
            return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
        }).length;
        
        const totalProspect = clients.filter(c => c.status === 'Prospect').length;
        const totalAttivo = clients.filter(c => c.status === 'Attivo').length;
        kpis.tassoConversione = totalProspect > 0 ? ((totalAttivo / (totalProspect + totalAttivo)) * 100).toFixed(1) : '0';
        
        kpis.progettiMarketingAttivi = projects.filter(p => p.area === 'Marketing' && p.status === 'In Corso').length;
        
        kpis.taskMarketingAperti = projects
            .filter(p => p.area === 'Marketing')
            .flatMap(p => p.todos || [])
            .filter(t => !t.completed && t.status !== 'terminato').length;
        
        // Pipeline cliente
        kpis.pipelineCliente = [
            { status: 'Prospect', count: clients.filter(c => c.status === 'Prospect').length },
            { status: 'In Contatto', count: clients.filter(c => c.status === 'In Contatto').length },
            { status: 'In Negoziazione', count: clients.filter(c => c.status === 'In Negoziazione').length },
            { status: 'Attivo', count: clients.filter(c => c.status === 'Attivo').length },
        ];
        
        // Progetti marketing
        kpis.progettiMarketing = projects.filter(p => p.area === 'Marketing');
        
        // Ultimi prospect
        kpis.ultimiProspect = clients
            .filter(c => c.status === 'Prospect')
            .sort((a, b) => {
                const dateA = new Date(a.createdAt || a.created_at);
                const dateB = new Date(b.createdAt || b.created_at);
                return dateB.getTime() - dateA.getTime();
            })
            .slice(0, 10);
    }
    
    // Commerciale
    if (userRole === 'Commerciale' || userArea === 'Commerciale' || userRole === 'Admin') {
        const contractsFirmatiMese = contracts.filter(c => {
            if (c.status !== 'Firmato') return false;
            const contractDate = new Date(c.date);
            return contractDate.getMonth() === currentMonth && contractDate.getFullYear() === currentYear;
        });
        kpis.valoreFirmatoMese = contractsFirmatiMese.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        
        kpis.valoreInNegoziazione = contracts
            .filter(c => c.status === 'Bozza' || c.status === 'Inviato')
            .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        
        const preventiviInvitati = contracts.filter(c => c.type === 'Preventivo' && c.status === 'Inviato').length;
        const preventiviFirmati = contracts.filter(c => c.type === 'Preventivo' && c.status === 'Firmato').length;
        kpis.tassoChiusura = preventiviInvitati > 0 ? ((preventiviFirmati / preventiviInvitati) * 100).toFixed(1) : '0';
        
        // Call/Meeting del mese (assumendo che events contenga le chiamate)
        kpis.callMese = events.filter(e => {
            if (!e.isCall) return false;
            const eventDate = new Date(e.startTime);
            return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
        }).length;
        
        // Top 5 negoziazioni
        kpis.topNegoziazioni = contracts
            .filter(c => c.status === 'Bozza' || c.status === 'Inviato')
            .sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0))
            .slice(0, 5);
        
        // Clienti da ricontattare
        kpis.clientiDaRicontattare = clients.filter(c => {
            if (c.status !== 'In Contatto' && c.status !== 'In Negoziazione') return false;
            const updatedAt = new Date(c.updatedAt || c.updated_at || c.createdAt || c.created_at);
            const daysDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff > 15;
        });
    }
    
    // IT
    if (userRole === 'IT' || userArea === 'IT' || userRole === 'Admin') {
        kpis.progettiITAttivi = projects.filter(p => p.area === 'IT' && p.status === 'In Corso').length;
        
        // Progetti in ritardo (assumendo che esista un campo deadline, altrimenti usiamo updated_at)
        kpis.progettiITInRitardo = projects.filter(p => {
            if (p.area !== 'IT' || p.status === 'Completato') return false;
            // Per ora usiamo updated_at come proxy, in futuro aggiungere deadline
            const updatedAt = new Date(p.updatedAt || p.updated_at);
            const daysDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff > 30; // Consideriamo in ritardo se non aggiornato da 30 giorni
        }).length;
        
        kpis.taskApertiIT = projects
            .filter(p => p.area === 'IT')
            .flatMap(p => p.todos || [])
            .filter(t => !t.completed && t.status !== 'terminato').length;
        
        kpis.taskCompletati7gg = projects
            .filter(p => p.area === 'IT')
            .flatMap(p => p.todos || [])
            .filter(t => {
                if (!t.completed && t.status !== 'terminato') return false;
                const updatedAt = new Date(t.updatedAt || t.updated_at || t.createdAt || t.created_at);
                const daysDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
                return daysDiff <= 7;
            }).length;
        
        // Stato progetti IT
        kpis.statoProgettiIT = [
            { status: 'Pianificato', count: projects.filter(p => p.area === 'IT' && p.status === 'Pianificato').length },
            { status: 'In Corso', count: projects.filter(p => p.area === 'IT' && p.status === 'In Corso').length },
            { status: 'In Revisione', count: projects.filter(p => p.area === 'IT' && p.status === 'In Revisione').length },
            { status: 'Completato', count: projects.filter(p => p.area === 'IT' && p.status === 'Completato').length },
        ];
        
        // Progetti in revisione
        kpis.progettiInRevisione = projects.filter(p => p.area === 'IT' && p.status === 'In Revisione');
    }
    
    // Audit
    if (userRole === 'Audit' || userRole === 'Admin') {
        kpis.contrattiMancanti = projects.filter(p => {
            if (p.status !== 'In Corso') return false;
            const hasContract = contracts.some(c => c.projectId === p.id && c.status === 'Firmato');
            return !hasContract;
        }).length;
        
        kpis.fattureScaduteAudit = contracts.filter(c => {
            if (c.type !== 'Fattura' || c.status !== 'Inviato') return false;
            const invoiceDate = new Date(c.date);
            const daysDiff = (now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff > 30;
        }).length;
        
        kpis.progettiNonFatturati = projects.filter(p => {
            if (p.status !== 'Completato') return false;
            const hasInvoice = contracts.some(c => c.projectId === p.id && c.type === 'Fattura');
            return !hasInvoice;
        }).length;
        
        // Anomalie contrattuali
        kpis.anomalieContrattuali = projects.filter(p => {
            if (p.status !== 'In Corso') return false;
            const hasContract = contracts.some(c => c.projectId === p.id && c.status === 'Firmato');
            return !hasContract;
        });
        
        // Anomalie di fatturazione
        kpis.anomalieFatturazione = projects.filter(p => {
            if (p.status !== 'Completato') return false;
            const hasInvoice = contracts.some(c => c.projectId === p.id && c.type === 'Fattura');
            if (hasInvoice) return false;
            const completedDate = new Date(p.updatedAt || p.updated_at);
            const daysDiff = (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff > 30;
        });
    }
    
    return kpis;
}

const AREA_OPTIONS = ['CDA', 'Marketing', 'IT', 'Commerciale'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Dashboard per ruolo
export function DashboardRole({ user, clients, projects, contracts, users, events }: any) {
    const userRole = user?.role || 'Socio';
    const userArea = user?.area || '';
    
    const kpis = useMemo(() => {
        return calculateKPIs(clients || [], projects || [], contracts || [], users || [], events || [], userRole, userArea);
    }, [clients, projects, contracts, users, events, userRole, userArea]);
    
    // Presidente / CDA / Admin
    if (userRole === 'Presidente' || userRole === 'CDA' || userRole === 'Admin') {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Dashboard {userRole}</h2>
                
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        title="Fatturato Totale (Anno)" 
                        value={`€${kpis.fatturatoTotale?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0,00'}`}
                        icon={DollarSign}
                        color="green"
                    />
                    <StatCard 
                        title="Progetti Attivi" 
                        value={kpis.progettiAttivi || 0}
                        icon={Briefcase}
                        color="blue"
                    />
                    <StatCard 
                        title="Nuovi Clienti (90gg)" 
                        value={kpis.nuoviClienti90gg || 0}
                        icon={Users}
                        color="purple"
                    />
                    <StatCard 
                        title="Membri Attivi" 
                        value={kpis.membriAttivi || 0}
                        icon={Users}
                        color="orange"
                    />
                </div>
                
                {/* Grafici */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Fatturato per Area */}
                    {kpis.fatturatoPerArea && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Fatturato per Area</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={kpis.fatturatoPerArea}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="area" />
                                    <YAxis />
                                    <Tooltip formatter={(value: any) => `€${value.toLocaleString('it-IT')}`} />
                                    <Bar dataKey="fatturato" fill="#3B82F6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    
                    {/* Progetti per Area */}
                    {kpis.progettiPerArea && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Progetti per Area</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={kpis.progettiPerArea}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ area, count }) => `${area}: ${count}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="count"
                                    >
                                        {kpis.progettiPerArea.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
                
                {/* Liste */}
                <SimpleList
                    title="Contratti Chiave in Negoziazione"
                    items={kpis.contrattiChiave || []}
                    renderItem={(contract: any, index: number) => (
                        <div key={contract.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <div>
                                <p className="font-medium">{contract.type}</p>
                                <p className="text-sm text-gray-600">Cliente ID: {contract.clientId}</p>
                            </div>
                            <p className="font-bold">€{parseFloat(contract.amount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                        </div>
                    )}
                />
            </div>
        );
    }
    
    // Tesoreria
    if (userRole === 'Tesoreria') {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Dashboard Tesoreria</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        title="Incassato (Anno)" 
                        value={`€${kpis.incassatoAnno?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0,00'}`}
                        icon={DollarSign}
                        color="green"
                    />
                    <StatCard 
                        title="Da Incassare" 
                        value={`€${kpis.daIncassare?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0,00'}`}
                        icon={Clock}
                        color="orange"
                    />
                    <StatCard 
                        title="Fatture Scadute" 
                        value={`€${kpis.fattureScadute?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0,00'}`}
                        icon={AlertCircle}
                        color="red"
                    />
                    <StatCard 
                        title="Preventivi da Approvare" 
                        value={`€${kpis.preventiviDaApprovare?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0,00'}`}
                        icon={FileText}
                        color="purple"
                    />
                </div>
                
                <SimpleList
                    title="Fatture Scadute (Azione Richiesta)"
                    items={kpis.fattureScaduteLista || []}
                    renderItem={(invoice: any, index: number) => {
                        const daysDiff = Math.floor((new Date().getTime() - new Date(invoice.date).getTime()) / (1000 * 60 * 60 * 24));
                        return (
                            <div key={invoice.id || index} className="flex justify-between items-center p-3 bg-red-50 rounded">
                                <div>
                                    <p className="font-medium">Fattura #{invoice.id?.substring(0, 8)}</p>
                                    <p className="text-sm text-gray-600">Scaduta da {daysDiff} giorni</p>
                                </div>
                                <p className="font-bold text-red-600">€{parseFloat(invoice.amount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                            </div>
                        );
                    }}
                />
                
                <SimpleList
                    title="Progetti da Fatturare"
                    items={kpis.progettiDaFatturare || []}
                    renderItem={(project: any, index: number) => (
                        <div key={project.id || index} className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                            <div>
                                <p className="font-medium">{project.name}</p>
                                <p className="text-sm text-gray-600">Completato ma non fatturato</p>
                            </div>
                            <CheckCircle className="w-5 h-5 text-yellow-600" />
                        </div>
                    )}
                />
            </div>
        );
    }
    
    // Marketing
    if (userRole === 'Marketing' || userArea === 'Marketing') {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Dashboard Marketing</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        title="Nuovi Prospect (Mese)" 
                        value={kpis.nuoviProspectMese || 0}
                        icon={Users}
                        color="blue"
                    />
                    <StatCard 
                        title="Tasso Conversione" 
                        value={`${kpis.tassoConversione || 0}%`}
                        icon={TrendingUp}
                        color="green"
                    />
                    <StatCard 
                        title="Progetti Marketing Attivi" 
                        value={kpis.progettiMarketingAttivi || 0}
                        icon={Briefcase}
                        color="purple"
                    />
                    <StatCard 
                        title="Task Marketing Aperti" 
                        value={kpis.taskMarketingAperti || 0}
                        icon={FileText}
                        color="orange"
                    />
                </div>
                
                {/* Pipeline Cliente */}
                {kpis.pipelineCliente && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Pipeline Cliente</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={kpis.pipelineCliente}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="status" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#8B5CF6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
                
                <SimpleList
                    title="Ultimi Prospect Inseriti"
                    items={kpis.ultimiProspect || []}
                    renderItem={(client: any, index: number) => (
                        <div key={client.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <div>
                                <p className="font-medium">{client.name}</p>
                                <p className="text-sm text-gray-600">{client.email}</p>
                            </div>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Prospect</span>
                        </div>
                    )}
                />
            </div>
        );
    }
    
    // Commerciale
    if (userRole === 'Commerciale' || userArea === 'Commerciale') {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Dashboard Commerciale</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        title="Valore Firmato (Mese)" 
                        value={`€${kpis.valoreFirmatoMese?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0,00'}`}
                        icon={DollarSign}
                        color="green"
                    />
                    <StatCard 
                        title="Valore in Negoziazione" 
                        value={`€${kpis.valoreInNegoziazione?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0,00'}`}
                        icon={Clock}
                        color="orange"
                    />
                    <StatCard 
                        title="Tasso di Chiusura" 
                        value={`${kpis.tassoChiusura || 0}%`}
                        icon={TrendingUp}
                        color="blue"
                    />
                    <StatCard 
                        title="Call/Meeting (Mese)" 
                        value={kpis.callMese || 0}
                        icon={Users}
                        color="purple"
                    />
                </div>
                
                <SimpleList
                    title="Top 5 Negoziazioni Aperte"
                    items={kpis.topNegoziazioni || []}
                    renderItem={(contract: any, index: number) => (
                        <div key={contract.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <div>
                                <p className="font-medium">{contract.type}</p>
                                <p className="text-sm text-gray-600">Status: {contract.status}</p>
                            </div>
                            <p className="font-bold">€{parseFloat(contract.amount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                        </div>
                    )}
                />
                
                <SimpleList
                    title="Clienti da Ricontattare"
                    items={kpis.clientiDaRicontattare || []}
                    renderItem={(client: any, index: number) => (
                        <div key={client.id || index} className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                            <div>
                                <p className="font-medium">{client.name}</p>
                                <p className="text-sm text-gray-600">{client.email} - {client.status}</p>
                            </div>
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                        </div>
                    )}
                />
            </div>
        );
    }
    
    // IT
    if (userRole === 'IT' || userArea === 'IT') {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Dashboard IT</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        title="Progetti IT Attivi" 
                        value={kpis.progettiITAttivi || 0}
                        icon={Briefcase}
                        color="blue"
                    />
                    <StatCard 
                        title="Progetti IT In Ritardo" 
                        value={kpis.progettiITInRitardo || 0}
                        icon={AlertCircle}
                        color="red"
                    />
                    <StatCard 
                        title="Task Aperti (IT)" 
                        value={kpis.taskApertiIT || 0}
                        icon={FileText}
                        color="orange"
                    />
                    <StatCard 
                        title="Task Completati (7gg)" 
                        value={kpis.taskCompletati7gg || 0}
                        icon={CheckCircle}
                        color="green"
                    />
                </div>
                
                {/* Stato Progetti IT */}
                {kpis.statoProgettiIT && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Stato Progetti IT</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={kpis.statoProgettiIT}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="status" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
                
                <SimpleList
                    title="Progetti in Revisione"
                    items={kpis.progettiInRevisione || []}
                    renderItem={(project: any, index: number) => (
                        <div key={project.id || index} className="flex justify-between items-center p-3 bg-blue-50 rounded">
                            <div>
                                <p className="font-medium">{project.name}</p>
                                <p className="text-sm text-gray-600">Pronto per controllo qualità</p>
                            </div>
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                    )}
                />
            </div>
        );
    }
    
    // Audit
    if (userRole === 'Audit') {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Dashboard Audit</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        title="Contratti Mancanti" 
                        value={kpis.contrattiMancanti || 0}
                        icon={AlertCircle}
                        color="red"
                    />
                    <StatCard 
                        title="Fatture Scadute" 
                        value={kpis.fattureScaduteAudit || 0}
                        icon={FileText}
                        color="orange"
                    />
                    <StatCard 
                        title="Progetti Non Fatturati" 
                        value={kpis.progettiNonFatturati || 0}
                        icon={Briefcase}
                        color="yellow"
                    />
                    <StatCard 
                        title="Anomalie Dati" 
                        value={(kpis.anomalieContrattuali?.length || 0) + (kpis.anomalieFatturazione?.length || 0)}
                        icon={AlertCircle}
                        color="red"
                    />
                </div>
                
                <SimpleList
                    title="Anomalie Contrattuali"
                    items={kpis.anomalieContrattuali || []}
                    renderItem={(project: any, index: number) => (
                        <div key={project.id || index} className="flex justify-between items-center p-3 bg-red-50 rounded">
                            <div>
                                <p className="font-medium">{project.name}</p>
                                <p className="text-sm text-gray-600">Progetto attivo senza contratto firmato</p>
                            </div>
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                    )}
                />
                
                <SimpleList
                    title="Anomalie di Fatturazione"
                    items={kpis.anomalieFatturazione || []}
                    renderItem={(project: any, index: number) => {
                        const completedDate = new Date(project.updatedAt || project.updated_at);
                        const daysDiff = Math.floor((new Date().getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                            <div key={project.id || index} className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                                <div>
                                    <p className="font-medium">{project.name}</p>
                                    <p className="text-sm text-gray-600">Completato da {daysDiff} giorni, non ancora fatturato</p>
                                </div>
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                            </div>
                        );
                    }}
                />
            </div>
        );
    }
    
    // Default per altri ruoli
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-600">Dashboard non disponibile per il ruolo: {userRole}</p>
            </div>
        </div>
    );
}

