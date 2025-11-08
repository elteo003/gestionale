# 🔄 Flussi Dinamici - Logica Condizionale Frontend

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Sviluppatori Frontend** che implementano logica condizionale
- **UI/UX Designers** che progettano interfacce dinamiche

## Dashboard Dinamiche per Ruolo (Sezioni 1-7)

### Architettura

Le dashboard sono **completamente dinamiche** in base al ruolo dell'utente loggato. Il componente `DashboardRole` gestisce la logica di rendering condizionale.

### Flusso di Rendering

```mermaid
graph TD
    A[User Logs In] -->|Token Decoded| B[Extract user.role]
    B --> C{Switch user.role}
    C -->|Presidente| D[Dashboard Presidente]
    C -->|Tesoreria| E[Dashboard Tesoreria]
    C -->|Marketing| F[Dashboard Marketing]
    C -->|Commerciale| G[Dashboard Commerciale]
    C -->|IT| H[Dashboard IT]
    C -->|CDA| I[Dashboard CDA]
    C -->|Audit| J[Dashboard Audit]
    
    D --> K[GET /api/dashboard?role=presidente]
    E --> L[GET /api/dashboard?role=tesoreria]
    F --> M[GET /api/dashboard?role=marketing]
    G --> N[GET /api/dashboard?role=commerciale]
    H --> O[GET /api/dashboard?role=it]
    I --> P[GET /api/dashboard?role=cda]
    J --> Q[GET /api/dashboard?role=audit]
    
    K --> R[Render KPI Cards]
    L --> R
    M --> R
    N --> R
    O --> R
    P --> R
    Q --> R
    
    R --> S[Render Charts]
    S --> T[Render Lists]
```

### Implementazione Componente

**File**: `components/DashboardRole.tsx`

```typescript
function DashboardRole({ user, clients, projects, contracts, events }: Props) {
    const [kpis, setKPIs] = useState<any[]>([]);
    const [charts, setCharts] = useState<any[]>([]);
    const [lists, setLists] = useState<any[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, [user?.role]);

    const loadDashboardData = async () => {
        // Chiamata API con ruolo utente
        const data = await apiCall('GET', `/api/dashboard?role=${user.role}`);
        setKPIs(data.kpis);
        setCharts(data.charts);
        setLists(data.lists);
    };

    // Render condizionale in base al ruolo
    switch (user?.role) {
        case 'Presidente':
            return <DashboardPresidente kpis={kpis} charts={charts} lists={lists} />;
        case 'Tesoreria':
            return <DashboardTesoreria kpis={kpis} charts={charts} lists={lists} />;
        // ... altri ruoli
        default:
            return <DashboardDefault />;
    }
}
```

### Esempio: Dashboard Tesoreria

**KPI Cards**:
- **Incassato (Anno)**: Somma contratti/fatture `status = 'Pagato'`
- **Da Incassare**: Somma fatture `status = 'Inviata'`
- **Fatture Scadute**: Fatture inviate con data > 30gg fa
- **Preventivi da Approvare**: Somma preventivi `status = 'Inviato'`

**Charts**:
- Grafico a Linee: Flusso di Cassa (Ultimi 6 Mesi)

**Lists**:
- Fatture Scadute (Azione Richiesta)
- Progetti da Fatturare

## Form Dinamici per Tipo Evento (Sezione 10.3)

### Architettura

Il modale "Crea Evento" (`Calendar.tsx`) cambia **dinamicamente** i campi visibili in base al `eventType` selezionato.

### Diagramma di Flusso

```mermaid
stateDiagram-v2
    [*] --> BaseForm: Apre Modale
    BaseForm --> SelectType: Utente seleziona eventType
    
    SelectType --> CallForm: eventType = 'call'
    SelectType --> FormazioneForm: eventType = 'formazione'
    SelectType --> NetworkingForm: eventType = 'networking'
    SelectType --> GenericForm: eventType = 'generic'
    
    CallForm --> CallSubtype: Seleziona sottotipo
    CallSubtype --> CallReparto: eventSubtype = 'call_reparto'
    CallSubtype --> CallClienti: eventSubtype = 'call_clienti'
    CallSubtype --> CallInterna: eventSubtype = 'call_interna'
    
    CallReparto --> AreaSelect: Mostra Select Area
    CallClienti --> ClienteSelect: Mostra Select Cliente
    
    FormazioneForm --> SessioniForm: Se ricorrenza
    FormazioneForm --> MaterialiForm: Bottone Aggiungi Materiale
    
    NetworkingForm --> LocationInput: Mostra Location
    NetworkingForm --> ExternalLinkInput: Mostra Link Esterno
    
    CallForm --> Submit
    FormazioneForm --> Submit
    NetworkingForm --> Submit
    GenericForm --> Submit
    [*] <-- Submit
```

