import React, { useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { Plus, Clock, Users, CheckCircle, XCircle, Phone, AlertCircle, Briefcase, GraduationCap, Network, X, FileText, Edit2, Trash2, Calendar as CalendarIcon2, BarChart3, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { eventsAPI, usersAPI, projectsAPI, clientsAPI, pollsAPI } from '../services/api.ts';
import { cn } from '../utils/cn';

interface Event {
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    isCall: boolean;
    callLink?: string;
    eventType?: 'call' | 'networking' | 'formazione' | 'generic';
    eventSubtype?: 'call_interna' | 'call_reparto' | 'call_clienti';
    area?: string;
    clientId?: string;
    clientName?: string;
    recurrenceType?: 'none' | 'weekly' | 'monthly';
    recurrenceEndDate?: string;
    version?: number;
    creatorId: string;
    creatorName?: string;
    participants?: Participant[];
}

interface Participant {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    status: 'pending' | 'accepted' | 'declined';
}

interface HeatmapSlotUser {
    userId: string;
    userName: string;
    userEmail?: string;
}

interface HeatmapSlot {
    slotStartTime: string;
    availableUsers: number;
    userIds?: string[];
    users?: HeatmapSlotUser[];
}

interface OrganizeFormState {
    title: string;
    description: string;
    eventType: 'call' | 'networking' | 'formazione' | 'generic';
    eventSubtype: 'call_interna' | 'call_reparto' | 'call_clienti';
    area: string;
    clientId: string;
    callLink: string;
}

interface CalendarProps {
    currentUser: any;
}

interface Project {
    id: string;
    name: string;
    area?: string;
    status: string;
    clientName?: string;
    assignedAt?: string;
}

interface WeekDaySlots {
    day: Date;
    slots: Date[];
}

interface AvailabilitySelectorProps {
    durationMinutes: number;
    selectedSlots: string[];
    onChange: Dispatch<SetStateAction<string[]>>;
    weekStart: Date;
    onWeekChange: (date: Date) => void;
}

interface HeatmapGridProps {
    durationMinutes: number;
    data: HeatmapSlot[];
    weekStart: Date;
    onWeekChange: (date: Date) => void;
    loading: boolean;
    selectedSlot: string | null;
    onSelectSlot: (slot: HeatmapSlot) => void;
}

interface EventOrganizeFormProps {
    formData: OrganizeFormState;
    setFormData: Dispatch<SetStateAction<OrganizeFormState>>;
    allClients: any[];
    onCancel: () => void;
    onSubmit: () => void;
    submitting: boolean;
    submitLabel: string;
}

export default function Calendar({ currentUser }: CalendarProps) {
    const [events, setEvents] = useState<Event[]>([]);
    const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [allClients, setAllClients] = useState<any[]>([]);
    const [polls, setPolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [selectedPoll, setSelectedPoll] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isPollModalOpen, setIsPollModalOpen] = useState(false);
    const [isPollViewModalOpen, setIsPollViewModalOpen] = useState(false);

    // Carica eventi e utenti
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [eventsData, usersData, projectsData, clientsData, pollsData] = await Promise.all([
                eventsAPI.getAll({}).catch((err: any) => {
                    console.error('Errore caricamento eventi:', err);
                    return [];
                }),
                usersAPI.getAll().catch((err: any) => {
                    console.error('Errore caricamento utenti:', err);
                    return [];
                }),
                projectsAPI.getMyProjects().catch((err: any) => {
                    console.error('Errore caricamento progetti assegnati:', err);
                    return [];
                }),
                clientsAPI.getAll().catch((err: any) => {
                    console.error('Errore caricamento clienti:', err);
                    return [];
                }),
                pollsAPI.getAll({ status: 'open' }).catch((err: any) => {
                    console.error('Errore caricamento sondaggi:', err);
                    return [];
                }),
            ]);
            // Assicurati che siano sempre array
            setEvents(Array.isArray(eventsData) ? eventsData : []);
            setAllUsers(Array.isArray(usersData) ? usersData : []);
            setAssignedProjects(Array.isArray(projectsData) ? projectsData : []);
            setAllClients(Array.isArray(clientsData) ? clientsData : []);
            setPolls(Array.isArray(pollsData) ? pollsData : []);
        } catch (error) {
            console.error('Errore generale nel caricamento:', error);
            setEvents([]);
            setAllUsers([]);
            setAssignedProjects([]);
            setAllClients([]);
            setPolls([]);
        } finally {
            setLoading(false);
        }
    };

    // Filtra eventi per il mese selezionato
    const getMonthEvents = () => {
        const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);
        return events.filter(event => {
            const eventStart = new Date(event.startTime);
            return eventStart >= start && eventStart <= end;
        });
    };

    // Ottieni giorni del mese
    const getDaysInMonth = () => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        
        // Aggiungi giorni vuoti all'inizio
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Aggiungi giorni del mese
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    };

    // Ottieni eventi per un giorno specifico
    const getEventsForDay = (day: number | null) => {
        if (day === null) return [];
        const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
        return events.filter(event => {
            const eventDate = new Date(event.startTime);
            return eventDate.toDateString() === date.toDateString();
        });
    };

    // Funzione preparata per future implementazioni con deadline - rimossa per ora
    // const _getProjectsForDay = (day: number | null) => {
    //     if (day === null) return [];
    //     return assignedProjects;
    // };

    // Naviga mese
    const changeMonth = (direction: number) => {
        setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + direction, 1));
    };

    // Formatta data/ora
    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    };

    // Gestione RSVP
    const handleRSVP = async (eventId: string, status: 'accepted' | 'declined') => {
        try {
            await eventsAPI.rsvp(eventId, status);
            await loadData(); // Ricarica eventi per aggiornare partecipanti
            if (selectedEvent?.id === eventId) {
                // Ricarica dettagli evento se aperto
                const updated = events.find(e => e.id === eventId);
                if (updated) setSelectedEvent(updated);
            }
        } catch (error: any) {
            alert(error.message || 'Errore nell\'aggiornamento RSVP');
        }
    };

    // Ottieni stato RSVP dell'utente corrente
    const getMyRSVPStatus = (event: Event) => {
        if (!currentUser) return null;
        const participant = event.participants?.find(p => p.userId === currentUser.id);
        return participant?.status || null;
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">Caricamento eventi...</div>;
    }

    const monthEvents = getMonthEvents();
    const days = getDaysInMonth();
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                       'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

    return (
        <div className="space-y-6">
            {/* Header Calendario */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => changeMonth(-1)}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        >
                            ‹
                        </button>
                        <h2 className="text-xl font-semibold">
                            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                        </h2>
                        <button
                            onClick={() => changeMonth(1)}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        >
                            ›
                        </button>
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded transition-colors"
                        >
                            Oggi
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Nuovo Evento</span>
                        </button>
                        {(currentUser?.role === 'Manager' || currentUser?.role === 'CDA' || 
                          currentUser?.role === 'Admin' || currentUser?.role === 'Responsabile' || 
                          currentUser?.role === 'Presidente') && (
                            <button
                                onClick={() => setIsPollModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                <CalendarIcon2 className="w-5 h-5" />
                                <span>Da Pianificare</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Griglia Calendario */}
                <div className="grid grid-cols-7 gap-1">
                    {/* Nomi giorni */}
                    {dayNames.map(day => (
                        <div key={day} className="p-2 text-center text-sm font-medium text-gray-600 bg-gray-50 rounded">
                            {day}
                        </div>
                    ))}

                    {/* Giorni */}
                    {days.map((day, index) => {
                        const dayEvents = getEventsForDay(day);
                        const isToday = day !== null && 
                            new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day).toDateString() === 
                            new Date().toDateString();

                        return (
                            <div
                                key={index}
                                className={`min-h-[100px] p-1 border border-gray-200 rounded ${
                                    day === null ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                                } ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
                            >
                                {day !== null && (
                                    <>
                                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
                                            {day}
                                        </div>
                                        <div className="space-y-1">
                                            {/* Eventi */}
                                            {dayEvents.slice(0, 2).map(event => (
                                                <div
                                                    key={event.id}
                                                    onClick={() => {
                                                        setSelectedEvent(event);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className={`text-xs p-1 rounded cursor-pointer truncate ${
                                                        event.eventType === 'call' || event.isCall
                                                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                            : event.eventType === 'formazione'
                                                            ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                                            : event.eventType === 'networking'
                                                            ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    }`}
                                                    title={event.title}
                                                >
                                                    {event.eventType === 'call' || event.isCall ? (
                                                        <Phone className="w-3 h-3 inline mr-1" />
                                                    ) : event.eventType === 'formazione' ? (
                                                        <GraduationCap className="w-3 h-3 inline mr-1" />
                                                    ) : event.eventType === 'networking' ? (
                                                        <Network className="w-3 h-3 inline mr-1" />
                                                    ) : null}
                                                    {formatTime(event.startTime)} {event.title}
                                                </div>
                                            ))}
                                            {/* Progetti Assegnati (mostra solo se ci sono progetti e non ci sono troppi eventi) */}
                                            {dayEvents.length <= 2 && assignedProjects.length > 0 && (
                                                assignedProjects.slice(0, 2 - dayEvents.length).map(project => (
                                                    <div
                                                        key={project.id}
                                                        className="text-xs p-1 rounded bg-purple-100 text-purple-800 truncate"
                                                        title={`Progetto: ${project.name} - ${project.status}`}
                                                    >
                                                        <Briefcase className="w-3 h-3 inline mr-1" />
                                                        {project.name}
                                                    </div>
                                                ))
                                            )}
                                            {(dayEvents.length + Math.min(assignedProjects.length, 2 - dayEvents.length)) > 3 && (
                                                <div className="text-xs text-gray-500">
                                                    +{(dayEvents.length + assignedProjects.length) - 3} altri
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Lista Sondaggi Attivi */}
            {polls.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CalendarIcon2 className="w-5 h-5 text-purple-600" />
                        Sondaggi Attivi
                    </h3>
                    <div className="space-y-3">
                        {polls.map((poll: any) => (
                            <div
                                key={poll.id}
                                onClick={() => {
                                    setSelectedPoll(poll);
                                    setIsPollViewModalOpen(true);
                                }}
                                className="p-4 border border-purple-200 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="font-semibold text-purple-900 mb-1">{poll.title}</div>
                                        <div className="text-sm text-purple-700">
                                            Creato da: {poll.creatorName} • Durata: {poll.durationMinutes} minuti
                                        </div>
                                        <div className="text-xs text-purple-600 mt-2">
                                            Clicca per votare o vedere risultati
                                        </div>
                                    </div>
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-200 text-purple-800">
                                        Aperto
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Lista Eventi del Mese */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Eventi di {monthNames[selectedDate.getMonth()]}</h3>
                {monthEvents.length === 0 ? (
                    <p className="text-gray-500">Nessun evento questo mese</p>
                ) : (
                    <div className="space-y-3">
                        {monthEvents.map(event => {
                            const myStatus = getMyRSVPStatus(event);
                            return (
                                <div
                                    key={event.id}
                                    onClick={() => {
                                        setSelectedEvent(event);
                                        setIsModalOpen(true);
                                    }}
                                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {event.eventType === 'call' || event.isCall ? (
                                                    <Phone className="w-4 h-4 text-blue-600" />
                                                ) : event.eventType === 'formazione' ? (
                                                    <GraduationCap className="w-4 h-4 text-purple-600" />
                                                ) : event.eventType === 'networking' ? (
                                                    <Network className="w-4 h-4 text-orange-600" />
                                                ) : null}
                                                <h4 className="font-semibold text-gray-900">{event.title}</h4>
                                                {event.eventType && (
                                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                                        {event.eventType === 'call' ? '📞 Call' :
                                                         event.eventType === 'formazione' ? '🎓 Formazione' :
                                                         event.eventType === 'networking' ? '🤝 Networking' :
                                                         '📅 Evento'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {formatDateTime(event.startTime)} - {formatTime(event.endTime)}
                                                </div>
                                                {event.participants && event.participants.length > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        {event.participants.length} partecipanti
                                                    </div>
                                                )}
                                            </div>
                                            {event.description && (
                                                <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                                            )}
                                        </div>
                                        {myStatus && (
                                            <div className="ml-4">
                                                {myStatus === 'accepted' && (
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                )}
                                                {myStatus === 'declined' && (
                                                    <XCircle className="w-5 h-5 text-red-500" />
                                                )}
                                                {myStatus === 'pending' && (
                                                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Lista Progetti Assegnati */}
            {assignedProjects.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <Briefcase className="w-5 h-5 mr-2 text-purple-600" />
                        Progetti Assegnati
                    </h3>
                    <div className="space-y-3">
                        {assignedProjects.map(project => (
                            <div
                                key={project.id}
                                className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="font-medium text-purple-900">{project.name}</div>
                                    <div className="text-sm text-purple-700">
                                        {project.clientName && <span>Cliente: {project.clientName}</span>}
                                        {project.area && <span className="ml-2">• Area: {project.area}</span>}
                                        <span className="ml-2">• Status: {project.status}</span>
                                    </div>
                                </div>
                                <div className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-200 text-purple-800">
                                    Progetto
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modale Dettaglio Evento */}
            {isModalOpen && selectedEvent && (
                <EventDetailModal
                    event={selectedEvent}
                    currentUser={currentUser}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedEvent(null);
                    }}
                    onRSVP={handleRSVP}
                    onRefresh={loadData}
                />
            )}

            {/* Modale Crea Sondaggio */}
            {isPollModalOpen && (
                <CreatePollModal
                    allUsers={allUsers}
                    currentUser={currentUser}
                    onClose={() => setIsPollModalOpen(false)}
                    onSuccess={() => {
                        setIsPollModalOpen(false);
                        loadData();
                    }}
                />
            )}

            {/* Modale Visualizza/Vota Sondaggio */}
            {isPollViewModalOpen && selectedPoll && (
                <PollViewModal
                    poll={selectedPoll}
                    currentUser={currentUser}
                    allClients={allClients}
                    onClose={() => {
                        setIsPollViewModalOpen(false);
                        setSelectedPoll(null);
                    }}
                    onSuccess={() => {
                        setIsPollViewModalOpen(false);
                        setSelectedPoll(null);
                        loadData();
                    }}
                />
            )}

            {/* Modale Crea Evento */}
            {isCreateModalOpen && (
                <CreateEventModal
                    allUsers={allUsers}
                    allClients={allClients}
                    currentUser={currentUser}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}

// Modale Dettaglio Evento
function EventDetailModal({ event, currentUser, onClose, onRSVP, onRefresh }: any) {
    const [activeTab, setActiveTab] = useState<'details' | 'reports'>('details');
    const [reports, setReports] = useState<any[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [isReportEditorOpen, setIsReportEditorOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const isCreator = currentUser?.id === event.creatorId;
    const myStatus = event.participants?.find((p: Participant) => p.userId === currentUser?.id)?.status;
    const pendingParticipants = event.participants?.filter((p: Participant) => p.status === 'pending') ?? [];
    const isEventPast = new Date(event.endTime) < new Date();
    const isManager = currentUser?.role === 'Manager' || currentUser?.role === 'CDA' || 
                     currentUser?.role === 'Admin' || currentUser?.role === 'Responsabile' || 
                     currentUser?.role === 'Presidente';
    const canCreateReport = isEventPast && (isManager || event.creatorId === currentUser?.id);

    // Carica report quando si apre il tab
    useEffect(() => {
        if (activeTab === 'reports' && isEventPast) {
            loadReports();
        }
    }, [activeTab, event.id, isEventPast]);

    const loadReports = async () => {
        try {
            setLoadingReports(true);
            const data = await eventsAPI.getReports(event.id);
            setReports(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Errore caricamento report:', error);
            setReports([]);
        } finally {
            setLoadingReports(false);
        }
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted': return 'bg-green-100 text-green-800';
            case 'declined': return 'bg-red-100 text-red-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'accepted': return 'Accettato';
            case 'declined': return 'Rifiutato';
            default: return 'In attesa';
        }
    };

    const handleDeleteEvent = async () => {
        if (!isCreator || isDeleting) return;

        const confirmed = window.confirm('Sei sicuro di voler eliminare questo evento? Questa azione non può essere annullata.');
        if (!confirmed) {
          return;
        }

        try {
          setIsDeleting(true);
          await eventsAPI.delete(event.id);
          alert('Evento eliminato con successo!');
          if (typeof onClose === 'function') {
            onClose();
          }
          if (typeof onRefresh === 'function') {
            await onRefresh();
          }
        } catch (error: any) {
          console.error('Errore eliminazione evento:', error);
          alert('Errore durante l\'eliminazione dell\'evento: ' + (error?.message || 'Errore sconosciuto'));
        } finally {
          setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {isCreator && (
                    <button
                        onClick={handleDeleteEvent}
                        disabled={isDeleting}
                        className="absolute top-4 right-14 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isDeleting ? 'Eliminazione in corso...' : 'Elimina evento'}
                    >
                        <Trash2 className="w-6 h-6" />
                    </button>
                )}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <XCircle className="w-6 h-6" />
                </button>

                <div className="p-6">
                    {/* Tabs per eventi passati */}
                    {isEventPast && (
                        <div className="flex gap-2 mb-4 border-b border-gray-200">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`px-4 py-2 font-medium transition-colors ${
                                    activeTab === 'details'
                                        ? 'border-b-2 border-indigo-600 text-indigo-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Dettagli
                            </button>
                            <button
                                onClick={() => setActiveTab('reports')}
                                className={`px-4 py-2 font-medium transition-colors ${
                                    activeTab === 'reports'
                                        ? 'border-b-2 border-indigo-600 text-indigo-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <FileText className="w-4 h-4 inline mr-2" />
                                Report e Verbali
                            </button>
                        </div>
                    )}

                    {activeTab === 'details' && (
                        <>
                    <div className="flex items-start gap-4 mb-4">
                        {event.isCall && (
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Phone className="w-6 h-6 text-blue-600" />
                            </div>
                        )}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h2>
                            {event.description && (
                                <p className="text-gray-600 mb-4">{event.description}</p>
                            )}
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatDateTime(event.startTime)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>Fine: {formatDateTime(event.endTime)}</span>
                                </div>
                                {event.creatorName && (
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        <span>Creato da: {event.creatorName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Link Call (solo per call e visibile a creatore e partecipanti) */}
                    {event.isCall && event.callLink && (
                        (currentUser?.id === event.creatorId || myStatus === 'accepted') && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h3 className="font-medium mb-2 flex items-center gap-2">
                                    <Phone className="w-5 h-5 text-blue-600" />
                                    <span>Link per la Call</span>
                                </h3>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={event.callLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
                                    >
                                        Apri Call
                                    </a>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(event.callLink!);
                                            alert('Link copiato negli appunti!');
                                        }}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                        title="Copia link"
                                    >
                                        📋
                                    </button>
                                </div>
                                <p className="text-xs text-gray-600 mt-2 break-all">{event.callLink}</p>
                            </div>
                        )
                    )}

                    {/* RSVP Buttons (solo se non è il creatore e non è già accettato/rifiutato) */}
                    {currentUser && !isCreator && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-medium mb-3">Il tuo invito</h3>
                            {myStatus === 'accepted' || myStatus === 'declined' ? (
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(myStatus)}`}>
                                        {getStatusLabel(myStatus)}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onRSVP(event.id, 'accepted')}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        Accetta
                                    </button>
                                    <button
                                        onClick={() => onRSVP(event.id, 'declined')}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Rifiuta
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Badge stato inviti pendenti visibile solo all'organizzatore */}
                    {isCreator && pendingParticipants.length > 0 && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h3 className="font-medium mb-3">Risposte in sospeso</h3>
                            <div className="flex items-center gap-2">
                                <span
                                    className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 cursor-help"
                                    title={pendingParticipants.map((p: Participant) => p.userName).join(', ')}
                                >
                                    In attesa di risposta ({pendingParticipants.length})
                                </span>
                                <span className="text-xs text-yellow-700">Passa sopra per vedere chi deve ancora rispondere</span>
                            </div>
                        </div>
                    )}

                    {/* Partecipanti */}
                    {event.participants && event.participants.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-3">Partecipanti ({event.participants.length})</h3>
                            <div className="space-y-2">
                                {event.participants.map((participant: Participant) => (
                                    <div
                                        key={participant.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div>
                                            <div className="font-medium text-gray-900">{participant.userName}</div>
                                            <div className="text-sm text-gray-600">{participant.userEmail}</div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(participant.status)}`}>
                                            {getStatusLabel(participant.status)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    </>
                    )}

                    {activeTab === 'reports' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Report e Verbali</h3>
                                {canCreateReport && (
                                    <button
                                        onClick={() => {
                                            setEditingReport(null);
                                            setIsReportEditorOpen(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Aggiungi Verbale
                                    </button>
                                )}
                            </div>

                            {loadingReports ? (
                                <div className="text-center py-8 text-gray-500">Caricamento...</div>
                            ) : reports.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                    <p>Nessun report disponibile</p>
                                    {canCreateReport && (
                                        <p className="text-sm mt-2">Clicca su "Aggiungi Verbale" per creare il primo report</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reports.map((report: any) => (
                                        <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <div className="font-medium text-gray-900">{report.creatorName}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {new Date(report.createdAt).toLocaleString('it-IT')}
                                                    </div>
                                                </div>
                                                {report.creatorUserId === currentUser?.id && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingReport(report);
                                                                setIsReportEditorOpen(true);
                                                            }}
                                                            className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                            title="Modifica"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('Sei sicuro di voler eliminare questo report?')) {
                                                                    try {
                                                                        await eventsAPI.deleteReport(event.id, report.id);
                                                                        loadReports();
                                                                    } catch (error: any) {
                                                                        alert('Errore: ' + (error.message || 'Errore sconosciuto'));
                                                                    }
                                                                }
                                                            }}
                                                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Elimina"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                                                {report.reportContent}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Report Editor Modal */}
                {isReportEditorOpen && (
                    <EventReportEditor
                        event={event}
                        report={editingReport}
                        onClose={() => {
                            setIsReportEditorOpen(false);
                            setEditingReport(null);
                        }}
                        onSuccess={() => {
                            setIsReportEditorOpen(false);
                            setEditingReport(null);
                            loadReports();
                            if (onRefresh) onRefresh();
                        }}
                    />
                )}
            </div>
        </div>
    );
}

// Modale Crea Evento Avanzato
function CreateEventModal({ allUsers, allClients, currentUser, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        // Campi base
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        eventType: 'generic' as 'call' | 'networking' | 'formazione' | 'generic',
        // Campi Call
        eventSubtype: 'call_interna' as 'call_interna' | 'call_reparto' | 'call_clienti',
        area: '',
        clientId: '',
        callLink: '',
        // Campi Formazione
        trainerName: '',
        prerequisites: '',
        level: 'Base' as 'Base' | 'Intermedio' | 'Avanzato',
        // Campi Networking
        location: '',
        externalLink: '',
        // Inviti
        invitationRules: {
            groups: [] as string[],
            individuals: [] as string[],
            area: ''
        },
        // Ricorrenza
        recurrenceType: 'none' as 'none' | 'weekly' | 'monthly',
        recurrenceEndDate: '',
    });
    const [showIndividualSelector, setShowIndividualSelector] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Precompila data/ora di inizio e fine
    const now = new Date();
    const defaultStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 ora da ora
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000); // 1 ora dopo

    const formatDateTimeLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.title || !formData.startTime || !formData.endTime) {
            setError('Titolo, data inizio e fine sono obbligatori');
            return;
        }

        if (new Date(formData.endTime) <= new Date(formData.startTime)) {
            setError('La data di fine deve essere successiva alla data di inizio');
            return;
        }

        if (formData.eventType === 'call' && !formData.callLink) {
            setError('Il link per la call è obbligatorio per le call');
            return;
        }

        if (formData.eventType === 'call' && formData.eventSubtype === 'call_reparto' && !formData.area) {
            setError('Seleziona l\'area per la call di reparto');
            return;
        }

        if (formData.eventType === 'call' && formData.eventSubtype === 'call_clienti' && !formData.clientId) {
            setError('Seleziona il cliente per la call con clienti');
            return;
        }

        if (formData.recurrenceType !== 'none' && !formData.recurrenceEndDate) {
            setError('Specifica la data di fine ricorrenza');
            return;
        }

        try {
            setLoading(true);
            const payload: any = {
                title: formData.title,
                description: formData.description || undefined,
                startTime: formData.startTime,
                endTime: formData.endTime,
                eventType: formData.eventType,
                invitationRules: {
                    groups: formData.invitationRules.groups,
                    individuals: formData.invitationRules.individuals,
                    area: formData.invitationRules.area || undefined,
                },
                recurrenceType: formData.recurrenceType,
                recurrenceEndDate: (formData.recurrenceType === 'weekly' || formData.recurrenceType === 'monthly') ? formData.recurrenceEndDate : undefined,
            };

            // Campi specifici per Call
            if (formData.eventType === 'call') {
                payload.eventSubtype = formData.eventSubtype;
                payload.callLink = formData.callLink;
                payload.isCall = true;
                if (formData.eventSubtype === 'call_reparto') {
                    payload.area = formData.area;
                }
                if (formData.eventSubtype === 'call_clienti') {
                    payload.clientId = formData.clientId;
                }
            }

            // Campi specifici per Formazione
            if (formData.eventType === 'formazione') {
                payload.trainerName = formData.trainerName || undefined;
                payload.prerequisites = formData.prerequisites || undefined;
                payload.level = formData.level;
            }

            // Campi specifici per Networking
            if (formData.eventType === 'networking') {
                payload.location = formData.location || undefined;
                payload.externalLink = formData.externalLink || undefined;
            }

            await eventsAPI.create(payload);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Errore nella creazione dell\'evento');
        } finally {
            setLoading(false);
        }
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

    const availableGroups = [
        { id: 'manager', label: 'Manager/Responsabili' },
        { id: 'cda', label: 'CDA' },
        { id: 'associati', label: 'Associati' },
    ];

    const isManager = currentUser?.role === 'Manager' || currentUser?.role === 'Responsabile' || 
                     currentUser?.role === 'Presidente' || currentUser?.role === 'CDA' || 
                     currentUser?.role === 'Admin';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-6">Crea Nuovo Evento</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Tipo Evento */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo di Evento *
                            </label>
                            <select
                                value={formData.eventType}
                                onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value as any }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="generic">📅 Evento Generico</option>
                                <option value="call">📞 Call</option>
                                <option value="formazione">🎓 Formazione</option>
                                <option value="networking">🤝 Networking</option>
                            </select>
                        </div>

                        {/* Campi Base */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Titolo *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descrizione
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data/Ora Inizio *
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.startTime || formatDateTimeLocal(defaultStart)}
                                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data/Ora Fine *
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.endTime || formatDateTimeLocal(defaultEnd)}
                                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Campi specifici per Call */}
                        {formData.eventType === 'call' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sottotipo Call *
                                    </label>
                                    <select
                                        value={formData.eventSubtype}
                                        onChange={(e) => setFormData(prev => ({ ...prev, eventSubtype: e.target.value as any }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="call_interna">Call Interna</option>
                                        <option value="call_reparto">Call di Reparto</option>
                                        <option value="call_clienti">Call con Clienti</option>
                                    </select>
                                </div>

                                {formData.eventSubtype === 'call_reparto' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Area *
                                        </label>
                                        <select
                                            value={formData.area}
                                            onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        >
                                            <option value="">Seleziona Area</option>
                                            <option value="IT">IT</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Commerciale">Commerciale</option>
                                            <option value="CDA">CDA</option>
                                        </select>
                                    </div>
                                )}

                                {formData.eventSubtype === 'call_clienti' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Cliente *
                                        </label>
                                        <select
                                            value={formData.clientId}
                                            onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        >
                                            <option value="">Seleziona Cliente</option>
                                            {allClients.map((client: any) => (
                                                <option key={client.id} value={client.id}>{client.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Link per la Call *
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.callLink}
                                        onChange={(e) => setFormData(prev => ({ ...prev, callLink: e.target.value }))}
                                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* Campi specifici per Formazione */}
                        {formData.eventType === 'formazione' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nome Relatore/Formatore
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.trainerName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, trainerName: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Livello
                                    </label>
                                    <select
                                        value={formData.level}
                                        onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value as any }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="Base">Base</option>
                                        <option value="Intermedio">Intermedio</option>
                                        <option value="Avanzato">Avanzato</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Prerequisiti (opzionale)
                                    </label>
                                    <textarea
                                        value={formData.prerequisites}
                                        onChange={(e) => setFormData(prev => ({ ...prev, prerequisites: e.target.value }))}
                                        placeholder="Es: Conoscenza base di React, Aver letto il documento X"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        rows={2}
                                    />
                                </div>
                            </>
                        )}

                        {/* Campi specifici per Networking */}
                        {formData.eventType === 'networking' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Location (Indirizzo)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Link Esterno (opzionale)
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.externalLink}
                                        onChange={(e) => setFormData(prev => ({ ...prev, externalLink: e.target.value }))}
                                        placeholder="https://..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </>
                        )}

                        {/* Widget Selezione Invitati */}
                        {isManager && (
                            <div className="border-t pt-6">
                                <h3 className="text-lg font-semibold mb-4">Inviti</h3>
                                
                                {/* Gruppi */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Invita per Gruppo
                                    </label>
                                    <div className="space-y-2">
                                        {availableGroups.map(group => (
                                            <label key={group.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.invitationRules.groups.includes(group.id)}
                                                    onChange={() => handleToggleGroup(group.id)}
                                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-900">{group.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Singoli Utenti */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setShowIndividualSelector(!showIndividualSelector)}
                                        className="mb-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        {showIndividualSelector ? 'Nascondi' : 'Aggiungi'} Singoli Utenti
                                    </button>
                                    {showIndividualSelector && (
                                        <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                                            {allUsers
                                                .filter((u: any) => u.id !== currentUser?.id)
                                                .map((user: any) => (
                                                    <label
                                                        key={user.id}
                                                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.invitationRules.individuals.includes(user.id)}
                                                            onChange={() => handleToggleIndividual(user.id)}
                                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                        />
                                                        <div className="ml-3">
                                                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                            {user.email && (
                                                                <div className="text-xs text-gray-500">{user.email}</div>
                                                            )}
                                                        </div>
                                                    </label>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Ricorrenza */}
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold mb-4">Ricorrenza</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tipo Ricorrenza
                                    </label>
                                    <select
                                        value={formData.recurrenceType}
                                        onChange={(e) => setFormData(prev => ({ ...prev, recurrenceType: e.target.value as any }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="none">Non si ripete</option>
                                        <option value="weekly">Settimanale</option>
                                        <option value="monthly">Mensile</option>
                                    </select>
                                </div>
                                {formData.recurrenceType !== 'none' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Data Fine Ricorrenza *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.recurrenceEndDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, recurrenceEndDate: e.target.value }))}
                                            min={formData.startTime.split('T')[0]}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            required={true}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Creazione...' : 'Crea Evento'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Componente Editor Report (Verbale)
function EventReportEditor({ event, report, onClose, onSuccess }: any) {
    const [content, setContent] = useState(report?.reportContent || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!content.trim()) {
            setError('Il contenuto del report è obbligatorio');
            return;
        }

        try {
            setLoading(true);
            if (report) {
                await eventsAPI.updateReport(event.id, report.id, content);
            } else {
                await eventsAPI.createReport(event.id, content);
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Errore nel salvataggio del report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                    <X className="w-6 h-6" />
                </button>
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-6">{report ? 'Modifica Verbale' : 'Nuovo Verbale'}</h2>
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contenuto del Verbale (Markdown supportato)
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                rows={15}
                                placeholder="Scrivi il verbale dell'evento qui..."
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Puoi usare Markdown per formattare il testo (titoli, liste, grassetto, ecc.)
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                Annulla
                            </button>
                            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                {loading ? 'Salvataggio...' : (report ? 'Aggiorna' : 'Salva')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Componente Crea Sondaggio
function CreatePollModal({ allUsers, currentUser, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        title: '',
        durationMinutes: 60,
        invitationRules: { groups: [] as string[], individuals: [] as string[], area: '' },
        timeSlots: [] as Array<{ startTime: string; endTime: string }> ,
        pollType: 'fixed_slots' as 'fixed_slots' | 'open_availability',
    });
    const [showIndividualSelector, setShowIndividualSelector] = useState(false);
    const [newSlotDate, setNewSlotDate] = useState('');
    const [newSlotTime, setNewSlotTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const availableGroups = [
        { id: 'manager', label: 'Manager/Responsabili' },
        { id: 'cda', label: 'CDA' },
        { id: 'associati', label: 'Associati' },
    ];

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

    const handlePollTypeChange = (type: 'fixed_slots' | 'open_availability') => {
        setFormData(prev => ({
            ...prev,
            pollType: type,
            timeSlots: type === 'fixed_slots' ? prev.timeSlots : [],
        }));
    };

    const addTimeSlot = () => {
        if (formData.pollType !== 'fixed_slots') {
            return;
        }
        if (!newSlotDate || !newSlotTime) {
            alert('Seleziona data e ora');
            return;
        }
        const startDateTime = new Date(`${newSlotDate}T${newSlotTime}`);
        const endDateTime = new Date(startDateTime.getTime() + formData.durationMinutes * 60 * 1000);
        setFormData(prev => ({
            ...prev,
            timeSlots: [...prev.timeSlots, { startTime: startDateTime.toISOString(), endTime: endDateTime.toISOString() }]
        }));
        setNewSlotDate('');
        setNewSlotTime('');
    };

    const removeTimeSlot = (index: number) => {
        setFormData(prev => ({ ...prev, timeSlots: prev.timeSlots.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!formData.title || formData.durationMinutes <= 0) {
            setError('Titolo e durata sono obbligatori');
            return;
        }
        if (formData.pollType === 'fixed_slots' && formData.timeSlots.length === 0) {
            setError('Per la modalità "Proponi Slot" devi aggiungere almeno uno slot temporale');
            return;
        }
        if (formData.invitationRules.groups.length === 0 && formData.invitationRules.individuals.length === 0) {
            setError('Seleziona almeno un gruppo o un utente da invitare');
            return;
        }
        try {
            setLoading(true);
            const payload: any = {
                title: formData.title,
                durationMinutes: formData.durationMinutes,
                invitationRules: formData.invitationRules,
                pollType: formData.pollType,
            };
            if (formData.invitationRules.area) {
                payload.invitationRules = {
                    ...formData.invitationRules,
                    area: formData.invitationRules.area,
                };
            }
            if (formData.pollType === 'fixed_slots') {
                payload.timeSlots = formData.timeSlots;
            }
            await pollsAPI.create(payload);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Errore nella creazione del sondaggio');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                    <X className="w-6 h-6" />
                </button>
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-6">Crea Sondaggio di Disponibilità</h2>
                    {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Titolo Sondaggio *</label>
                            <input type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Es: Sondaggio per Call Cliente X" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Durata Evento (minuti) *</label>
                                <input type="number" value={formData.durationMinutes} onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 60 }))} min="15" step="15" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Modalità *</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="pollType"
                                            value="fixed_slots"
                                            checked={formData.pollType === 'fixed_slots'}
                                            onChange={() => handlePollTypeChange('fixed_slots')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span>Proponi Slot</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="pollType"
                                            value="open_availability"
                                            checked={formData.pollType === 'open_availability'}
                                            onChange={() => handlePollTypeChange('open_availability')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span>Heatmap Disponibilità</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold mb-4">Invita Partecipanti</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Invita per Gruppo</label>
                                <div className="space-y-2">
                                    {availableGroups.map(group => (
                                        <label key={group.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                            <input type="checkbox" checked={formData.invitationRules.groups.includes(group.id)} onChange={() => handleToggleGroup(group.id)} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                            <span className="ml-3 text-sm text-gray-900">{group.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <button type="button" onClick={() => setShowIndividualSelector(!showIndividualSelector)} className="mb-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                                    {showIndividualSelector ? 'Nascondi' : 'Aggiungi'} Singoli Utenti
                                </button>
                                {showIndividualSelector && (
                                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                                        {allUsers.filter((u: any) => u.id !== currentUser?.id).map((user: any) => (
                                            <label key={user.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                                <input type="checkbox" checked={formData.invitationRules.individuals.includes(user.id)} onChange={() => handleToggleIndividual(user.id)} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                    {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="border-t pt-6">
                            {formData.pollType === 'fixed_slots' ? (
                                <>
                                    <h3 className="text-lg font-semibold mb-4">Slot Temporali Proposti</h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                                            <input type="date" value={newSlotDate} onChange={(e) => setNewSlotDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Ora Inizio</label>
                                            <input type="time" value={newSlotTime} onChange={(e) => setNewSlotTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                        </div>
                                    </div>
                                    <button type="button" onClick={addTimeSlot} className="mb-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                                        <Plus className="w-4 h-4 inline mr-2" />Aggiungi Slot
                                    </button>
                                    {formData.timeSlots.length > 0 && (
                                        <div className="space-y-2">
                                            {formData.timeSlots.map((slot, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <span className="text-sm">{new Date(slot.startTime).toLocaleString('it-IT')} - {new Date(slot.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <button type="button" onClick={() => removeTimeSlot(index)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
                                    <h3 className="text-lg font-semibold text-indigo-900">Modalità Heatmap</h3>
                                    <p className="text-sm text-indigo-800">
                                        Gli invitati potranno indicare gli slot disponibili colorando il calendario. Potrai vedere una heatmap aggregata e organizzare l'evento direttamente sullo slot con più consensi.
                                    </p>
                                    <p className="text-xs text-indigo-700">
                                        Suggerimento: comunica nelle note del sondaggio (descrizione successiva) eventuali vincoli di giorni/ore da considerare.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Annulla</button>
                            <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
                                {loading ? 'Creazione...' : 'Crea Sondaggio'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Componente Visualizza/Vota Sondaggio
function PollViewModal({ poll, currentUser, allClients, onClose, onSuccess }: any) {
    const [pollData, setPollData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'vote' | 'results'>('vote');
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [availabilitySlots, setAvailabilitySlots] = useState<string[]>([]);
    const [availabilityWeekStart, setAvailabilityWeekStart] = useState<Date>(getWeekStart(new Date()));
    const [heatmapWeekStart, setHeatmapWeekStart] = useState<Date>(getWeekStart(new Date()));
    const [heatmapData, setHeatmapData] = useState<HeatmapSlot[]>([]);
    const [heatmapSelection, setHeatmapSelection] = useState<HeatmapSlot | null>(null);
    const [heatmapLoading, setHeatmapLoading] = useState(false);
    const [voting, setVoting] = useState(false);
    const [organizingSlot, setOrganizingSlot] = useState<string | null>(null);
    const [organizingHeatmapSlot, setOrganizingHeatmapSlot] = useState<string | null>(null);
    const [organizeLoading, setOrganizeLoading] = useState(false);
    const [organizeFormData, setOrganizeFormData] = useState<OrganizeFormState>(() => createDefaultOrganizeForm(poll.title));
    const [closing, setClosing] = useState(false);

    const isCreator = poll.creatorUserId === currentUser?.id;

    const loadPollDetails = useCallback(async () => {
      try {
        setLoading(true);
        const data = await pollsAPI.getById(poll.id);
        setPollData(data);

        if (data.pollType === 'fixed_slots' && Array.isArray(data.slots)) {
          const userVotes = data.slots
            .filter((slot: any) => slot.votes?.some((v: any) => v.userId === currentUser?.id))
            .map((slot: any) => slot.id);
          setSelectedSlots(userVotes);
          setAvailabilitySlots([]);
        } else if (data.pollType === 'open_availability') {
          const normalized = Array.isArray(data.myAvailabilitySlots)
            ? data.myAvailabilitySlots
                .map((slot: string) => new Date(slot).toISOString())
                .sort()
            : [];
          setAvailabilitySlots(normalized);
          if (normalized.length > 0) {
            setAvailabilityWeekStart(getWeekStart(new Date(normalized[0])));
          }
          setSelectedSlots([]);
        }
      } catch (error) {
        console.error('Errore caricamento dettagli sondaggio:', error);
      } finally {
        setLoading(false);
      }
    }, [poll.id, currentUser?.id]);

    useEffect(() => {
      loadPollDetails();
    }, [loadPollDetails]);

    useEffect(() => {
      if (pollData?.status === 'closed') {
        setActiveView('results');
      }
    }, [pollData?.status]);

    const loadHeatmap = useCallback(async () => {
      try {
        setHeatmapLoading(true);
        const data = await pollsAPI.heatmap(poll.id);
        const slots: HeatmapSlot[] = data?.slots ?? [];
        setHeatmapData(slots);
        if (slots.length > 0) {
          const earliest = [...slots]
            .map(slot => new Date(slot.slotStartTime).toISOString())
            .sort()[0];
          if (earliest) {
            setHeatmapWeekStart(getWeekStart(new Date(earliest)));
          }
        } else {
          setHeatmapSelection(null);
          setOrganizingHeatmapSlot(null);
        }
      } catch (error) {
        console.error('Errore caricamento heatmap:', error);
      } finally {
        setHeatmapLoading(false);
      }
    }, [poll.id]);

    useEffect(() => {
      if (pollData?.pollType === 'open_availability' && activeView === 'results' && isCreator) {
        loadHeatmap();
      }
    }, [pollData?.pollType, activeView, isCreator, loadHeatmap]);

    useEffect(() => {
      setOrganizeFormData((prev: OrganizeFormState) => ({ ...prev, title: poll.title || prev.title }));
    }, [poll.title]);

    const isFixedPoll = pollData?.pollType === 'fixed_slots';
    const durationMinutes = pollData?.durationMinutes ?? poll.durationMinutes ?? 60;
    const selectedHeatmapUsers: HeatmapSlotUser[] = heatmapSelection?.users ?? [];
    const selectedHeatmapUserCount = selectedHeatmapUsers.length;
    const isClosed = pollData?.status === 'closed';

    const formatDateTime = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const handleVoteFixed = async () => {
      if (selectedSlots.length === 0) {
        alert('Seleziona almeno uno slot');
        return;
      }
      try {
        setVoting(true);
        await pollsAPI.vote(poll.id, selectedSlots);
        await loadPollDetails();
        alert('Voto registrato con successo!');
      } catch (error: any) {
        alert('Errore: ' + (error.message || 'Errore sconosciuto'));
      } finally {
        setVoting(false);
      }
    };

    const handleSaveAvailability = async () => {
      try {
        setVoting(true);
        await pollsAPI.submitAvailability(poll.id, availabilitySlots);
        await loadPollDetails();
        alert('Disponibilità registrate con successo!');
      } catch (error: any) {
        alert('Errore: ' + (error.message || 'Errore sconosciuto'));
      } finally {
        setVoting(false);
      }
    };

    const handleSelectHeatmapSlot = (slot: HeatmapSlot) => {
      setOrganizingHeatmapSlot(slot.slotStartTime);
      setHeatmapSelection(slot);
      setOrganizingSlot(null);
      setOrganizeFormData(createDefaultOrganizeForm(pollData?.title || poll.title));
    };

    const handleOrganize = async ({ slotId, slotStartTime }: { slotId?: string; slotStartTime?: string }) => {
      if (!organizeFormData.title.trim()) {
        alert('Inserisci un titolo per l\'evento');
        return;
      }

      try {
        setOrganizeLoading(true);
        const payload: any = {
          ...organizeFormData,
          invitationRules: pollData?.invitationRules || poll.invitationRules || {},
        };

        if (pollData?.pollType === 'fixed_slots') {
          payload.slotId = slotId;
        } else {
          payload.slotStartTime = slotStartTime;
        }

        await pollsAPI.organize(poll.id, payload);
        alert('Evento creato con successo!');
        setOrganizeFormData(createDefaultOrganizeForm(poll.title));
        setOrganizingSlot(null);
        setOrganizingHeatmapSlot(null);
        setHeatmapSelection(null);
        onSuccess();
      } catch (error: any) {
        alert('Errore: ' + (error.message || 'Errore sconosciuto'));
      } finally {
        setOrganizeLoading(false);
      }
    };

    const handleClosePoll = async () => {
      if (!window.confirm('Sei sicuro di voler chiudere definitivamente questo sondaggio?')) {
        return;
      }

      try {
        setClosing(true);
        await pollsAPI.close(poll.id);
        alert('Sondaggio chiuso con successo!');
        onSuccess();
        onClose();
      } catch (error: any) {
        alert('Errore: ' + (error.message || 'Errore sconosciuto'));
      } finally {
        setClosing(false);
      }
    };

    if (loading || !pollData) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl p-6">
            <div className="text-center py-8">Caricamento...</div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
            <X className="w-6 h-6" />
          </button>
          <div className="p-6">
            <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between md:pr-14">
              <h2 className="text-2xl font-bold">{pollData.title}</h2>
              {isCreator && !isClosed && (
                <button
                  type="button"
                  onClick={handleClosePoll}
                  disabled={closing}
                  className="inline-flex items-center justify-center self-start px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg transition-colors hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed md:self-center"
                >
                  {closing ? 'Chiusura...' : 'Chiudi sondaggio'}
                </button>
              )}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Durata prevista: {durationMinutes} minuti • Creato da: {pollData.creatorName}
            </div>
            {isClosed && (
              <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                Questo sondaggio è stato chiuso. Puoi comunque consultare i risultati nella scheda dedicata.
              </div>
            )}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveView('vote')}
                className={cn(
                  'px-4 py-2 font-medium transition-colors',
                  activeView === 'vote' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 hover:text-gray-900',
                  isClosed && 'pointer-events-none opacity-50'
                )}
                disabled={isClosed}
              >
                <CheckSquare className="w-4 h-4 inline mr-2" />Vota Disponibilità
              </button>
              {isCreator && (
                <button
                  onClick={() => setActiveView('results')}
                  className={cn(
                    'px-4 py-2 font-medium transition-colors',
                    activeView === 'results' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <BarChart3 className="w-4 h-4 inline mr-2" />Risultati
                </button>
              )}
            </div>

            {activeView === 'vote' && !isClosed && (
              isFixedPoll ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Seleziona gli slot per cui sei disponibile</h3>
                  {pollData.slots && pollData.slots.length > 0 ? (
                    <div className="space-y-3 mb-6">
                      {pollData.slots.map((slot: any) => (
                        <label
                          key={slot.id}
                          className={cn(
                            'flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors',
                            selectedSlots.includes(slot.id)
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSlots.includes(slot.id)}
                            onChange={() => {
                              setSelectedSlots(prev =>
                                prev.includes(slot.id)
                                  ? prev.filter(id => id !== slot.id)
                                  : [...prev, slot.id]
                              );
                            }}
                            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <div className="ml-4 flex-1">
                            <div className="font-medium text-gray-900">
                              {new Date(slot.startTime).toLocaleString('it-IT', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="text-sm text-gray-600">
                              Fino alle {new Date(slot.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {slot.votes && slot.votes.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {slot.votes.length} {slot.votes.length === 1 ? 'persona disponibile' : 'persone disponibili'}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">Nessuno slot disponibile</div>
                  )}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      Chiudi
                    </button>
                    <button
                      onClick={handleVoteFixed}
                      disabled={voting || selectedSlots.length === 0}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {voting ? 'Salvataggio...' : 'Salva Voto'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Seleziona tutti gli slot in cui sei disponibile. Puoi navigare tra le settimane per indicare disponibilità future.
                  </p>
                  <AvailabilitySelector
                    durationMinutes={durationMinutes}
                    selectedSlots={availabilitySlots}
                    onChange={setAvailabilitySlots}
                    weekStart={availabilityWeekStart}
                    onWeekChange={setAvailabilityWeekStart}
                  />
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      Chiudi
                    </button>
                    <button
                      onClick={handleSaveAvailability}
                      disabled={voting}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {voting ? 'Salvataggio...' : 'Salva disponibilità'}
                    </button>
                  </div>
                </div>
              )
            )}

            {activeView === 'results' && (
              !isCreator ? (
                <div className="text-sm text-gray-500">Solo il creatore del sondaggio può visualizzare i risultati.</div>
              ) : isFixedPoll ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Griglia Disponibilità</h3>
                  {pollData.slots && pollData.slots.length > 0 ? (
                    <div className="space-y-4">
                      {pollData.slots.map((slot: any) => {
                        const voters = slot.votes || [];
                        const votersCount = voters.length;
                        return (
                          <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {new Date(slot.startTime).toLocaleString('it-IT', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Fino alle {new Date(slot.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-indigo-600">{votersCount}</div>
                                <div className="text-xs text-gray-600">disponibili</div>
                              </div>
                            </div>
                            {voters.length > 0 && (
                              <div className="mb-4">
                                <div className="text-sm font-medium text-gray-700 mb-2">Persone disponibili:</div>
                                <div className="flex flex-wrap gap-2">
                                  {voters.map((vote: any) => (
                                    <span key={vote.id} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">{vote.userName}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (organizingSlot === slot.id) {
                                  setOrganizingSlot(null);
                                } else {
                                  setOrganizingSlot(slot.id);
                                  setOrganizingHeatmapSlot(null);
                                  setHeatmapSelection(null);
                                  setOrganizeFormData(createDefaultOrganizeForm(pollData.title));
                                }
                              }}
                              disabled={votersCount === 0}
                              className={cn(
                                'w-full px-4 py-2 bg-purple-600 text-white rounded-lg transition-colors',
                                votersCount === 0
                                  ? 'opacity-60 cursor-not-allowed'
                                  : 'hover:bg-purple-700'
                              )}
                            >
                              {organizingSlot === slot.id ? 'Chiudi form' : 'Organizza Evento per questo Slot'}
                            </button>
                            {organizingSlot === slot.id && (
                              <EventOrganizeForm
                                formData={organizeFormData}
                                setFormData={setOrganizeFormData}
                                allClients={allClients}
                                onCancel={() => setOrganizingSlot(null)}
                                onSubmit={() => handleOrganize({ slotId: slot.id })}
                                submitting={organizeLoading}
                                submitLabel="Crea Evento"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">Nessuno slot disponibile</div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <HeatmapGrid
                    durationMinutes={durationMinutes}
                    data={heatmapData}
                    weekStart={heatmapWeekStart}
                    onWeekChange={setHeatmapWeekStart}
                    loading={heatmapLoading}
                    selectedSlot={organizingHeatmapSlot}
                    onSelectSlot={handleSelectHeatmapSlot}
                  />
                  {heatmapSelection ? (
                    <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-indigo-900">Slot selezionato</div>
                          <div className="text-sm text-indigo-800">
                            {formatDateTime(heatmapSelection.slotStartTime)} • Durata {durationMinutes} minuti
                          </div>
                          <div className="text-xs text-indigo-700">
                            {heatmapSelection.availableUsers} persone disponibili
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOrganizingHeatmapSlot(null);
                            setHeatmapSelection(null);
                          }}
                          className="self-start px-3 py-1 text-xs font-medium bg-white text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-100"
                        >
                          Annulla selezione
                        </button>
                      </div>
                      {selectedHeatmapUserCount > 0 && (
                        <div>
                          <div className="text-xs font-medium text-indigo-900 mb-2 uppercase tracking-wide">Disponibili</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedHeatmapUsers.map((user: HeatmapSlotUser) => (
                              <span key={user.userId} className="px-2 py-1 text-xs bg-white border border-indigo-200 rounded text-indigo-700">
                                {user.userName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <EventOrganizeForm
                        formData={organizeFormData}
                        setFormData={setOrganizeFormData}
                        allClients={allClients}
                        onCancel={() => {
                          setOrganizingHeatmapSlot(null);
                          setHeatmapSelection(null);
                        }}
                        onSubmit={() => handleOrganize({ slotStartTime: heatmapSelection.slotStartTime })}
                        submitting={organizeLoading}
                        submitLabel="Crea Evento"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Seleziona uno slot dalla heatmap per organizzare l'evento.</p>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  function AvailabilitySelector({ durationMinutes, selectedSlots, onChange, weekStart, onWeekChange }: AvailabilitySelectorProps) {
    const weekGrid = useMemo(() => generateWeekSlots(weekStart, durationMinutes), [weekStart, durationMinutes]);
    const timeSlots = weekGrid[0]?.slots ?? [];
    const now = Date.now();

    const toggleSlot = (iso: string) => {
      let updated: string[];
      if (selectedSlots.includes(iso)) {
        updated = selectedSlots.filter(slot => slot !== iso);
      } else {
        updated = [...selectedSlots, iso];
      }
      updated.sort();
      onChange(updated);
    };

    const handlePrevWeek = () => onWeekChange(addDays(weekStart, -7));
    const handleNextWeek = () => onWeekChange(addDays(weekStart, 7));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" /> Settimana precedente
          </button>
          <span className="font-semibold text-sm sm:text-base">{formatWeekRange(weekStart)}</span>
          <button
            type="button"
            onClick={handleNextWeek}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Prossima settimana <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-lg overflow-hidden text-xs sm:text-sm min-w-[720px]">
            <div className="bg-white font-semibold p-2 text-center">Orario</div>
            {weekGrid.map((day: WeekDaySlots) => (
              <div key={day.day.toISOString()} className="bg-white font-semibold p-2 text-center capitalize">
                {formatDayLabel(day.day)}
              </div>
            ))}
            {timeSlots.map((slotTime: Date, rowIndex: number) => (
              <React.Fragment key={slotTime.toISOString()}>
                <div className="bg-white p-2 font-medium text-center">{formatTimeLabel(slotTime)}</div>
                {weekGrid.map((day: WeekDaySlots) => {
                  const slot = day.slots[rowIndex];
                  if (!slot) {
                    return <div key={`${day.day.toISOString()}-${rowIndex}`} className="bg-gray-50" />;
                  }
                  const iso = slot.toISOString();
                  const isSelected = selectedSlots.includes(iso);
                  const isPast = slot.getTime() < now;
                  return (
                    <button
                      key={`${day.day.toISOString()}-${rowIndex}`}
                      type="button"
                      onClick={() => !isPast && toggleSlot(iso)}
                      disabled={isPast}
                      className={cn(
                        'h-12 w-full flex items-center justify-center text-xs sm:text-sm transition-colors',
                        isPast
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isSelected
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-white hover:bg-indigo-50',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
                      )}
                      title={isPast ? 'Slot scaduto' : isSelected ? 'Slot selezionato' : 'Indica disponibilità'}
                    >
                      {isSelected ? '✔' : ''}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function HeatmapGrid({ durationMinutes, data, weekStart, onWeekChange, loading, selectedSlot, onSelectSlot }: HeatmapGridProps) {
    const weekGrid = useMemo(() => generateWeekSlots(weekStart, durationMinutes), [weekStart, durationMinutes]);
    const timeSlots = weekGrid[0]?.slots ?? [];
    const dataMap = useMemo(() => {
      const map = new Map<string, HeatmapSlot>();
      data.forEach((slot: HeatmapSlot) => {
        const iso = new Date(slot.slotStartTime).toISOString();
        map.set(iso, slot);
      });
      return map;
    }, [data]);
    const maxCount = useMemo(
      () => data.reduce((max: number, slot: HeatmapSlot) => Math.max(max, slot.availableUsers ?? 0), 0),
      [data]
    );

    const handlePrevWeek = () => onWeekChange(addDays(weekStart, -7));
    const handleNextWeek = () => onWeekChange(addDays(weekStart, 7));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" /> Settimana precedente
          </button>
          <span className="font-semibold text-sm sm:text-base">{formatWeekRange(weekStart)}</span>
          <button
            type="button"
            onClick={handleNextWeek}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Prossima settimana <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="text-center py-6 text-sm text-gray-500">Caricamento heatmap...</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-lg overflow-hidden text-xs sm:text-sm min-w-[720px]">
              <div className="bg-white font-semibold p-2 text-center">Orario</div>
              {weekGrid.map((day: WeekDaySlots) => (
                <div key={day.day.toISOString()} className="bg-white font-semibold p-2 text-center capitalize">
                  {formatDayLabel(day.day)}
                </div>
              ))}
              {timeSlots.map((slotTime: Date, rowIndex: number) => (
                <React.Fragment key={slotTime.toISOString()}>
                  <div className="bg-white p-2 font-medium text-center">{formatTimeLabel(slotTime)}</div>
                  {weekGrid.map((day: WeekDaySlots) => {
                    const slot = day.slots[rowIndex];
                    if (!slot) {
                      return <div key={`${day.day.toISOString()}-${rowIndex}`} className="bg-gray-50" />;
                    }
                    const iso = slot.toISOString();
                    const slotInfo = dataMap.get(iso);
                    const count = slotInfo?.availableUsers ?? 0;
                    const disabled = !slotInfo || count === 0;
                    return (
                      <button
                        key={`${day.day.toISOString()}-${rowIndex}`}
                        type="button"
                        disabled={disabled}
                        onClick={() => slotInfo && onSelectSlot(slotInfo)}
                        className={cn(
                          'h-12 w-full flex flex-col items-center justify-center text-xs sm:text-sm transition-colors px-2 text-center',
                          getHeatmapColorClass(count, maxCount),
                          disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-95',
                          selectedSlot === iso && 'ring-2 ring-purple-500 ring-offset-2'
                        )}
                        title={slotInfo?.users?.map((user: HeatmapSlotUser) => user.userName).join(', ') || 'Nessuna disponibilità registrata'}
                      >
                        <span className="font-semibold">{count > 0 ? count : '-'}</span>
                        <span className="text-[10px] sm:text-xs uppercase tracking-wide">Disponibili</span>
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3 w-3 rounded-full bg-white border border-gray-300" /> 0
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3 w-3 rounded-full bg-emerald-100" /> Basso
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3 w-3 rounded-full bg-emerald-300" /> Medio
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3 w-3 rounded-full bg-emerald-500" /> Alto
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3 w-3 rounded-full bg-emerald-600" /> Massimo consenso
          </div>
        </div>
      </div>
    );
  }

  function EventOrganizeForm({ formData, setFormData, allClients, onCancel, onSubmit, submitting, submitLabel }: EventOrganizeFormProps) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titolo Evento *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((prev: OrganizeFormState) => ({ ...prev, title: e.target.value }))}
            placeholder="Titolo dell'evento"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Evento</label>
          <select
            value={formData.eventType}
            onChange={(e) => {
              const value = e.target.value as OrganizeFormState['eventType'];
              setFormData((prev: OrganizeFormState) => ({
                ...prev,
                eventType: value,
                eventSubtype: value === 'call' ? prev.eventSubtype : 'call_interna',
                area: value === 'call' ? prev.area : '',
                clientId: value === 'call' ? prev.clientId : '',
                callLink: value === 'call' ? prev.callLink : '',
              }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="generic">📅 Evento Generico</option>
            <option value="call">📞 Call</option>
            <option value="formazione">🎓 Formazione</option>
            <option value="networking">🤝 Networking</option>
          </select>
        </div>
        {formData.eventType === 'call' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sottotipo Call</label>
              <select
                value={formData.eventSubtype}
                onChange={(e) => {
                  const value = e.target.value as OrganizeFormState['eventSubtype'];
                  setFormData((prev: OrganizeFormState) => ({
                    ...prev,
                    eventSubtype: value,
                    area: value === 'call_reparto' ? prev.area : '',
                    clientId: value === 'call_clienti' ? prev.clientId : '',
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="call_interna">Call Interna</option>
                <option value="call_reparto">Call di Reparto</option>
                <option value="call_clienti">Call con Clienti</option>
              </select>
            </div>
            {formData.eventSubtype === 'call_reparto' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                <select
                  value={formData.area}
                  onChange={(e) => setFormData((prev: OrganizeFormState) => ({ ...prev, area: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Seleziona Area</option>
                  <option value="IT">IT</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Commerciale">Commerciale</option>
                </select>
              </div>
            )}
            {formData.eventSubtype === 'call_clienti' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData((prev: OrganizeFormState) => ({ ...prev, clientId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Seleziona Cliente</option>
                  {allClients.map((client: any) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link per la Call</label>
              <input
                type="url"
                value={formData.callLink}
                onChange={(e) => setFormData((prev: OrganizeFormState) => ({ ...prev, callLink: e.target.value }))}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione (opzionale)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData((prev: OrganizeFormState) => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || !formData.title.trim()}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creazione...' : submitLabel}
          </button>
        </div>
      </div>
    );
  }

  const AVAILABILITY_HOURS = { start: 8, end: 20 };

  function createDefaultOrganizeForm(defaultTitle?: string): OrganizeFormState {
    return {
      title: defaultTitle || '',
      description: '',
      eventType: 'call',
      eventSubtype: 'call_interna',
      area: '',
      clientId: '',
      callLink: '',
    };
  }

  function getWeekStart(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function addDays(date: Date, amount: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function formatWeekRange(weekStart: Date): string {
    const end = addDays(weekStart, 6);
    return `${weekStart.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`;
  }

  function formatDayLabel(date: Date): string {
    return date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }

  function formatTimeLabel(date: Date): string {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function generateWeekSlots(weekStart: Date, durationMinutes: number): WeekDaySlots[] {
    const days: WeekDaySlots[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i);
      const daySlots: Date[] = [];
      let slotPointer = new Date(dayDate);
      slotPointer.setHours(AVAILABILITY_HOURS.start, 0, 0, 0);

      while (true) {
        const slotStart = new Date(slotPointer);
        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

        if (slotEnd.getDate() !== dayDate.getDate()) {
          break;
        }
        if (
          slotEnd.getHours() > AVAILABILITY_HOURS.end ||
          (slotEnd.getHours() === AVAILABILITY_HOURS.end && slotEnd.getMinutes() > 0)
        ) {
          break;
        }

        daySlots.push(slotStart);
        slotPointer = new Date(slotPointer.getTime() + durationMinutes * 60000);

        if (slotPointer.getDate() !== dayDate.getDate()) {
          break;
        }
      }

      days.push({ day: dayDate, slots: daySlots });
    }
    return days;
  }

  function getHeatmapColorClass(count: number, max: number): string {
    if (count === 0) {
      return 'bg-white text-gray-400';
    }
    if (max <= 1) {
      return 'bg-emerald-200 text-emerald-900';
    }
    const ratio = count / max;
    if (ratio > 0.75) return 'bg-emerald-600 text-white';
    if (ratio > 0.5) return 'bg-emerald-500 text-white';
    if (ratio > 0.25) return 'bg-emerald-300 text-emerald-900';
    return 'bg-emerald-100 text-emerald-900';
  }

