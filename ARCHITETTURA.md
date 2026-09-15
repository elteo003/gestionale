# Architettura Gestionale Associazione

## 📋 Panoramica

Questa è un'applicazione full-stack per la gestione di un'associazione, con separazione tra frontend e backend per il deploy su Render.

## 🏗️ Architettura

```
┌─────────────────┐     ┌─────────────────┐
│   Browser / PWA │     │  Electron (PC)  │
│   React + Vite  │     │  stesso UI      │
└────────┬────────┘     └────────┬────────┘
         │ HTTP + WS + Web Push  │
         └───────────┬───────────┘
                     ▼
            ┌─────────────────┐
            │   Backend API   │
            │   Express + WS  │
            │   inbox + VAPID │
            └────────┬────────┘
                     │
                     ▼
            ┌─────────────────┐
            │   PostgreSQL    │
            └─────────────────┘
```

## 📁 Struttura Progetto

```
GESTIONALE-JEINS/
├── backend/
│   ├── app.js                 # Factory Express (middleware + route)
│   ├── server.js              # Avvio HTTP
│   ├── lib/                   # roles, pagination, taskAccess, AppError
│   ├── services/              # authService, notificationService, webPush
│   ├── middleware/            # auth, authorize, rateLimit, requestLog
│   ├── validators/            # schemi Zod (auth, notifications)
│   ├── routes/                # API REST per dominio
│   │   ├── auth, clients, projects, contracts, events
│   │   ├── users, tasks, sprints, activities, timeEntries
│   │   ├── messages, notifications, polls, candidates, onboarding, eventReports
│   ├── database/
│   │   ├── schema.sql         # Bootstrap DB nuovo ambiente
│   │   ├── migration_*.sql    # Migrazioni incrementali
│   │   └── connection.js
│   ├── scripts/
│   │   ├── migrate.js         # Bootstrap (SEED_ADMIN opzionale)
│   │   └── run-sql-migrations.js
│   ├── test/                  # Test Node (npm test)
│   └── render.yaml
│
└── gestionale-app/            # Frontend React + Vite + TypeScript
    ├── src/components/        # UI (Login, Dashboard, Calendar, …)
    ├── src/services/api.ts    # Client API
    └── render.yaml
```

Documentazione operativa: `docs/RBAC.md`, `docs/INDEX.md`.

## 🗄️ Database Schema

### Tabelle Principali

1. **users** - Utenti del sistema
   - `user_id` (UUID, PK)
   - `name`, `email`, `password_hash`
   - `area`, `role` (Socio, Responsabile, Admin)

2. **clients** - Clienti
   - `client_id` (UUID, PK)
   - `name`, `contact_person`, `email`, `phone`
   - `status`, `area`
   - `created_by` (FK → users)

3. **projects** - Progetti
   - `project_id` (UUID, PK)
   - `name`, `client_id` (FK), `area`, `status`
   - `created_by` (FK → users)

4. **todos** - Task dei progetti
   - `todo_id` (UUID, PK)
   - `project_id` (FK), `text`, `completed`, `priority`

5. **contracts** - Contratti/Fatture/Preventivi
   - `contract_id` (UUID, PK)
   - `type`, `client_id` (FK), `project_id` (FK)
   - `amount`, `status`, `date`

6. **events** - Eventi/Calendario
   - `event_id` (UUID, PK)
   - `title`, `description`
   - `start_time`, `end_time`, `is_call`
   - `creator_id` (FK → users)

7. **participants** - Partecipanti eventi
   - `participant_id` (UUID, PK)
   - `event_id` (FK), `user_id` (FK)
   - `status` (pending, accepted, declined)

## 🔐 Autenticazione

- **JWT** (7 giorni), ruolo ricaricato dal DB a ogni richiesta
- **Registrazione**: ruolo non inviabile dal client; campo opzionale `managerCode` → ruolo elevato (hash in `ELEVATED_REGISTRATION_CODE_HASH`)
- **RBAC** su clienti, progetti, contratti, task (vedi `docs/RBAC.md`)
- Rate limiting su login/register
- Endpoint:
  - `POST /api/auth/login`
  - `POST /api/auth/register` (body: `name`, `email`, `password`, `area?`, `managerCode?`)
  - `GET /api/auth/verify`

## 🌐 API Endpoints

### Clienti
- `GET /api/clients` - Lista tutti i clienti
- `GET /api/clients/:id` - Dettaglio cliente
- `POST /api/clients` - Crea cliente
- `PUT /api/clients/:id` - Aggiorna cliente
- `PATCH /api/clients/:id/status` - Aggiorna stato
- `DELETE /api/clients/:id` - Elimina cliente

### Progetti
- `GET /api/projects` - Lista tutti i progetti (con todos)
- `GET /api/projects/:id` - Dettaglio progetto
- `POST /api/projects` - Crea progetto
- `PUT /api/projects/:id` - Aggiorna progetto
- `PATCH /api/projects/:id/status` - Aggiorna stato
- `DELETE /api/projects/:id` - Elimina progetto
- `POST /api/projects/:id/todos` - Aggiungi todo
- `PATCH /api/projects/:projectId/todos/:todoId/toggle` - Toggle todo
- `DELETE /api/projects/:projectId/todos/:todoId` - Elimina todo

