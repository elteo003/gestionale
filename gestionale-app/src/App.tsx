import { useState, useMemo, useEffect } from 'react';
import {
    LayoutDashboard,
    Users,
    Briefcase,
    FileText,
    Plus,
    ChevronDown,
    ChevronRight,
    Trash2,
    ListTodo,
    X,
    Menu,
    LogOut,
    User,
    CalendarIcon,
    Settings
} from 'lucide-react';
import Login from './components/Login';
import Calendar from './components/Calendar';
import AdminPanel from './components/AdminPanel';
import MyTasks from './components/MyTasks';
import ConflictDialog from './components/ConflictDialog';
import { DashboardRole } from './components/DashboardRole';
import { ConflictData } from './utils/conflictResolver';
import { clientsAPI, projectsAPI, contractsAPI, authAPI, usersAPI, eventsAPI, tasksAPI } from './services/api.ts';

// --- Costanti per le Opzioni ---
const CLIENT_STATUS_OPTIONS = ['Prospect', 'In Contatto', 'In Negoziazione', 'Attivo', 'Chiuso', 'Perso'];
const PROJECT_STATUS_OPTIONS = ['Pianificato', 'In Corso', 'In Revisione', 'Completato', 'Sospeso'];
const TODO_PRIORITY_OPTIONS = ['Bassa', 'Media', 'Alta'];
const CONTRACT_TYPE_OPTIONS = ['Contratto', 'Fattura', 'Preventivo'];
const CONTRACT_STATUS_OPTIONS = ['Bozza', 'Inviato', 'Firmato', 'Pagato', 'Annullato'];
const AREA_OPTIONS = ['CDA', 'Marketing', 'IT', 'Commerciale'];

