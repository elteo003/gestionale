// Servizio API per comunicare con il backend

// Funzione per ottenere l'API URL (controlla prima localStorage per override personalizzato)
function getApiUrl(): string {
    return localStorage.getItem('customApiUrl') || import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

const API_URL = getApiUrl();

// Log dell'URL configurato (solo in development)
if (import.meta.env.DEV) {
    console.log('🔗 API URL configurato:', API_URL || 'NON CONFIGURATO ⚠️');
}

// Funzione per verificare se usare mock data (globale o per sezione)
function shouldUseMockData(section?: 'dashboard' | 'clients' | 'projects' | 'contracts' | 'events'): boolean {
    const globalMock = localStorage.getItem('useMockData') === 'true';
    if (!globalMock) return false;
    
    // Se non specificata sezione, usa mock globale
    if (!section) return globalMock;
    
    // Controlla se la sezione specifica ha mock attivo
    const mockSections = JSON.parse(localStorage.getItem('mockDataSections') || '{}');
    return mockSections[section] === true;
}

// Funzione helper per determinare la sezione dall'endpoint
function getSectionFromEndpoint(endpoint: string): 'dashboard' | 'clients' | 'projects' | 'contracts' | 'events' | undefined {
    if (endpoint.includes('/api/clients')) return 'clients';
    if (endpoint.includes('/api/projects')) return 'projects';
    if (endpoint.includes('/api/contracts')) return 'contracts';
    if (endpoint.includes('/api/events')) return 'events';
    if (endpoint.includes('/api/users') || endpoint.includes('/health')) return 'dashboard'; // Utenti e health per dashboard
    return undefined;
}

// Funzione helper per verificare se dashboard mock è attivo e se servono dati correlati
function shouldMockRelatedDataForDashboard(endpoint: string): boolean {
    const mockSections = JSON.parse(localStorage.getItem('mockDataSections') || '{}');
    const dashboardMock = mockSections.dashboard === true;
    
    if (!dashboardMock) return false;
    
    // Se la dashboard è mockata, mocka anche i dati correlati per i KPI
    // Solo se non sono già mockati individualmente
    if (endpoint.includes('/api/clients')) return mockSections.clients !== true;
    if (endpoint.includes('/api/projects')) return mockSections.projects !== true;
    if (endpoint.includes('/api/contracts')) return mockSections.contracts !== true;
    if (endpoint.includes('/api/events')) return mockSections.events !== true;
    
    return false;
}

// Funzione helper per verificare se la dashboard è mockata (usata dentro getMockData)
function isDashboardMocked(): boolean {
    const mockSections = JSON.parse(localStorage.getItem('mockDataSections') || '{}');
    return mockSections.dashboard === true;
}

// Funzione helper per le chiamate API
async function apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Determina la sezione dall'endpoint
    const section = getSectionFromEndpoint(endpoint);
    
    // Se mock data è attivo per questa sezione, restituisci dati finti
    if (shouldUseMockData(section)) {
        return getMockData(endpoint, options, section);
    }
    
    // Se la dashboard è mockata e servono dati correlati per i KPI, mockali anche se non sono attivi individualmente
    if (shouldMockRelatedDataForDashboard(endpoint)) {
        return getMockData(endpoint, options, section);
    }
    const token = localStorage.getItem('token');
    const fullUrl = `${getApiUrl()}${endpoint}`;
    
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

// Funzione per generare mock data in base all'endpoint e sezione
function getMockData(endpoint: string, options: RequestInit = {}, section?: string): Promise<any> {
    // Simula un delay di rete
    return new Promise((resolve) => {
        setTimeout(() => {
            // Clients mock data
            if (endpoint.includes('/api/clients')) {
                if (options.method === 'GET' && !endpoint.includes('/api/clients/')) {
                    const baseClients = [
                        { id: '1', name: 'Azienda Alpha', email: 'alpha@example.com', phone: '+39 123 456 7890', status: 'Attivo', notes: 'Cliente principale', createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: '2', name: 'Beta Corp', email: 'beta@example.com', phone: '+39 123 456 7891', status: 'In Negoziazione', notes: 'In fase di negoziazione', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: '3', name: 'Gamma Solutions', email: 'gamma@example.com', phone: '+39 123 456 7892', status: 'Prospect', notes: 'Nuovo prospect', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: '4', name: 'Delta Technologies', email: 'delta@example.com', phone: '+39 123 456 7893', status: 'Attivo', notes: 'Cliente attivo da 2 anni', createdAt: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString() },
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
            // Projects mock data
            else if (endpoint.includes('/api/projects')) {
                if (options.method === 'GET' && !endpoint.includes('/api/projects/') || endpoint.includes('/todos')) {
                    if (endpoint.includes('/todos')) {
                        const projectId = endpoint.split('/')[3];
                        resolve([
                            { id: '1', text: 'Setup iniziale progetto', completed: false, priority: 'Alta', status: 'da fare' },
                            { id: '2', text: 'Revisione documentazione', completed: false, priority: 'Media', status: 'in corso' },
                            { id: '3', text: 'Test di integrazione', completed: true, priority: 'Bassa', status: 'terminato' },
                        ]);
                    } else {
                        // Se la dashboard è mockata, include più progetti IT per i KPI
                        const isDashboardMock = isDashboardMocked();
                        const baseProjects = [
                            { id: '1', name: 'Sito Web Alpha', client_id: '1', status: 'In Corso', area: 'IT', created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), todos: [
                                { id: '1', text: 'Design homepage', completed: false, priority: 'Alta', status: 'da fare', createdAt: new Date().toISOString() },
                                { id: '2', text: 'Implementazione backend', completed: true, priority: 'Alta', status: 'terminato', createdAt: new Date().toISOString() },
                            ]},
                            { id: '2', name: 'Campagna Marketing Beta', client_id: '2', status: 'In Corso', area: 'Marketing', created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), todos: [
                                { id: '3', text: 'Analisi target audience', completed: false, priority: 'Media', status: 'in corso', createdAt: new Date().toISOString() },
                            ]},
                            { id: '3', name: 'Sistema CRM Gamma', client_id: '3', status: 'Completato', area: 'IT', created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), todos: [] },
                        ];
                        
                        if (isDashboardMock) {
                            // Aggiungi più progetti IT per la dashboard
                            baseProjects.push(
                                { id: '4', name: 'App Mobile E-commerce', client_id: '1', status: 'In Corso', area: 'IT', created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), todos: [
                                    { id: '4', text: 'Setup ambiente sviluppo', completed: true, priority: 'Alta', status: 'terminato', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
                                    { id: '5', text: 'Implementazione API REST', completed: false, priority: 'Alta', status: 'in corso', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
                                    { id: '6', text: 'Test unitari', completed: false, priority: 'Media', status: 'da fare', createdAt: new Date().toISOString() },
                                ]},
                                { id: '5', name: 'Sistema di Backup Cloud', client_id: '2', status: 'In Revisione', area: 'IT', created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), todos: [
                                    { id: '7', text: 'Configurazione backup automatico', completed: true, priority: 'Alta', status: 'terminato', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
                                ]},
                                { id: '6', name: 'Dashboard Analytics', client_id: '3', status: 'Pianificato', area: 'IT', created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), todos: [] }
                            );
                        }
                        
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
            // Contracts mock data
            else if (endpoint.includes('/api/contracts')) {
                if (options.method === 'GET' && !endpoint.includes('/api/contracts/')) {
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    resolve([
                        { id: '1', type: 'Contratto', client_id: '1', project_id: '1', projectId: '1', amount: 50000, status: 'Firmato', date: `${currentYear}-01-15` },
                        { id: '2', type: 'Fattura', client_id: '2', project_id: '2', projectId: '2', amount: 15000, status: 'Pagato', date: `${currentYear}-02-20` },
                        { id: '3', type: 'Preventivo', client_id: '3', project_id: null, projectId: null, amount: 30000, status: 'Inviato', date: `${currentYear}-03-10` },
                        { id: '4', type: 'Fattura', client_id: '1', project_id: '1', projectId: '1', amount: 25000, status: 'Inviata', date: `${currentYear}-03-25` },
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
            // Events mock data
            else if (endpoint.includes('/api/events')) {
                if (options.method === 'GET' && !endpoint.includes('/api/events/') || endpoint.includes('/participants')) {
                    if (endpoint.includes('/participants')) {
                        resolve([
                            { id: '1', user_id: '1', status: 'accepted', name: 'Admin Test' },
                            { id: '2', user_id: '2', status: 'pending', name: 'User Test' },
                        ]);
                    } else {
                        resolve([
                            { id: '1', title: 'Riunione CDA', description: 'Riunione mensile consiglio', start_time: new Date(Date.now() + 86400000).toISOString(), end_time: new Date(Date.now() + 86400000 + 3600000).toISOString(), is_call: false, call_link: null },
                            { id: '2', title: 'Call con Cliente Alpha', description: 'Discussione progetto', start_time: new Date(Date.now() + 172800000).toISOString(), end_time: new Date(Date.now() + 172800000 + 1800000).toISOString(), is_call: true, call_link: 'https://meet.google.com/abc-defg-hij' },
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
            // Users and Dashboard mock data
            else if (endpoint === '/api/users' && options.method !== 'POST') {
                resolve([
                    { id: '1', name: 'Admin Test', email: 'admin@test.com', area: 'IT', role: 'Admin', is_active: true },
                    { id: '2', name: 'User Test', email: 'user@test.com', area: 'Marketing', role: 'Socio', is_active: true },
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

