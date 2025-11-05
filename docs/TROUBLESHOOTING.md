# 🐛 Troubleshooting Guide

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Sviluppatori** che risolvono problemi
- **DevOps** che gestiscono deployment
- **Support** che assiste utenti

## Problemi Comuni

### Troubleshooting Decision Tree

```mermaid
graph TD
    A[Problem Occurs] --> B{What Type?}
    B -->|Backend| C[Backend Issues]
    B -->|Frontend| D[Frontend Issues]
    B -->|Database| E[Database Issues]
    B -->|Deployment| F[Deployment Issues]
    
    C --> C1{Port in Use?}
    C1 -->|Yes| C2[Kill Process]
    C1 -->|No| C3{Env Vars OK?}
    C3 -->|No| C4[Check .env]
    C3 -->|Yes| C5{Database Connected?}
    
    D --> D1{API Reachable?}
    D1 -->|No| D2[Check VITE_API_URL]
    D1 -->|Yes| D3{CORS Error?}
    D3 -->|Yes| D4[Check CORS Config]
    
    E --> E1{Connection Failed?}
    E1 -->|Yes| E2[Check DATABASE_URL]
    E1 -->|No| E3{Migration Error?}
    E3 -->|Yes| E4[Check Migration Order]
    
    F --> F1{Build Failed?}
    F1 -->|Yes| F2[Check Build Logs]
    F1 -->|No| F3{Deploy Failed?}
    
    style A fill:#e1f5ff
    style C fill:#ffcccc
    style D fill:#ffffcc
    style E fill:#ccccff
    style F fill:#ffcc99
```

### Backend Non Si Avvia

#### Sintomi
- Server non risponde
- Errori in console
- Port già in uso

#### Soluzioni

**1. Verifica Variabili d'Ambiente**
```bash
# Verifica .env esiste
ls -la backend/.env

# Verifica DATABASE_URL
echo $DATABASE_URL

# Testa connessione database
psql "$DATABASE_URL" -c "SELECT 1;"
```

**2. Port Già in Uso**
```bash
# Mac/Linux
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**3. Dependencies Mancanti**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Frontend Non Si Connette al Backend

#### Sintomi
- "Impossibile raggiungere il backend"
- Errori CORS
- "Failed to fetch"

#### Soluzioni

**1. Verifica VITE_API_URL**
```bash
# Frontend .env
cat gestionale-app/.env
# Dovrebbe contenere: VITE_API_URL=http://localhost:3000

# Su Render: Verifica variabile d'ambiente
# Render Dashboard → Environment Variables
```

**2. Verifica Backend Online**
```bash
# Testa health check
curl http://localhost:3000/health
# Dovrebbe ritornare: {"status":"ok","database":"connected"}
```

**3. Verifica CORS**
```javascript
// backend/server.js
// FRONTEND_URL deve corrispondere all'URL del frontend
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
```

**4. Render Sleep Mode**
- Render free tier: Servizi vanno in sleep dopo inattività
- **Soluzione**: Prima chiamata può richiedere 30-60s per wake-up
- **Workaround**: Aumenta timeout frontend a 30-60s

### Database Connection Failed

#### Sintomi
- "Database connection failed"
- Errori PostgreSQL
- Timeout connessione

#### Soluzioni

**1. Verifica DATABASE_URL**
```bash
# Formato corretto
postgresql://user:password@host:port/database

# Testa connessione
psql "$DATABASE_URL" -c "SELECT 1;"
```

**2. Verifica Credenziali**
- User/password corretti
- Database esiste
- Permessi corretti

**3. Firewall/Network**
- Port PostgreSQL aperto (5432)
- IP whitelist (se applicabile)

**4. Connection Pool**
```javascript
// backend/database/connection.js
// Aumenta timeout se necessario
const pool = new Pool({
    connectionTimeoutMillis: 10000, // 10 secondi
    idleTimeoutMillis: 30000,
});
```

### Migrazioni Database Falliscono

#### Sintomi
- Errori durante migrazione
- "relation already exists"
- "column does not exist"

#### Soluzioni

**1. Verifica Ordine Migrazioni**
- Migrazioni devono essere eseguite in ordine cronologico
- Vedi [Database Migrations](./backend/Database-Migrations.md)

**2. Verifica Stato Migrazioni**
```sql
-- Verifica tabelle esistenti
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verifica colonne
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'projects';
```

**3. Rollback e Riprova**
```bash
# Restore backup
psql "$DATABASE_URL" < backup_pre_migration.sql

