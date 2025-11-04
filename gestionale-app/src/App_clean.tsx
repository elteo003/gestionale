import React, { useState, useMemo, useEffect } from 'react';
import {
    LayoutDashboard,
    Users,
    Briefcase,
    FileText,
    Plus,
    ChevronDown,
    ChevronRight,
    Trash2,
    CheckCircle,
    Circle,
    X,
    Menu,
    Flag
} from 'lucide-react';

// --- Dati di Esempio ---
const INITIAL_CLIENTS = [
    { id: 'c1', name: 'Azienda Locale Spa', contactPerson: 'Mario Rossi', email: 'mario.rossi@azienda.it', phone: '02 123456', status: 'Attivo', area: 'IT' },
    { id: 'c2', name: 'Studio Legale Bianchi', contactPerson: 'Anna Bianchi', email: 'a.bianchi@studio.it', phone: '06 789012', status: 'In Negoziazione', area: 'Commerciale' },
    { id: 'c3', name: 'Ristorante La Lupa', contactPerson: 'Luca Verdi', email: 'info@lalupa.it', phone: '081 345678', status: 'Prospect', area: 'Marketing' },
];

const INITIAL_PROJECTS = [
    {
        id: 'p1',
        name: 'Sviluppo E-commerce',
        clientId: 'c1',
        area: 'IT',
        status: 'In Corso',
        todos: [
            { id: 't1', text: 'Definizione specifiche', completed: true, priority: 'Alta' },
            { id: 't2', text: 'Design UI/UX', completed: false, priority: 'Alta' },
            { id: 't3', text: 'Sviluppo backend', completed: false, priority: 'Media' },
        ]
    },
    {
        id: 'p2',
        name: 'Campagna Social Media',
        clientId: 'c3',
        area: 'Marketing',
        status: 'Pianificato',
        todos: [
            { id: 't4', text: 'Analisi competitor', completed: false, priority: 'Media' },
        ]
    },
];

const INITIAL_CONTRACTS = [
    { id: 'f1', clientId: 'c1', projectId: 'p1', type: 'Contratto', amount: 5000, status: 'Firmato', date: '2025-01-15' },
    { id: 'f2', clientId: 'c1', projectId: 'p1', type: 'Fattura', amount: 2500, status: 'Inviata', date: '2025-02-01' },
    { id: 'f3', clientId: 'c3', projectId: 'p2', type: 'Contratto', amount: 1500, status: 'Bozza', date: '2025-02-20' },
];

// --- Costanti per le Opzioni ---
const CLIENT_STATUS_OPTIONS = ['Prospect', 'In Contatto', 'In Negoziazione', 'Attivo', 'Chiuso', 'Perso'];
const PROJECT_STATUS_OPTIONS = ['Pianificato', 'In Corso', 'In Revisione', 'Completato', 'Sospeso'];
const TODO_PRIORITY_OPTIONS = ['Bassa', 'Media', 'Alta'];
const CONTRACT_TYPE_OPTIONS = ['Contratto', 'Fattura', 'Preventivo'];
const CONTRACT_STATUS_OPTIONS = ['Bozza', 'Inviato', 'Firmato', 'Pagato', 'Annullato'];
const AREA_OPTIONS = ['CDA', 'Marketing', 'IT', 'Commerciale'];


