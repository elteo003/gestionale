import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, X, FileText, Calendar, Trash2, Edit2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { candidatesAPI, onboardingAPI, pollsAPI } from '../services/api.ts';

interface Candidate {
    id: string;
    name: string;
    email: string;
    cvUrl?: string;
    status: 'In attesa' | 'In colloquio' | 'Accettato' | 'Rifiutato';
    areaCompetenza?: string;
    createdAt: string;
    createdByName?: string;
}

interface RecruitingProps {
    currentUser: any;
}

export default function Recruiting({ currentUser }: RecruitingProps) {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [isPollModalOpen, setIsPollModalOpen] = useState(false);
    const [startingOnboarding, setStartingOnboarding] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        cvUrl: '',
        areaCompetenza: '',
    });

    useEffect(() => {
        loadCandidates();
    }, []);

    const loadCandidates = async () => {
        try {
            setLoading(true);
            const data = await candidatesAPI.getAll();
            setCandidates(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error('Errore caricamento candidati:', error);
            alert('Errore nel caricamento dei candidati: ' + (error.message || 'Errore sconosciuto'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCandidate = async () => {
        try {
            if (!formData.name || !formData.email) {
                alert('Nome ed email sono obbligatori');
                return;
            }

            const newCandidate = await candidatesAPI.create({
                name: formData.name,
                email: formData.email,
                cvUrl: formData.cvUrl || undefined,
                areaCompetenza: formData.areaCompetenza || undefined,
            });

            setCandidates([newCandidate, ...candidates]);
            setIsModalOpen(false);
            setFormData({ name: '', email: '', cvUrl: '', areaCompetenza: '' });
        } catch (error: any) {
            alert('Errore: ' + (error.message || 'Errore sconosciuto'));
        }
    };

    const handleUpdateStatus = async (candidateId: string, newStatus: string) => {
        try {
            const updated = await candidatesAPI.update(candidateId, { status: newStatus });
            setCandidates(candidates.map(c => c.id === candidateId ? updated : c));
        } catch (error: any) {
            alert('Errore: ' + (error.message || 'Errore sconosciuto'));
        }
    };

    const handleDelete = async (candidateId: string) => {
        if (!window.confirm('Sei sicuro di voler eliminare questo candidato?')) {
            return;
        }
        try {
            await candidatesAPI.delete(candidateId);
            setCandidates(candidates.filter(c => c.id !== candidateId));
        } catch (error: any) {
            alert('Errore: ' + (error.message || 'Errore sconosciuto'));
        }
    };

    const handleStartPoll = (candidate: Candidate) => {
        setSelectedCandidate(candidate);
        setIsPollModalOpen(true);
    };

    const handleStartOnboarding = async (candidateId: string) => {
        if (!window.confirm('Vuoi avviare il periodo di prova per questo candidato? Verrà creato un nuovo utente e un progetto.')) {
            return;
        }

        try {
            setStartingOnboarding(candidateId);
            const result = await onboardingAPI.start(candidateId);
            alert(`Periodo di prova avviato!\n\nUtente creato: ${result.user.email}\nPassword temporanea: ${result.user.tempPassword}\n\nProgetto: ${result.project.name}\n\n⚠️ IMPORTANTE: Invia la password temporanea al candidato via email.`);
            
            // Aggiorna lo stato del candidato
            await loadCandidates();
            
            // TODO: Reindirizza al progetto creato (se necessario)
            // window.location.href = `/progetti/${result.project.id}`;
        } catch (error: any) {
            alert('Errore: ' + (error.message || 'Errore sconosciuto'));
        } finally {
            setStartingOnboarding(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Accettato': return 'bg-green-100 text-green-800';
            case 'In colloquio': return 'bg-blue-100 text-blue-800';
            case 'Rifiutato': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const canManage = currentUser?.role === 'Manager' || 
                     currentUser?.role === 'CDA' || 
                     currentUser?.role === 'Admin' || 
                     currentUser?.role === 'Responsabile' || 
                     currentUser?.role === 'Presidente';

    if (!canManage) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">Non hai i permessi per accedere a questa sezione.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Recruiting</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Aggiungi Candidato
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">Caricamento...</div>
            ) : candidates.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                    Nessun candidato presente. Clicca "Aggiungi Candidato" per iniziare.
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {candidates.map((candidate) => (
                                <tr key={candidate.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <UserPlus className="w-5 h-5 text-indigo-600 mr-2" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                                                {candidate.cvUrl && (
                                                    <a href={candidate.cvUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">
                                                        <FileText className="w-3 h-3 inline mr-1" />
                                                        CV
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.areaCompetenza || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(candidate.status)}`}>
                                            {candidate.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            {candidate.status === 'In attesa' && (
                                                <>
                                                    <button
                                                        onClick={() => handleStartPoll(candidate)}
                                                        className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                                                        title="Avvia Sondaggio Colloquio"
                                                    >
                                                        <Calendar className="w-4 h-4" />
                                                        Colloquio
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(candidate.id, 'Rifiutato')}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Rifiuta"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            {candidate.status === 'Accettato' && (
                                                <button
                                                    onClick={() => handleStartOnboarding(candidate.id)}
                                                    disabled={startingOnboarding === candidate.id}
                                                    className="text-green-600 hover:text-green-900 flex items-center gap-1 disabled:opacity-50"
                                                    title="Avvia Periodo di Prova"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                    {startingOnboarding === candidate.id ? 'Avvio...' : 'Avvia Prova'}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(candidate.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Elimina"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modale Aggiungi Candidato */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-bold mb-4">Aggiungi Candidato</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Link CV (opzionale)</label>
                                <input
                                    type="url"
                                    value={formData.cvUrl}
                                    onChange={(e) => setFormData(prev => ({ ...prev, cvUrl: e.target.value }))}
                                    placeholder="https://drive.google.com/..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Area Competenza</label>
                                <select
                                    value={formData.areaCompetenza}
                                    onChange={(e) => setFormData(prev => ({ ...prev, areaCompetenza: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">Seleziona Area</option>
                                    <option value="IT">IT</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Commerciale">Commerciale</option>
                                    <option value="CDA">CDA</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                    Annulla
                                </button>
                                <button onClick={handleCreateCandidate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                    Crea
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modale Avvia Sondaggio Colloquio - Integrato con Calendar/CreatePollModal */}
            {isPollModalOpen && selectedCandidate && (
                <CreatePollModalForCandidate
                    candidate={selectedCandidate}
                    currentUser={currentUser}
                    onClose={() => {
                        setIsPollModalOpen(false);
                        setSelectedCandidate(null);
                    }}
                    onSuccess={() => {
                        setIsPollModalOpen(false);
                        setSelectedCandidate(null);
                        handleUpdateStatus(selectedCandidate.id, 'In colloquio');
                        loadCandidates();
                    }}
                />
            )}
        </div>
    );
}

// Componente modale per creare sondaggio colloquio (usa la stessa logica di Calendar/CreatePollModal)
function CreatePollModalForCandidate({ candidate, currentUser, onClose, onSuccess }: any) {
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: `Colloquio con ${candidate.name}`,
        durationMinutes: 60,
        invitationRules: {
            groups: [] as string[],
            individuals: [] as string[],
        },
        timeSlots: [] as { startTime: string; endTime: string }[],
    });
    const [newSlotDate, setNewSlotDate] = useState('');
    const [newSlotTime, setNewSlotTime] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const { usersAPI } = await import('../services/api.ts');
            const data = await usersAPI.getAll();
            setAllUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Errore caricamento utenti:', error);
        }
    };

    const addTimeSlot = () => {
        if (!newSlotDate || !newSlotTime) {
            alert('Inserisci data e ora');
            return;
        }

        const startTime = new Date(`${newSlotDate}T${newSlotTime}`);
        const endTime = new Date(startTime.getTime() + formData.durationMinutes * 60000);

        setFormData(prev => ({
            ...prev,
            timeSlots: [...prev.timeSlots, {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            }],
        }));

        setNewSlotDate('');
        setNewSlotTime('');
    };

    const removeTimeSlot = (index: number) => {
        setFormData(prev => ({
            ...prev,
            timeSlots: prev.timeSlots.filter((_, i) => i !== index),
        }));
    };

    const handleToggleGroup = (group: string) => {
        setFormData(prev => ({
            ...prev,
            invitationRules: {
                ...prev.invitationRules,
                groups: prev.invitationRules.groups.includes(group)
                    ? prev.invitationRules.groups.filter(g => g !== group)
                    : [...prev.invitationRules.groups, group],
            },
        }));
    };

    const handleToggleIndividual = (userId: string) => {
        setFormData(prev => ({
            ...prev,
            invitationRules: {
                ...prev.invitationRules,
                individuals: prev.invitationRules.individuals.includes(userId)
                    ? prev.invitationRules.individuals.filter(id => id !== userId)
                    : [...prev.invitationRules.individuals, userId],
            },
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.timeSlots.length === 0) {
            alert('Aggiungi almeno uno slot temporale');
            return;
        }

        try {
            setLoading(true);
            await pollsAPI.create({
                ...formData,
                candidateId: candidate.id,
            });
            alert('Sondaggio colloquio creato con successo!');
            onSuccess();
        } catch (error: any) {
            alert('Errore: ' + (error.message || 'Errore sconosciuto'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold mb-4">Avvia Sondaggio Colloquio</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Candidato: <strong>{candidate.name}</strong> ({candidate.email})
                </p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Titolo Sondaggio *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Durata (minuti) *</label>
                        <input
                            type="number"
                            value={formData.durationMinutes}
                            onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 60 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            min="15"
                            step="15"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Invita Intervistatori</label>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2">Gruppi</label>
                                <div className="space-y-2">
                                    {['Manager', 'CDA', 'Associati'].map(group => (
                                        <label key={group} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.invitationRules.groups.includes(group)}
                                                onChange={() => handleToggleGroup(group)}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm">{group}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2">Utenti Singoli</label>
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {allUsers.map(user => (
                                        <label key={user.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.invitationRules.individuals.includes(user.id)}
                                                onChange={() => handleToggleIndividual(user.id)}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm">{user.name} ({user.email})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Slot Temporali</label>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Data</label>
                                <input
                                    type="date"
                                    value={newSlotDate}
                                    onChange={(e) => setNewSlotDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Ora Inizio</label>
                                <input
                                    type="time"
                                    value={newSlotTime}
                                    onChange={(e) => setNewSlotTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <button type="button" onClick={addTimeSlot} className="mb-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                            <Plus className="w-4 h-4 inline mr-2" />Aggiungi Slot
                        </button>
                        {formData.timeSlots.length > 0 && (
                            <div className="space-y-2">
                                {formData.timeSlots.map((slot, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-sm">{new Date(slot.startTime).toLocaleString('it-IT')} - {new Date(slot.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                        <button type="button" onClick={() => removeTimeSlot(index)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            Annulla
                        </button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                            {loading ? 'Creazione...' : 'Crea Sondaggio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

