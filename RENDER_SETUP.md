# Guida Setup Render.com

## 🔧 Configurazione Variabili d'Ambiente

### ⚠️ IMPORTANTE: Render non usa automaticamente `render.yaml`

Se crei i servizi manualmente (non tramite Blueprint), devi configurare le variabili d'ambiente nel dashboard di Render.

---

## 📋 Backend (Web Service)

### Variabili d'Ambiente Richieste:

1. **DATABASE_URL** 
   - **Come ottenerla**: 
     - Vai su "Databases" → Seleziona il tuo database PostgreSQL
     - Clicca "Connect" → "Internal Database URL" (o "External Connection String")
     - Copia la connection string completa
   - **Esempio**: `postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com:5432/gestionale_db`
   - **Dove configurarla**: Dashboard Render → Backend Service → "Environment" → Aggiungi variabile

2. **JWT_SECRET**
   - **Come generarla**: Genera una stringa casuale sicura (almeno 32 caratteri)
   - **Esempio**: `your-super-secret-jwt-key-min-32-chars-long-12345`
   - **Puoi generarla con**: 
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - **Dove configurarla**: Dashboard Render → Backend Service → "Environment" → Aggiungi variabile

3. **NODE_ENV**
   - **Valore**: `production`
   - **Dove configurarla**: Dashboard Render → Backend Service → "Environment"

4. **FRONTEND_URL**
   - **Valore**: L'URL del tuo frontend su Render (es. `https://gestionale-frontend.onrender.com`)
   - **Dove configurarla**: Dashboard Render → Backend Service → "Environment"

5. **PORT** (opzionale)
   - Render fornisce automaticamente la variabile `PORT`, il backend la usa automaticamente

---

## 📋 Frontend (Static Site)

### Variabili d'Ambiente Richieste:

1. **VITE_API_URL**
   - **Valore**: L'URL del tuo backend su Render (es. `https://gestionale-backend.onrender.com`)
   - **⚠️ IMPORTANTE**: Per i Static Sites, questa variabile deve essere configurata PRIMA del build
   - **Dove configurarla**: Dashboard Render → Frontend Static Site → "Environment" → Aggiungi variabile
   - **Nota**: Non includere trailing slash (`/`) alla fine dell'URL

---

## 🔍 Verifica Configurazione

### Backend:
1. Vai su Dashboard Render → Backend Service → "Environment"
2. Verifica che siano presenti:
   - ✅ `DATABASE_URL` (con la connection string completa)
   - ✅ `JWT_SECRET` (stringa casuale sicura)
   - ✅ `NODE_ENV=production`
   - ✅ `FRONTEND_URL` (URL del frontend)

### Frontend:
1. Vai su Dashboard Render → Frontend Static Site → "Environment"
2. Verifica che sia presente:
   - ✅ `VITE_API_URL` (URL del backend)

---

## 🚀 Ordine di Deploy

1. **Database PostgreSQL**: Crea il database e ottieni la connection string
2. **Backend**: 
   - Configura tutte le variabili d'ambiente
   - Fai deploy
   - Verifica che funzioni: `https://tuo-backend.onrender.com/health`
   - Esegui migrazione database (via SSH o tramite script)
3. **Frontend**: 
   - Configura `VITE_API_URL` con l'URL del backend
   - Fai deploy

---

## 🔧 Se il backend non parte

1. Controlla i log: Dashboard → Backend Service → "Logs"
2. Verifica che `DATABASE_URL` sia configurata correttamente
3. Verifica che `JWT_SECRET` sia presente
4. Controlla che il database sia accessibile

---

## 🔧 Se il frontend dà "failed to fetch"

1. Verifica che `VITE_API_URL` sia configurata correttamente
2. Verifica che l'URL del backend sia corretto (senza trailing slash)
3. Controlla che il backend sia attivo e risponda su `/health`
4. Verifica CORS nel backend (deve includere l'URL del frontend in `FRONTEND_URL`)

---

## 📝 Esempio Configurazione Completa

### Backend Environment Variables:
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
NODE_ENV=production
FRONTEND_URL=https://gestionale-frontend.onrender.com
PORT=10000
```

### Frontend Environment Variables:
```
VITE_API_URL=https://gestionale-backend.onrender.com
```

---

**Nota**: Render aggiorna automaticamente le variabili quando le modifichi, ma potrebbe essere necessario riavviare il servizio.

