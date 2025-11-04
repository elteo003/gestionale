// Servizio API per comunicare con il backend

// Funzione per ottenere l'API URL (controlla prima localStorage per override personalizzato)
function getApiUrl(): string {
    const url = localStorage.getItem('customApiUrl') || import.meta.env.VITE_API_URL || 'http://localhost:3000';
    // Rimuovi trailing slash se presente
    return url.replace(/\/+$/, '');
}

const API_URL = getApiUrl();

// Log dell'URL configurato (solo in development)
if (import.meta.env.DEV) {
    console.log('🔗 API URL configurato:', API_URL || 'NON CONFIGURATO ⚠️');
}

// Funzione helper per determinare la sezione dall'endpoint
function getSectionFromEndpoint(endpoint: string): 'dashboard' | 'clients' | 'projects' | 'contracts' | 'events' | undefined {
    // IMPORTANTE: Gli endpoint di autenticazione NON devono mai essere mockati
    if (endpoint.includes('/api/auth')) return undefined;
    
    if (endpoint.includes('/api/clients')) return 'clients';
    if (endpoint.includes('/api/projects')) return 'projects';
    if (endpoint.includes('/api/contracts')) return 'contracts';
    if (endpoint.includes('/api/events')) return 'events';
    if (endpoint.includes('/api/users') || endpoint.includes('/health')) return 'dashboard'; // Utenti e health per dashboard
    return undefined;
}

// Funzione per verificare se usare mock data (globale o per sezione)
// IMPORTANTE: Gli endpoint di autenticazione NON devono mai essere mockati
function shouldUseMockData(section?: 'dashboard' | 'clients' | 'projects' | 'contracts' | 'events', endpoint?: string): boolean {
    // Se l'endpoint è di autenticazione, NON usare mai mock data
    if (endpoint && endpoint.includes('/api/auth')) {
        return false;
    }
    
    // Se non c'è sezione (es. endpoint non riconosciuto), NON usare mock data
    if (!section) return false;
    
    // Controlla se il mock globale è attivo
    const globalMock = localStorage.getItem('useMockData') === 'true';
    
    // Se il mock globale è disattivato, controlla solo le sezioni specifiche
    if (!globalMock) {
        const mockSections = JSON.parse(localStorage.getItem('mockDataSections') || '{}');
        return mockSections[section] === true;
    }
    
    // Se il mock globale è attivo, controlla se la sezione specifica ha mock attivo
    const mockSections = JSON.parse(localStorage.getItem('mockDataSections') || '{}');
    // Se la sezione è esplicitamente disattivata, rispetta quella impostazione
    if (mockSections[section] === false) return false;
    // Altrimenti usa il mock globale o quello specifico della sezione
    return mockSections[section] === true || globalMock;
}

// Funzione helper per verificare se dashboard mock è attivo e se servono dati correlati
// IMPORTANTE: NON forza più il mock dei dati correlati. I dati mock devono essere attivati SOLO manualmente dal pannello admin
function shouldMockRelatedDataForDashboard(endpoint: string): boolean {
    // IMPORTANTE: Gli endpoint di autenticazione NON devono mai essere mockati
    if (endpoint.includes('/api/auth')) return false;
    
    // I dati correlati vengono mockati SOLO se sono esplicitamente attivati nel pannello admin
    // Non vengono più mockati automaticamente quando la dashboard è mockata
    return false;
}