// --- Componente Principale ---
export default function App() {
    const [user, setUser] = useState<any>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const [clients, setClients] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);

    const [activeView, setActiveView] = useState('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Stati per gestione conflitti
    const [conflictDialog, setConflictDialog] = useState<{
        isOpen: boolean;
        conflictData: ConflictData | null;
        entityType: 'progetto' | 'cliente' | 'contratto' | 'task';
        entityId: string;
        originalData: any;
        updateFunction: (data: any, version?: number) => Promise<void>;
    } | null>(null);

    // Verifica autenticazione all'avvio
    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            try {
                // Prova a parsare l'utente salvato
                const parsedUser = JSON.parse(savedUser);
                if (parsedUser && parsedUser.email) {
                    // Usa l'utente salvato immediatamente per evitare problemi di ruolo
                    console.log('Utente caricato da localStorage:', parsedUser);
                    setUser(parsedUser);
                    setIsAuthenticated(true);
                    // Poi verifica il token in background e aggiorna se necessario
                    authAPI.verify()
                        .then((response: any) => {
                            if (response && response.user) {
                                console.log('Utente verificato dal backend:', response.user);
                                setUser(response.user);
                                localStorage.setItem('user', JSON.stringify(response.user));
                            }
                        })
                        .catch((err: any) => {
                            // Se la verifica fallisce, mantieni l'utente salvato ma logga l'errore
                            console.warn('Verifica token fallita, usando utente salvato:', err);
                        });
                    loadData();
                } else {
                    // Se l'utente salvato non è valido, rimuovilo
                    console.error('Utente salvato non valido:', parsedUser);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            } catch (error) {
                console.error('Errore nel parsing dell\'utente salvato:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
            setLoading(false);
        } else {
            setLoading(false);
        }
    }, []);

    // Carica dati dal backend
    const loadData = async () => {
        try {
            const [clientsData, projectsData, contractsData, usersData, eventsData] = await Promise.all([
                clientsAPI.getAll().catch((err: any) => {
                    console.error('Errore caricamento clienti:', err);
                    return [];
                }),
                projectsAPI.getAll().catch((err: any) => {
                    console.error('Errore caricamento progetti:', err);
                    return [];
                }),
                contractsAPI.getAll().catch((err: any) => {
                    console.error('Errore caricamento contratti:', err);
                    return [];
                }),
                usersAPI.getAll().catch((err: any) => {
                    console.error('Errore caricamento utenti:', err);
                    return [];
                }),
                eventsAPI.getAll().catch((err: any) => {
                    console.error('Errore caricamento eventi:', err);
                    return [];
                }),
            ]);
            // Assicurati che siano sempre array
            setClients(Array.isArray(clientsData) ? clientsData : []);
            setProjects(Array.isArray(projectsData) ? projectsData : []);
            setContracts(Array.isArray(contractsData) ? contractsData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);
            setEvents(Array.isArray(eventsData) ? eventsData : []);
        } catch (error) {
            console.error('Errore generale nel caricamento dei dati:', error);
            // Imposta array vuoti come fallback
            setClients([]);
            setProjects([]);
            setContracts([]);
            setUsers([]);
            setEvents([]);
        }
    };

    const handleLoginSuccess = (userData: any) => {
        // Assicurati che l'utente abbia tutti i campi necessari
        if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
            // Ricarica i dati dopo il login
            loadData();
        } else {
            console.error('Errore: userData non valido', userData);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        setClients([]);
        setProjects([]);
        setContracts([]);
    };

    // --- Funzioni CRUD con API ---

    // Clienti
    const addClient = async (client: any) => {
        try {
            const newClient = await clientsAPI.create(client);
            setClients([...clients, newClient]);
            setIsModalOpen(false);
        } catch (error: any) {
            alert(error.message || 'Errore nella creazione del cliente');
        }
    };

    const updateClientStatus = async (clientId: string, status: string) => {
        try {
            const updated = await clientsAPI.updateStatus(clientId, status);
            setClients(clients.map(c => c.id === clientId ? { ...c, ...updated, version: updated.version || c.version } : c));
        } catch (error: any) {
            if (error.name === 'ConcurrentModificationError' && error.conflictData) {
                // Gestisci conflitto
                const client = clients.find(c => c.id === clientId);
                setConflictDialog({
                    isOpen: true,
                    conflictData: {
                        yourChanges: { status },
                        serverData: error.conflictData.serverData,
                        originalData: client
                    },
                    entityType: 'cliente',
                    entityId: clientId,
                    originalData: client,
                    updateFunction: async (data: any, version?: number) => {
                        const updated = await clientsAPI.update(clientId, { ...data, expectedVersion: version });
                        setClients(clients.map(c => c.id === clientId ? { ...c, ...updated } : c));
                    }
                });
            } else {
                alert(error.message || 'Errore nell\'aggiornamento dello stato');
            }
        }
    };

    const deleteClient = async (clientId: string) => {
        if (!window.confirm('Sei sicuro di voler eliminare questo cliente? Verranno eliminati anche i progetti e i contratti associati.')) {
            return;
        }
        try {
            await clientsAPI.delete(clientId);
            setClients(clients.filter(c => c.id !== clientId));
            setProjects(projects.filter(p => p.clientId !== clientId));
            setContracts(contracts.filter(c => c.clientId !== clientId));
        } catch (error: any) {
            alert(error.message || 'Errore nell\'eliminazione del cliente');
        }
    };

    // Progetti
    const addProject = async (project: any) => {
        try {
            const newProject = await projectsAPI.create(project);
            setProjects([...projects, newProject]);
            setIsModalOpen(false);
        } catch (error: any) {
            alert(error.message || 'Errore nella creazione del progetto');
        }
    };

    const updateProjectStatus = async (projectId: string, status: string) => {
        try {
            const updated = await projectsAPI.updateStatus(projectId, status);
            setProjects(projects.map(p => p.id === projectId ? { ...p, status: updated.status, version: updated.version || p.version } : p));
        } catch (error: any) {
            if (error.name === 'ConcurrentModificationError' && error.conflictData) {
                // Gestisci conflitto
                const project = projects.find(p => p.id === projectId);
                setConflictDialog({
                    isOpen: true,
                    conflictData: {
                        yourChanges: { status },
                        serverData: error.conflictData.serverData,
                        originalData: project
                    },
                    entityType: 'progetto',
                    entityId: projectId,
                    originalData: project,
                    updateFunction: async (data: any, version?: number) => {
                        const updated = await projectsAPI.update(projectId, { ...data, expectedVersion: version });
                        setProjects(projects.map(p => p.id === projectId ? { ...p, ...updated } : p));
                    }
                });
            } else {
                alert(error.message || 'Errore nell\'aggiornamento dello stato');
            }
        }
    };

    const deleteProject = async (projectId: string) => {
        if (!window.confirm('Sei sicuro di voler eliminare questo progetto?')) {
            return;
        }
        try {
            await projectsAPI.delete(projectId);
            setProjects(projects.filter(p => p.id !== projectId));
            setContracts(contracts.filter(c => c.projectId !== projectId));
        } catch (error: any) {
            alert(error.message || 'Errore nell\'eliminazione del progetto');
        }
    };

    // To-do
    const addTodoToProject = async (projectId: string, todoText: string, priority: string) => {
        try {
            const newTodo = await projectsAPI.addTodo(projectId, { text: todoText, priority });
            setProjects(projects.map(p =>
                p.id === projectId ? { ...p, todos: [...p.todos, newTodo] } : p
            ));
        } catch (error: any) {
            alert(error.message || 'Errore nell\'aggiunta del todo');
        }
    };

    const toggleTodo = async (projectId: string, todoId: string) => {
        try {
            const updated = await projectsAPI.toggleTodo(projectId, todoId);
            setProjects(projects.map(p =>
                p.id === projectId ? {
                    ...p,
                    todos: p.todos.map((t: any) => t.id === todoId ? updated : t)
                } : p
            ));
        } catch (error: any) {
            alert(error.message || 'Errore nell\'aggiornamento del todo');
        }
    };

    const updateTodoStatus = async (projectId: string, todoId: string, status: string) => {
        try {
            // Mappa gli stati italiani a completed
            const completed = status === 'terminato';
            
            // Se è "terminato", imposta completed = true
            // Se è "da fare", imposta completed = false
            // Per "in corso", usiamo una logica: se non è né terminato né da fare, è in corso
            // Per ora usiamo toggleTodo se è terminato/da fare, altrimenti aggiungiamo un campo custom
            const updated = await projectsAPI.updateTodoStatus(projectId, todoId, { status, completed });
            setProjects(projects.map(p =>
                p.id === projectId ? {
                    ...p,
                    todos: p.todos.map((t: any) => t.id === todoId ? { ...updated, status } : t)
                } : p
            ));
        } catch (error: any) {
            alert(error.message || 'Errore nell\'aggiornamento dello stato del todo');
        }
    };

    const deleteTodo = async (projectId: string, todoId: string) => {
        try {
            await projectsAPI.deleteTodo(projectId, todoId);
            setProjects(projects.map(p =>
                p.id === projectId ? {
                    ...p,
                    todos: p.todos.filter((t: any) => t.id !== todoId)
                } : p
            ));
        } catch (error: any) {
            alert(error.message || 'Errore nell\'eliminazione del todo');
        }
    };

    // Contratti
    const addContract = async (contract: any) => {
        try {
            const newContract = await contractsAPI.create(contract);
            setContracts([...contracts, newContract]);
            setIsModalOpen(false);
        } catch (error: any) {
            alert(error.message || 'Errore nella creazione del contratto');
        }
    };

    const updateContractStatus = async (contractId: string, status: string) => {
        try {
            const updated = await contractsAPI.updateStatus(contractId, status);
            setContracts(contracts.map(c => c.id === contractId ? { ...c, ...updated, version: updated.version || c.version } : c));
        } catch (error: any) {
            if (error.name === 'ConcurrentModificationError' && error.conflictData) {
                // Gestisci conflitto
                const contract = contracts.find(c => c.id === contractId);
                setConflictDialog({
                    isOpen: true,
                    conflictData: {
                        yourChanges: { status },
                        serverData: error.conflictData.serverData,
                        originalData: contract
                    },
                    entityType: 'contratto',
                    entityId: contractId,
                    originalData: contract,
                    updateFunction: async (data: any, version?: number) => {
                        const updated = await contractsAPI.update(contractId, { ...data, expectedVersion: version });
                        setContracts(contracts.map(c => c.id === contractId ? { ...c, ...updated } : c));
                    }
                });
            } else {
                alert(error.message || 'Errore nell\'aggiornamento dello stato');
            }
        }
    };

    const deleteContract = async (contractId: string) => {
        if (!window.confirm('Sei sicuro di voler eliminare questo documento?')) {
            return;
        }
        try {
            await contractsAPI.delete(contractId);
            setContracts(contracts.filter(c => c.id !== contractId));
        } catch (error: any) {
            alert(error.message || 'Errore nell\'eliminazione del contratto');
        }
    };

    // --- Funzioni Modale ---
    const openModal = (type: string) => {
        console.log('Opening modal:', type, { clients: clients?.length, projects: projects?.length });
        let content;
        try {
            switch (type) {
                case 'client':
                    content = <AddClientForm onSubmit={addClient} />;
                    break;
                case 'project':
                    // Assicurati che clients sia sempre un array
                    const clientsArray = Array.isArray(clients) ? clients : [];
                    console.log('Creating AddProjectForm with clients:', clientsArray.length);
                    content = <AddProjectForm clients={clientsArray} onSubmit={addProject} />;
                    break;
                case 'contract':
                    // Assicurati che clients e projects siano sempre array
                    const clientsArr = Array.isArray(clients) ? clients : [];
                    const projectsArr = Array.isArray(projects) ? projects : [];
                    console.log('Creating AddContractForm with clients:', clientsArr.length, 'projects:', projectsArr.length);
                    content = <AddContractForm 
                        clients={clientsArr} 
                        projects={projectsArr} 
                        onSubmit={addContract} 
                    />;
                    break;
                default:
                    console.warn('Unknown modal type:', type);
                    content = <div className="p-4 text-red-600">Tipo di form sconosciuto: {type}</div>;
            }
        } catch (error) {
            console.error('Errore nella creazione del form:', error);
            content = <div className="p-4 text-red-600">Errore nel caricamento del form: {error instanceof Error ? error.message : 'Errore sconosciuto'}</div>;
        }
        console.log('Modal content created:', content ? 'OK' : 'NULL');
        setModalContent(content);
        setIsModalOpen(true);
    };

    // --- Funzioni di Utility ---
    const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || 'N/A';
    const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'N/A';

    // Mostra login se non autenticato
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Caricamento...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    // --- Render ---
    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar (Desktop) */}
            <Sidebar activeView={activeView} setActiveView={setActiveView} user={user} onLogout={handleLogout} className="hidden md:flex" />

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
                        <Sidebar activeView={activeView} setActiveView={setActiveView} user={user} onLogout={handleLogout} onNavigate={() => setIsSidebarOpen(false)} />
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
                        user={user}
                        clients={clients}
                        projects={projects}
                        contracts={contracts}
                        users={users}
                        events={events}
                        onUpdateClientStatus={updateClientStatus}
                        onUpdateProjectStatus={updateProjectStatus}
                        onUpdateContractStatus={updateContractStatus}
                        onAddTodo={addTodoToProject}
                        onUpdateTodoStatus={updateTodoStatus}
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
                {modalContent || <div className="p-4 text-gray-600">Caricamento form...</div>}
            </Modal>

            {/* Dialog Conflitti */}
            {conflictDialog && conflictDialog.isOpen && conflictDialog.conflictData && (
                <ConflictDialog
                    isOpen={conflictDialog.isOpen}
                    onClose={() => setConflictDialog(null)}
                    conflictData={conflictDialog.conflictData}
                    entityType={conflictDialog.entityType}
                    onResolve={async (resolution: 'yours' | 'server' | 'merged', mergedData?: Record<string, any>) => {
                        if (!conflictDialog || !conflictDialog.conflictData) return;
                        
                        try {
                            let dataToSave = mergedData || conflictDialog.conflictData.yourChanges;
                            const serverVersion = conflictDialog.conflictData.serverData?.version;
                            
                            if (resolution === 'server') {
                                // Ricarica i dati dal server
                                await loadData();
                            } else {
                                // Applica la risoluzione (yours o merged)
                                await conflictDialog.updateFunction(dataToSave, serverVersion);
                            }
                            
                            setConflictDialog(null);
                        } catch (error: any) {
                            console.error('Errore risoluzione conflitto:', error);
                            alert(error.message || 'Errore nell\'applicazione della risoluzione');
                        }
                    }}
                    onReload={async () => {
                        await loadData();
                        setConflictDialog(null);
                    }}
                />
            )}
        </div>
    );
}