### Contratti
- `GET /api/contracts` - Lista tutti i contratti
- `GET /api/contracts/:id` - Dettaglio contratto
- `POST /api/contracts` - Crea contratto
- `PUT /api/contracts/:id` - Aggiorna contratto
- `PATCH /api/contracts/:id/status` - Aggiorna stato
- `DELETE /api/contracts/:id` - Elimina contratto

### Eventi
- `GET /api/events` - Lista eventi (con filtri: startDate, endDate, isCall)
- `GET /api/events/:id` - Dettaglio evento
- `GET /api/events/:id/participants` - Lista partecipanti
- `GET /api/events/my/upcoming` - Eventi futuri dell'utente
- `POST /api/events` - Crea evento
- `PUT /api/events/:id` - Aggiorna evento
- `DELETE /api/events/:id` - Elimina evento
- `POST /api/events/:id/rsvp` - RSVP (accept/decline)

### Utenti
- `GET /api/users` - Lista utenti
- `GET /api/users/:id` - Dettaglio utente

### Notifiche (web + desktop)
Stesso inbox e stesso protocollo Web Push (VAPID). Electron si registra con `platform: "desktop"`.
- `GET /api/notifications` - Inbox (`?unread=1&limit=50`)
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `GET` / `PATCH /api/notifications/preferences`
- `GET /api/push/vapid-public-key` - Chiave pubblica (503 se VAPID assente)
- `POST /api/push/subscribe` - Body: `{ platform, endpoint, keys: { p256dh, auth } }`
- `DELETE /api/push/subscribe` - Body: `{ endpoint }`

Fatti di dominio che popolano l’inbox (senza far fallire il 201 se il push è down): messaggio chat, assegnazione task, invito evento (prima occorrenza se ricorrente). In parallelo: frame WS `{ type: "notification" }` all’utente.

## 🚀 Setup e Deploy

### Setup Locale

1. **Backend**:
   ```bash
   cd backend
   npm install
   # Crea file .env con DATABASE_URL, JWT_SECRET, PORT, FRONTEND_URL
   npm run migrate  # Inizializza database
   npm run dev      # Avvia server
   ```

2. **Frontend**:
   ```bash
   cd gestionale-app
   npm install
   # Crea file .env con VITE_API_URL=http://localhost:3000
   npm run dev      # Avvia dev server
   ```

### Deploy su Render

1. **Database PostgreSQL**:
   - Crea nuovo database PostgreSQL su Render
   - Copia la connection string

2. **Backend Service**:
   - Crea nuovo Web Service su Render
   - Connetti al repository GitHub
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     - `DATABASE_URL` (dalla connection string del database)
     - `JWT_SECRET` (genera una stringa casuale sicura)
     - `NODE_ENV=production`
     - `FRONTEND_URL` (URL del frontend su Render)
   - Dopo il deploy, esegui la migrazione: `npm run migrate`

3. **Frontend Static Site**:
   - Crea nuovo Static Site su Render
   - Connetti al repository GitHub
   - Root Directory: `gestionale-app`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variable:
     - `VITE_API_URL` (URL del backend su Render)

## 📝 Variabili d'Ambiente

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-super-secret-key
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.onrender.com
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend.onrender.com
```

## 🎯 Funzionalità Implementate

✅ Sistema autenticazione (Login/Registrazione con JWT)
✅ Gestione Clienti (CRUD completo)
✅ Gestione Progetti (CRUD + Todo List)
✅ Gestione Contratti/Fatture (CRUD)
✅ API Eventi/Calendario (CRUD + RSVP)
✅ Responsive design (mobile + desktop)
✅ Persistenza dati PostgreSQL
✅ Notifiche: inbox + Web Push VAPID + fan-out WS per utente (web e desktop)

## 🔄 Funzionalità da Completare

⚠️ **Componente Calendario Frontend**: 
   - Il componente calendario è attualmente un placeholder
   - Deve essere implementato per visualizzare eventi in formato calendario
   - Usare le API `eventsAPI.getAll()`, `eventsAPI.rsvp()`, ecc.

⚠️ **Visualizzazione Partecipanti Eventi**:
   - Implementare UI per vedere chi ha accettato/rifiutato inviti
   - Mostrare stato RSVP per ogni evento

## 🛠️ Tecnologie

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express.js, PostgreSQL (pg), JWT, bcrypt
- **Deploy**: Render.com

## 📚 Documentazione API

Tutte le API richiedono autenticazione (tranne `/api/auth/*`).
Includi header: `Authorization: Bearer <token>`

Le risposte sono in formato JSON. Gli errori hanno formato:
```json
{
  "error": "Messaggio di errore"
}
```

---

**Sviluppato seguendo le best practices per applicazioni full-stack moderne**

