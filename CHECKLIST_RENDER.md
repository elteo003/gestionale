# ✅ Checklist Configurazione Render

## 🔴 PROBLEMA: "Failed to Fetch"

Questo errore indica che il frontend non riesce a comunicare con il backend.

## ✅ VERIFICA 1: Backend è attivo?

1. Apri il Dashboard Render → Backend Service
2. Controlla lo stato: deve essere **"Live"** (verde)
3. Se è "Sleeping", clicca "Manual Deploy" per risvegliarlo
4. Apri i **Logs** e verifica:
   - ✅ `🚀 Server avviato sulla porta XXXX`
   - ✅ `✅ Connesso al database PostgreSQL`
   - ✅ `✅ Test connessione database riuscito`
   - ❌ Se vedi errori → Leggi sotto

## ✅ VERIFICA 2: Backend risponde?

Apri nel browser:
```
https://TUO-BACKEND.onrender.com/health
```

**Dovrebbe rispondere:**
```json
{"status":"OK","timestamp":"2024-..."}
```

**Se non risponde:**
- Backend non è avviato
- Controlla i log per errori

## ✅ VERIFICA 3: Variabili d'Ambiente BACKEND

Su Render → Backend Service → "Environment":

| Variabile | Valore | ⚠️ Obbligatorio |
|-----------|--------|----------------|
| `DATABASE_URL` | `postgresql://...` (connection string completa) | ✅ **SÌ** |
| `JWT_SECRET` | Stringa casuale sicura (min 32 caratteri) | ✅ **SÌ** |
| `NODE_ENV` | `production` | ✅ **SÌ** |
| `FRONTEND_URL` | URL del frontend (es: `https://tuo-frontend.onrender.com`) | ✅ **SÌ** |
| `PORT` | Lasciare vuoto (Render usa la sua porta) | ❌ No |

**⚠️ IMPORTANTE:**
- `DATABASE_URL` deve essere la **"Internal Database URL"** dal tuo database PostgreSQL su Render
- NON usare la "External Connection String" per il backend su Render

## ✅ VERIFICA 4: Variabili d'Ambiente FRONTEND

Su Render → Frontend Static Site → "Environment":

| Variabile | Valore | ⚠️ Obbligatorio |
|-----------|--------|----------------|
| `VITE_API_URL` | URL completo del backend (es: `https://gestionale-backend-xxx.onrender.com`) | ✅ **SÌ** |

**⚠️ IMPORTANTE:**
- **NON** includere trailing slash (`/`)
- **NON** includere `/api` alla fine
- Esempio corretto: `https://gestionale-backend-xxx.onrender.com`
- Esempio sbagliato: `https://gestionale-backend-xxx.onrender.com/` ❌

## ✅ VERIFICA 5: Database è configurato?

1. Su Render → Database PostgreSQL
2. Controlla lo stato: deve essere **"Available"**
3. Vai su "Connect" → Copia "Internal Database URL"
4. Verifica che questa URL sia impostata in `DATABASE_URL` del backend
5. **Esegui lo script SQL**: Apri il database e esegui `database_setup_complete.sql`

## 🔍 TEST RAPIDO

### Test 1: Backend Health Check
```bash
curl https://TUO-BACKEND.onrender.com/health
```
Deve rispondere: `{"status":"OK",...}`

### Test 2: Backend Login (da browser console)
Apri la console del browser (F12) e esegui:
```javascript
fetch('https://TUO-BACKEND.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'test' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**Risultati possibili:**
- ✅ `{"error":"Credenziali non valide"}` → Backend funziona! (email non esiste, ma è normale)
- ❌ `Failed to fetch` → Backend non raggiungibile
- ❌ `CORS error` → `FRONTEND_URL` non configurato correttamente

### Test 3: Frontend API URL
Apri la console del browser (F12) e verifica:
```javascript
console.log('API URL:', import.meta.env.VITE_API_URL)
```

Deve mostrare l'URL del backend (non `undefined` o `http://localhost:3000`)

## 🐛 ERRORI COMUNI

### Errore: "DATABASE_URL non è configurato"
**Causa**: Variabile d'ambiente mancante
**Soluzione**: Aggiungi `DATABASE_URL` su Render → Backend → Environment

### Errore: "Impossibile connettersi al database"
**Causa**: Connection string errata o database non attivo
**Soluzione**: 
1. Verifica che il database sia "Available"
2. Usa "Internal Database URL" (non External)
3. Verifica che le tabelle siano create (`database_setup_complete.sql`)

### Errore: "JWT_SECRET is not defined"
**Causa**: Variabile d'ambiente mancante
**Soluzione**: Aggiungi `JWT_SECRET` su Render → Backend → Environment

### Errore: "Failed to fetch" (frontend)
**Causa**: Backend non raggiungibile o `VITE_API_URL` errata
**Soluzione**:
1. Verifica che il backend sia "Live"
2. Verifica `VITE_API_URL` nel frontend
3. Testa `/health` endpoint manualmente

### Errore: CORS
**Causa**: `FRONTEND_URL` non corrisponde all'URL reale del frontend
**Soluzione**: Aggiorna `FRONTEND_URL` nel backend con l'URL esatto del frontend

## 📋 ORDINE DI SETUP

1. ✅ **Database PostgreSQL** → Crea su Render → Ottieni Internal URL
2. ✅ **Backend** → Configura tutte le variabili → Deploy → Verifica log
3. ✅ **Esegui migrazione** → Esegui `database_setup_complete.sql` sul database
4. ✅ **Frontend** → Configura `VITE_API_URL` → Deploy

---

**Dopo ogni modifica, attendi il deploy completo (2-3 minuti) e verifica i log!**

