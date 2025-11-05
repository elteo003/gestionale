# 🔧 Documentazione Backend

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Sviluppatori Backend** che devono implementare o modificare API
- **Ingegneri del Software** che devono comprendere l'architettura del sistema
- **DevOps** che devono configurare e deployare il backend

## Tech Stack

### Tecnologie Core

- **Node.js 18+**: Runtime JavaScript server-side
- **Express.js 4.18+**: Framework web minimalista e flessibile
- **PostgreSQL**: Database relazionale tramite client `pg`
- **JWT (jsonwebtoken)**: Autenticazione stateless
- **bcrypt**: Hashing sicuro delle password (salt rounds: 10)
- **CORS**: Gestione Cross-Origin Resource Sharing
- **dotenv**: Caricamento variabili d'ambiente

### Dipendenze Principali

```json
{
  "express": "^4.18.2",
  "pg": "^8.11.3",
  "bcrypt": "^5.1.1",
  "jsonwebtoken": "^9.0.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1"
}
```

## Installazione e Avvio

### Prerequisiti

- Node.js 18+ installato
- Accesso a un database PostgreSQL
- Credenziali database configurate

### Setup Locale

```bash
# Naviga nella cartella backend
cd backend

# Installa le dipendenze
npm install

# Crea file .env
cp .env.example .env
# Modifica .env con le tue credenziali

# Avvia il server in modalità sviluppo
npm run dev

# O in modalità produzione
npm start
```

### Script Disponibili

- `npm start`: Avvia il server in produzione
- `npm run dev`: Avvia con watch mode (auto-reload)
- `npm run migrate`: Esegue le migration SQL
- `npm run create-user`: Crea un utente admin

## Variabili d'Ambiente

### Configurazione Obbligatoria

**`.env`** file nella root di `backend/`:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars

# Frontend URL (per CORS)
FRONTEND_URL=http://localhost:5173

# Ambiente
NODE_ENV=development
PORT=3000
```

### Descrizione Variabili

- **`DATABASE_URL`**: Connection string PostgreSQL completa. Formato: `postgresql://[user]:[password]@[host]:[port]/[database]`
- **`JWT_SECRET`**: Chiave segreta per firmare i token JWT. Deve essere lunga almeno 32 caratteri e non condivisa pubblicamente
- **`FRONTEND_URL`**: URL del frontend per configurare CORS. In produzione, utilizzare l'URL del sito Render
- **`NODE_ENV`**: Ambiente di esecuzione (`development` o `production`)
- **`PORT`**: Porta su cui il server ascolta (default: 3000)

## Architettura API

### Principi RESTful

Il backend segue i principi REST (Representational State Transfer):

- **Risorse**: Ogni endpoint rappresenta una risorsa (es. `/api/clients`, `/api/projects`)
- **Metodi HTTP**: GET (lettura), POST (creazione), PUT (aggiornamento), DELETE (eliminazione)
- **Status Codes**: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 500 (Internal Server Error)
- **JSON**: Tutti i payload sono in formato JSON

### Struttura delle Route

```
/api
├── /auth              # Autenticazione
│   ├── POST /login
│   ├── POST /register
│   └── GET /verify
│
├── /users             # Gestione utenti
│   ├── GET /
│   ├── GET /:id
│   ├── POST /
│   └── PUT /:id
│
├── /clients           # Gestione clienti
├── /projects          # Gestione progetti
├── /contracts         # Gestione contratti
├── /events            # Gestione eventi
│   └── /:id/reports   # Report eventi
├── /tasks             # Gestione task
├── /polls             # Sondaggi disponibilità
├── /candidates        # Candidati HR
└── /onboarding        # Periodi di prova
```

## Flusso di Autenticazione

### Middleware `authenticateToken`

Tutte le route (eccetto `/api/auth/*`) sono protette dal middleware `authenticateToken` che:

1. Estrae il token JWT dall'header `Authorization: Bearer <token>`
2. Verifica la firma del token usando `JWT_SECRET`
3. Decodifica il payload e estrae `userId`, `email`, `role`
4. Aggiunge `req.user` con i dati dell'utente decodificati
5. Aggiorna `last_seen` nella tabella `users` per tracciare attività

### Diagramma di Sequenza: Login

```mermaid
sequenceDiagram
    participant C as Client (Frontend)
    participant B as Backend API
    participant D as Database
    participant J as JWT Service

    C->>B: POST /api/auth/login<br/>{email, password}
    B->>D: SELECT user WHERE email = ?
    D-->>B: user row (con password_hash)
    B->>B: bcrypt.compare(password, password_hash)
    alt Password Corretta
        B->>J: jwt.sign({userId, email, role})
        J-->>B: token JWT
        B->>D: UPDATE users SET last_seen = NOW()
        B-->>C: 200 OK<br/>{token, user: {...}}
        C->>C: localStorage.setItem('token', token)
    else Password Errata
        B-->>C: 401 Unauthorized<br/>{error: "Credenziali non valide"}
    end
```

