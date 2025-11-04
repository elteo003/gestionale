import { useState, useEffect } from 'react';
import { Users, Activity, Database, Settings, Trash2, Edit2, Key, Power, PowerOff, Plus, X, AlertCircle, CheckCircle } from 'lucide-react';

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
    const [healthStatus, setHealthStatus] = useState<{ api: 'ok' | 'error', db: 'ok' | 'error' }>({ api: 'ok', db: 'ok' });
    const [useMockData, setUseMockData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    // Carica stato mock data da localStorage
    useEffect(() => {
        const mockDataEnabled = localStorage.getItem('useMockData') === 'true';
        setUseMockData(mockDataEnabled);
    }, []);

    // Health check polling
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/health`);
                const data = await response.json();
                setHealthStatus({
                    api: response.ok ? 'ok' : 'error',
                    db: data.db || 'ok'
                });
            } catch (error) {
                setHealthStatus({ api: 'error', db: 'error' });
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
                    <HealthCheck healthStatus={healthStatus} />
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
function HealthCheck({ healthStatus }: any) {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Stato del Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="font-medium">Stato API</p>
                            <p className="text-sm text-gray-600">Frontend ➔ Backend</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className={`w-4 h-4 rounded-full ${healthStatus.api === 'ok' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-sm font-medium">{healthStatus.api === 'ok' ? 'OK' : 'ERROR'}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="font-medium">Stato Database</p>
                            <p className="text-sm text-gray-600">Backend ➔ Database</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className={`w-4 h-4 rounded-full ${healthStatus.db === 'ok' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-sm font-medium">{healthStatus.db === 'ok' ? 'OK' : 'ERROR'}</span>
                        </div>
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
            <h3 className="text-lg font-semibold mb-4">Visti di Recente (Ultimi 5 Minuti)</h3>
            {users.length === 0 ? (
                <p className="text-gray-500 text-sm">Nessun utente connesso</p>
            ) : (
                <div className="space-y-2">
                    {users.map((user: any) => {
                        const lastSeen = new Date(user.last_seen);
                        const minutesAgo = Math.floor((new Date().getTime() - lastSeen.getTime()) / 60000);
                        return (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-gray-600">{user.email} - {user.area} ({user.role})</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-gray-500">{minutesAgo} minuti fa</span>
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
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Modalità Sviluppo</h3>
            <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div>
                    <p className="font-medium">Attiva Dati di Simulazione (Mock Data)</p>
                    <p className="text-sm text-gray-600 mt-1">
                        Quando attivo, tutte le chiamate API restituiscono dati finti locali invece di contattare il backend.
                        Questo permette di testare l'UI senza modificare il database reale.
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={useMockData}
                        onChange={(e) => onToggle(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>
            {useMockData && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        ⚠️ Modalità Mock attiva. I dati visualizzati sono di simulazione e non verranno salvati nel database.
                    </p>
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