### Implementazione

**File**: `components/Calendar.tsx` (CreateEventModal)

```typescript
function CreateEventModal({ onClose, onSuccess }: Props) {
    const [eventType, setEventType] = useState<'call' | 'formazione' | 'networking' | 'generic'>('generic');
    const [eventSubtype, setEventSubtype] = useState<string>('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        // Campi comuni
        invitationRules: { groups: [], individuals: [] },
        recurrenceType: 'none',
        // Campi Call
        callLink: '',
        clientId: '',
        area: '',
        // Campi Formazione
        trainerName: '',
        level: '',
        prerequisites: '',
        // Campi Networking
        location: '',
        externalLink: '',
    });

    // Render condizionale campi
    return (
        <form>
            {/* Campi Comuni (sempre visibili) */}
            <input type="text" placeholder="Titolo" />
            <input type="datetime-local" placeholder="Data Inizio" />
            
            {/* Select Tipo Evento */}
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option value="generic">📅 Evento Generico</option>
                <option value="call">📞 Call</option>
                <option value="formazione">🎓 Formazione</option>
                <option value="networking">🤝 Networking</option>
            </select>

            {/* Campi Dinamici Call */}
            {eventType === 'call' && (
                <>
                    <select value={eventSubtype} onChange={(e) => setEventSubtype(e.target.value)}>
                        <option value="call_interna">Call Interna</option>
                        <option value="call_reparto">Call di Reparto</option>
                        <option value="call_clienti">Call con Clienti</option>
                    </select>

                    {eventSubtype === 'call_reparto' && (
                        <select value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})}>
                            <option value="">Seleziona Area</option>
                            <option value="IT">IT</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Commerciale">Commerciale</option>
                        </select>
                    )}

                    {eventSubtype === 'call_clienti' && (
                        <select value={formData.clientId} onChange={(e) => setFormData({...formData, clientId: e.target.value})}>
                            <option value="">Seleziona Cliente</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    )}

                    <input type="url" placeholder="Link per la Call" value={formData.callLink} />
                </>
            )}

            {/* Campi Dinamici Formazione */}
            {eventType === 'formazione' && (
                <>
                    <input type="text" placeholder="Nome Relatore/Formatore" value={formData.trainerName} />
                    <select value={formData.level}>
                        <option value="Base">Base</option>
                        <option value="Intermedio">Intermedio</option>
                        <option value="Avanzato">Avanzato</option>
                    </select>
                    <textarea placeholder="Prerequisiti" value={formData.prerequisites} />
                    
                    {/* Gestione Sessioni (se ricorrenza) */}
                    {formData.recurrenceType !== 'none' && (
                        <SessioniManager sessions={sessions} />
                    )}
                    
                    {/* Gestione Materiale */}
                    <button onClick={openMaterialiModal}>Aggiungi Materiale</button>
                </>
            )}

            {/* Campi Dinamici Networking */}
            {eventType === 'networking' && (
                <>
                    <input type="text" placeholder="Location (Indirizzo)" value={formData.location} />
                    <input type="url" placeholder="Link Esterno" value={formData.externalLink} />
                    <input type="number" placeholder="Limite Partecipanti" />
                </>
            )}

            {/* Widget Invitati (sempre visibile) */}
            <InvitationRulesWidget 
                rules={formData.invitationRules}
                onChange={(rules) => setFormData({...formData, invitationRules: rules})}
            />

            {/* Widget Ricorrenza (sempre visibile) */}
            <RecurrenceWidget 
                type={formData.recurrenceType}
                endDate={formData.recurrenceEndDate}
                onChange={(type, endDate) => setFormData({...formData, recurrenceType: type, recurrenceEndDate: endDate})}
            />
        </form>
    );
}
```

### Widget Invitati

**Componente**: `InvitationRulesWidget`

