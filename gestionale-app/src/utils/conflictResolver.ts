/**
 * Utility per risolvere conflitti di modifica simultanea
 * Implementa merge intelligente basato su campi modificati
 */

export interface ConflictData {
    yourChanges: Record<string, any>;
    serverData: Record<string, any>;
    originalData?: Record<string, any>;
}

export interface ConflictResult {
    hasConflict: boolean;
    mergeableFields: string[];
    conflictingFields: string[];
    mergedData: Record<string, any>;
}

/**
 * Analizza i conflitti e determina quali campi possono essere merge automaticamente
 */
export function analyzeConflict(
    yourChanges: Record<string, any>,
    serverData: Record<string, any>,
    originalData?: Record<string, any>
): ConflictResult {
    const mergeableFields: string[] = [];
    const conflictingFields: string[] = [];
    const mergedData: Record<string, any> = { ...serverData };

    // Se non abbiamo dati originali, consideriamo tutti i campi come conflittuali
    if (!originalData) {
        Object.keys(yourChanges).forEach(key => {
            if (key !== 'version' && key !== 'id' && key !== 'createdAt') {
                conflictingFields.push(key);
            }
        });
        return {
            hasConflict: conflictingFields.length > 0,
            mergeableFields: [],
            conflictingFields,
            mergedData: serverData
        };
    }

    // Analizza ogni campo modificato
    Object.keys(yourChanges).forEach(key => {
        // Ignora campi di sistema
        if (key === 'version' || key === 'id' || key === 'createdAt' || key === 'updatedAt') {
            return;
        }

        const yourValue = yourChanges[key];
        const serverValue = serverData[key];
        const originalValue = originalData[key];

        // Se il valore originale non è definito, considera come nuovo campo
        if (originalValue === undefined) {
            if (yourValue !== serverValue) {
                conflictingFields.push(key);
            } else {
                mergeableFields.push(key);
                mergedData[key] = yourValue;
            }
            return;
        }

        // Se entrambi hanno modificato lo stesso campo
        if (yourValue !== originalValue && serverValue !== originalValue && yourValue !== serverValue) {
            conflictingFields.push(key);
        }
        // Se solo tu hai modificato
        else if (yourValue !== originalValue && serverValue === originalValue) {
            mergeableFields.push(key);
            mergedData[key] = yourValue;
        }
        // Se solo il server ha modificato
        else if (yourValue === originalValue && serverValue !== originalValue) {
            mergeableFields.push(key);
            mergedData[key] = serverValue; // Mantieni valore server
        }
        // Se entrambi hanno lo stesso valore
        else {
            mergeableFields.push(key);
            mergedData[key] = yourValue;
        }
    });

    return {
        hasConflict: conflictingFields.length > 0,
        mergeableFields,
        conflictingFields,
        mergedData
    };
}

/**
 * Determina se un conflitto può essere risolto automaticamente
 */
export function canAutoMerge(conflictResult: ConflictResult): boolean {
    return conflictResult.hasConflict && conflictResult.conflictingFields.length === 0;
}

/**
 * Formatta i nomi dei campi per la visualizzazione
 */
export function formatFieldName(field: string): string {
    const fieldMap: Record<string, string> = {
        name: 'Nome',
        clientId: 'Cliente',
        area: 'Area',
        status: 'Stato',
        contactPerson: 'Persona di Contatto',
        email: 'Email',
        phone: 'Telefono',
        type: 'Tipo',
        amount: 'Importo',
        date: 'Data',
        projectId: 'Progetto',
        description: 'Descrizione',
        priority: 'Priorità',
        assignedTo: 'Assegnato a'
    };

    return fieldMap[field] || field.charAt(0).toUpperCase() + field.slice(1);
}

