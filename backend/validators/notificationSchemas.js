import { z } from 'zod';

export const subscribeSchema = z.object({
    platform: z.enum(['web', 'desktop']),
    endpoint: z.string().url('endpoint non valido').max(2048),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
        p256dh: z.string().min(20).max(200),
        auth: z.string().min(8).max(200),
    }),
    userAgent: z.string().max(400).optional(),
});

export const unsubscribeSchema = z.object({
    endpoint: z.string().url('endpoint non valido').max(2048),
});

export const preferencesSchema = z.object({
    settings: z.object({
        'chat.message': z.boolean().optional(),
        'task.assigned': z.boolean().optional(),
        'event.invited': z.boolean().optional(),
        'chat.mentioned': z.boolean().optional(),
        'task.updated': z.boolean().optional(),
    }),
});
