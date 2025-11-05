# 📚 Glossario Terminologico

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Nuovi sviluppatori** che si uniscono al progetto
- **Stakeholders** che devono comprendere terminologia
- **Documentation writers** che creano documentazione

## Terminologia Tecnica

### Architettura

**3-Tier Architecture**
- Architettura a 3 livelli: Presentation (Frontend), Business Logic (Backend), Data (Database)

**API (Application Programming Interface)**
- Interfaccia per comunicazione tra frontend e backend

**REST (Representational State Transfer)**
- Stile architetturale per API web, basato su HTTP methods (GET, POST, PUT, DELETE)

**JWT (JSON Web Token)**
- Token di autenticazione stateless, formato JSON firmato

**CORS (Cross-Origin Resource Sharing)**
- Meccanismo che permette richieste HTTP cross-origin (tra domini diversi)

### Database

**PostgreSQL**
- Database relazionale open-source utilizzato nel progetto

**Migration**
- Script SQL che modifica schema database in modo controllato

**Optimistic Locking**
- Meccanismo controllo concorrenza che previene modifiche simultanee senza bloccare dati

**Version (Database)**
- Campo numerico che incrementa ad ogni modifica, usato per optimistic locking

**Foreign Key**
- Vincolo referenziale che garantisce integrità dati tra tabelle

**Trigger**
- Funzione PostgreSQL eseguita automaticamente su eventi (INSERT, UPDATE, DELETE)

### Frontend

**React**
- Libreria JavaScript per costruire interfacce utente

**TypeScript**
- Superset di JavaScript con type checking statico

**Vite**
- Build tool veloce per sviluppo e produzione

**Component**
- Blocco riutilizzabile di UI in React

**Hook**
- Funzione React che permette di "agganciarsi" a features (state, lifecycle)

**State**
- Dati che determinano comportamento e rendering di un componente

**Props**
- Proprietà passate da componente parent a child

**Context API**
- Meccanismo React per condivisione stato globale senza prop drilling

**Code Splitting**
- Tecnica per dividere bundle JavaScript in chunks più piccoli

### Backend

**Express.js**
- Framework web minimalista per Node.js

**Middleware**
- Funzione che esegue durante request/response cycle (es. autenticazione, logging)

**Route Handler**
- Funzione che gestisce richiesta HTTP per uno specifico endpoint

**Connection Pool**
- Pool di connessioni database riutilizzabili per performance

**bcrypt**
- Libreria per hashing password sicuro

**Rate Limiting**
- Meccanismo che limita numero richieste da stesso IP/timeframe

### Testing

**Unit Test**
- Test di singola funzione/componente isolato

**Integration Test**
- Test di interazione tra componenti/moduli

**E2E Test (End-to-End)**
- Test di flusso completo utente, da UI a database

**Mock Data**
- Dati simulati usati per testing senza dipendere da sistemi esterni

### Deployment

**Render**
- Piattaforma cloud per hosting applicazioni (frontend, backend, database)

**Supabase**
- Piattaforma backend-as-a-service con database PostgreSQL

**Environment Variable**
- Variabile configurazione separata dal codice (es. DATABASE_URL, JWT_SECRET)

**Build**
- Processo di compilazione/ottimizzazione codice per produzione

**Health Check**
- Endpoint che verifica stato sistema (database connesso, servizio online)

### Security

**XSS (Cross-Site Scripting)**
- Vulnerabilità che permette iniezione codice JavaScript malevolo

**SQL Injection**
- Vulnerabilità che permette iniezione codice SQL malevolo

**HTTPS**
- Protocollo HTTP sicuro con crittografia TLS/SSL

**Refresh Token**
- Token utilizzato per ottenere nuovo access token senza rieffettuare login

## Terminologia Business

### Ruoli Utente

**Admin**
- Ruolo amministratore con accesso completo a tutte le funzionalità

**Presidente**
- Ruolo dirigenziale con accesso a dashboard e reportistica

**CDA (Consiglio di Amministrazione)**
- Ruolo dirigenziale con accesso a decisioni strategiche

**Tesoreria**
- Ruolo finanziario con accesso a contratti, fatture, pagamenti

**Responsabile**
- Ruolo manageriale con accesso a progetti e team della propria area

**Manager (IT/Marketing/Commerciale)**
- Ruolo manageriale specifico per area (IT, Marketing, Commerciale)

**Socio**
- Ruolo base con accesso a task assegnati e dashboard personale

**Audit**
- Ruolo di controllo con accesso a reportistica e verifiche

### Entità Business

**Cliente**
- Azienda/persona con cui l'associazione ha rapporti commerciali

**Progetto**
- Iniziativa lavorativa associata a un cliente, con team e task

**Contratto**
- Accordo formale con cliente, può includere fatture

**Fattura**
- Documento di pagamento associato a contratto

**Task**
- Attività specifica assegnata a membro team, parte di un progetto

**Evento**
- Appuntamento/riunione nel calendario (call, formazione, networking, colloquio)

**Sondaggio (Poll)**
- Raccolta disponibilità per pianificare evento futuro

**Candidato**
- Persona in processo di recruiting/onboarding

**Verbale (Report)**
- Documento post-evento che riassume contenuto/decisioni

### Stati e Status

**Prospect**
- Cliente potenziale, non ancora in contatto formale

**In Contatto**
- Cliente con cui si è iniziato comunicazione

**In Negoziazione**
- Cliente con cui si sta negoziando contratto

**Attivo**
- Cliente con contratto attivo

**Pianificato**
- Progetto in fase di pianificazione

**In Corso**
- Progetto attualmente in esecuzione

**Completato**
- Progetto terminato con successo

**Sospeso**
- Progetto temporaneamente sospeso

**Da Fare**
- Task non ancora iniziato

**In Revisione**
- Task completato, in attesa di verifica

## Acronimi

**API** - Application Programming Interface

**CDA** - Consiglio di Amministrazione

**CORS** - Cross-Origin Resource Sharing

**CRUD** - Create, Read, Update, Delete (operazioni base dati)

**E2E** - End-to-End

**JWT** - JSON Web Token

**KPI** - Key Performance Indicator

**RBAC** - Role-Based Access Control

**REST** - Representational State Transfer

**SPA** - Single Page Application

**SQL** - Structured Query Language

**XSS** - Cross-Site Scripting

## Convenzioni di Naming

### Backend

- **File**: `kebab-case.js` (es. `event-reports.js`)
- **Funzioni**: `camelCase` (es. `getUserById`)
- **Costanti**: `UPPER_SNAKE_CASE` (es. `MAX_RETRIES`)
- **Tabelle Database**: `snake_case` (es. `project_assignments`)

### Frontend

- **Componenti**: `PascalCase.tsx` (es. `ProjectCard.tsx`)
- **Hooks**: `useCamelCase.ts` (es. `useProjects.ts`)
- **Utils**: `camelCase.ts` (es. `formatDate.ts`)
- **Props Interface**: `ComponentNameProps` (es. `ProjectCardProps`)

## Riferimenti

- **[Database Schema](./data/Database-Schema.md)** - Entità database
- **[API Endpoints](./backend/API-Endpoints.md)** - Endpoint API
- **[Frontend Components](./frontend/README.md)** - Componenti frontend

---

**Versione**: 1.0  
**Ultimo Aggiornamento**: 2024