### Diagramma di Sequenza: Richiesta Protetta

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware Auth
    participant R as Route Handler
    participant D as Database

    C->>M: GET /api/projects<br/>Authorization: Bearer <token>
    M->>M: jwt.verify(token, JWT_SECRET)
    alt Token Valido
        M->>M: Decode payload → req.user
        M->>D: UPDATE users SET last_seen = NOW()
        M->>R: next() con req.user
        R->>D: SELECT * FROM projects...
        D-->>R: results
        R-->>C: 200 OK<br/>{projects: [...]}
    else Token Invalido/Scaduto
        M-->>C: 401 Unauthorized<br/>{error: "Token non valido"}
    end
```

## Convenzioni di Codice

### Error Handling

**Pattern Standardizzato:**

```javascript
try {
    // Logica business
    const result = await pool.query(...);
    res.json(result.rows);
} catch (error) {
    console.error('Errore descrittivo:', error);
    res.status(500).json({ 
        error: 'Errore interno del server',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
}
```

### Struttura Risposte JSON

**Successo:**
```json
{
  "id": "uuid",
  "name": "Nome Risorsa",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Errore:**
```json
{
  "error": "Messaggio errore user-friendly"
}
```

**Errore con Dettagli (Solo Development):**
```json
{
  "error": "Errore interno del server",
  "details": "Stack trace completo"
}
```

### Gestione Transazioni

Per operazioni multi-step (es. creazione evento con partecipanti):

```javascript
const client = await pool.connect();
try {
    await client.query('BEGIN');
    
    // Operazione 1
    await client.query('INSERT INTO ...');
    
    // Operazione 2
    await client.query('INSERT INTO ...');
    
    await client.query('COMMIT');
    res.status(201).json({ ... });
} catch (error) {
    await client.query('ROLLBACK');
    throw error;
} finally {
    client.release();
}
```

### Logging

**Standard di Logging:**

- **Info**: Operazioni di business importanti
- **Error**: Errori che richiedono attenzione
- **Debug**: Dettagli tecnici (solo in development)

```javascript
console.log('✅ Operazione completata:', result);
console.error('❌ Errore:', error.message);
console.log('🔍 Debug info:', debugData); // Solo in dev
```

## Sicurezza

### Password Hashing

- **Algoritmo**: bcrypt con 10 salt rounds
- **Storage**: Solo hash in database, mai password plain text
- **Verifica**: `bcrypt.compare(password, hash)` per login

### JWT Token

- **Scadenza**: 7 giorni
- **Payload**: `{ userId, email, role }`
- **Secret**: Variabile d'ambiente `JWT_SECRET`
- **Header**: `Authorization: Bearer <token>`

### SQL Injection Prevention

- **Sempre**: Usare parametri query (`$1, $2, ...`)
- **Mai**: Concatenare stringhe SQL direttamente

```javascript
// ✅ CORRETTO
await pool.query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ SBAGLIATO
await pool.query(`SELECT * FROM users WHERE email = '${email}'`);
```

### CORS Configuration

- **Origini Permesse**: Configurate tramite `FRONTEND_URL`
- **Credenziali**: Abilitate per supportare cookie/token
- **Metodi**: GET, POST, PUT, PATCH, DELETE, OPTIONS

## Performance

### Connection Pooling

Il client PostgreSQL (`pg`) gestisce automaticamente il connection pooling. Il pool è configurato in `database/connection.js`.

### Indicizzazione

Tutte le foreign key e colonne usate frequentemente in WHERE/ORDER BY hanno indici per ottimizzare le query.

### Query Optimization

- **SELECT**: Usare solo colonne necessarie (`SELECT id, name` invece di `SELECT *`)
- **JOIN**: Usare JOIN espliciti invece di subquery quando possibile
- **LIMIT**: Applicare limit su query che ritornano molti risultati

## Testing

### Health Check Endpoint

```bash
GET /health
```

Risposta:
```json
{
  "status": "OK",
  "db": "ok",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Testing Manuale

```bash
# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test route protetta
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer <token>"
```

## Deployment

### Render Web Service

Il backend è configurato per deploy automatico su Render tramite `render.yaml`:

```yaml
services:
  - type: web
    name: gestionale-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: gestionale-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: FRONTEND_URL
        value: https://gestionale-i5bj.onrender.com
    healthCheckPath: /health
```

### Monitoraggio

- **Health Check**: Render monitora automaticamente `/health`
- **Logs**: Accessibili dal dashboard Render
- **Database**: Monitoraggio tramite dashboard Supabase/Render

## Riferimenti

- **[API Endpoints Completi](./API-Endpoints.md)** - Documentazione dettagliata di tutti gli endpoint
- **[Database Schema](../data/Database-Schema.md)** - Schema completo del database

---

**Versione**: 1.0  
**Mantainer**: Team Backend