// Funzione helper per le chiamate API
async function apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    // IMPORTANTE: Gli endpoint di autenticazione NON devono mai essere mockati
    // Devono sempre fare chiamate reali al backend
    if (endpoint.includes('/api/auth')) {
        // Prosegui direttamente con la chiamata HTTP reale
    } else {
        // Determina la sezione dall'endpoint
        const section = getSectionFromEndpoint(endpoint);
        
        // Se mock data è attivo per questa sezione, restituisci dati finti
        if (shouldUseMockData(section, endpoint)) {
            return getMockData(endpoint, options);
        }
        
        // Se la dashboard è mockata e servono dati correlati per i KPI, mockali anche se non sono attivi individualmente
        if (shouldMockRelatedDataForDashboard(endpoint)) {
            return getMockData(endpoint, options);
        }
    }
    const token = localStorage.getItem('token');
    const baseUrl = getApiUrl();
    // Assicurati che l'endpoint inizi con / e che baseUrl non finisca con /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = `${baseUrl}${cleanEndpoint}`;
    
    const config: RequestInit = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    };

    try {
        const response = await fetch(fullUrl, config);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
            
            // Se il token è scaduto o non valido, rimuovilo e reindirizza al login
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
            
            // Se è un conflitto di modifica simultanea (409), passa l'errore completo
            if (response.status === 409 && error.error === 'CONCURRENT_MODIFICATION') {
                const conflictError: any = new Error(error.message || 'Conflitto di modifica');
                conflictError.name = 'ConcurrentModificationError';
                conflictError.status = 409;
                conflictError.conflictData = error;
                throw conflictError;
            }
            
            throw new Error(error.error || `Errore ${response.status}`);
        }
        
        return await response.json();
    } catch (error: any) {
        console.error('❌ Errore API:', {
            url: fullUrl,
            method: options.method || 'GET',
            error: error.message,
            type: error.name
        });
        
        // Se è un errore di rete, fornisci un messaggio più chiaro
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            const networkError = new Error(
                `Impossibile raggiungere il backend. Verifica che:\n` +
                `1. Il backend sia avviato e raggiungibile\n` +
                `2. VITE_API_URL sia configurato correttamente (attuale: ${getApiUrl() || 'NON CONFIGURATO'})\n` +
                `3. Non ci siano problemi di CORS o firewall`
            );
            networkError.name = 'NetworkError';
            throw networkError;
        }
        
        throw error;
    }
}

// Auth API
export const authAPI = {
    login: (email: string, password: string) => 
        apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),
    
    register: (userData: any) =>
        apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        }),
    
    verify: () =>
        apiCall('/api/auth/verify'),
};

