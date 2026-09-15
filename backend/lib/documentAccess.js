import { canAccessProjectInArea, isPrivileged, isSocio } from './roles.js';
import { isUserAssignedToProject } from './projectAccess.js';

/** Visibilità sincrono quando hai già l'area del progetto (lettura messaggi). */
export function canSeeProjectArea(user, projectArea) {
    if (!user) return false;
    if (isPrivileged(user.role)) return true;
    if (isSocio(user.role)) return false;
    return canAccessProjectInArea(user, projectArea);
}

export async function userCanSeeProject(user, projectId, projectArea) {
    if (!user || !projectId) return false;
    if (isPrivileged(user.role)) return true;
    if (isSocio(user.role)) return isUserAssignedToProject(user.userId, projectId);
    return canAccessProjectInArea(user, projectArea);
}

export function redactCitation(user, row) {
    if (!row?.resourceId) return null;
    const allowed = canSeeProjectArea(user, row.resourceArea);
    if (!allowed) {
        return {
            id: row.resourceId,
            title: null,
            url: null,
            projectName: null,
            allowed: false,
        };
    }
    return {
        id: row.resourceId,
        title: row.resourceTitle || 'Documento',
        url: row.resourceUrl || null,
        projectName: row.resourceProject || null,
        allowed: true,
    };
}

export function shapeReply(row) {
    if (!row?.replyId) return null;
    return {
        id: row.replyId,
        author: row.replyAuthor || 'Qualcuno',
        text: row.replyBody || '',
    };
}

function parseMentions(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

export function shapeMessage(row, user) {
    return {
        id: row.id,
        chatId: row.chatId,
        senderId: row.senderId,
        senderName: row.senderName,
        senderAvatar: row.senderAvatar,
        senderHandle: row.senderHandle,
        senderColor: row.senderColor,
        body: row.body || '',
        createdAt: row.createdAt,
        reply: shapeReply(row),
        citation: redactCitation(user, row),
        mentions: parseMentions(row.mentions),
    };
}