// --- Componenti UI ---

function Sidebar({ activeView, setActiveView, user, onLogout, className = '', onNavigate }: any) {
    const isAdmin = user?.role === 'Admin' || user?.role === 'IT' || user?.role === 'Responsabile';
    // Contabilità visibile solo a Tesoreria e Responsabile dell'area Commerciale
    const canViewContabilita = user?.role === 'Tesoreria' || 
                                (user?.role === 'Responsabile' && user?.area === 'Commerciale');
    
    // Verifica se l'utente è un manager/admin
    const isManager = user && (
        user.role === 'Admin' || 
        user.role === 'IT' || 
        user.role === 'Responsabile' ||
        user.role === 'Presidente' ||
        user.role === 'CDA' ||
        user.role === 'Tesoreria' ||
        user.role === 'Marketing' ||
        user.role === 'Commerciale' ||
        user.role === 'Audit'
    );
    
    // Verifica se l'utente è un associato (non manager/admin)
    const isAssociate = user && !isManager;
    
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'clienti', label: 'Clienti', icon: Users },
        { id: 'progetti', label: 'Progetti', icon: Briefcase },
        ...(canViewContabilita ? [{ id: 'contabilita', label: 'Contabilità', icon: FileText }] : []),
        { id: 'calendario', label: 'Calendario', icon: CalendarIcon },
        ...(isAssociate ? [{ id: 'mytasks', label: 'I Miei Task', icon: ListTodo }] : []),
        ...(isAdmin ? [{ id: 'amministrazione', label: 'Amministrazione', icon: Settings }] : []),
    ];

    const handleClick = (view: string) => {
        setActiveView(view);
        if (onNavigate) onNavigate();
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
            <div className="border-t border-gray-700 p-4">
                <div className="flex items-center mb-3 text-gray-300">
                    <User className="w-5 h-5 mr-2" />
                    <div className="flex-1">
                        <div className="text-sm font-medium">{user?.name}</div>
                        <div className="text-xs text-gray-400">{user?.role || 'Ruolo sconosciuto'}</div>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="flex items-center w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white rounded transition-colors duration-200"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span className="text-sm">Esci</span>
                </button>
            </div>
        </nav>
    );
}