// Clients API
export const clientsAPI = {
    getAll: () => apiCall('/api/clients'),
    getById: (id: string) => apiCall(`/api/clients/${id}`),
    create: (client: any) =>
        apiCall('/api/clients', {
            method: 'POST',
            body: JSON.stringify(client),
        }),
    update: (id: string, client: any) =>
        apiCall(`/api/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(client),
        }),
    updateStatus: (id: string, status: string) =>
        apiCall(`/api/clients/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
    delete: (id: string) =>
        apiCall(`/api/clients/${id}`, {
            method: 'DELETE',
        }),
};

// Projects API
export const projectsAPI = {
    getAll: () => apiCall('/api/projects'),
    getMyProjects: () => apiCall('/api/projects/my'),
    getById: (id: string) => apiCall(`/api/projects/${id}`),
    create: (project: any) =>
        apiCall('/api/projects', {
            method: 'POST',
            body: JSON.stringify(project),
        }),
    update: (id: string, project: any) =>
        apiCall(`/api/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(project),
        }),
    updateStatus: (id: string, status: string) =>
        apiCall(`/api/projects/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
    delete: (id: string) =>
        apiCall(`/api/projects/${id}`, {
            method: 'DELETE',
        }),
    addTodo: (projectId: string, todo: any) =>
        apiCall(`/api/projects/${projectId}/todos`, {
            method: 'POST',
            body: JSON.stringify(todo),
        }),
    toggleTodo: (projectId: string, todoId: string) =>
        apiCall(`/api/projects/${projectId}/todos/${todoId}/toggle`, {
            method: 'PATCH',
        }),
    updateTodoStatus: (projectId: string, todoId: string, data: any) =>
        apiCall(`/api/projects/${projectId}/todos/${todoId}/status`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
    deleteTodo: (projectId: string, todoId: string) =>
        apiCall(`/api/projects/${projectId}/todos/${todoId}`, {
            method: 'DELETE',
        }),
    // Team Management
    getTeam: (projectId: string) =>
        apiCall(`/api/projects/${projectId}/team`),
    addTeamMember: (projectId: string, userId: string) =>
        apiCall(`/api/projects/${projectId}/team`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        }),
    removeTeamMember: (projectId: string, userId: string) =>
        apiCall(`/api/projects/${projectId}/team/${userId}`, {
            method: 'DELETE',
        }),
    // Tasks Management (nuova tabella tasks)
    getTasks: (projectId: string) =>
        apiCall(`/api/projects/${projectId}/tasks`),
    createTask: (projectId: string, task: any) =>
        apiCall(`/api/projects/${projectId}/tasks`, {
            method: 'POST',
            body: JSON.stringify(task),
        }),
    deleteTask: (projectId: string, taskId: string) =>
        apiCall(`/api/projects/${projectId}/tasks/${taskId}`, {
            method: 'DELETE',
        }),
};

// Contracts API
export const contractsAPI = {
    getAll: () => apiCall('/api/contracts'),
    getById: (id: string) => apiCall(`/api/contracts/${id}`),
    create: (contract: any) =>
        apiCall('/api/contracts', {
            method: 'POST',
            body: JSON.stringify(contract),
        }),
    update: (id: string, contract: any) =>
        apiCall(`/api/contracts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(contract),
        }),
    updateStatus: (id: string, status: string) =>
        apiCall(`/api/contracts/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
    delete: (id: string) =>
        apiCall(`/api/contracts/${id}`, {
            method: 'DELETE',
        }),
};

// Events API
export const eventsAPI = {
    getAll: (filters: any = {}) => {
        const params = new URLSearchParams();
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.isCall !== undefined) params.append('isCall', filters.isCall);
        
        const query = params.toString();
        return apiCall(`/api/events${query ? `?${query}` : ''}`);
    },
    getById: (id: string) => apiCall(`/api/events/${id}`),
    getParticipants: (id: string) => apiCall(`/api/events/${id}/participants`),
    getMyUpcoming: () => apiCall('/api/events/my/upcoming'),
    create: (event: any) =>
        apiCall('/api/events', {
            method: 'POST',
            body: JSON.stringify(event),
        }),
    update: (id: string, event: any) =>
        apiCall(`/api/events/${id}`, {
            method: 'PUT',
            body: JSON.stringify(event),
        }),
    delete: (id: string) =>
        apiCall(`/api/events/${id}`, {
            method: 'DELETE',
        }),
    rsvp: (id: string, status: string) =>
        apiCall(`/api/events/${id}/rsvp`, {
            method: 'POST',
            body: JSON.stringify({ status }),
        }),
};

// Users API
export const usersAPI = {
    getAll: () => apiCall('/api/users'),
    getById: (id: string) => apiCall(`/api/users/${id}`),
    getOnline: () => apiCall('/api/users/online'),
    create: (userData: any) =>
        apiCall('/api/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        }),
    update: (id: string, userData: any) =>
        apiCall(`/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        }),
    resetPassword: (id: string, newPassword: string) =>
        apiCall(`/api/users/${id}/reset-password`, {
            method: 'PATCH',
            body: JSON.stringify({ newPassword }),
        }),
    updateStatus: (id: string, isActive: boolean) =>
        apiCall(`/api/users/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive }),
        }),
};

