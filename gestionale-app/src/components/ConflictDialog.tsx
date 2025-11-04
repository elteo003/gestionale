import { useState } from 'react';
import { AlertTriangle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { analyzeConflict, formatFieldName, ConflictData } from '../utils/conflictResolver';

interface ConflictDialogProps {
    isOpen: boolean;
    onClose: () => void;
    conflictData: ConflictData;
    entityType: 'progetto' | 'cliente' | 'contratto' | 'task';
    onResolve: (resolution: 'yours' | 'server' | 'merged', mergedData?: Record<string, any>) => void;
    onReload: () => void;
}

export default function ConflictDialog({
    isOpen,
    onClose,
    conflictData,
    entityType,
    onResolve,
    onReload
}: ConflictDialogProps) {
    const [selectedResolution, setSelectedResolution] = useState<'yours' | 'server' | 'merged' | null>(null);

    if (!isOpen) return null;

    const analysis = analyzeConflict(
        conflictData.yourChanges,
        conflictData.serverData,
        conflictData.originalData
    );

    const entityNameMap = {
        progetto: 'Progetto',
        cliente: 'Cliente',
        contratto: 'Contratto',
        task: 'Task'
    };

    const entityName = entityNameMap[entityType] || 'Record';

    const handleResolve = () => {
        if (!selectedResolution) return;

        if (selectedResolution === 'merged') {
            onResolve('merged', analysis.mergedData);
        } else {
            onResolve(selectedResolution);
        }
        setSelectedResolution(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                        <h2 className="text-2xl font-bold text-gray-900">
                            Conflitto di Modifica
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <p className="text-gray-700">
                            Il {entityName.toLowerCase()} è stato modificato da un altro utente mentre lo stavi modificando.
                            Scegli come risolvere il conflitto:
                        </p>
                    </div>

                    {/* Campi che possono essere merge automaticamente */}
                    {analysis.mergeableFields.length > 0 && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <h3 className="font-semibold text-green-900">Campi Merge Automatici</h3>
                            </div>
                            <p className="text-sm text-green-700 mb-2">
                                Questi campi sono stati modificati solo da te e possono essere merge automaticamente:
                            </p>
                            <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                                {analysis.mergeableFields.map(field => (
                                    <li key={field}>{formatFieldName(field)}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Campi in conflitto */}
                    {analysis.conflictingFields.length > 0 && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center space-x-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                <h3 className="font-semibold text-yellow-900">Campi in Conflitto</h3>
                            </div>
                            <p className="text-sm text-yellow-700 mb-3">
                                Questi campi sono stati modificati da entrambi. Scegli quale versione mantenere:
                            </p>
                            <div className="space-y-4">
                                {analysis.conflictingFields.map(field => (
                                    <div key={field} className="bg-white p-3 rounded border border-yellow-300">
                                        <div className="font-medium text-gray-900 mb-2">
                                            {formatFieldName(field)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <div className="text-gray-500 mb-1">Tua Modifica:</div>
                                                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                                    {String(conflictData.yourChanges[field] || 'N/A')}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500 mb-1">Versione Server:</div>
                                                <div className="bg-green-50 p-2 rounded border border-green-200">
                                                    {String(conflictData.serverData[field] || 'N/A')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Opzioni di risoluzione */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Come vuoi risolvere il conflitto?</h3>
                        <div className="space-y-3">
                            {/* Opzione 1: Mantieni le tue modifiche */}
                            <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                style={{ borderColor: selectedResolution === 'yours' ? '#3b82f6' : '#e5e7eb' }}>
                                <input
                                    type="radio"
                                    name="resolution"
                                    value="yours"
                                    checked={selectedResolution === 'yours'}
                                    onChange={() => setSelectedResolution('yours')}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">Mantieni le Mie Modifiche</div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        Sovrascrivi le modifiche del server con le tue modifiche
                                    </div>
                                </div>
                            </label>

                            {/* Opzione 2: Mantieni versione server */}
                            <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                style={{ borderColor: selectedResolution === 'server' ? '#3b82f6' : '#e5e7eb' }}>
                                <input
                                    type="radio"
                                    name="resolution"
                                    value="server"
                                    checked={selectedResolution === 'server'}
                                    onChange={() => setSelectedResolution('server')}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">Mantieni Versione Server</div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        Scarta le tue modifiche e mantieni la versione del server
                                    </div>
                                </div>
                            </label>

                            {/* Opzione 3: Merge intelligente */}
                            {analysis.conflictingFields.length === 0 && (
                                <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                    style={{ borderColor: selectedResolution === 'merged' ? '#3b82f6' : '#e5e7eb' }}>
                                    <input
                                        type="radio"
                                        name="resolution"
                                        value="merged"
                                        checked={selectedResolution === 'merged'}
                                        onChange={() => setSelectedResolution('merged')}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">Merge Automatico (Consigliato)</div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            Combina automaticamente le modifiche non conflittuali
                                        </div>
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Azioni */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <button
                            onClick={onReload}
                            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Ricarica Dati</span>
                        </button>
                        <div className="flex space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleResolve}
                                disabled={!selectedResolution}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                Applica Risoluzione
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

