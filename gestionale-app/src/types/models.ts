export interface User {
    id: string;
    name: string;
    email?: string;
    area?: string;
    role?: string;
    avatarUrl?: string | null;
    handle?: string | null;
    color?: string | null;
    permissions?: import('../lib/permissions').UserPermissions;
}

export interface Client {
    id: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    status: string;
    area?: string;
    version?: number;
}

export interface Project {
    id: string;
    name: string;
    clientId?: string;
    clientName?: string;
    area?: string;
    status: string;
    todos?: Todo[];
    version?: number;
}

export interface Todo {
    id: string;
    text: string;
    completed: boolean;
    priority: 'Bassa' | 'Media' | 'Alta';
}

export interface Contract {
    id: string;
    type: 'Contratto' | 'Fattura' | 'Preventivo';
    clientId?: string;
    projectId?: string;
    amount: number;
    status: string;
    date: string;
    version?: number;
}

export interface BoardColumn {
    id: string;
    projectId: string;
    name: string;
    accent: 'violet' | 'cyan' | 'pink' | 'emerald' | 'amber' | 'rose';
    position: number;
}

export interface Subtask {
    id: string;
    taskId: string;
    text: string;
    completed: boolean;
    position: number;
}

export interface Task {
    id: string;
    projectId: string;
    projectName?: string;
    columnId: string | null;
    columnName?: string;
    sprintId: string | null;
    sprintName?: string;
    title: string;
    description?: string | null;
    coverUrl?: string | null;
    priority: 'Bassa' | 'Media' | 'Alta';
    storyPoints: number;
    startDate?: string | null;
    dueDate?: string | null;
    position: number;
    subtasks: Subtask[];
    assignees: User[];
    createdAt?: string;
}

export interface Sprint {
    id: string;
    projectId: string | null;
    name: string;
    goal?: string | null;
    startDate: string;
    endDate: string;
    targetPoints: number;
    completedPoints: number;
    status: 'planned' | 'active' | 'closed';
}

export interface Activity {
    id: string;
    actorId: string | null;
    actorName?: string | null;
    actorAvatar?: string | null;
    actorHandle?: string | null;
    actorColor?: string | null;
    type: string;
    targetType?: string | null;
    targetId?: string | null;
    projectId?: string | null;
    payload?: Record<string, any> | null;
    createdAt: string;
}

export interface TimeEntrySummary {
    id: string;
    name: string;
    avatarUrl?: string | null;
    handle?: string | null;
    color?: string | null;
    totalHours: number;
    entryCount: number;
}

export interface Chat {
    id: string;
    projectId?: string | null;
    name?: string | null;
    isGroup: boolean;
    updatedAt: string;
    lastMessage?: {
        id: string;
        body: string;
        senderId: string;
        senderName?: string;
        createdAt: string;
    } | null;
}

export interface MessageReply {
    id: string;
    author: string;
    text: string;
}

export interface MessageCitation {
    id: string;
    title?: string | null;
    url?: string | null;
    projectName?: string | null;
    allowed: boolean;
}

export interface CitableDocument {
    id: string;
    title: string;
    url: string;
    projectId: string;
    projectName: string;
    area?: string | null;
}

export interface MessageMention {
    id: string;
    name: string;
    handle?: string | null;
    color?: string | null;
    avatarUrl?: string | null;
}

export interface Message {
    id: string;
    chatId: string;
    senderId: string | null;
    senderName?: string | null;
    senderAvatar?: string | null;
    senderHandle?: string | null;
    senderColor?: string | null;
    body: string;
    createdAt: string;
    reply?: MessageReply | null;
    citation?: MessageCitation | null;
    mentions?: MessageMention[];
}