```typescript
function InvitationRulesWidget({ rules, onChange }: Props) {
    const [groups, setGroups] = useState<string[]>(rules.groups || []);
    const [individuals, setIndividuals] = useState<string[]>(rules.individuals || []);

    const toggleGroup = (group: string) => {
        const newGroups = groups.includes(group)
            ? groups.filter(g => g !== group)
            : [...groups, group];
        setGroups(newGroups);
        onChange({ groups: newGroups, individuals });
    };

    return (
        <div>
            <h3>Gruppi</h3>
            {['Manager', 'CDA', 'Associati'].map(group => (
                <label key={group}>
                    <input 
                        type="checkbox" 
                        checked={groups.includes(group)}
                        onChange={() => toggleGroup(group)}
                    />
                    {group}
                </label>
            ))}
            
            <h3>Utenti Singoli</h3>
            {allUsers.map(user => (
                <label key={user.id}>
                    <input 
                        type="checkbox"
                        checked={individuals.includes(user.id)}
                        onChange={() => toggleIndividual(user.id)}
                    />
                    {user.name}
                </label>
            ))}
        </div>
    );
}
```

### Widget Ricorrenza

**Componente**: `RecurrenceWidget`

```typescript
function RecurrenceWidget({ type, endDate, onChange }: Props) {
    return (
        <div>
            <select value={type} onChange={(e) => onChange(e.target.value, endDate)}>
                <option value="none">Nessuna Ricorrenza</option>
                <option value="weekly">Settimanale</option>
                <option value="monthly">Mensile</option>
            </select>

            {type !== 'none' && (
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => onChange(type, e.target.value)}
                    placeholder="Data Fine Ricorrenza"
                />
            )}
        </div>
    );
}
```

## Flusso Sondaggi (Sezione 12)

### Modalità Disponibili

Il campo **"Da pianificare"** ora offre due modalità distinte che l'organizzatore seleziona in fase di creazione del sondaggio:

1. **Sondaggio Classico – Proponi Slot (`poll_type = "fixed_slots"`)**
   - L'organizzatore propone da 2 a 5 slot specifici.
   - Gli invitati esprimono disponibilità sì/no sugli slot proposti.
   - I dati persistono in `poll_time_slots` e `poll_votes`.
   - Il manager finalizza scegliendo lo slot migliore dalla tabella riepilogativa.

2. **Sondaggio Heatmap – Raccogli Disponibilità (`poll_type = "open_availability"`)**
   - L'organizzatore definisce titolo, invitati e durata dello slot (30/60 minuti, configurabile).
   - Non vengono proposti slot; gli invitati selezionano liberamente gli intervalli disponibili sul calendario.
   - Ogni selezione genera righe nella nuova tabella `open_availability_votes`.
   - Il manager visualizza una heatmap con l'intensità della disponibilità per ogni intervallo e può confermare direttamente lo slot migliore.

### Diagramma Overview Modalità

```mermaid
graph TD
    A["Manager: Clic su 'Da pianificare'"] --> B{Seleziona modalità}
    B -->|Proponi Slot| C[Compila form con slot definiti]
    C --> D[POST /api/polls (poll_type=fixed_slots)]
    D --> E[Invitati votano slot]
    E --> F[Manager sceglie slot migliore]
    F --> G[Organizza evento finale]

    B -->|Raccogli Disponibilità| H[Definisce durata + invitati]
    H --> I[POST /api/polls (poll_type=open_availability)]
    I --> J[Invitati colorano disponibilità]
    J --> K[Heatmap aggregata]
    K --> L[Manager clicca slot heatmap]
    L --> G
```

### Architettura Heatmap

```mermaid
graph LR
    subgraph Frontend
        V[PollViewModal \n Modalità Heatmap]
        HM[HeatmapCalendar]
    end
    subgraph Backend
        SP[(scheduling_polls)]
        OA[(open_availability_votes)]
    end
    V -->|POST disponibilità| OA
    HM -->|GET /api/polls/:id/heatmap| OA
    SP --> HM
    HM -->|Selezione slot ottimale| V
    V -->|POST /api/polls/:id/organize| BackendAPI
```

### Aggiornamento Mermaid Sequenziale

La sequenza completa ora distingue le due modalità:

```mermaid
sequenceDiagram
    participant M as Manager
    participant C as Calendar
    participant API as Backend
    participant A as Associati
    participant P as PollViewModal

    Note over M,P: Selezione Modalità
    M->>C: Crea sondaggio "Da pianificare"
    C->>M: Mostra radio [Proponi Slot | Heatmap]
    M->>C: Sceglie modalità

    alt Modalità Proponi Slot
        M->>C: Inserisce 2-5 slot
        C->>API: POST /api/polls<br/>{poll_type: "fixed_slots", timeSlots: [...]}
        API-->>C: {slots: [...]} (poll_time_slots)
        A->>P: Vota slot proposti
        P->>API: POST /api/polls/:id/vote<br/>{slotIds: [...]}
        API-->>P: Salva in poll_votes
        M->>P: Tabella risultati
        M->>API: POST /api/polls/:id/organize
        API-->>API: Crea evento + participants
    else Modalità Heatmap
        M->>C: Imposta durata + invitati
        C->>API: POST /api/polls<br/>{poll_type: "open_availability"}
        A->>P: Seleziona griglia disponibilità (drag multi-slot)
        P->>API: POST /api/polls/:id/availability<br/>{slots: [...]} (uno per ogni intervallo)
        API-->>P: Righe salvate in open_availability_votes
        M->>P: Visualizza heatmap (GET /api/polls/:id/heatmap)
        P->>API: GET /api/polls/:id/heatmap
        API-->>P: [{slot_start_time, user_count}]
        M->>P: Clicca slot ottimale
        M->>API: POST /api/polls/:id/organize
        API-->>API: Evento creato + poll chiuso
    end

    API-->>C: Aggiorna calendario + chiude sondaggio
```

