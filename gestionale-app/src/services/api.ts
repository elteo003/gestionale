/**
 * Client API verso il backend. Mock in `lib/api/mock.ts` (solo dev, import dinamico).
 */
import {
    apiCall as httpCall,
    getApiUrl,
    getWsUrl,
    getSectionFromEndpoint,
    shouldUseMockData,
    ConcurrentModificationError,
} from '../lib/api/client';

export { getApiUrl, getWsUrl, ConcurrentModificationError };

if (import.meta.env.DEV) {
    console.log('API URL:', getApiUrl());
}

type MockFn = (endpoint: string, options: RequestInit) => Promise<unknown>;
let mockFn: MockFn | null = null;

async function loadMock(): Promise<MockFn> {
    if (!mockFn) {
        const mod = await import('../lib/api/mock');
        mockFn = mod.getMockData;
    }
    return mockFn;
}

async function apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!import.meta.env.PROD && !endpoint.includes('/api/auth')) {
        const section = getSectionFromEndpoint(endpoint);
        if (shouldUseMockData(section, endpoint)) {
            const mock = await loadMock();
            return mock(endpoint, options);
        }
    }
    return httpCall(endpoint, options);
}

// Auth API
export const authAPI = {
    login: (email: string, password: string) => 
        apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),
    
    register: (userData: {
        name: string;
        email: string;
        password: string;
        area?: string;
        managerCode?: string;
    }) =>
        apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        }),
    
    verify: () =>
        apiCall('/api/auth/verify'),

    refresh: () =>
        apiCall('/api/auth/refresh', { method: 'POST' }),

    logout: () =>
        apiCall('/api/auth/logout', { method: 'POST' }),
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
    getResources: (projectId: string) =>
        apiCall(`/api/projects/${projectId}/resources`),
    addResource: (projectId: string, resource: { title: string; url: string }) =>
        apiCall(`/api/projects/${projectId}/resources`, {
            method: 'POST',
            body: JSON.stringify(resource),
        }),
    removeResource: (projectId: string, resourceId: string) =>
        apiCall(`/api/projects/${projectId}/resources/${resourceId}`, {
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
    // Reports
    getReports: (eventId: string) => apiCall(`/api/events/${eventId}/reports`),
    createReport: (eventId: string, reportContent: string) =>
        apiCall(`/api/events/${eventId}/reports`, {
            method: 'POST',
            body: JSON.stringify({ reportContent }),
        }),
    updateReport: (eventId: string, reportId: string, reportContent: string) =>
        apiCall(`/api/events/${eventId}/reports/${reportId}`, {
            method: 'PUT',
            body: JSON.stringify({ reportContent }),
        }),
    deleteReport: (eventId: string, reportId: string) =>
        apiCall(`/api/events/${eventId}/reports/${reportId}`, {
            method: 'DELETE',
        }),
};

// Polls API
export const candidatesAPI = {
    getAll: (filters?: { area?: string; status?: string }) => 
        apiCall(`/api/candidates${filters ? '?' + new URLSearchParams(filters as any).toString() : ''}`),
    getById: (id: string) => apiCall(`/api/candidates/${id}`),
    create: (data: any) => apiCall('/api/candidates', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiCall(`/api/candidates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    delete: (id: string) => apiCall(`/api/candidates/${id}`, {
        method: 'DELETE',
    }),
};

export const onboardingAPI = {
    start: (candidateId: string) => apiCall('/api/onboarding/start', {
        method: 'POST',
        body: JSON.stringify({ candidateId }),
    }),
};

export const pollsAPI = {
    getAll: (filters: any = {}) => {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.creatorId) params.append('creatorId', filters.creatorId);
        const query = params.toString();
        return apiCall(`/api/polls${query ? `?${query}` : ''}`);
    },
    getById: (id: string) => apiCall(`/api/polls/${id}`),
    create: (poll: any) =>
        apiCall('/api/polls', {
            method: 'POST',
            body: JSON.stringify(poll),
        }),
    vote: (id: string, slotIds: string[]) =>
        apiCall(`/api/polls/${id}/vote`, {
            method: 'POST',
            body: JSON.stringify({ slotIds }),
        }),
    submitAvailability: (id: string, slots: string[]) =>
        apiCall(`/api/polls/${id}/availability`, {
            method: 'POST',
            body: JSON.stringify({ slots }),
        }),
    heatmap: (id: string) => apiCall(`/api/polls/${id}/heatmap`),
    organize: (id: string, data: any) =>
        apiCall(`/api/polls/${id}/organize`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    close: (id: string) =>
        apiCall(`/api/polls/${id}/close`, {
            method: 'POST',
        }),
};

// Users API
export const usersAPI = {
    getAll: () => apiCall('/api/users'),
    getMe: () => apiCall('/api/users/me'),
    updateMe: (data: any) =>
        apiCall('/api/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
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

// Tasks API (board / Kanban)
export const tasksAPI = {
    getAll: (filters: { projectId?: string; columnId?: string; sprintId?: string } = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
        const q = params.toString();
        return apiCall(`/api/tasks${q ? `?${q}` : ''}`);
    },
    getById: (id: string) => apiCall(`/api/tasks/${id}`),
    create: (task: any) =>
        apiCall('/api/tasks', { method: 'POST', body: JSON.stringify(task) }),
    update: (id: string, task: any) =>
        apiCall(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }),
    move: (id: string, columnId: string, position?: number) =>
        apiCall(`/api/tasks/${id}/move`, {
            method: 'PATCH',
            body: JSON.stringify({ columnId, position }),
        }),
    delete: (id: string) =>
        apiCall(`/api/tasks/${id}`, { method: 'DELETE' }),
    addSubtask: (taskId: string, text: string, position = 0) =>
        apiCall(`/api/tasks/${taskId}/subtasks`, {
            method: 'POST', body: JSON.stringify({ text, position }),
        }),
    toggleSubtask: (taskId: string, subtaskId: string) =>
        apiCall(`/api/tasks/${taskId}/subtasks/${subtaskId}/toggle`, { method: 'PATCH' }),
    deleteSubtask: (taskId: string, subtaskId: string) =>
        apiCall(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' }),
    addAssignee: (taskId: string, userId: string) =>
        apiCall(`/api/tasks/${taskId}/assignees`, {
            method: 'POST', body: JSON.stringify({ userId }),
        }),
    removeAssignee: (taskId: string, userId: string) =>
        apiCall(`/api/tasks/${taskId}/assignees/${userId}`, { method: 'DELETE' }),
    getColumns: (projectId: string) =>
        apiCall(`/api/tasks/columns/by-project/${projectId}`),
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

// Sprints API
export const sprintsAPI = {
    getAll: (filters: { projectId?: string; status?: string } = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
        const q = params.toString();
        return apiCall(`/api/sprints${q ? `?${q}` : ''}`);
    },
    getActive: (projectId?: string) =>
        apiCall(`/api/sprints/active${projectId ? `?projectId=${projectId}` : ''}`),
    create: (sprint: any) =>
        apiCall('/api/sprints', { method: 'POST', body: JSON.stringify(sprint) }),
    update: (id: string, sprint: any) =>
        apiCall(`/api/sprints/${id}`, { method: 'PUT', body: JSON.stringify(sprint) }),
    delete: (id: string) =>
        apiCall(`/api/sprints/${id}`, { method: 'DELETE' }),
};

// Activities API
export const activitiesAPI = {
    getAll: (filters: { projectId?: string; limit?: number } = {}) => {
        const params = new URLSearchParams();
        if (filters.projectId) params.append('projectId', filters.projectId);
        if (filters.limit) params.append('limit', String(filters.limit));
        const q = params.toString();
        return apiCall(`/api/activities${q ? `?${q}` : ''}`);
    },
    create: (activity: any) =>
        apiCall('/api/activities', { method: 'POST', body: JSON.stringify(activity) }),
};

// Time entries API
export const timeAPI = {
    getAll: (filters: any = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => v && params.append(k, String(v)));
        const q = params.toString();
        return apiCall(`/api/time-entries${q ? `?${q}` : ''}`);
    },
    summary: (period: 'week' | 'month' | 'year' = 'month') =>
        apiCall(`/api/time-entries/summary?period=${period}`),
    create: (entry: any) =>
        apiCall('/api/time-entries', { method: 'POST', body: JSON.stringify(entry) }),
    delete: (id: string) =>
        apiCall(`/api/time-entries/${id}`, { method: 'DELETE' }),
};

// Messages / Chat API
export const messagesAPI = {
    getChats: () => apiCall('/api/chats'),
    getMessages: (chatId: string, opts?: { after?: string; before?: string; limit?: number }) => {
        const q = new URLSearchParams();
        if (opts?.after) q.set('after', opts.after);
        if (opts?.before) q.set('before', opts.before);
        if (opts?.limit) q.set('limit', String(opts.limit));
        const qs = q.toString();
        return apiCall(`/api/chats/${chatId}/messages${qs ? `?${qs}` : ''}`);
    },
    sendMessage: (
        chatId: string,
        body: string,
        extra?: {
            replyToId?: string | null;
            citedResourceId?: string | null;
            mentionIds?: string[];
        },
    ) =>
        apiCall(`/api/chats/${chatId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                body,
                replyToId: extra?.replyToId || undefined,
                citedResourceId: extra?.citedResourceId || undefined,
                mentionIds: extra?.mentionIds?.length ? extra.mentionIds : undefined,
            }),
        }),
    getDocuments: (chatId: string, q?: string) => {
        const qs = q ? `?q=${encodeURIComponent(q)}` : '';
        return apiCall(`/api/chats/${chatId}/documents${qs}`);
    },
    getMembers: (chatId: string) => apiCall(`/api/chats/${chatId}/members`),
    createChat: (data: { name?: string; projectId?: string; memberIds?: string[] }) =>
        apiCall('/api/chats', { method: 'POST', body: JSON.stringify(data) }),
};

export const notificationsAPI = {
    vapidPublicKey: () => apiCall('/api/push/vapid-public-key'),
    subscribePush: (body: {
        platform: 'web' | 'desktop';
        endpoint: string;
        expirationTime?: number | null;
        keys: { p256dh: string; auth: string };
    }) => apiCall('/api/push/subscribe', { method: 'POST', body: JSON.stringify(body) }),
    unsubscribePush: (endpoint: string) =>
        apiCall('/api/push/subscribe', {
            method: 'DELETE',
            body: JSON.stringify({ endpoint }),
        }),
    list: (opts?: { unread?: boolean; limit?: number }) => {
        const q = new URLSearchParams();
        if (opts?.unread) q.set('unread', '1');
        if (opts?.limit) q.set('limit', String(opts.limit));
        const qs = q.toString();
        return apiCall(`/api/notifications${qs ? `?${qs}` : ''}`);
    },
    unreadCount: () => apiCall('/api/notifications/unread-count'),
    markRead: (id: string) =>
        apiCall(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () =>
        apiCall('/api/notifications/read-all', { method: 'POST' }),
};