// Tasks API
export const tasksAPI = {
    getMyTasks: () => apiCall('/api/tasks/mytasks'),
    assignTask: (taskId: string, userId: string) =>
        apiCall(`/api/tasks/${taskId}/assign`, {
            method: 'PUT',
            body: JSON.stringify({ userId }),
        }),
    updateTaskStatus: (taskId: string, status: string) =>
        apiCall(`/api/tasks/${taskId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        }),
};

// Funzione per generare mock data in base all'endpoint e sezione
function getMockData(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Simula un delay di rete
    return new Promise((resolve) => {
        setTimeout(() => {
            // Clients mock data - Dati completi per Marketing e altre dashboard
            if (endpoint.includes('/api/clients')) {
                if (options.method === 'GET' && !endpoint.includes('/api/clients/')) {
                    const now = Date.now();
                    const baseClients = [
                        // Prospect (per Marketing)
                        { id: '1', name: 'TechStartup SRL', email: 'info@techstartup.it', phone: '+39 02 1234 5678', status: 'Prospect', area: 'IT', notes: 'Startup innovativa', createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: '2', name: 'Digital Agency Beta', email: 'contact@digitalbeta.com', phone: '+39 06 2345 6789', status: 'Prospect', area: 'Marketing', notes: 'Agenzia marketing digitale', createdAt: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: '3', name: 'Innovate Solutions', email: 'hello@innovate.it', phone: '+39 011 3456 7890', status: 'Prospect', area: 'Commerciale', notes: 'Nuova opportunità', createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString() },
                        // In Contatto
                        { id: '4', name: 'MediaCorp Italia', email: 'info@mediacorp.it', phone: '+39 02 4567 8901', status: 'In Contatto', area: 'Marketing', notes: 'In contatto da 20 giorni', createdAt: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: '5', name: 'Enterprise Solutions', email: 'sales@enterprise.it', phone: '+39 06 5678 9012', status: 'In Contatto', area: 'Commerciale', notes: 'Follow-up necessario', createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 18 * 24 * 60 * 60 * 1000).toISOString() },
                        // In Negoziazione
                        { id: '6', name: 'Global Finance Group', email: 'procurement@globalfinance.com', phone: '+39 02 6789 0123', status: 'In Negoziazione', area: 'Commerciale', notes: 'Contratto in fase di definizione', createdAt: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: '7', name: 'Retail Chain Alpha', email: 'business@retailalpha.it', phone: '+39 011 7890 1234', status: 'In Negoziazione', area: 'Commerciale', notes: 'Preventivo inviato', createdAt: new Date(now - 75 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(now - 75 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString() },
                        // Attivi
                        { id: '8', name: 'Azienda Alpha', email: 'alpha@example.com', phone: '+39 02 8901 2345', status: 'Attivo', area: 'IT', notes: 'Cliente principale IT', createdAt: new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: '9', name: 'Beta Corp', email: 'beta@example.com', phone: '+39 06 9012 3456', status: 'Attivo', area: 'Marketing', notes: 'Cliente attivo marketing', createdAt: new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: '10', name: 'Gamma Solutions', email: 'gamma@example.com', phone: '+39 011 0123 4567', status: 'Attivo', area: 'Commerciale', notes: 'Cliente storico', createdAt: new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: '11', name: 'Delta Technologies', email: 'delta@example.com', phone: '+39 02 1234 5678', status: 'Attivo', area: 'IT', notes: 'Cliente IT attivo da 2 anni', createdAt: new Date(now - 730 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(now - 730 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString() },
                        // Clienti recenti (ultimi 90gg per Presidente)
                        { id: '12', name: 'New Client 2024', email: 'new@client2024.it', phone: '+39 06 2345 6789', status: 'Attivo', area: 'Commerciale', notes: 'Nuovo cliente', createdAt: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString() },
                    ];
                    resolve(baseClients);
                } else if (options.method === 'POST') {
                    const body = JSON.parse(options.body as string);
                    resolve({ id: Date.now().toString(), ...body, created_at: new Date().toISOString() });
                } else if (options.method === 'PUT') {
                    const body = JSON.parse(options.body as string);
                    resolve({ id: endpoint.split('/')[3], ...body, updated_at: new Date().toISOString() });
                } else if (options.method === 'DELETE') {
                    resolve({ message: 'Cliente eliminato (Mock)' });
                } else {
                    resolve({ id: '1', name: 'Azienda Alpha', email: 'alpha@example.com', phone: '+39 123 456 7890', status: 'Attivo' });
                }
            }
            // Projects mock data - Dati completi per tutte le aree
            else if (endpoint.includes('/api/projects')) {
                if (options.method === 'GET' && !endpoint.includes('/api/projects/') || endpoint.includes('/todos')) {
                    if (endpoint.includes('/todos')) {
                        // Task generici per progetti
                        resolve([
                            { id: '1', text: 'Setup iniziale progetto', completed: false, priority: 'Alta', status: 'da fare', createdAt: new Date().toISOString(), updated_at: new Date().toISOString() },
                            { id: '2', text: 'Revisione documentazione', completed: false, priority: 'Media', status: 'in corso', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
                            { id: '3', text: 'Test di integrazione', completed: true, priority: 'Bassa', status: 'terminato', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
                        ]);
                    } else {
                        const now = Date.now();
                        const baseProjects = [
                            // PROGETTI IT - Vari stati per dashboard IT
                            { id: '1', name: 'Sito Web Alpha', client_id: '8', status: 'In Corso', area: 'IT', created_at: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), todos: [
                                { id: '1', text: 'Design homepage', completed: false, priority: 'Alta', status: 'da fare', createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString() },
                                { id: '2', text: 'Implementazione backend', completed: true, priority: 'Alta', status: 'terminato', createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString() },
                                { id: '3', text: 'Test integrazione frontend', completed: false, priority: 'Media', status: 'in corso', createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() },
                            ]},
                            { id: '2', name: 'App Mobile E-commerce', client_id: '8', status: 'In Corso', area: 'IT', created_at: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(), todos: [
                                { id: '4', text: 'Setup ambiente sviluppo', completed: true, priority: 'Alta', status: 'terminato', createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString() },
                                { id: '5', text: 'Implementazione API REST', completed: false, priority: 'Alta', status: 'in corso', createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString() },
                                { id: '6', text: 'Test unitari', completed: false, priority: 'Media', status: 'da fare', createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() },
                            ]},
                            { id: '3', name: 'Sistema di Backup Cloud', client_id: '11', status: 'In Revisione', area: 'IT', created_at: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), todos: [
                                { id: '7', text: 'Configurazione backup automatico', completed: true, priority: 'Alta', status: 'terminato', createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString() },
                                { id: '8', text: 'Test disaster recovery', completed: false, priority: 'Alta', status: 'in corso', createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString() },
                            ]},
                            { id: '4', name: 'Dashboard Analytics', client_id: '11', status: 'Pianificato', area: 'IT', created_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(), todos: [] },
                            { id: '5', name: 'Sistema CRM Enterprise', client_id: '8', status: 'Completato', area: 'IT', created_at: new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), todos: [] },
                            { id: '6', name: 'API Gateway Microservices', client_id: '11', status: 'In Corso', area: 'IT', created_at: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(), todos: [
                                { id: '9', text: 'Design architettura', completed: true, priority: 'Alta', status: 'terminato', createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString() },
                                { id: '10', text: 'Implementazione gateway', completed: false, priority: 'Alta', status: 'in corso', createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() },
                            ]},
                            // PROGETTI MARKETING - Per dashboard Marketing
                            { id: '7', name: 'Campagna Marketing Beta', client_id: '9', status: 'In Corso', area: 'Marketing', created_at: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), todos: [
                                { id: '11', text: 'Analisi target audience', completed: false, priority: 'Media', status: 'in corso', createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString() },
                                { id: '12', text: 'Creazione contenuti social', completed: false, priority: 'Alta', status: 'da fare', createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() },
                            ]},
                            { id: '8', name: 'Rebranding Aziendale', client_id: '9', status: 'In Corso', area: 'Marketing', created_at: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), todos: [
                                { id: '13', text: 'Design nuovo logo', completed: true, priority: 'Alta', status: 'terminato', createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString() },
                            ]},
                            { id: '9', name: 'Lancio Prodotto Innovativo', client_id: '2', status: 'Pianificato', area: 'Marketing', created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), todos: [] },
                            // PROGETTI COMMERCIALE
                            { id: '10', name: 'Espansione Commerciale Nord', client_id: '10', status: 'In Corso', area: 'Commerciale', created_at: new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), todos: [] },
                            { id: '11', name: 'Partnership Strategica', client_id: '6', status: 'In Negoziazione', area: 'Commerciale', created_at: new Date(now - 50 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(), todos: [] },
                        ];
                        
                        resolve(baseProjects);
                    }
                } else if (options.method === 'POST') {
                    const body = JSON.parse(options.body as string);
                    resolve({ id: Date.now().toString(), ...body, created_at: new Date().toISOString() });
                } else if (options.method === 'PUT' || options.method === 'PATCH') {
                    const body = options.body ? JSON.parse(options.body as string) : {};
                    resolve({ id: endpoint.split('/')[3], ...body, updated_at: new Date().toISOString() });
                } else if (options.method === 'DELETE') {
                    resolve({ message: 'Progetto eliminato (Mock)' });
                } else {
                    resolve({ id: '1', name: 'Sito Web Alpha', client_id: '1', status: 'In Corso', area: 'IT' });
                }
            }
            // Contracts mock data - Dati completi per Tesoreria, Commerciale e Audit
            else if (endpoint.includes('/api/contracts')) {
                if (options.method === 'GET' && !endpoint.includes('/api/contracts/')) {
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    const currentMonth = now.getMonth();
                    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
                    
                    resolve([
                        // Contratti Firmati (per Presidente, Commerciale)
                        { id: '1', type: 'Contratto', client_id: '8', project_id: '1', projectId: '1', amount: 75000, status: 'Firmato', date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-05` },
                        { id: '2', type: 'Contratto', client_id: '9', project_id: '7', projectId: '7', amount: 45000, status: 'Firmato', date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-10` },
                        { id: '3', type: 'Contratto', client_id: '10', project_id: '10', projectId: '10', amount: 120000, status: 'Firmato', date: `${currentYear}-${String(currentMonth).padStart(2, '0') || '12'}-15` },
                        // Fatture Pagate (per Tesoreria)
                        { id: '4', type: 'Fattura', client_id: '8', project_id: '5', projectId: '5', amount: 25000, status: 'Pagato', date: `${currentYear}-01-15` },
                        { id: '5', type: 'Fattura', client_id: '9', project_id: '7', projectId: '7', amount: 15000, status: 'Pagato', date: `${currentYear}-02-20` },
                        { id: '6', type: 'Fattura', client_id: '11', project_id: '3', projectId: '3', amount: 35000, status: 'Pagato', date: `${currentYear}-03-10` },
                        // Fatture In Sospeso (da incassare - per Tesoreria)
                        { id: '7', type: 'Fattura', client_id: '8', project_id: '1', projectId: '1', amount: 30000, status: 'Inviato', date: `${currentYear}-${String(currentMonth).padStart(2, '0') || '12'}-05` },
                        { id: '8', type: 'Fattura', client_id: '9', project_id: '8', projectId: '8', amount: 18000, status: 'Inviato', date: `${currentYear}-${String(currentMonth).padStart(2, '0') || '12'}-10` },
                        // Fatture Scadute (>30gg - per Tesoreria e Audit)
                        { id: '9', type: 'Fattura', client_id: '10', project_id: '10', projectId: '10', amount: 22000, status: 'Inviato', date: `${currentYear}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}` },
                        { id: '10', type: 'Fattura', client_id: '11', project_id: '6', projectId: '6', amount: 28000, status: 'Inviato', date: `${currentYear}-${String(fortyFiveDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(fortyFiveDaysAgo.getDate()).padStart(2, '0')}` },
                        // Preventivi Inviati (per Tesoreria e Commerciale)
                        { id: '11', type: 'Preventivo', client_id: '6', project_id: null, projectId: null, amount: 55000, status: 'Inviato', date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-12` },
                        { id: '12', type: 'Preventivo', client_id: '7', project_id: null, projectId: null, amount: 38000, status: 'Inviato', date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-18` },
                        { id: '13', type: 'Preventivo', client_id: '4', project_id: null, projectId: null, amount: 42000, status: 'Inviato', date: `${currentYear}-${String(currentMonth).padStart(2, '0') || '12'}-20` },
                        // Contratti in Bozza (per Commerciale)
                        { id: '14', type: 'Contratto', client_id: '5', project_id: null, projectId: null, amount: 65000, status: 'Bozza', date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-25` },
                        { id: '15', type: 'Contratto', client_id: '4', project_id: null, projectId: null, amount: 48000, status: 'Bozza', date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-28` },
                    ]);
                } else if (options.method === 'POST') {
                    const body = JSON.parse(options.body as string);
                    resolve({ id: Date.now().toString(), ...body, created_at: new Date().toISOString() });
                } else if (options.method === 'PUT' || options.method === 'PATCH') {
                    const body = options.body ? JSON.parse(options.body as string) : {};
                    resolve({ id: endpoint.split('/')[3], ...body, updated_at: new Date().toISOString() });
                } else if (options.method === 'DELETE') {
                    resolve({ message: 'Contratto eliminato (Mock)' });
                } else {
                    resolve({ id: '1', type: 'Contratto', client_id: '1', project_id: '1', projectId: '1', amount: 50000, status: 'Firmato' });
                }
            }
            // Events mock data - Dati completi per calendario e dashboard Commerciale
            else if (endpoint.includes('/api/events')) {
                if (options.method === 'GET' && !endpoint.includes('/api/events/') || endpoint.includes('/participants')) {
                    if (endpoint.includes('/participants')) {
                        resolve([
                            { id: '1', user_id: '1', status: 'accepted', name: 'Admin Test' },
                            { id: '2', user_id: '2', status: 'pending', name: 'User Test' },
                        ]);
                    } else {
                        const now = Date.now();
                        const currentMonth = new Date().getMonth();
                        const currentYear = new Date().getFullYear();
                        
                        // Eventi per questo mese (per Commerciale - call del mese)
                        const eventsThisMonth = [];
                        for (let i = 1; i <= 5; i++) {
                            const eventDate = new Date(currentYear, currentMonth, i * 5, 10 + i, 0);
                            if (eventDate > new Date()) {
                                eventsThisMonth.push({
                                    id: `call-${i}`,
                                    title: `Call Cliente ${i}`,
                                    description: `Call commerciale con cliente`,
                                    start_time: eventDate.toISOString(),
                                    end_time: new Date(eventDate.getTime() + 60 * 60 * 1000).toISOString(),
                                    is_call: true,
                                    call_link: `https://meet.google.com/call-${i}`,
                                    creator_id: '1',
                                });
                            }
                        }
                        
                        resolve([
                            // Eventi CDA (per Presidente)
                            { id: '1', title: 'Riunione CDA', description: 'Riunione mensile consiglio di amministrazione', start_time: new Date(now + 86400000).toISOString(), end_time: new Date(now + 86400000 + 3600000).toISOString(), is_call: false, call_link: null, creator_id: '1' },
                            { id: '2', title: 'Riunione CDA Straordinaria', description: 'Riunione straordinaria per bilancio', start_time: new Date(now + 5 * 86400000).toISOString(), end_time: new Date(now + 5 * 86400000 + 7200000).toISOString(), is_call: false, call_link: null, creator_id: '1' },
                            // Call commerciali (per Commerciale - del mese corrente)
                            ...eventsThisMonth,
                            // Altri eventi
                            { id: '3', title: 'Call con Cliente Alpha', description: 'Discussione progetto sito web', start_time: new Date(now + 172800000).toISOString(), end_time: new Date(now + 172800000 + 1800000).toISOString(), is_call: true, call_link: 'https://meet.google.com/abc-defg-hij', creator_id: '1' },
                            { id: '4', title: 'Presentazione Prodotto', description: 'Presentazione nuovo prodotto ai clienti', start_time: new Date(now + 259200000).toISOString(), end_time: new Date(now + 259200000 + 5400000).toISOString(), is_call: false, call_link: null, creator_id: '1' },
                            { id: '5', title: 'Call Tecnica Beta Corp', description: 'Call tecnica per progetto app mobile', start_time: new Date(now + 345600000).toISOString(), end_time: new Date(now + 345600000 + 3600000).toISOString(), is_call: true, call_link: 'https://meet.google.com/beta-corp', creator_id: '1' },
                        ]);
                    }
                } else if (options.method === 'POST') {
                    const body = JSON.parse(options.body as string);
                    resolve({ id: Date.now().toString(), ...body, created_at: new Date().toISOString() });
                } else if (options.method === 'PUT') {
                    const body = JSON.parse(options.body as string);
                    resolve({ id: endpoint.split('/')[3], ...body, updated_at: new Date().toISOString() });
                } else if (options.method === 'DELETE') {
                    resolve({ message: 'Evento eliminato (Mock)' });
                } else {
                    resolve({ id: '1', title: 'Riunione CDA', description: 'Riunione mensile', start_time: new Date().toISOString(), end_time: new Date().toISOString(), is_call: false });
                }
            }
            // Users and Dashboard mock data - Dati completi per tutte le dashboard
            else if (endpoint === '/api/users' && options.method !== 'POST') {
                resolve([
                    { id: '1', name: 'Admin Test', email: 'admin@test.com', area: 'IT', role: 'Admin', is_active: true, created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() },
                    { id: '2', name: 'Mario Rossi', email: 'mario.rossi@test.com', area: 'Marketing', role: 'Marketing', is_active: true, created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString() },
                    { id: '3', name: 'Luigi Bianchi', email: 'luigi.bianchi@test.com', area: 'IT', role: 'IT', is_active: true, created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString() },
                    { id: '4', name: 'Anna Verdi', email: 'anna.verdi@test.com', area: 'Commerciale', role: 'Commerciale', is_active: true, created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() },
                    { id: '5', name: 'Paolo Neri', email: 'paolo.neri@test.com', area: 'Commerciale', role: 'Responsabile', is_active: true, created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString() },
                    { id: '6', name: 'Giulia Blu', email: 'giulia.blu@test.com', area: null, role: 'Tesoreria', is_active: true, created_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString() },
                    { id: '7', name: 'Marco Gialli', email: 'marco.gialli@test.com', area: null, role: 'Presidente', is_active: true, created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString() },
                    { id: '8', name: 'Sara Rossi', email: 'sara.rossi@test.com', area: null, role: 'CDA', is_active: true, created_at: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000).toISOString() },
                    { id: '9', name: 'Luca Verdi', email: 'luca.verdi@test.com', area: 'Marketing', role: 'Socio', is_active: true, created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
                    { id: '10', name: 'Francesca Neri', email: 'francesca.neri@test.com', area: null, role: 'Audit', is_active: true, created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() },
                ]);
            } else if (endpoint === '/api/users/online') {
                resolve([
                    { id: '1', name: 'Admin Test', email: 'admin@test.com', area: 'IT', role: 'Admin', last_seen: new Date().toISOString() },
                ]);
            } else if (endpoint.startsWith('/api/users') && options.method === 'POST') {
                const body = JSON.parse(options.body as string);
                resolve({ id: Date.now().toString(), ...body, is_active: true, created_at: new Date().toISOString() });
            } else if (endpoint.startsWith('/api/users') && options.method === 'PUT') {
                const body = JSON.parse(options.body as string);
                resolve({ id: endpoint.split('/')[3], ...body });
            } else if (endpoint.includes('/reset-password') || endpoint.includes('/status')) {
                resolve({ message: 'Operazione completata (Mock)' });
            } else if (endpoint === '/health') {
                resolve({ status: 'OK', db: 'ok', timestamp: new Date().toISOString() });
            } else {
                // Per altri endpoint, restituisci array vuoto o oggetto vuoto
                resolve(Array.isArray(endpoint) ? [] : {});
            }
        }, 300); // Simula 300ms di delay
    });
}