### Componente: CreatePollModal

**File**: `components/Calendar.tsx` (CreatePollModal)

```typescript
function CreatePollModal({ allUsers, currentUser, onClose, onSuccess }: Props) {
    const [formData, setFormData] = useState({
        title: '',
        durationMinutes: 60,
        invitationRules: { groups: [], individuals: [] },
        timeSlots: [] as { startTime: string; endTime: string }[],
        pollType: 'fixed_slots' as 'fixed_slots' | 'open_availability',
        candidateId: null as string | null,
    });

    const requiresSlots = formData.pollType === 'fixed_slots';

    const addTimeSlot = () => {
        if (!requiresSlots) return;
        const startTime = new Date(`${newSlotDate}T${newSlotTime}`);
        const endTime = new Date(startTime.getTime() + formData.durationMinutes * 60000);
        setFormData(prev => ({
            ...prev,
            timeSlots: [...prev.timeSlots, {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            }],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await pollsAPI.create(formData);
        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Form fields + radio per pollType */}
        </form>
    );
}
```

### Componente: PollViewModal

**File**: `components/Calendar.tsx` (PollViewModal)

**Tab disponibili**:
1. **"Vota Disponibilità"**: per tutti gli invitati.
   - Se `pollType === "fixed_slots"` mostra la lista slot tradizionale con checkbox.
   - Se `pollType === "open_availability"` renderizza il widget heatmap che permette selezione multipla/all drag.
2. **"Risultati"**: accessibile solo all'organizzatore/manager.
   - Tabella classica per `fixed_slots`.
   - Heatmap interattiva per `open_availability`, integrata con endpoint `/api/polls/:id/heatmap`.

```typescript
function PollViewModal({ poll, currentUser, onClose, onSuccess }: Props) {
    const [activeView, setActiveView] = useState<'vote' | 'results'>('vote');
    const [pollData, setPollData] = useState<any>(null);
    const isHeatmap = pollData?.pollType === 'open_availability';

    useEffect(() => {
        loadPollDetails();
    }, [poll.id]);

    const loadPollDetails = async () => {
        const data = await pollsAPI.getById(poll.id);
        setPollData(data);
    };

    const handleHeatmapVote = async (slots: string[]) => {
        await pollsAPI.submitAvailability(poll.id, slots);
        await loadPollDetails();
    };

    return (
        <div>
            {/* Tabs vote/results */}
            {activeView === 'vote' && isHeatmap ? (
                <HeatmapAvailabilitySelector
                    duration={pollData.durationMinutes}
                    onSubmit={handleHeatmapVote}
                    initialSelection={pollData.myAvailabilitySlots}
                />
            ) : null}
        </div>
    );
}
```

## Integrazione Recruiting (Sezione 13)

### Flusso Sondaggio Colloquio

**File**: `components/Recruiting.tsx` (CreatePollModalForCandidate)

Quando un manager clicca "Avvia Sondaggio Colloquio" su un candidato:

```typescript
function CreatePollModalForCandidate({ candidate, onSuccess }: Props) {
    // Pre-compila il form con dati candidato
    const [formData, setFormData] = useState({
        title: `Colloquio con ${candidate.name}`,
        durationMinutes: 60,
        invitationRules: { groups: [], individuals: [] },
        timeSlots: [],
        candidateId: candidate.id, // ⚠️ IMPORTANTE: Passa candidateId
    });

    const handleSubmit = async () => {
        await pollsAPI.create(formData); // Include candidateId
        onSuccess();
    };
}
```

**Backend**: Quando viene organizzato il sondaggio, crea evento con `event_type = 'colloquio'` e `candidate_id = candidate.id`.

---

**Versione**: 1.0  
**Ultimo Aggiornamento**: 2024

