/**
 * Helper per gestire update con optimistic locking e risoluzione conflitti
 */

import { ConflictData } from './conflictResolver';

export interface UpdateOptions {
    entityId: string;
    entityType: 'progetto' | 'cliente' | 'contratto' | 'task';
    currentVersion: number | undefined;
    updateData: Record<string, any>;
    updateFunction: (data: any, version?: number) => Promise<any>;
    originalData?: Record<string, any>;
    onConflict?: (conflictData: ConflictData) => void;
}

/**
 * Esegue un update con gestione automatica dei conflitti
 */
export async function updateWithConflictHandling(options: UpdateOptions): Promise<any> {
    const {
        entityId,
        entityType,
        currentVersion,
        updateData,
        updateFunction,
        originalData,
        onConflict
    } = options;

    try {
        // Includi la version se disponibile
        const dataWithVersion = currentVersion !== undefined
            ? { ...updateData, expectedVersion: currentVersion }
            : updateData;

        // Esegui l'update
        return await updateFunction(dataWithVersion, currentVersion);
    } catch (error: any) {
        // Se è un errore di conflitto, gestiscilo
        if (error.name === 'ConcurrentModificationError' && error.conflictData) {
            const conflictData: ConflictData = {
                yourChanges: updateData,
                serverData: error.conflictData.serverData,
                originalData: originalData
            };

            // Se c'è un callback, chiamalo
            if (onConflict) {
                onConflict(conflictData);
            }

            // Rilancia l'errore per permettere al chiamante di gestirlo
            throw error;
        }

        // Rilancia altri errori
        throw error;
    }
}