// --- Componente Principale ---
export default function App() {
    const [activeView, setActiveView] = useState('dashboard');
    const [clients, setClients] = useState(INITIAL_CLIENTS);
    const [projects, setProjects] = useState(INITIAL_PROJECTS);
    const [contracts, setContracts] = useState(INITIAL_CONTRACTS);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // --- Funzioni CRUD ---

    // Clienti
    const addClient = (client) => {
        setClients([...clients, { ...client, id: crypto.randomUUID() }]);
        setIsModalOpen(false);
    };

    const updateClientStatus = (clientId, status) => {
        setClients(clients.map(c => c.id === clientId ? { ...c, status } : c));
    };

    const deleteClient = (clientId) => {
        // Prima di eliminare un cliente, potresti voler gestire progetti e contratti collegati
        // Per semplicità, qui eliminiamo solo il cliente
        if (window.confirm('Sei sicuro di voler eliminare questo cliente? Verranno eliminati anche i progetti e i contratti associati.')) {
            setClients(clients.filter(c => c.id !== clientId));
            setProjects(projects.filter(p => p.clientId !== clientId));
            setContracts(contracts.filter(c => c.clientId !== clientId));
        }
    };

    // Progetti
    const addProject = (project) => {
        setProjects([...projects, { ...project, id: crypto.randomUUID(), todos: [] }]);
        setIsModalOpen(false);
    };

    const updateProjectStatus = (projectId, status) => {
        setProjects(projects.map(p => p.id === projectId ? { ...p, status } : p));
    };

    const deleteProject = (projectId) => {
        if (window.confirm('Sei sicuro di voler eliminare questo progetto?')) {
            setProjects(projects.filter(p => p.id !== projectId));
            // Potresti voler eliminare anche i contratti collegati
            setContracts(contracts.filter(c => c.projectId !== projectId));
        }
    };

    // To-do
    const addTodoToProject = (projectId, todoText, priority) => {
        const newTodo = { id: crypto.randomUUID(), text: todoText, completed: false, priority: priority };
        setProjects(projects.map(p =>
            p.id === projectId ? { ...p, todos: [...p.todos, newTodo] } : p
        ));
    };

    const toggleTodo = (projectId, todoId) => {
        setProjects(projects.map(p =>
            p.id === projectId ? {
                ...p,
                todos: p.todos.map(t =>
                    t.id === todoId ? { ...t, completed: !t.completed } : t
                )
            } : p
        ));
    };

    const deleteTodo = (projectId, todoId) => {
        setProjects(projects.map(p =>
            p.id === projectId ? {
                ...p,
                todos: p.todos.filter(t => t.id !== todoId)
            } : p
        ));
    };

    // Contratti
    const addContract = (contract) => {
        setContracts([...contracts, { ...contract, id: crypto.randomUUID() }]);
        setIsModalOpen(false);
    };

    const updateContractStatus = (contractId, status) => {
        setContracts(contracts.map(c => c.id === contractId ? { ...c, status } : c));
    };

    const deleteContract = (contractId) => {
        if (window.confirm('Sei sicuro di voler eliminare questo documento?')) {
            setContracts(contracts.filter(c => c.id !== contractId));
        }
    };


    // --- Funzioni Modale ---
    const openModal = (type) => {
        let content;
        switch (type) {
            case 'client':
                content = <AddClientForm onSubmit={addClient} />;
                break;
            case 'project':
                content = <AddProjectForm clients={clients} onSubmit={addProject} />;
                break;
            case 'contract':
                content = <AddContractForm clients={clients} projects={projects} onSubmit={addContract} />;
                break;
            default:
                content = null;
        }
        setModalContent(content);
        setIsModalOpen(true);
    };

    // --- Funzioni di Utility ---
    const getClientName = (clientId) => clients.find(c => c.id === clientId)?.name || 'N/A';
    const getProjectName = (projectId) => projects.find(p => p.id === projectId)?.name || 'N/A';

    // --- Render ---
    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar (Desktop) */}
            <Sidebar activeView={activeView} setActiveView={setActiveView} className="hidden md:flex" />

            {/* Mobile Sidebar Toggle */}
            <div className="md:hidden p-4 bg-white shadow-md">
                <button onClick={() => setIsSidebarOpen(true)}>
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Mobile Sidebar (Overlay) */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-30 flex md:hidden">
                    <div className="fixed inset-0 bg-black/30" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="relative z-40 w-64 bg-gray-800 h-full">
                        <Sidebar activeView={activeView} setActiveView={setActiveView} onNavigate={() => setIsSidebarOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <Header onAddNewClick={openModal} activeView={activeView} />

                {/* Content Area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6 lg:p-8">
                    <RenderContent
                        activeView={activeView}
                        clients={clients}
                        projects={projects}
                        contracts={contracts}
                        onUpdateClientStatus={updateClientStatus}
                        onUpdateProjectStatus={updateProjectStatus}
                        onUpdateContractStatus={updateContractStatus}
                        onAddTodo={addTodoToProject}
                        onToggleTodo={toggleTodo}
                        onDeleteTodo={deleteTodo}
                        onDeleteClient={deleteClient}
                        onDeleteProject={deleteProject}
                        onDeleteContract={deleteContract}
                        getClientName={getClientName}
                        getProjectName={getProjectName}
                    />
                </main>
            </div>

            {/* Modale */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                {modalContent}
            </Modal>
        </div>
    );
}

