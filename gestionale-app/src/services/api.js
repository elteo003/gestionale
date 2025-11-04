// Servizio API per comunicare con il backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Funzione helper per le chiamate API
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        
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
    } catch (error) {
        console.error('Errore API:', error);
        throw error;
    }
}

// Auth API
export const authAPI = {
    login: (email, password) => 
        apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),
    
    register: (userData) =>
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
    getById: (id) => apiCall(`/api/clients/${id}`),
    create: (client) =>
        apiCall('/api/clients', {
            method: 'POST',
            body: JSON.stringify(client),
        }),
    update: (id, client) =>
        apiCall(`/api/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(client),
        }),
    updateStatus: (id, status) =>
        apiCall(`/api/clients/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
    delete: (id) =>
        apiCall(`/api/clients/${id}`, {
            method: 'DELETE',
        }),
};

// Projects API
export const projectsAPI = {
    getAll: () => apiCall('/api/projects'),
    getById: (id) => apiCall(`/api/projects/${id}`),
    create: (project) =>
        apiCall('/api/projects', {
            method: 'POST',
            body: JSON.stringify(project),
        }),
    update: (id, project) =>
        apiCall(`/api/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(project),
        }),
    updateStatus: (id, status) =>
        apiCall(`/api/projects/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
    delete: (id) =>
        apiCall(`/api/projects/${id}`, {
            method: 'DELETE',
        }),
    addTodo: (projectId, todo) =>
        apiCall(`/api/projects/${projectId}/todos`, {
            method: 'POST',
            body: JSON.stringify(todo),
        }),
    toggleTodo: (projectId, todoId) =>
        apiCall(`/api/projects/${projectId}/todos/${todoId}/toggle`, {
            method: 'PATCH',
        }),
    deleteTodo: (projectId, todoId) =>
        apiCall(`/api/projects/${projectId}/todos/${todoId}`, {
            method: 'DELETE',
        }),
};

// Contracts API
export const contractsAPI = {
    getAll: () => apiCall('/api/contracts'),
    getById: (id) => apiCall(`/api/contracts/${id}`),
    create: (contract) =>
        apiCall('/api/contracts', {
            method: 'POST',
            body: JSON.stringify(contract),
        }),
    update: (id, contract) =>
        apiCall(`/api/contracts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(contract),
        }),
    updateStatus: (id, status) =>
        apiCall(`/api/contracts/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
    delete: (id) =>
        apiCall(`/api/contracts/${id}`, {
            method: 'DELETE',
        }),
};

// Events API
export const eventsAPI = {
    getAll: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.isCall !== undefined) params.append('isCall', filters.isCall);
        
        const query = params.toString();
        return apiCall(`/api/events${query ? `?${query}` : ''}`);
    },
    getById: (id) => apiCall(`/api/events/${id}`),
    getParticipants: (id) => apiCall(`/api/events/${id}/participants`),
    getMyUpcoming: () => apiCall('/api/events/my/upcoming'),
    create: (event) =>
        apiCall('/api/events', {
            method: 'POST',
            body: JSON.stringify(event),
        }),
    update: (id, event) =>
        apiCall(`/api/events/${id}`, {
            method: 'PUT',
            body: JSON.stringify(event),
        }),
    delete: (id) =>
        apiCall(`/api/events/${id}`, {
            method: 'DELETE',
        }),
    rsvp: (id, status) =>
        apiCall(`/api/events/${id}/rsvp`, {
            method: 'POST',
            body: JSON.stringify({ status }),
        }),
};

// Users API
export const usersAPI = {
    getAll: () => apiCall('/api/users'),
    getById: (id) => apiCall(`/api/users/${id}`),
};

