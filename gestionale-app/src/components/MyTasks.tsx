import { useState, useEffect } from 'react';
import { tasksAPI, projectsAPI } from '../services/api.ts';
import { CheckCircle, Clock, AlertCircle, Circle } from 'lucide-react';

interface MyTasksProps {
    user: any;
}

export default function MyTasks({ user }: MyTasksProps) {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Verifica che l'utente sia valido (può avere id o user_id)
        const userId = user?.id || user?.user_id;
        if (user && userId) {
            loadTasks();
        } else {
            setLoading(false);
            setError('Utente non autenticato');
        }
    }, [user]);

    const loadTasks = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('MyTasks: Caricamento task per utente:', user?.id || user?.user_id);
            const myTasks = await tasksAPI.getMyTasks();
            console.log('MyTasks: Task ricevuti:', myTasks);
            // Assicurati che sia sempre un array
            const tasksArray = Array.isArray(myTasks) ? myTasks : [];
            setTasks(tasksArray);
            console.log('MyTasks: Tasks impostati:', tasksArray.length);
        } catch (error: any) {
            console.error('MyTasks: Errore caricamento tasks:', error);
            console.error('MyTasks: Stack error:', error.stack);
            setError(error.message || 'Errore nel caricamento dei tuoi task');
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        try {
            await tasksAPI.updateTaskStatus(taskId, newStatus);
            await loadTasks();
        } catch (error: any) {
            alert(error.message || 'Errore nell\'aggiornamento dello stato');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Completato':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'In Corso':
                return <Clock className="w-5 h-5 text-yellow-600" />;
            case 'In Revisione':
                return <AlertCircle className="w-5 h-5 text-blue-600" />;
            default:
                return <Circle className="w-5 h-5 text-red-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completato':
                return 'bg-green-100 text-green-700 border-green-300';
            case 'In Corso':
                return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            case 'In Revisione':
                return 'bg-blue-100 text-blue-700 border-blue-300';
            default:
                return 'bg-red-100 text-red-700 border-red-300';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Alta':
                return 'bg-red-100 text-red-700';
            case 'Media':
                return 'bg-yellow-100 text-yellow-700';
            default:
                return 'bg-green-100 text-green-700';
        }
    };

    // Verifica che l'utente sia valido (può avere id o user_id)
    const userId = user?.id || user?.user_id;
    if (!user || !userId) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-red-500 text-lg">Errore: Utente non autenticato</p>
                <p className="text-gray-400 text-sm mt-2">Effettua il login per visualizzare i tuoi task</p>
                <p className="text-xs text-gray-500 mt-2">Debug: user={user ? 'presente' : 'null'}, userId={userId || 'null'}</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500">Caricamento dei tuoi task...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-red-500 text-lg">Errore</p>
                <p className="text-gray-600 text-sm mt-2">{error}</p>
                <button
                    onClick={loadTasks}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                    Riprova
                </button>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500 text-lg">Nessun task assegnato</p>
                <p className="text-gray-400 text-sm mt-2">I task assegnati dal tuo manager appariranno qui</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">I Miei Task</h2>
                <div className="space-y-4">
                    {tasks.map((task: any) => {
                        // Validazione task per evitare errori
                        if (!task || !task.id) {
                            console.warn('MyTasks: Task non valido ignorato:', task);
                            return null;
                        }
                        
                        const taskStatus = task.status || 'Da Fare';
                        const taskPriority = task.priority || 'Media';
                        const taskDescription = task.description || 'Task senza descrizione';
                        
                        return (
                            <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            {getStatusIcon(taskStatus)}
                                            <h3 className="text-lg font-semibold text-gray-900">{taskDescription}</h3>
                                        </div>
                                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                                            <span className="font-medium">Progetto:</span>
                                            <span>{task.projectName || 'N/A'}</span>
                                            <span className="text-gray-400">•</span>
                                            <span className="font-medium">Area:</span>
                                            <span>{task.projectArea || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end space-y-2">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(taskPriority)}`}>
                                            {taskPriority}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center space-x-2">
                                        <label className="text-sm font-medium text-gray-700">Stato:</label>
                                        <select
                                            value={taskStatus}
                                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                            className={`px-3 py-2 text-sm font-medium rounded-md border ${getStatusColor(taskStatus)} cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                                        >
                                            <option value="Da Fare">Da Fare</option>
                                            <option value="In Corso">In Corso</option>
                                            <option value="In Revisione">In Revisione</option>
                                            <option value="Completato">Completato</option>
                                        </select>
                                    </div>
                                    {task.updatedAt && (
                                        <span className="text-xs text-gray-400">
                                            Aggiornato: {new Date(task.updatedAt).toLocaleDateString('it-IT')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