// --- Componenti UI ---

function Sidebar({ activeView, setActiveView, className = '', onNavigate }) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'clienti', label: 'Clienti', icon: Users },
        { id: 'progetti', label: 'Progetti', icon: Briefcase },
        { id: 'contabilita', label: 'Contabilità', icon: FileText },
    ];

    const handleClick = (view) => {
        setActiveView(view);
        if (onNavigate) onNavigate(); // Chiude la sidebar mobile
    };

    return (
        <nav className={`w-64 bg-gray-800 text-white flex-shrink-0 flex flex-col ${className}`}>
            <div className="h-16 flex items-center justify-center px-4 bg-gray-900 shadow-md">
                <h1 className="text-xl font-bold text-white">Gestionale</h1>
            </div>
            <div className="flex-1 overflow-y-auto">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleClick(item.id)}
                        className={`flex items-center w-full px-6 py-4 text-left transition-colors duration-200 ${activeView === item.id
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <item.icon className="w-5 h-5 mr-3" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
}

function Header({ onAddNewClick, activeView }) {
    const getTitle = () => {
        switch (activeView) {
            case 'dashboard': return 'Dashboard';
            case 'clienti': return 'Gestione Clienti';
            case 'progetti': return 'Gestione Progetti';
            case 'contabilita': return 'Gestione Contabilità';
            default: return 'Gestionale';
        }
    };

    const getButtonLabel = () => {
        switch (activeView) {
            case 'clienti': return 'Nuovo Cliente';
            case 'progetti': return 'Nuovo Progetto';
            case 'contabilita': return 'Nuovo Documento';
            default: return null;
        }
    };

    const buttonLabel = getButtonLabel();
    const modalType = activeView.slice(0, -1); // 'clienti' -> 'client'

    return (
        <header className="h-16 bg-white shadow-md flex-shrink-0">
            <div className="flex items-center justify-between h-full px-4 md:px-6">
                <h2 className="text-2xl font-semibold text-gray-800">{getTitle()}</h2>
                {buttonLabel && (
                    <button
                        onClick={() => onAddNewClick(modalType)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        <span>{buttonLabel}</span>
                    </button>
                )}
            </div>
        </header>
    );
}

function RenderContent({ activeView, ...props }) {
    switch (activeView) {
        case 'dashboard':
            return <Dashboard {...props} />;
        case 'clienti':
            return <ClientiList {...props} />;
        case 'progetti':
            return <ProgettiList {...props} />;
        case 'contabilita':
            return <ContabilitaList {...props} />;
        default:
            return <div>Seleziona una vista</div>;
    }
}

function Modal({ isOpen, onClose, children }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>

            {/* Content */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

// --- Componenti di Pagina ---

function Dashboard({ clients, projects, contracts }) {
    const activeProjects = projects.filter(p => p.status === 'In Corso').length;
    const newProspects = clients.filter(c => c.status === 'Prospect').length;
    const dueInvoices = contracts.filter(c => c.type === 'Fattura' && c.status === 'Inviata').length;

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">Panoramica</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Progetti Attivi" value={activeProjects} icon={Briefcase} color="blue" />
                <StatCard title="Nuovi Prospect" value={newProspects} icon={Users} color="green" />
                <StatCard title="Fatture da Incassare" value={dueInvoices} icon={FileText} color="orange" />
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color }) {
    const colors = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        orange: 'bg-orange-100 text-orange-600',
    };
    return (
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
            <div className={`p-3 rounded-full ${colors[color] || 'bg-gray-100 text-gray-600'} mr-4`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <div className="text-gray-500 text-sm">{title}</div>
                <div className="text-3xl font-bold text-gray-900">{value}</div>
            </div>
        </div>
    );
}

function ClientiList({ clients, onUpdateClientStatus, onDeleteClient }) {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azienda</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contatto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email / Telefono</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map(client => (
                        <tr key={client.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{client.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{client.contactPerson}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-600">{client.email}</div>
                                <div className="text-sm text-gray-500">{client.phone}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                    {client.area}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <StatusSelector
                                    currentStatus={client.status}
                                    options={CLIENT_STATUS_OPTIONS}
                                    onChange={(newStatus) => onUpdateClientStatus(client.id, newStatus)}
                                />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => onDeleteClient(client.id)} className="text-red-500 hover:text-red-700">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ProgettiList({ projects, onUpdateProjectStatus, onAddTodo, onToggleTodo, onDeleteTodo, onDeleteProject, getClientName }) {
    return (
        <div className="space-y-6">
            {projects.map(project => (
                <ProjectCard
                    key={project.id}
                    project={project}
                    clientName={getClientName(project.clientId)}
                    onUpdateProjectStatus={onUpdateProjectStatus}
                    onAddTodo={onAddTodo}
                    onToggleTodo={onToggleTodo}
                    onDeleteTodo={onDeleteTodo}
                    onDeleteProject={onDeleteProject}
                />
            ))}
        </div>
    );
}

function ProjectCard({ project, clientName, onUpdateProjectStatus, onAddTodo, onToggleTodo, onDeleteTodo, onDeleteProject }) {
    const [newTodoText, setNewTodoText] = useState('');
    const [newTodoPriority, setNewTodoPriority] = useState('Media');
    const [isExpanded, setIsExpanded] = useState(true);

    const handleAddTodo = (e) => {
        e.preventDefault();
        if (newTodoText.trim()) {
            onAddTodo(project.id, newTodoText, newTodoPriority);
            setNewTodoText('');
            setNewTodoPriority('Media');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Header Card */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-600 hover:text-gray-900">
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                        <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {clientName}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {project.area}
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <StatusSelector
                        currentStatus={project.status}
                        options={PROJECT_STATUS_OPTIONS}
                        onChange={(newStatus) => onUpdateProjectStatus(project.id, newStatus)}
                    />
                    <button onClick={() => onDeleteProject(project.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Contenuto Espandibile */}
            {isExpanded && (
                <div className="p-4">
                    {/* Lista To-do */}
                    <h4 className="text-sm font-medium text-gray-500 mb-2">To-do List</h4>
                    <div className="space-y-2 mb-4">
                        {project.todos.length > 0 ? project.todos.map(todo => (
                            <TodoItem
                                key={todo.id}
                                todo={todo}
                                onToggle={() => onToggleTodo(project.id, todo.id)}
                                onDelete={() => onDeleteTodo(project.id, todo.id)}
                            />
                        )) : (
                            <div className="text-sm text-gray-400 italic">Nessun task ancora aggiunto.</div>
                        )}
                    </div>

                    {/* Form Aggiungi To-do */}
                    <form onSubmit={handleAddTodo} className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
                        <input
                            type="text"
                            value={newTodoText}
                            onChange={(e) => setNewTodoText(e.target.value)}
                            placeholder="Nuovo task..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <select
                            value={newTodoPriority}
                            onChange={(e) => setNewTodoPriority(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            {TODO_PRIORITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-colors duration-200"
                        >
                            Aggiungi
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

function TodoItem({ todo, onToggle, onDelete }) {
    const priorityColors = {
        'Bassa': 'text-green-500',
        'Media': 'text-yellow-500',
        'Alta': 'text-red-500',
    };

    return (
        <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
            <div className="flex items-center space-x-3">
                <button onClick={onToggle}>
                    {todo.completed
                        ? <CheckCircle className="w-5 h-5 text-green-500" />
                        : <Circle className="w-5 h-5 text-gray-400" />
                    }
                </button>
                <span className={`${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                    {todo.text}
                </span>
            </div>
            <div className="flex items-center space-x-2">
                <Flag className={`w-4 h-4 ${priorityColors[todo.priority]}`} />
                <button onClick={onDelete} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}


function ContabilitaList({ contracts, onUpdateContractStatus, onDeleteContract, getClientName, getProjectName }) {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progetto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {contracts.map(contract => (
                        <tr key={contract.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{contract.type}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-800">{getClientName(contract.clientId)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-600">{getProjectName(contract.projectId)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-600">{contract.date}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">€ {contract.amount.toFixed(2)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <StatusSelector
                                    currentStatus={contract.status}
                                    options={CONTRACT_STATUS_OPTIONS}
                                    onChange={(newStatus) => onUpdateContractStatus(contract.id, newStatus)}
                                />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => onDeleteContract(contract.id)} className="text-red-500 hover:text-red-700">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


// --- Componenti Form (per Modale) ---

function AddClientForm({ onSubmit }) {
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        status: 'Prospect',
        area: 'Marketing',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.name && formData.email) {
            onSubmit(formData);
        } else {
            alert('Nome azienda e email sono obbligatori.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Aggiungi Nuovo Cliente</h3>
            <FormInput name="name" label="Nome Azienda" value={formData.name} onChange={handleChange} required />
            <FormInput name="contactPerson" label="Referente" value={formData.contactPerson} onChange={handleChange} />
            <FormInput name="email" label="Email" type="email" value={formData.email} onChange={handleChange} required />
            <FormInput name="phone" label="Telefono" value={formData.phone} onChange={handleChange} />
            <FormSelect name="area" label="Area di Competenza" value={formData.area} onChange={handleChange} options={AREA_OPTIONS} />
            <FormSelect name="status" label="Stato Iniziale" value={formData.status} onChange={handleChange} options={CLIENT_STATUS_OPTIONS} />
            <div className="pt-4 flex justify-end">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200">
                    Salva Cliente
                </button>
            </div>
        </form>
    );
}

function AddProjectForm({ clients, onSubmit }) {
    const [formData, setFormData] = useState({
        name: '',
        clientId: clients[0]?.id || '',
        area: 'IT',
        status: 'Pianificato',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.name && formData.clientId) {
            onSubmit(formData);
        } else {
            alert('Nome progetto e cliente sono obbligatori.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Aggiungi Nuovo Progetto</h3>
            <FormInput name="name" label="Nome Progetto" value={formData.name} onChange={handleChange} required />
            <FormSelect name="clientId" label="Cliente" value={formData.clientId} onChange={handleChange} options={clients.map(c => ({ value: c.id, label: c.name }))} />
            <FormSelect name="area" label="Area di Competenza" value={formData.area} onChange={handleChange} options={AREA_OPTIONS} />
            <FormSelect name="status" label="Stato Iniziale" value={formData.status} onChange={handleChange} options={PROJECT_STATUS_OPTIONS} />
            <div className="pt-4 flex justify-end">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200">
                    Salva Progetto
                </button>
            </div>
        </form>
    );
}

function AddContractForm({ clients, projects, onSubmit }) {
    const [formData, setFormData] = useState({
        type: 'Contratto',
        clientId: clients[0]?.id || '',
        projectId: projects[0]?.id || '',
        amount: 0,
        status: 'Bozza',
        date: new Date().toISOString().split('T')[0], // Data odierna
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Filtra i progetti in base al cliente selezionato
    const availableProjects = useMemo(() => {
        return projects.filter(p => p.clientId === formData.clientId);
    }, [formData.clientId, projects]);

    // Aggiorna il progetto se il cliente cambia e il progetto non è più valido
    useEffect(() => {
        if (availableProjects.length > 0 && !availableProjects.find(p => p.id === formData.projectId)) {
            setFormData(prev => ({ ...prev, projectId: availableProjects[0].id }));
        } else if (availableProjects.length === 0) {
            setFormData(prev => ({ ...prev, projectId: '' }));
        }
    }, [formData.clientId, availableProjects, formData.projectId]);


    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.clientId && formData.amount > 0) {
            onSubmit(formData);
        } else {
            alert('Cliente e importo sono obbligatori.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Aggiungi Documento</h3>
            <FormSelect name="type" label="Tipo" value={formData.type} onChange={handleChange} options={CONTRACT_TYPE_OPTIONS} />
            <FormSelect name="clientId" label="Cliente" value={formData.clientId} onChange={handleChange} options={clients.map(c => ({ value: c.id, label: c.name }))} />
            <FormSelect name="projectId" label="Progetto (opzionale)" value={formData.projectId} onChange={handleChange} options={availableProjects.map(p => ({ value: p.id, label: p.name }))} />
            <FormInput name="amount" label="Importo (€)" type="number" value={formData.amount} onChange={handleChange} required />
            <FormInput name="date" label="Data" type="date" value={formData.date} onChange={handleChange} required />
            <FormSelect name="status" label="Stato Iniziale" value={formData.status} onChange={handleChange} options={CONTRACT_STATUS_OPTIONS} />

            <div className="pt-4 flex justify-end">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200">
                    Salva Documento
                </button>
            </div>
        </form>
    );
}


// --- Componenti di Form Generici ---

function FormInput({ label, name, type = 'text', value, onChange, required = false }) {
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
            <input
                type={type}
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
        </div>
    );
}

function FormSelect({ label, name, value, onChange, options, required = false }) {
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
            <select
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
                {options.map(option => (
                    <option
                        key={typeof option === 'object' ? option.value : option}
                        value={typeof option === 'object' ? option.value : option}
                    >
                        {typeof option === 'object' ? option.label : option}
                    </option>
                ))}
            </select>
        </div>
    );
}

function StatusSelector({ currentStatus, options, onChange }) {
    const statusColors = {
        'Attivo': 'bg-green-100 text-green-800',
        'In Corso': 'bg-green-100 text-green-800',
        'Firmato': 'bg-green-100 text-green-800',
        'Pagato': 'bg-green-100 text-green-800',
        'In Negoziazione': 'bg-yellow-100 text-yellow-800',
        'In Revisione': 'bg-yellow-100 text-yellow-800',
        'Inviato': 'bg-yellow-100 text-yellow-800',
        'Prospect': 'bg-blue-100 text-blue-800',
        'Pianificato': 'bg-blue-100 text-blue-800',
        'Bozza': 'bg-blue-100 text-blue-800',
        'In Contatto': 'bg-indigo-100 text-indigo-800',
        'Chiuso': 'bg-gray-100 text-gray-800',
        'Completato': 'bg-gray-100 text-gray-800',
        'Sospeso': 'bg-gray-100 text-gray-800',
        'Perso': 'bg-red-100 text-red-800',
        'Annullato': 'bg-red-100 text-red-800',
    };

    const colorClass = statusColors[currentStatus] || 'bg-gray-100 text-gray-800';

    return (
        <select
            value={currentStatus}
            onChange={(e) => onChange(e.target.value)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full border-none appearance-none ${colorClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            onClick={(e) => e.stopPropagation()} // Evita che il click sulla select apra/chiuda altri elementi
        >
            {options.map(option => (
                <option key={option} value={option}>{option}</option>
            ))}
        </select>
    );
}

