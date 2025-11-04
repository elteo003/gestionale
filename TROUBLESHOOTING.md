# 🔧 Troubleshooting - "Failed to Fetch"

## ✅ Verifica: Il codice usa SQL reale, NON dati mock

Ho verificato il codice:
- ✅ **Tutte le route usano `pool.query()` per query SQL reali al database**
- ✅ **Nessun dato mock o hardcoded**
- ✅ **Login e Registrazione usano il database PostgreSQL**

## 🔍 Diagnosi "Failed to Fetch"

L'errore "Failed to fetch" significa che il frontend non riesce a comunicare con il backend.

### Possibili Cause:

1. **Backend non avviato o crashato**
   - Il backend su Render potrebbe non essere partito
   - Verifica i log: Dashboard Render → Backend Service → "Logs"

2. **Database non configurato**
   - Se `DATABASE_URL` non è configurata, il backend potrebbe crashare
   - Verifica i log del backend per errori di connessione database

3. **URL Backend errato nel frontend**
   - `VITE_API_URL` deve essere l'URL corretto del backend su Render
   - Esempio: `https://gestionale-backend-xxx.onrender.com` (senza trailing slash)

4. **CORS non configurato**
   - `FRONTEND_URL` nel backend deve corrispondere all'URL del frontend

5. **JWT_SECRET mancante**
   - Se `JWT_SECRET` non è configurata, il backend potrebbe non funzionare

## 🔧 Checklist Diagnostica

### 1. Verifica Backend su Render
```bash
# Apri l'URL del backend nel browser
https://tuo-backend.onrender.com/health

# Dovrebbe rispondere:
{"status":"OK","timestamp":"..."}
```

**Se non risponde:**
- Il backend non è avviato
- Controlla i log su Render per vedere errori

### 2. Verifica Log Backend
Su Render Dashboard → Backend Service → "Logs":
- ✅ Cerca "✅ Connesso al database PostgreSQL"
- ✅ Cerca "✅ Test connessione database riuscito"
- ❌ Se vedi "❌ ERRORE: DATABASE_URL non è configurato!" → Configura DATABASE_URL
- ❌ Se vedi "❌ ERRORE: Impossibile connettersi al database!" → Verifica connection string

### 3. Verifica Variabili d'Ambiente Backend
Su Render → Backend Service → "Environment":
- ✅ `DATABASE_URL` = connection string completa del database
- ✅ `JWT_SECRET` = stringa casuale sicura (almeno 32 caratteri)
- ✅ `NODE_ENV` = `production`
- ✅ `FRONTEND_URL` = URL del frontend su Render

### 4. Verifica Variabili d'Ambiente Frontend
Su Render → Frontend Static Site → "Environment":
- ✅ `VITE_API_URL` = URL del backend (senza trailing slash)
- Esempio: `https://gestionale-backend-xxx.onrender.com`

### 5. Verifica Database
Su Render → Database → "Connect":
- ✅ Verifica che il database sia attivo
- ✅ Copia "Internal Database URL" (per uso su Render)
- ✅ Esegui lo script SQL `database_setup_complete.sql` per creare le tabelle

## 🐛 Errori Comuni

### Errore: "Cannot read property 'query' of undefined"
**Causa**: Database non connesso
**Soluzione**: Verifica `DATABASE_URL` e che il database sia attivo

### Errore: "JWT_SECRET is not defined"
**Causa**: Variabile d'ambiente mancante
**Soluzione**: Aggiungi `JWT_SECRET` su Render

### Errore: "Failed to fetch" (CORS)
**Causa**: `FRONTEND_URL` non corrisponde
**Soluzione**: Aggiorna `FRONTEND_URL` nel backend con l'URL reale del frontend

### Errore: "Failed to fetch" (URL errato)
**Causa**: `VITE_API_URL` non configurata o errata
**Soluzione**: Verifica che `VITE_API_URL` sia l'URL corretto del backend

## 🔍 Test Rapido

1. **Backend Health Check**:
   ```
   https://tuo-backend.onrender.com/health
   ```
   Deve rispondere: `{"status":"OK",...}`

2. **Test Login Endpoint** (da browser console):
   ```javascript
   fetch('https://tuo-backend.onrender.com/api/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email: 'test@test.com', password: 'test' })
   }).then(r => r.json()).then(console.log)
   ```

3. **Verifica Database**:
   - Vai su Render → Database → "Connect"
   - Usa "External Connection" per connetterti con un client PostgreSQL
   - Esegui: `SELECT * FROM users;` (dovrebbe essere vuoto o avere l'admin)

## 📝 Ordine di Setup Corretto

1. **Database PostgreSQL** → Crea e ottieni connection string
2. **Backend** → Configura tutte le variabili → Deploy → Verifica log
3. **Esegui migrazione** → `npm run migrate` (via SSH o script)
4. **Frontend** → Configura `VITE_API_URL` → Deploy

---

**Se il problema persiste, verifica i log del backend su Render per vedere l'errore esatto!**