function Header({ onAddNewClick, activeView }: any) {
    const getTitle = () => {
        switch (activeView) {
            case 'dashboard': return 'Dashboard';
            case 'clienti': return 'Gestione Clienti';
            case 'progetti': return 'Gestione Progetti';
            case 'contabilita': return 'Gestione Contabilità';
            case 'calendario': return 'Calendario Eventi';
            case 'amministrazione': return 'Pannello Amministrazione';
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

    const getModalType = () => {
        switch (activeView) {
            case 'clienti': return 'client';
            case 'progetti': return 'project';
            case 'contabilita': return 'contract';
            default: return null;
        }
    };

    const buttonLabel = getButtonLabel();
    const modalType = getModalType();

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

function RenderContent({ activeView, user, ...props }: any) {
    switch (activeView) {
        case 'dashboard':
            return <Dashboard user={user} {...props} />;
        case 'clienti':
            return <ClientiList {...props} />;
        case 'progetti':
            return <ProgettiList {...props} />;
        case 'contabilita':
            return <ContabilitaList {...props} />;
        case 'calendario':
            return <Calendar currentUser={user || null} />;
        case 'mytasks':
            // Verifica che l'utente sia valido prima di renderizzare MyTasks
            if (!user) {
                return (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <p className="text-red-500 text-lg">Errore: Utente non autenticato</p>
                        <p className="text-gray-400 text-sm mt-2">Effettua il login per visualizzare i tuoi task</p>
                    </div>
                );
            }
            return <MyTasks user={user} />;
        case 'amministrazione':
            return <AdminPanel user={user} />;
        default:
            return <div>Seleziona una vista</div>;
    }
}

function Modal({ isOpen, onClose, children }: any) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>
                <div className="p-6">
                    {children || <div className="p-4 text-red-600">Errore: contenuto non disponibile</div>}
                </div>
            </div>
        </div>
    );
}

// --- Componenti di Pagina ---

function Dashboard({ user, clients, projects, contracts, users, events }: any) {
    return <DashboardRole user={user} clients={clients} projects={projects} contracts={contracts} users={users} events={events} />;
}

// StatCard non utilizzato - rimosso per evitare warning TypeScript

function ClientiList({ clients, onUpdateClientStatus, onDeleteClient }: any) {
    // Assicurati che clients sia sempre un array
    const clientsList = Array.isArray(clients) ? clients : [];
    
    if (clientsList.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500 text-lg">Nessun cliente presente</p>
                <p className="text-gray-400 text-sm mt-2">Aggiungi un nuovo cliente utilizzando il pulsante in alto</p>
            </div>
        );
    }
    
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
                    {clientsList.map((client: any) => (
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
                                    onChange={(newStatus: string) => onUpdateClientStatus(client.id, newStatus)}
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

function ProgettiList({ projects, onUpdateProjectStatus, onAddTodo, onUpdateTodoStatus, onDeleteTodo, onDeleteProject, getClientName, user, users }: any) {
    // Assicurati che projects sia sempre un array
    const projectsList = Array.isArray(projects) ? projects : [];
    
    if (projectsList.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500 text-lg">Nessun progetto presente</p>
                <p className="text-gray-400 text-sm mt-2">Aggiungi un nuovo progetto utilizzando il pulsante in alto</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {projectsList.map((project: any) => (
                <ProjectCard
                    key={project.id}
                    project={project}
                    clientName={getClientName(project.clientId)}
                    onUpdateProjectStatus={onUpdateProjectStatus}
                    onAddTodo={onAddTodo}
                    onUpdateTodoStatus={onUpdateTodoStatus}
                    onDeleteTodo={onDeleteTodo}
                    onDeleteProject={onDeleteProject}
                    user={user}
                    users={users}
                />
            ))}
        </div>
    );
}

function ProjectCard({ project, clientName, onUpdateProjectStatus, onAddTodo, onUpdateTodoStatus, onDeleteTodo, onDeleteProject, user, users }: any) {
    const [newTodoText, setNewTodoText] = useState('');
    const [newTodoPriority, setNewTodoPriority] = useState('Media');
    const [isExpanded, setIsExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState<'todos' | 'team' | 'tasks'>('todos');
    
    // Nuovi stati per Team e Tasks
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loadingTeam, setLoadingTeam] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('Media');

    // Verifica se l'utente è manager (può gestire team e tasks)
    // I manager possono gestire tutti i progetti o solo quelli della loro area
    const isManager = useMemo(() => {
        if (!user) {
            console.warn('ProjectCard: user è null o undefined');
            return false;
        }
        
        const role = user.role;
        const userArea = user.area;
        const projectArea = project.area;
        
        // Manager globali (possono gestire tutti i progetti)
        const isGlobalManager = role === 'Admin' || 
            role === 'IT' || 
            role === 'Responsabile' ||
            role === 'Presidente' ||
            role === 'CDA' ||
            role === 'Tesoreria' ||
            role === 'Audit';
        
        // Manager di area (possono gestire solo progetti della loro area)
        const isAreaManager = (role === 'Marketing' || role === 'Commerciale') && 
            (!projectArea || userArea === projectArea);
        
        const result = isGlobalManager || isAreaManager;
        
        console.log('ProjectCard isManager check:', {
            projectId: project.id,
            projectName: project.name,
            userRole: role,
            userArea: userArea,
            projectArea: projectArea,
            isGlobalManager,
            isAreaManager,
            isManager: result,
            userObject: user
        });
        
        return result;
    }, [user, project.area, project.id, project.name]);

    // Carica team quando si apre il tab Team
    useEffect(() => {
        if (activeTab === 'team' && isManager) {
            loadTeam();
        }
    }, [activeTab, project.id, isManager]);

    // Carica tasks quando si apre il tab Tasks
    useEffect(() => {
        if (activeTab === 'tasks' && isManager) {
            loadTasks();
        }
    }, [activeTab, project.id, isManager]);

    const loadTeam = async () => {
        setLoadingTeam(true);
        try {
            const team = await projectsAPI.getTeam(project.id);
            setTeamMembers(team || []);
        } catch (error: any) {
            console.error('Errore caricamento team:', error);
            alert(error.message || 'Errore nel caricamento del team');
        } finally {
            setLoadingTeam(false);
        }
    };

    const loadTasks = async () => {
        setLoadingTasks(true);
        try {
            const projectTasks = await projectsAPI.getTasks(project.id);
            setTasks(projectTasks || []);
        } catch (error: any) {
            console.error('Errore caricamento tasks:', error);
            alert(error.message || 'Errore nel caricamento dei tasks');
        } finally {
            setLoadingTasks(false);
        }
    };

    const handleAddTeamMember = async () => {
        if (!selectedUserId) {
            alert('Seleziona un utente');
            return;
        }
        try {
            await projectsAPI.addTeamMember(project.id, selectedUserId);
            await loadTeam();
            setSelectedUserId('');
        } catch (error: any) {
            alert(error.message || 'Errore nell\'aggiunta del membro');
        }
    };

    const handleRemoveTeamMember = async (userId: string) => {
        if (!confirm('Rimuovere questo membro dal team?')) return;
        try {
            await projectsAPI.removeTeamMember(project.id, userId);
            await loadTeam();
        } catch (error: any) {
            alert(error.message || 'Errore nella rimozione del membro');
        }
    };

    const handleCreateTask = async (e: any) => {
        e.preventDefault();
        if (!newTaskDescription.trim()) {
            alert('Inserisci una descrizione per il task');
            return;
        }
        try {
            await projectsAPI.createTask(project.id, {
                description: newTaskDescription,
                priority: newTaskPriority
            });
            setNewTaskDescription('');
            setNewTaskPriority('Media');
            await loadTasks();
        } catch (error: any) {
            alert(error.message || 'Errore nella creazione del task');
        }
    };

    const handleAssignTask = async (taskId: string, userId: string) => {
        try {
            await tasksAPI.assignTask(taskId, userId);
            await loadTasks();
        } catch (error: any) {
            alert(error.message || 'Errore nell\'assegnazione del task');
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Eliminare questo task?')) return;
        try {
            await projectsAPI.deleteTask(project.id, taskId);
            await loadTasks();
        } catch (error: any) {
            alert(error.message || 'Errore nell\'eliminazione del task');
        }
    };

    const handleAddTodo = (e: any) => {
        e.preventDefault();
        if (newTodoText.trim()) {
            onAddTodo(project.id, newTodoText, newTodoPriority);
            setNewTodoText('');
            setNewTodoPriority('Media');
        }
    };

    // Filtra utenti per area del progetto (per il team)
    const availableUsers = users.filter((u: any) => 
        u.area === project.area && 
        !teamMembers.find((tm: any) => tm.id === u.id)
    );

    // Separa tasks: backlog (non assegnati) e assegnati (per membro)
    const backlogTasks = tasks.filter((t: any) => !t.assignedTo);
    const assignedTasksByMember = teamMembers.map((member: any) => ({
        member,
        tasks: tasks.filter((t: any) => t.assignedTo === member.id)
    }));

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                        onChange={(newStatus: string) => onUpdateProjectStatus(project.id, newStatus)}
                    />
                    <button onClick={() => onDeleteProject(project.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="p-4">
                    {/* Tabs per Manager */}
                    {isManager && (
                        <div className="flex space-x-2 mb-4 border-b border-gray-200">
                            <button
                                onClick={() => setActiveTab('todos')}
                                className={`px-4 py-2 text-sm font-medium ${
                                    activeTab === 'todos' 
                                        ? 'border-b-2 border-indigo-500 text-indigo-600' 
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                To-do List (Legacy)
                            </button>
                            <button
                                onClick={() => setActiveTab('team')}
                                className={`px-4 py-2 text-sm font-medium ${
                                    activeTab === 'team' 
                                        ? 'border-b-2 border-indigo-500 text-indigo-600' 
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Team
                            </button>
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`px-4 py-2 text-sm font-medium ${
                                    activeTab === 'tasks' 
                                        ? 'border-b-2 border-indigo-500 text-indigo-600' 
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Tasks
                            </button>
                        </div>
                    )}

                    {/* Tab: To-do List (Legacy) */}
                    {(!isManager || activeTab === 'todos') && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">To-do List</h4>
                            <div className="space-y-2 mb-4">
                                {project.todos && project.todos.length > 0 ? project.todos.map((todo: any) => (
                                    <TodoItem
                                        key={todo.id}
                                        todo={todo}
                                        onStatusChange={(status: string) => onUpdateTodoStatus(project.id, todo.id, status)}
                                        onDelete={() => onDeleteTodo(project.id, todo.id)}
                                    />
                                )) : (
                                    <div className="text-sm text-gray-400 italic">Nessun task ancora aggiunto.</div>
                                )}
                            </div>

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

                    {/* Tab: Team (solo per Manager) */}
                    {isManager && activeTab === 'team' && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-4">Team del Progetto</h4>
                            
                            {loadingTeam ? (
                                <div className="text-sm text-gray-400">Caricamento...</div>
                            ) : (
                                <>
                                    {/* Lista membri del team */}
                                    <div className="space-y-2 mb-4">
                                        {teamMembers.length > 0 ? (
                                            teamMembers.map((member: any) => (
                                                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                                    <div>
                                                        <span className="font-medium text-gray-900">{member.name}</span>
                                                        <span className="text-sm text-gray-500 ml-2">({member.email})</span>
                                                        <span className="text-xs text-gray-400 ml-2">- {member.role}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveTeamMember(member.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-gray-400 italic">Nessun membro nel team</div>
                                        )}
                                    </div>

                                    {/* Aggiungi membro */}
                                    <div className="border-t pt-4">
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">Aggiungi membro al team</h5>
                                        <div className="flex space-x-2">
                                            <select
                                                value={selectedUserId}
                                                onChange={(e) => setSelectedUserId(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            >
                                                <option value="">Seleziona un utente...</option>
                                                {availableUsers.map((u: any) => (
                                                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={handleAddTeamMember}
                                                disabled={!selectedUserId || availableUsers.length === 0}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                                            >
                                                Aggiungi
                                            </button>
                                        </div>
                                        {availableUsers.length === 0 && (
                                            <p className="text-xs text-gray-400 mt-2">Tutti gli utenti dell'area sono già nel team</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Tab: Tasks (solo per Manager) */}
                    {isManager && activeTab === 'tasks' && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-4">Gestione Tasks</h4>
                            
                            {loadingTasks ? (
                                <div className="text-sm text-gray-400">Caricamento...</div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* Backlog (Task non assegnati) */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h5 className="text-sm font-semibold text-gray-700 mb-3">Backlog (Task da Assegnare)</h5>
                                        <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                                            {backlogTasks.length > 0 ? (
                                                backlogTasks.map((task: any) => (
                                                    <div key={task.id} className="bg-white p-3 rounded-md border border-gray-200">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <span className="text-sm text-gray-900 flex-1">{task.description}</span>
                                                            <button
                                                                onClick={() => handleDeleteTask(task.id)}
                                                                className="text-red-500 hover:text-red-700 ml-2"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                                task.priority === 'Alta' ? 'bg-red-100 text-red-700' :
                                                                task.priority === 'Media' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-green-100 text-green-700'
                                                            }`}>
                                                                {task.priority}
                                                            </span>
                                                            <select
                                                                value=""
                                                                onChange={(e) => {
                                                                    if (e.target.value) {
                                                                        handleAssignTask(task.id, e.target.value);
                                                                    }
                                                                }}
                                                                className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500"
                                                            >
                                                                <option value="">Assegna a...</option>
                                                                {teamMembers.map((member: any) => (
                                                                    <option key={member.id} value={member.id}>{member.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-sm text-gray-400 italic">Nessun task in backlog</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Task Assegnati (per membro) */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h5 className="text-sm font-semibold text-gray-700 mb-3">Task Assegnati</h5>
                                        <div className="space-y-4 max-h-96 overflow-y-auto">
                                            {assignedTasksByMember.length > 0 && assignedTasksByMember.some((g: any) => g.tasks.length > 0) ? (
                                                assignedTasksByMember
                                                    .filter((g: any) => g.tasks.length > 0)
                                                    .map((group: any) => (
                                                        <div key={group.member.id} className="bg-white p-3 rounded-md border border-gray-200">
                                                            <h6 className="text-xs font-semibold text-gray-700 mb-2">{group.member.name}</h6>
                                                            <div className="space-y-2">
                                                                {group.tasks.map((task: any) => (
                                                                    <div key={task.id} className="text-sm">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="text-gray-900">{task.description}</span>
                                                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                                                task.priority === 'Alta' ? 'bg-red-100 text-red-700' :
                                                                                task.priority === 'Media' ? 'bg-yellow-100 text-yellow-700' :
                                                                                'bg-green-100 text-green-700'
                                                                            }`}>
                                                                                {task.priority}
                                                                            </span>
                                                                        </div>
                                                                        <select
                                                                            value={task.status}
                                                                            onChange={(e) => {
                                                                                // Solo il membro assegnato può cambiare lo status
                                                                                if (user.id === task.assignedTo) {
                                                                                    tasksAPI.updateTaskStatus(task.id, e.target.value)
                                                                                        .then(() => loadTasks())
                                                                                        .catch((err: any) => alert(err.message || 'Errore nell\'aggiornamento'));
                                                                                } else {
                                                                                    alert('Puoi aggiornare solo i tuoi task assegnati');
                                                                                }
                                                                            }}
                                                                            disabled={user.id !== task.assignedTo}
                                                                            className={`text-xs px-2 py-1 rounded-md border ${
                                                                                task.status === 'Completato' ? 'bg-green-100 text-green-700 border-green-300' :
                                                                                task.status === 'In Corso' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                                                                task.status === 'In Revisione' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                                                                'bg-red-100 text-red-700 border-red-300'
                                                                            } ${user.id !== task.assignedTo ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                                        >
                                                                            <option value="Da Fare">Da Fare</option>
                                                                            <option value="In Corso">In Corso</option>
                                                                            <option value="In Revisione">In Revisione</option>
                                                                            <option value="Completato">Completato</option>
                                                                        </select>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                            ) : (
                                                <div className="text-sm text-gray-400 italic">Nessun task assegnato</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Form per creare nuovo task */}
                            <div className="border-t mt-4 pt-4">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Crea nuovo task</h5>
                                <form onSubmit={handleCreateTask} className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
                                    <input
                                        type="text"
                                        value={newTaskDescription}
                                        onChange={(e) => setNewTaskDescription(e.target.value)}
                                        placeholder="Descrizione del task..."
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                    <select
                                        value={newTaskPriority}
                                        onChange={(e) => setNewTaskPriority(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        {TODO_PRIORITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-colors duration-200"
                                    >
                                        Crea Task
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function TodoItem({ todo, onStatusChange, onDelete }: any) {
    // Determina lo stato corrente dal todo
    // Se ha un campo status, usalo, altrimenti deriva da completed
    const getCurrentStatus = () => {
        if (todo.status) return todo.status;
        if (todo.completed) return 'terminato';
        // Se non è completato e non ha status, potrebbe essere "in corso" o "da fare"
        // Per ora assumiamo "da fare"
        return 'da fare';
    };

    const currentStatus = getCurrentStatus();
    
    const statusOptions = [
        { value: 'da fare', label: 'Da Fare', color: 'bg-red-100 text-red-700 border-red-300' },
        { value: 'in corso', label: 'In Corso', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
        { value: 'terminato', label: 'Terminato', color: 'bg-green-100 text-green-700 border-green-300' },
    ];

    const priorityColors: any = {
        'Bassa': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
        'Media': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
        'Alta': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    };

    const currentStatusConfig = statusOptions.find(s => s.value === currentStatus) || statusOptions[0];
    const priorityConfig = priorityColors[todo.priority] || priorityColors['Media'];

    return (
        <div className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 border border-gray-200">
            <div className="flex items-center space-x-3 flex-1">
                <span className="text-gray-800 flex-1">{todo.text}</span>
                
                {/* Badge Priorità - più visibile */}
                <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}>
                    {todo.priority}
                </span>
            </div>
            
            <div className="flex items-center space-x-2">
                {/* Selettore Stato */}
                <select
                    value={currentStatus}
                    onChange={(e) => onStatusChange(e.target.value)}
                    className={`px-3 py-1 text-sm font-medium rounded-md border ${currentStatusConfig.color} cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                >
                    {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                
                <button 
                    onClick={onDelete} 
                    className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                    title="Elimina"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function ContabilitaList({ contracts, onUpdateContractStatus, onDeleteContract, getClientName, getProjectName }: any) {
    // Assicurati che contracts sia sempre un array
    const contractsList = Array.isArray(contracts) ? contracts : [];
    
    if (contractsList.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500 text-lg">Nessun documento presente</p>
                <p className="text-gray-400 text-sm mt-2">Aggiungi un nuovo documento utilizzando il pulsante in alto</p>
            </div>
        );
    }
    
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
                    {contractsList.map((contract: any) => (
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
                                <div className="text-sm text-gray-900">€ {Number(contract.amount).toFixed(2)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <StatusSelector
                                    currentStatus={contract.status}
                                    options={CONTRACT_STATUS_OPTIONS}
                                    onChange={(newStatus: string) => onUpdateContractStatus(contract.id, newStatus)}
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

function AddClientForm({ onSubmit }: any) {
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        status: 'Prospect',
        area: 'Marketing',
    });

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: any) => {
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
            <FormSelect 
                name="area" 
                label="Area di Competenza" 
                value={formData.area} 
                onChange={handleChange} 
                options={AREA_OPTIONS.map(area => ({ value: area, label: area }))} 
            />
            <FormSelect 
                name="status" 
                label="Stato Iniziale" 
                value={formData.status} 
                onChange={handleChange} 
                options={CLIENT_STATUS_OPTIONS.map(status => ({ value: status, label: status }))} 
            />
            <div className="pt-4 flex justify-end">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200">
                    Salva Cliente
                </button>
            </div>
        </form>
    );
}

function AddProjectForm({ clients, onSubmit }: any) {
    // Assicurati che clients sia sempre un array
    const clientsList = Array.isArray(clients) ? clients : [];
    const hasClients = clientsList.length > 0;

    console.log('AddProjectForm rendering with clients:', clientsList.length);

    const [formData, setFormData] = useState({
        name: '',
        clientId: hasClients ? clientsList[0]?.id || '' : '',
        area: 'IT',
        status: 'Pianificato',
    });

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: any) => {
        e.preventDefault();
        if (!formData.name) {
            alert('Il nome del progetto è obbligatorio.');
            return;
        }
        if (!hasClients) {
            alert('Devi prima creare almeno un cliente per poter creare un progetto.');
            return;
        }
        if (!formData.clientId) {
            alert('Seleziona un cliente.');
            return;
        }
        onSubmit(formData);
    };

    // Converti AREA_OPTIONS in formato per FormSelect
    const areaOptions = AREA_OPTIONS.map(area => ({ value: area, label: area }));
    const statusOptions = PROJECT_STATUS_OPTIONS.map(status => ({ value: status, label: status }));

    // Debug: verifica che il componente si renderizzi
    console.log('AddProjectForm render - formData:', formData, 'hasClients:', hasClients);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Aggiungi Nuovo Progetto</h3>
            
            <FormInput 
                name="name" 
                label="Nome Progetto" 
                value={formData.name} 
                onChange={handleChange} 
                required 
            />
            
            <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                    Cliente {!hasClients && <span className="text-red-500">*</span>}
                </label>
                {!hasClients ? (
                    <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                            ⚠️ Nessun cliente presente. Crea prima un cliente nella sezione "Clienti".
                        </p>
                    </div>
                ) : (
                    <select
                        id="clientId"
                        name="clientId"
                        value={formData.clientId}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option value="">Seleziona un cliente</option>
                        {clientsList.map((c: any) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>
            
            <FormSelect 
                name="area" 
                label="Area di Competenza" 
                value={formData.area} 
                onChange={handleChange} 
                options={areaOptions} 
            />
            
            <FormSelect 
                name="status" 
                label="Stato Iniziale" 
                value={formData.status} 
                onChange={handleChange} 
                options={statusOptions} 
            />
            
            <div className="pt-4 flex justify-end">
                <button 
                    type="submit" 
                    disabled={!hasClients}
                    className={`px-4 py-2 rounded-lg shadow-md transition-colors duration-200 ${
                        hasClients 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    Salva Progetto
                </button>
            </div>
        </form>
    );
}

function AddContractForm({ clients, projects, onSubmit }: any) {
    // Assicurati che clients e projects siano sempre array
    const clientsList = Array.isArray(clients) ? clients : [];
    const projectsList = Array.isArray(projects) ? projects : [];
    const hasClients = clientsList.length > 0;

    console.log('AddContractForm rendering with clients:', clientsList.length, 'projects:', projectsList.length);

    const [formData, setFormData] = useState({
        type: 'Contratto',
        clientId: hasClients ? clientsList[0]?.id || '' : '',
        projectId: '',
        amount: 0,
        status: 'Bozza',
        date: new Date().toISOString().split('T')[0],
    });

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const availableProjects = useMemo(() => {
        if (!formData.clientId) return [];
        return projectsList.filter((p: any) => p.clientId === formData.clientId);
    }, [formData.clientId, projectsList]);

    useEffect(() => {
        if (availableProjects.length > 0 && !availableProjects.find((p: any) => p.id === formData.projectId)) {
            setFormData(prev => ({ ...prev, projectId: availableProjects[0].id }));
        } else if (availableProjects.length === 0) {
            setFormData(prev => ({ ...prev, projectId: '' }));
        }
    }, [formData.clientId, availableProjects, formData.projectId]);

    const handleSubmit = (e: any) => {
        e.preventDefault();
        if (!hasClients) {
            alert('Devi prima creare almeno un cliente per poter creare un documento.');
            return;
        }
        if (!formData.clientId) {
            alert('Seleziona un cliente.');
            return;
        }
        if (!formData.amount || formData.amount <= 0) {
            alert('L\'importo deve essere maggiore di 0.');
            return;
        }
        onSubmit(formData);
    };

    // Converti le opzioni in formato per FormSelect
    const typeOptions = CONTRACT_TYPE_OPTIONS.map(type => ({ value: type, label: type }));
    const statusOptions = CONTRACT_STATUS_OPTIONS.map(status => ({ value: status, label: status }));

    // Debug: verifica che il componente si renderizzi
    console.log('AddContractForm render - formData:', formData, 'hasClients:', hasClients);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Aggiungi Documento</h3>
            
            <FormSelect name="type" label="Tipo" value={formData.type} onChange={handleChange} options={typeOptions} />
            
            <div>
                <label htmlFor="contractClientId" className="block text-sm font-medium text-gray-700">
                    Cliente {!hasClients && <span className="text-red-500">*</span>}
                </label>
                {!hasClients ? (
                    <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                            ⚠️ Nessun cliente presente. Crea prima un cliente nella sezione "Clienti".
                        </p>
                    </div>
                ) : (
                    <select
                        id="contractClientId"
                        name="clientId"
                        value={formData.clientId}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option value="">Seleziona un cliente</option>
                        {clientsList.map((c: any) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>
            
            <div>
                <label htmlFor="contractProjectId" className="block text-sm font-medium text-gray-700">
                    Progetto (opzionale)
                </label>
                {!formData.clientId ? (
                    <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <p className="text-sm text-gray-600">
                            Seleziona prima un cliente per vedere i suoi progetti.
                        </p>
                    </div>
                ) : availableProjects.length === 0 ? (
                    <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                            ℹ️ Nessun progetto disponibile per questo cliente.
                        </p>
                    </div>
                ) : (
                    <select
                        id="contractProjectId"
                        name="projectId"
                        value={formData.projectId}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option value="">Nessun progetto</option>
                        {availableProjects.map((p: any) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>
            
            <FormInput name="amount" label="Importo (€)" type="number" value={formData.amount} onChange={handleChange} required />
            <FormInput name="date" label="Data" type="date" value={formData.date} onChange={handleChange} required />
            <FormSelect name="status" label="Stato Iniziale" value={formData.status} onChange={handleChange} options={statusOptions} />
            
            <div className="pt-4 flex justify-end">
                <button 
                    type="submit" 
                    disabled={!hasClients}
                    className={`px-4 py-2 rounded-lg shadow-md transition-colors duration-200 ${
                        hasClients 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    Salva Documento
                </button>
            </div>
        </form>
    );
}

// --- Componenti di Form Generici ---

function FormInput({ label, name, type = 'text', value, onChange, required = false }: any) {
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

function FormSelect({ label, name, value, onChange, options, required = false }: any) {
    // Assicurati che options sia sempre un array
    const optionsList = Array.isArray(options) ? options : [];
    
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
            <select
                id={name}
                name={name}
                value={value || ''}
                onChange={onChange}
                required={required}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
                {optionsList.length === 0 ? (
                    <option value="">Nessuna opzione disponibile</option>
                ) : (
                    optionsList.map((option: any, index: number) => {
                        const optionValue = typeof option === 'object' ? option.value : option;
                        const optionLabel = typeof option === 'object' ? option.label : option;
                        return (
                            <option
                                key={optionValue || index}
                                value={optionValue}
                            >
                                {optionLabel}
                            </option>
                        );
                    })
                )}
            </select>
        </div>
    );
}

function StatusSelector({ currentStatus, options, onChange }: any) {
    const statusColors: any = {
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
            onClick={(e) => e.stopPropagation()}
        >
            {options.map((option: string) => (
                <option key={option} value={option}>{option}</option>
            ))}
        </select>
    );
}
