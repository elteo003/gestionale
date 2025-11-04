import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Activity, Settings, RefreshCw, Loader } from 'lucide-react';

interface DiagnosticsModalProps {
    type: 'api' | 'db';
    healthStatus: any;
    onClose: () => void;
}

export default function DiagnosticsModal({ type, healthStatus, onClose }: DiagnosticsModalProps) {
    const [testResults, setTestResults] = useState<any>(null);
    const [customApiUrl, setCustomApiUrl] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [connectionFlow, setConnectionFlow] = useState({
        frontend: 'pending' as 'pending' | 'checking' | 'success' | 'error',
        backend: 'pending' as 'pending' | 'checking' | 'success' | 'error',
        database: 'pending' as 'pending' | 'checking' | 'success' | 'error'
    });

    useEffect(() => {
        const getApiUrl = () => {
            const url = localStorage.getItem('customApiUrl') || import.meta.env.VITE_API_URL || 'http://localhost:3000';
            // Rimuovi trailing slash se presente
            return url.replace(/\/+$/, '');
        };
        setCustomApiUrl(getApiUrl());
    }, []);

    const runDiagnostics = async () => {
        setIsTesting(true);
        const results: any = {
            apiUrl: customApiUrl,
            timestamp: new Date().toISOString(),
            steps: []
        };

        // Step 1: Test Frontend → Backend (API)
        setConnectionFlow({ frontend: 'checking', backend: 'pending', database: 'pending' });
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            const startTime = Date.now();
            const response = await fetch(`${customApiUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(10000)
            });
            const responseTime = Date.now() - startTime;
            const data = await response.json();

            setConnectionFlow({ frontend: 'success', backend: 'checking', database: 'pending' });
            results.steps.push({
                step: 'Frontend → Backend',
                status: 'success',
                message: `API raggiungibile (${responseTime}ms)`,
                details: { status: response.status, responseTime }
            });

            // Step 2: Test Backend → Database
            await new Promise(resolve => setTimeout(resolve, 800));
            if (data.db === 'ok') {
                setConnectionFlow({ frontend: 'success', backend: 'success', database: 'success' });
                results.steps.push({
                    step: 'Backend → Database',
                    status: 'success',
                    message: 'Database connesso correttamente',
                    details: { dbStatus: data.db }
                });
            } else {
                setConnectionFlow({ frontend: 'success', backend: 'success', database: 'error' });
                results.steps.push({
                    step: 'Backend → Database',
                    status: 'error',
                    message: 'Errore connessione database',
                    details: { dbStatus: data.db, error: 'Il backend non riesce a connettersi al database' }
                });
            }
        } catch (error: any) {
            setConnectionFlow({ frontend: 'error', backend: 'pending', database: 'pending' });
            results.steps.push({
                step: 'Frontend → Backend',
                status: 'error',
                message: error.message || 'Errore di connessione',
                details: {
                    error: error.message,
                    possibleCauses: [
                        'Backend non avviato o non raggiungibile',
                        'URL API errato o non configurato',
                        'Problemi di rete o firewall',
                        'CORS non configurato correttamente'
                    ]
                }
            });
        }

        setTestResults(results);
        setIsTesting(false);
    };

    const saveApiUrl = () => {
        if (customApiUrl) {
            localStorage.setItem('customApiUrl', customApiUrl);
            alert('API URL salvato! Ricarica la pagina per applicare le modifiche.');
        }
    };

    const getStepIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-600" />;
            case 'checking':
                return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
            default:
                return <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>;
        }
    };

    const getStepColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'bg-green-100 border-green-300';
            case 'error':
                return 'bg-red-100 border-red-300';
            case 'checking':
                return 'bg-blue-100 border-blue-300';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-lg">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold mb-1">
                                {type === 'api' ? '🔍 Diagnostica API' : '🔍 Diagnostica Database'}
                            </h3>
                            <p className="text-indigo-100 text-sm">
                                Analisi dettagliata del flusso di connessione
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Flusso Connessione Animato */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            Flusso di Connessione
                        </h4>
                        <div className="flex items-center justify-between">
                            {/* Frontend */}
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all ${getStepColor(connectionFlow.frontend)}`}>
                                    {getStepIcon(connectionFlow.frontend)}
                                </div>
                                <p className="mt-2 text-sm font-medium text-gray-700">Frontend</p>
                                <p className="text-xs text-gray-500">Browser</p>
                            </div>

                            {/* Arrow 1 */}
                            <div className="flex-1 flex items-center justify-center px-4 relative">
                                <div className={`w-full h-1 rounded-full transition-all ${
                                    connectionFlow.frontend === 'success' 
                                        ? 'bg-green-400 animate-pulse' 
                                        : connectionFlow.frontend === 'error'
                                        ? 'bg-red-400'
                                        : 'bg-gray-300'
                                }`}></div>
                                <div className={`absolute ${connectionFlow.frontend === 'checking' ? 'animate-ping' : ''}`}>
                                    <svg className={`w-6 h-6 ${
                                        connectionFlow.frontend === 'success' ? 'text-green-500' :
                                        connectionFlow.frontend === 'error' ? 'text-red-500' :
                                        'text-gray-400'
                                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </div>
                            </div>

                            {/* Backend */}
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all ${getStepColor(connectionFlow.backend)}`}>
                                    {getStepIcon(connectionFlow.backend)}
                                </div>
                                <p className="mt-2 text-sm font-medium text-gray-700">Backend</p>
                                <p className="text-xs text-gray-500">API Server</p>
                            </div>

                            {/* Arrow 2 (solo per DB) */}
                            {type === 'db' && (
                                <>
                                    <div className="flex-1 flex items-center justify-center px-4 relative">
                                        <div className={`w-full h-1 rounded-full transition-all ${
                                            connectionFlow.backend === 'success' && connectionFlow.database === 'success'
                                                ? 'bg-green-400 animate-pulse' 
                                                : connectionFlow.database === 'error'
                                                ? 'bg-red-400'
                                                : 'bg-gray-300'
                                        }`}></div>
                                        <div className={`absolute ${connectionFlow.database === 'checking' ? 'animate-ping' : ''}`}>
                                            <svg className={`w-6 h-6 ${
                                                connectionFlow.database === 'success' ? 'text-green-500' :
                                                connectionFlow.database === 'error' ? 'text-red-500' :
                                                'text-gray-400'
                                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Database */}
                                    <div className="flex flex-col items-center flex-1">
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all ${getStepColor(connectionFlow.database)}`}>
                                            {getStepIcon(connectionFlow.database)}
                                        </div>
                                        <p className="mt-2 text-sm font-medium text-gray-700">Database</p>
                                        <p className="text-xs text-gray-500">PostgreSQL</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Configurazione API URL */}
                    <div className="bg-white border-2 border-indigo-200 rounded-lg p-6">
                        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Configurazione API URL
                        </h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    URL Backend API
                                </label>
                                <input
                                    type="text"
                                    value={customApiUrl}
                                    onChange={(e) => setCustomApiUrl(e.target.value)}
                                    placeholder="https://tuo-backend.onrender.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isTesting}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    URL attuale: {localStorage.getItem('customApiUrl') || import.meta.env.VITE_API_URL || 'http://localhost:3000'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={saveApiUrl}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    disabled={isTesting}
                                >
                                    Salva URL
                                </button>
                                <button
                                    onClick={runDiagnostics}
                                    disabled={isTesting}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isTesting ? (
                                        <>
                                            <Loader className="w-4 h-4 animate-spin" />
                                            Testando...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4" />
                                            Esegui Diagnostica
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Risultati Test */}
                    {testResults && (
                        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5" />
                                Risultati Test
                            </h4>
                            <div className="space-y-4">
                                {testResults.steps.map((step: any, index: number) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg border-2 transition-all ${
                                            step.status === 'success'
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-red-50 border-red-200'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {step.status === 'success' ? (
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                                    )}
                                                    <span className="font-semibold text-gray-800">{step.step}</span>
                                                </div>
                                                <p className={`text-sm ${step.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                                                    {step.message}
                                                </p>
                                                {step.details && (
                                                    <div className="mt-2 text-xs text-gray-600 bg-white/50 p-2 rounded">
                                                        <pre className="whitespace-pre-wrap">
                                                            {JSON.stringify(step.details, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                                {step.details?.possibleCauses && (
                                                    <div className="mt-3">
                                                        <p className="text-xs font-semibold text-gray-700 mb-1">Possibili cause:</p>
                                                        <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                                                            {step.details.possibleCauses.map((cause: string, i: number) => (
                                                                <li key={i}>{cause}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Informazioni Aggiuntive */}
                    {type === 'db' && healthStatus.db === 'error' && (
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
                            <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Suggerimenti per Database
                            </h4>
                            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                                <li>Verifica che il DATABASE_URL nel backend sia corretto</li>
                                <li>Controlla che il database PostgreSQL sia attivo su Render</li>
                                <li>Assicurati di usare la connection string "Pooled" (porta 6543) per Supabase</li>
                                <li>Verifica le credenziali del database</li>
                                <li>Controlla i log del backend per errori specifici</li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-lg flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
}

