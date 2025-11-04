// Servizio API per comunicare con il backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Log dell'URL configurato (solo in development)
if (import.meta.env.DEV) {
    console.log('🔗 API URL configurato:', API_URL || 'NON CONFIGURATO ⚠️');
}

// Funzione per verificare se usare mock data
function shouldUseMockData(): boolean {
    return localStorage.getItem('useMockData') === 'true';
}

// Funzione helper per le chiamate API
async function apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Se mock data è attivo, restituisci dati finti
    if (shouldUseMockData()) {
        return getMockData(endpoint, options);
    }
    const token = localStorage.getItem('token');
    const fullUrl = `${API_URL}${endpoint}`;
    
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
                `2. VITE_API_URL sia configurato correttamente (attuale: ${API_URL || 'NON CONFIGURATO'})\n` +
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

// Funzione per generare mock data in base all'endpoint
function getMockData(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Simula un delay di rete
    return new Promise((resolve) => {
        setTimeout(() => {
            if (endpoint === '/api/users' && options.method !== 'POST') {
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
            } else {
                // Per altri endpoint, restituisci array vuoto o oggetto vuoto
                resolve(Array.isArray(endpoint) ? [] : {});
            }
        }, 300); // Simula 300ms di delay
    });
}