# Esegui migrazioni in ordine
```

### Errori TypeScript in Build

#### Sintomi
- Build fallisce su Render
- Errori TypeScript
- Type errors

#### Soluzioni

**1. Verifica Errori Localmente**
```bash
cd gestionale-app
npm run build
# Risolvi tutti gli errori prima di push
```

**2. Errori Comuni**
- `TS6133`: Variabile non usata → Rimuovi o prefixa con `_`
- `TS2304`: Tipo non trovato → Aggiungi import
- `TS2554`: Argomenti errati → Verifica signature

**3. Type Assertions**
```typescript
// Se necessario, usa type assertion
const data = response as ProjectData;
```

### "Failed to fetch" su Render

#### Sintomi
- Frontend non raggiunge backend su Render
- Errori console browser
- Timeout

#### Soluzioni

**1. Verifica URL Backend**
```javascript
// Frontend: Verifica VITE_API_URL
console.log('API URL:', import.meta.env.VITE_API_URL);
// Dovrebbe essere: https://gestionale-backand-api.onrender.com
```

**2. Render Sleep Mode**
- Backend può essere in sleep (free tier)
- Prima richiesta può richiedere 30-60s
- **Soluzione**: Aumenta timeout a 30-60s

**3. CORS Configuration**
```javascript
// Backend: Verifica FRONTEND_URL
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
// Dovrebbe essere: https://gestionale-i5bj.onrender.com
```

### Errori Optimistic Locking

#### Sintomi
- 409 Conflict error
- "CONCURRENT_MODIFICATION"
- Modifiche non salvate

#### Soluzioni

**1. Verifica Version Passata**
```typescript
// Frontend: Sempre passa expectedVersion
await projectsAPI.update(projectId, {
    name: "Nuovo Nome",
    expectedVersion: project.version // ✅ Necessario
});
```

**2. Aggiorna Version Dopo Modifica**
```typescript
// Dopo update, aggiorna version nello stato
const updated = await projectsAPI.update(projectId, { ... });
setProject({ ...project, ...updated }); // updated include nuova version
```

**3. Gestisci Conflitto**
```typescript
try {
    await updateProject(projectId, data);
} catch (error) {
    if (error.name === 'ConcurrentModificationError') {
        // Mostra ConflictDialog
        showConflictDialog(error.conflictData);
    }
}
```

### Tab "Team" e "Tasks" Non Appaiono

#### Sintomi
- Tab non visibili in ProjectCard
- Solo tab "Dettagli" visibile

#### Soluzioni

**1. Verifica isManager Logic**
```typescript
// App.tsx: Verifica logica isManager
const isManager = 
    user.role === 'Admin' ||
    user.role === 'Presidente' ||
    user.role === 'CDA' ||
    user.role === 'Responsabile' ||
    (user.role === 'Marketing' && project.area === 'Marketing') ||
    (user.role === 'Commerciale' && project.area === 'Commerciale');
```

**2. Verifica User Prop**
```typescript
// Verifica user è passato correttamente
<ProjectCard project={project} user={user} users={users} />
```

**3. Debug Logging**
```typescript
console.log('isManager:', isManager, 'user.role:', user.role, 'project.area:', project.area);
```

### "I Miei Task" Schermata Bianca

#### Sintomi
- Blank screen quando si accede a "I Miei Task"
- Nessun errore visibile
- Console mostra errori

#### Soluzioni

**1. Verifica Tabella Tasks**
```sql
-- Verifica tabella esiste
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'tasks';

-- Se non esiste, esegui migrazione
\i backend/database/migration_tasks_and_assignments.sql
```

**2. Verifica User ID**
```typescript
// MyTasks.tsx: Verifica user.id
const userId = user?.id || user?.user_id;
console.log('User ID:', userId);
```

**3. Error Handling**
```typescript
// Verifica error handling appropriato
try {
    const tasks = await tasksAPI.getMyTasks();
    // ...
} catch (error) {
    console.error('Errore caricamento task:', error);
    // Mostra messaggio errore user-friendly
}
```

## Bug Noti

### 1. candidatesAPI.getAll() Signature Errata

**File**: `gestionale-app/src/services/api.ts`

**Problema**: Signature non corrisponde a utilizzo

**Workaround**: Correggere signature in `api.ts`

### 2. candidate_id Non Sempre Incluso in Query Eventi

**File**: `backend/routes/events.js`

**Problema**: `candidate_id` non sempre incluso in SELECT

**Workaround**: Aggiungere `candidate_id` a tutte le query eventi

### 3. CORS Troppo Permissivo in Development

**File**: `backend/server.js`

**Problema**: CORS accetta tutti gli origin in development

**Rischio**: Sicurezza ridotta in development

**Workaround**: Configurare origin specifici anche in development

## Debugging Tips

### Backend Debugging

**1. Logging Dettagliato**
```javascript
// Aggiungi logging temporaneo
console.log('Request:', req.method, req.path);
console.log('Body:', req.body);
console.log('User:', req.user);
```

**2. Test Endpoint Direttamente**
```bash
# Con curl
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","clientId":"123"}'
```

**3. Database Query Diretta**
```sql
-- Testa query direttamente
SELECT * FROM projects WHERE project_id = '123';
```

### Frontend Debugging

**1. React DevTools**
- Install extension
- Inspect component state
- Check props

**2. Console Logging**
```typescript
console.log('State:', state);
console.table(projects);
console.group('API Call');
console.log('Request:', request);
console.log('Response:', response);
console.groupEnd();
```

**3. Network Tab**
- Chrome DevTools → Network
- Verifica richieste API
- Verifica status code
- Verifica response body

## Getting Help

### Informazioni da Fornire

Quando chiedi aiuto, includi:

1. **Error Message**: Messaggio errore completo
2. **Stack Trace**: Stack trace (se disponibile)
3. **Steps to Reproduce**: Passi per riprodurre
4. **Environment**: Ambiente (local/production)
5. **Logs**: Log rilevanti
6. **Screenshots**: Screenshot (se UI)

### Log Collection

```bash
# Backend logs
cd backend
npm run dev 2>&1 | tee backend.log

# Frontend console
# Browser DevTools → Console → Save logs
```

## Riferimenti

- **[Database Migrations](./backend/Database-Migrations.md)** - Problemi migrazioni
- **[Error Handling](./backend/Error-Handling-Patterns.md)** - Gestione errori
- **[Deployment Checklist](./DEPLOYMENT-CHECKLIST.md)** - Problemi deployment

---

**Versione**: 1.0  
**Ultimo Aggiornamento**: 2024

