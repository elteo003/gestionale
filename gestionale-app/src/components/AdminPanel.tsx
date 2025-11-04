import { useState, useEffect } from 'react';
import { Users, Activity, Database, Settings, Trash2, Edit2, Key, Power, PowerOff, Plus, X, AlertCircle, CheckCircle, RefreshCw, Wifi, WifiOff, Server, Loader } from 'lucide-react';
import DiagnosticsModal from './DiagnosticsModal';

// Mock data per testing
const MOCK_USERS = [
    { id: '1', name: 'Admin Test', email: 'admin@test.com', area: 'IT', role: 'Admin', is_active: true, last_seen: new Date().toISOString() },
    { id: '2', name: 'User Test', email: 'user@test.com', area: 'Marketing', role: 'Socio', is_active: true, last_seen: new Date(Date.now() - 2 * 60000).toISOString() },
];

const MOCK_ONLINE_USERS = [
    { id: '1', name: 'Admin Test', email: 'admin@test.com', area: 'IT', role: 'Admin', last_seen: new Date().toISOString() },
];

interface AdminPanelProps {
    user: any;
}

export default function AdminPanel({ user }: AdminPanelProps) {
    const [activeTab, setActiveTab] = useState<'users' | 'health' | 'mock' | 'online'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [healthStatus, setHealthStatus] = useState<{ api: 'ok' | 'error', db: 'ok' | 'error', lastCheck?: string }>({ api: 'ok', db: 'ok' });
    const [useMockData, setUseMockData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState(false);
    const [diagnosticsType, setDiagnosticsType] = useState<'api' | 'db' | null>(null);

    // Carica stato mock data da localStorage
    useEffect(() => {
        const mockDataEnabled = localStorage.getItem('useMockData') === 'true';
        setUseMockData(mockDataEnabled);
    }, []);

    // Health check polling
    useEffect(() => {
        const getApiUrl = () => {
            return localStorage.getItem('customApiUrl') || import.meta.env.VITE_API_URL || 'http://localhost:3000';
        };

        const checkHealth = async () => {
            try {
                const apiUrl = getApiUrl();
                const startTime = Date.now();
                const response = await fetch(`${apiUrl}/health`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(5000) // Timeout 5 secondi
                });
                const responseTime = Date.now() - startTime;
                const data = await response.json();
                setHealthStatus({
                    api: response.ok ? 'ok' : 'error',
                    db: data.db || 'ok',
                    lastCheck: new Date().toISOString(),
                    responseTime
                });
            } catch (error: any) {
                setHealthStatus({ 
                    api: 'error', 
                    db: 'error',
                    lastCheck: new Date().toISOString(),
                    error: error.message || 'Errore sconosciuto'
                });
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Ogni 30 secondi

        return () => clearInterval(interval);
    }, []);

    // Carica utenti
    useEffect(() => {
        loadUsers();
        loadOnlineUsers();
    }, [useMockData]);

    const loadUsers = async () => {
        if (useMockData) {
            setUsers(MOCK_USERS);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                setError('Errore nel caricamento degli utenti');
            }
        } catch (error) {
            setError('Errore di connessione');
        } finally {
            setLoading(false);
        }
    };

    const loadOnlineUsers = async () => {
        if (useMockData) {
            setOnlineUsers(MOCK_ONLINE_USERS);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/online`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setOnlineUsers(data);
            }
        } catch (error) {
            console.error('Errore caricamento utenti online:', error);
        }
    };

    const handleToggleMockData = (enabled: boolean) => {
        setUseMockData(enabled);
        localStorage.setItem('useMockData', enabled ? 'true' : 'false');
        // Ricarica dati
        loadUsers();
        loadOnlineUsers();
    };

    const handleCreateUser = async (userData: any) => {
        if (useMockData) {
            const newUser = { ...userData, id: Date.now().toString(), is_active: true, created_at: new Date().toISOString() };
            setUsers([...users, newUser]);
            setIsCreateModalOpen(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                loadUsers();
                setIsCreateModalOpen(false);
            } else {
                const error = await response.json();
                setError(error.error || 'Errore nella creazione');
            }
        } catch (error) {
            setError('Errore di connessione');
        }
    };

    const handleUpdateUser = async (userId: string, updates: any) => {
        if (useMockData) {
            setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
            setIsEditModalOpen(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                loadUsers();
                setIsEditModalOpen(false);
            } else {
                const error = await response.json();
                setError(error.error || 'Errore nell\'aggiornamento');
            }
        } catch (error) {
            setError('Errore di connessione');
        }
    };

    const handleResetPassword = async (userId: string) => {
        const newPassword = prompt('Inserisci la nuova password (min 6 caratteri):');
        if (!newPassword || newPassword.length < 6) {
            alert('Password non valida');
            return;
        }

        if (useMockData) {
            alert('Password reimpostata (Mock Mode)');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${userId}/reset-password`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword })
            });

            if (response.ok) {
                alert('Password reimpostata con successo');
            } else {
                const error = await response.json();
                alert(error.error || 'Errore nella reimpostazione');
            }
        } catch (error) {
            alert('Errore di connessione');
        }
    };

    const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
        if (useMockData) {
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isActive: !currentStatus })
            });

            if (response.ok) {
                loadUsers();
            } else {
                const error = await response.json();
                alert(error.error || 'Errore nella modifica');
            }
        } catch (error) {
            alert('Errore di connessione');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Pannello Amministrazione</h2>
                {error && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Users className="w-5 h-5 inline mr-2" />
                        Gestione Utenti
                    </button>
                    <button
                        onClick={() => setActiveTab('health')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'health' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Activity className="w-5 h-5 inline mr-2" />
                        Stato Sistema
                    </button>
                    <button
                        onClick={() => setActiveTab('online')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'online' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Users className="w-5 h-5 inline mr-2" />
                        Utenti Connessi
                    </button>
                    <button
                        onClick={() => setActiveTab('mock')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'mock' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Settings className="w-5 h-5 inline mr-2" />
                        Modalità Sviluppo
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'users' && (
                    <UsersManagement
                        users={users}
                        loading={loading}
                        onCreateClick={() => setIsCreateModalOpen(true)}
                        onEditClick={(user) => {
                            setSelectedUser(user);
                            setIsEditModalOpen(true);
                        }}
                        onResetPassword={handleResetPassword}
                        onToggleStatus={handleToggleUserStatus}
                    />
                )}

                {activeTab === 'health' && (
                    <HealthCheck 
                        healthStatus={healthStatus} 
                        onDiagnosticsClick={(type: 'api' | 'db') => {
                            setDiagnosticsType(type);
                            setDiagnosticsModalOpen(true);
                        }}
                    />
                )}

                {activeTab === 'online' && (
                    <OnlineUsers users={onlineUsers} />
                )}

                {activeTab === 'mock' && (
                    <MockDataSettings useMockData={useMockData} onToggle={handleToggleMockData} />
                )}
            </div>

            {/* Modali */}
            {isCreateModalOpen && (
                <CreateUserModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={handleCreateUser}
                />
            )}

            {isEditModalOpen && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedUser(null);
                    }}
                    onSubmit={(updates) => handleUpdateUser(selectedUser.id, updates)}
                />
            )}

            {diagnosticsModalOpen && diagnosticsType && (
                <DiagnosticsModal
                    type={diagnosticsType}
                    healthStatus={healthStatus}
                    onClose={() => {
                        setDiagnosticsModalOpen(false);
                        setDiagnosticsType(null);
                    }}
                />
            )}
        </div>
    );
}

// Componente Gestione Utenti
function UsersManagement({ users, loading, onCreateClick, onEditClick, onResetPassword, onToggleStatus }: any) {
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Elenco Utenti</h3>
                <button
                    onClick={onCreateClick}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Crea Nuovo Utente
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">Caricamento...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Area</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ruolo</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Stato</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user: any) => (
                                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3">{user.name}</td>
                                    <td className="px-4 py-3">{user.email}</td>
                                    <td className="px-4 py-3">{user.area || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {user.is_active !== false ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Attivo</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Disattivato</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => onEditClick(user)}
                                                className="p-1 text-blue-600 hover:text-blue-800"
                                                title="Modifica"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onResetPassword(user.id)}
                                                className="p-1 text-yellow-600 hover:text-yellow-800"
                                                title="Reimposta Password"
                                            >
                                                <Key className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onToggleStatus(user.id, user.is_active !== false)}
                                                className={`p-1 ${user.is_active !== false ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                                                title={user.is_active !== false ? 'Disattiva' : 'Attiva'}
                                            >
                                                {user.is_active !== false ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Componente Health Check
function HealthCheck({ healthStatus, onDiagnosticsClick }: any) {
    const getApiUrl = () => {
        return localStorage.getItem('customApiUrl') || import.meta.env.VITE_API_URL || 'http://localhost:3000';
    };

    const formatLastCheck = () => {
        if (!healthStatus.lastCheck) return 'Mai controllato';
        const lastCheck = new Date(healthStatus.lastCheck);
        const secondsAgo = Math.floor((Date.now() - lastCheck.getTime()) / 1000);
        if (secondsAgo < 60) return `${secondsAgo}s fa`;
        return `${Math.floor(secondsAgo / 60)}m fa`;
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Stato del Sistema</h3>
                    <button
                        onClick={() => {
                            // Trigger manual health check
                            window.location.reload();
                        }}
                        className="flex items-center px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Aggiorna
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* API Status Card */}
                    <div 
                        className={`relative flex items-center justify-between p-5 rounded-lg border-2 transition-all cursor-pointer hover:shadow-lg ${
                            healthStatus.api === 'ok' 
                                ? 'bg-green-50 border-green-200 hover:border-green-300' 
                                : 'bg-red-50 border-red-200 hover:border-red-300 animate-shake'
                        }`}
                        onClick={() => onDiagnosticsClick('api')}
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Server className={`w-5 h-5 ${healthStatus.api === 'ok' ? 'text-green-600' : 'text-red-600'}`} />
                                <p className="font-semibold text-gray-800">Stato API</p>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">Frontend ➔ Backend</p>
                            <p className="text-xs text-gray-500">Ultimo check: {formatLastCheck()}</p>
                            {healthStatus.responseTime && (
                                <p className="text-xs text-gray-500 mt-1">Tempo risposta: {healthStatus.responseTime}ms</p>
                            )}
                        </div>
                        <div className="flex flex-col items-center space-y-2 ml-4">
                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center ${
                                healthStatus.api === 'ok' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                                {healthStatus.api === 'ok' ? (
                                    <>
                                        <div className="absolute w-12 h-12 rounded-full bg-green-400 animate-ping opacity-75"></div>
                                        <CheckCircle className="w-6 h-6 text-green-600 relative z-10" />
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute w-12 h-12 rounded-full bg-red-400 animate-pulse opacity-75"></div>
                                        <AlertCircle className="w-6 h-6 text-red-600 relative z-10 animate-bounce" />
                                    </>
                                )}
                            </div>
                            <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                healthStatus.api === 'ok' 
                                    ? 'bg-green-200 text-green-800' 
                                    : 'bg-red-200 text-red-800 animate-pulse'
                            }`}>
                                {healthStatus.api === 'ok' ? 'OK' : 'ERROR'}
                            </span>
                        </div>
                        {healthStatus.api === 'error' && (
                            <div className="absolute top-2 right-2">
                                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">
                                    Clicca per diagnosticare
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Database Status Card */}
                    <div 
                        className={`relative flex items-center justify-between p-5 rounded-lg border-2 transition-all cursor-pointer hover:shadow-lg ${
                            healthStatus.db === 'ok' 
                                ? 'bg-green-50 border-green-200 hover:border-green-300' 
                                : 'bg-red-50 border-red-200 hover:border-red-300 animate-shake'
                        }`}
                        onClick={() => onDiagnosticsClick('db')}
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Database className={`w-5 h-5 ${healthStatus.db === 'ok' ? 'text-green-600' : 'text-red-600'}`} />
                                <p className="font-semibold text-gray-800">Stato Database</p>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">Backend ➔ Database</p>
                            <p className="text-xs text-gray-500">Ultimo check: {formatLastCheck()}</p>
                        </div>
                        <div className="flex flex-col items-center space-y-2 ml-4">
                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center ${
                                healthStatus.db === 'ok' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                                {healthStatus.db === 'ok' ? (
                                    <>
                                        <div className="absolute w-12 h-12 rounded-full bg-green-400 animate-ping opacity-75"></div>
                                        <CheckCircle className="w-6 h-6 text-green-600 relative z-10" />
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute w-12 h-12 rounded-full bg-red-400 animate-pulse opacity-75"></div>
                                        <AlertCircle className="w-6 h-6 text-red-600 relative z-10 animate-bounce" />
                                    </>
                                )}
                            </div>
                            <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                healthStatus.db === 'ok' 
                                    ? 'bg-green-200 text-green-800' 
                                    : 'bg-red-200 text-red-800 animate-pulse'
                            }`}>
                                {healthStatus.db === 'ok' ? 'OK' : 'ERROR'}
                            </span>
                        </div>
                        {healthStatus.db === 'error' && (
                            <div className="absolute top-2 right-2">
                                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">
                                    Clicca per diagnosticare
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Componente Utenti Online
function OnlineUsers({ users }: any) {
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Visti di Recente (Ultimi 5 Minuti)
            </h3>
            {users.length === 0 ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">Nessun utente connesso</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {users.map((user: any, index: number) => {
                        const lastSeen = new Date(user.last_seen);
                        const minutesAgo = Math.floor((new Date().getTime() - lastSeen.getTime()) / 60000);
                        const secondsAgo = Math.floor((new Date().getTime() - lastSeen.getTime()) / 1000);
                        const timeAgo = secondsAgo < 60 ? `${secondsAgo}s fa` : `${minutesAgo}m fa`;
                        
                        return (
                            <div 
                                key={user.id} 
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-gray-50 rounded-lg border-2 border-green-200 hover:shadow-md transition-all animate-fadeIn"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-300">
                                            <span className="text-indigo-600 font-semibold text-lg">
                                                {user.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{user.name}</p>
                                        <p className="text-sm text-gray-600">{user.email}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {user.area} • {user.role}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                                        <span className="text-xs font-semibold text-green-600">Online</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{timeAgo}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Componente Mock Data Settings
function MockDataSettings({ useMockData, onToggle }: any) {
    const [mockSections, setMockSections] = useState({
        dashboard: false,
        clients: false,
        projects: false,
        contracts: false,
        events: false
    });

    useEffect(() => {
        // Carica configurazione mock sections da localStorage
        const saved = localStorage.getItem('mockDataSections');
        if (saved) {
            try {
                setMockSections(JSON.parse(saved));
            } catch (e) {
                console.error('Errore caricamento mock sections:', e);
            }
        }
    }, []);

    const handleSectionToggle = (section: keyof typeof mockSections) => {
        const newSections = {
            ...mockSections,
            [section]: !mockSections[section]
        };
        setMockSections(newSections);
        localStorage.setItem('mockDataSections', JSON.stringify(newSections));
    };

    const handleGlobalToggle = (enabled: boolean) => {
        onToggle(enabled);
        if (!enabled) {
            // Se disattiva globale, resetta tutte le sezioni
            setMockSections({
                dashboard: false,
                clients: false,
                projects: false,
                contracts: false,
                events: false
            });
            localStorage.setItem('mockDataSections', JSON.stringify({
                dashboard: false,
                clients: false,
                projects: false,
                contracts: false,
                events: false
            }));
        }
    };

    const sectionLabels = {
        dashboard: { label: 'Dashboard', icon: '📊', description: 'Statistiche e KPI fittizi' },
        clients: { label: 'Clienti', icon: '👥', description: 'Lista clienti simulati' },
        projects: { label: 'Progetti', icon: '💼', description: 'Progetti e todo list fittizi' },
        contracts: { label: 'Contabilità', icon: '💰', description: 'Contratti e fatture simulate' },
        events: { label: 'Eventi/Calendario', icon: '📅', description: 'Eventi e chiamate fittizie' }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Modalità Sviluppo
            </h3>
            
            {/* Toggle Globale */}
            <div className={`flex items-center justify-between p-6 rounded-lg border-2 transition-all mb-6 ${
                useMockData 
                    ? 'bg-yellow-50 border-yellow-300 shadow-lg' 
                    : 'bg-gray-50 border-gray-200'
            }`}>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-lg">Attiva Modalità Mock Data</p>
                        {useMockData && (
                            <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full animate-pulse">
                                ATTIVO
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600">
                        Attiva la modalità mock per abilitare la selezione di dati fittizi per sezione.
                        Scegli quali sezioni usare con dati simulati.
                    </p>
                </div>
                <button
                    onClick={() => handleGlobalToggle(!useMockData)}
                    className={`ml-6 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
                        useMockData
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-md'
                            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                >
                    {useMockData ? 'ON' : 'OFF'}
                </button>
            </div>

            {/* Sezioni Mock Configurabili */}
            {useMockData && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="mb-4">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Seleziona Sezioni con Mock Data
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                            Seleziona quali sezioni devono usare dati fittizi invece di contattare il backend.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(Object.keys(sectionLabels) as Array<keyof typeof sectionLabels>).map((section) => {
                            const config = sectionLabels[section];
                            const isActive = mockSections[section];
                            return (
                                <div
                                    key={section}
                                    className={`p-4 rounded-lg border-2 transition-all ${
                                        isActive
                                            ? 'bg-green-50 border-green-300'
                                            : 'bg-gray-50 border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-2xl">{config.icon}</span>
                                                <span className="font-semibold text-gray-800">{config.label}</span>
                                                {isActive && (
                                                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                                                        ATTIVO
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1">{config.description}</p>
                                        </div>
                                        <button
                                            onClick={() => handleSectionToggle(section)}
                                            className={`ml-4 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                                isActive
                                                    ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                                                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                            }`}
                                        >
                                            {isActive ? 'ON' : 'OFF'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Banner Informativo */}
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-blue-800 mb-1">
                                    ⚠️ Modalità Mock Attiva
                                </p>
                                <p className="text-sm text-blue-700">
                                    Le sezioni selezionate useranno dati di simulazione e non verranno salvate nel database.
                                    Le altre sezioni continueranno a usare il backend reale.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Modale Crea Utente
function CreateUserModal({ onClose, onSubmit }: any) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        area: 'Marketing',
        role: 'Socio'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
                <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="text-lg font-semibold">Crea Nuovo Utente</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                            minLength={6}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                        <select
                            value={formData.area}
                            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="CDA">CDA</option>
                            <option value="Marketing">Marketing</option>
                            <option value="IT">IT</option>
                            <option value="Commerciale">Commerciale</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="Socio">Socio</option>
                            <option value="Presidente">Presidente</option>
                            <option value="CDA">CDA</option>
                            <option value="Tesoreria">Tesoreria</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Commerciale">Commerciale</option>
                            <option value="IT">IT</option>
                            <option value="Audit">Audit</option>
                            <option value="Responsabile">Responsabile</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Crea Utente
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Modale Modifica Utente
function EditUserModal({ user, onClose, onSubmit }: any) {
    const [formData, setFormData] = useState({
        name: user.name || '',
        email: user.email || '',
        area: user.area || 'Marketing',
        role: user.role || 'Socio'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
                <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="text-lg font-semibold">Modifica Utente</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                        <select
                            value={formData.area}
                            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="CDA">CDA</option>
                            <option value="Marketing">Marketing</option>
                            <option value="IT">IT</option>
                            <option value="Commerciale">Commerciale</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="Socio">Socio</option>
                            <option value="Presidente">Presidente</option>
                            <option value="CDA">CDA</option>
                            <option value="Tesoreria">Tesoreria</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Commerciale">Commerciale</option>
                            <option value="IT">IT</option>
                            <option value="Audit">Audit</option>
                            <option value="Responsabile">Responsabile</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Salva Modifiche
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

