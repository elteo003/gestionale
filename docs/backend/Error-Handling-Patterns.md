# 🚨 Error Handling Patterns - Backend

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Sviluppatori Backend** che implementano nuove route API
- **Code Reviewers** che verificano la conformità ai pattern
- **Ingegneri del Software** che definiscono standard di codice

## Principi Fondamentali

### 1. Sempre Usare Try-Catch

**Ogni route handler** deve essere wrappato in try-catch:

```javascript
router.post('/api/example', authenticateToken, async (req, res) => {
    try {
        // Logica business
        const result = await pool.query(...);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Errore operazione:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});
```

### 2. Logging Dettagliato

**Sempre loggare** errori con contesto sufficiente:

```javascript
catch (error) {
    console.error('Errore creazione progetto:', {
        userId: req.user.userId,
        projectName: req.body.name,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({ error: 'Errore interno del server' });
}
```

### 3. Non Esporre Dettagli in Produzione

**Mai** esporre stack trace o dettagli interni in produzione:

```javascript
res.status(500).json({ 
    error: 'Errore interno del server',
    // Solo in development
    ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        stack: error.stack 
    })
});
```

## Codici di Stato HTTP

### 200 OK
**Uso**: Operazione completata con successo

```javascript
res.json({ data: result });
```

### 201 Created
**Uso**: Risorsa creata con successo

```javascript
res.status(201).json({ id: newId, ...data });
```

### 400 Bad Request
**Uso**: Richiesta malformata, validazione fallita

```javascript
if (!name || !email) {
    return res.status(400).json({ 
        error: 'Nome ed email sono obbligatori' 
    });
}
```

### 401 Unauthorized
**Uso**: Token mancante, invalido o scaduto

```javascript
// Gestito da authenticateToken middleware
if (!token) {
    return res.status(401).json({ 
        error: 'Token di autenticazione mancante' 
    });
}
```

### 403 Forbidden
**Uso**: Token valido ma permessi insufficienti

```javascript
if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
    return res.status(403).json({ 
        error: 'Non hai i permessi per questa operazione' 
    });
}
```

### 404 Not Found
**Uso**: Risorsa non trovata

```javascript
if (result.rows.length === 0) {
    return res.status(404).json({ 
        error: 'Progetto non trovato' 
    });
}
```

### 409 Conflict
**Uso**: Conflitto di modifica simultanea (optimistic locking)

```javascript
if (currentVersion !== expectedVersion) {
    return res.status(409).json({
        error: 'CONCURRENT_MODIFICATION',
        message: 'Il record è stato modificato da un altro utente',
        currentVersion: currentVersion,
        expectedVersion: expectedVersion,
        serverData: serverData.rows[0]
    });
}
```

### 500 Internal Server Error
**Uso**: Errore interno del server (non gestito)

```javascript
catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ 
        error: 'Errore interno del server' 
    });
}
```

## Pattern per Tipi di Errore

### Errori di Validazione

```javascript
// Pattern standardizzato
const { name, email, status } = req.body;

// Validazione campi obbligatori
if (!name || !email) {
    return res.status(400).json({ 
        error: 'Nome ed email sono obbligatori' 
    });
}

// Validazione formato
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ 
        error: 'Formato email non valido' 
    });
}

// Validazione valori enum
const validStatuses = ['Attivo', 'Inattivo', 'Sospeso'];
if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ 
        error: `Status deve essere uno di: ${validStatuses.join(', ')}` 
    });
}
```

### Errori di Database

```javascript
try {
    const result = await pool.query('INSERT INTO ...');
} catch (error) {
    // PostgreSQL error codes
    if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ 
            error: 'Email già registrata' 
        });
    }
    
    if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({ 
            error: 'Riferimento a risorsa inesistente' 
        });
    }
    
    if (error.code === '42P01') { // Table does not exist
        console.error('Tabella non trovata:', error);
        return res.status(500).json({ 
            error: 'Errore di configurazione database' 
        });
    }
    
    // Altri errori database
    console.error('Errore database:', error);
    res.status(500).json({ error: 'Errore interno del server' });
}
```

### Errori di Autenticazione

```javascript
// Middleware authenticateToken
if (!token) {
    return res.status(401).json({ 
        error: 'Token di autenticazione mancante' 
    });
}

jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token scaduto. Effettua nuovamente il login.' 
            });
        }
        return res.status(403).json({ 
            error: 'Token non valido' 
        });
    }
    req.user = user;
    next();
});
```

### Errori di Autorizzazione

```javascript
// Pattern: Verifica permessi prima dell'operazione
const canPerformAction = 
    req.user.role === 'Admin' || 
    req.user.role === 'Manager' ||
    (req.user.userId === resource.creator_id);

if (!canPerformAction) {
    return res.status(403).json({ 
        error: 'Non hai i permessi per questa operazione' 
    });
}
```

## Struttura Risposte Errore

### Formato Standard

```javascript
// Errore semplice
{
    "error": "Messaggio errore user-friendly"
}

// Errore con dettagli (solo development)
{
    "error": "Errore interno del server",
    "details": "Dettagli tecnici (solo in NODE_ENV=development)"
}

// Errore con dati aggiuntivi (es. 409 Conflict)
{
    "error": "CONCURRENT_MODIFICATION",
    "message": "Descrizione estesa",
    "currentVersion": 6,
    "expectedVersion": 5,
    "serverData": { ... }
}
```

### Convenzioni Messaggi

- **Italiano**: Tutti i messaggi di errore in italiano (per utenti finali)
- **User-Friendly**: Messaggi chiari e comprensibili, non tecnici
- **Specifici**: Indicare cosa è andato storto e come risolvere (quando possibile)

**Esempi**:

```javascript
// ✅ BENE
"Email ed email sono obbligatori"
"Progetto non trovato"
"Non hai i permessi per modificare questo progetto"

// ❌ MALE
"Validation error"
"404"
"Access denied"
```

## Gestione Errori in Transazioni

### Pattern con Rollback

```javascript
const client = await pool.connect();
try {
    await client.query('BEGIN');
    
    // Operazione 1
    await client.query('INSERT INTO ...');
    
    // Operazione 2
    await client.query('UPDATE ...');
    
    await client.query('COMMIT');
    res.status(201).json({ success: true });
} catch (error) {
    await client.query('ROLLBACK');
    console.error('Errore transazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
} finally {
    client.release();
}
```

### Errori Specifici in Transazioni

```javascript
try {
    await client.query('BEGIN');
    
    // Validazione prima della transazione
    if (!validData) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Dati non validi' });
    }
    
    // Operazioni...
    
    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');
    
    // Gestisci errori specifici
    if (error.code === '23505') {
        return res.status(400).json({ error: 'Record duplicato' });
    }
    
    throw error; // Rilancia per gestione generale
}
```

## Logging Strategy

### Livelli di Log

```javascript
// INFO: Operazioni di business importanti
console.log('✅ Progetto creato:', { id: project.id, name: project.name });

// WARN: Situazioni anomale ma gestibili
console.warn('⚠️  Utente non trovato, usando dati cache');

// ERROR: Errori che richiedono attenzione
console.error('❌ Errore database:', {
    query: 'SELECT ...',
    error: error.message,
    code: error.code
});
```

### Formato Log Standardizzato

```javascript
// Pattern: [Timestamp] [Level] [Context] [Details]
console.error('[ERROR] [Projects] [Create]', {
    userId: req.user.userId,
    projectName: req.body.name,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
});
```

### Cosa NON Loggare

- ❌ Password (anche hash, se possibile)
- ❌ Token JWT completi
- ❌ Dati sensibili (carte di credito, SSN, ecc.)
- ❌ Stack trace in produzione

### Cosa Loggare

- ✅ User ID (non email completa)
- ✅ Operazione eseguita
- ✅ Errori con contesto
- ✅ Timestamp
- ✅ Request ID (se implementato)

## Error Handling Middleware

### Middleware Globale

**File**: `backend/server.js`

```javascript
// Error handling middleware (deve essere l'ultimo)
app.use((err, req, res, next) => {
    console.error('Errore non gestito:', {
        path: req.path,
        method: req.method,
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    res.status(err.status || 500).json({
        error: err.message || 'Errore interno del server',
        ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack 
        })
    });
});
```

### 404 Handler

```javascript
// 404 handler (dopo tutte le route)
app.use((req, res) => {
    console.log(`404 - Route non trovata: ${req.method} ${req.path}`);
    res.status(404).json({ 
        error: 'Route non trovata',
        path: req.path,
        method: req.method
    });
});
```

## Best Practices

### 1. Validazione Precoce

**Valida i dati PRIMA** di eseguire operazioni costose:

```javascript
// ✅ BENE: Valida prima
if (!name || !email) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti' });
}

// Poi esegui query
const result = await pool.query(...);

// ❌ MALE: Valida dopo query
const result = await pool.query(...);
if (!name) {
    // Query già eseguita inutilmente
}
```

### 2. Return Early

**Usa return early** per evitare nesting eccessivo:

```javascript
// ✅ BENE
if (!name) {
    return res.status(400).json({ error: 'Nome obbligatorio' });
}

if (!email) {
    return res.status(400).json({ error: 'Email obbligatoria' });
}

// Logica principale (non nested)
const result = await pool.query(...);

// ❌ MALE
if (name) {
    if (email) {
        // Logica nested
    } else {
        return res.status(400).json({ error: 'Email obbligatoria' });
    }
} else {
    return res.status(400).json({ error: 'Nome obbligatorio' });
}
```

### 3. Errori Specifici vs Generici

**Usa errori specifici** quando possibile, ma non esporre dettagli interni:

```javascript
// ✅ BENE: Specifico ma sicuro
if (error.code === '23505') {
    return res.status(400).json({ error: 'Email già registrata' });
}

// ❌ MALE: Troppo generico
res.status(500).json({ error: 'Errore' });

// ❌ MALE: Troppo dettagliato (sicurezza)
res.status(500).json({ 
    error: error.message,
    stack: error.stack,
    query: error.query // Espone query SQL
});
```

### 4. Consistent Error Format

**Usa sempre lo stesso formato** per errori simili:

```javascript
// Pattern: { error: "messaggio", ...optionalFields }

// ✅ Consistente
res.status(400).json({ error: 'Email già registrata' });
res.status(400).json({ error: 'Nome obbligatorio' });
res.status(400).json({ error: 'Formato email non valido' });

// ❌ Inconsistente
res.status(400).json({ message: 'Email già registrata' });
res.status(400).json({ error: 'Nome obbligatorio' });
res.status(400).send('Formato email non valido');
```

## Esempi Completi

### Esempio 1: Creazione Risorsa

```javascript
router.post('/api/projects', authenticateToken, async (req, res) => {
    try {
        const { name, clientId, area, status } = req.body;

        // Validazione
        if (!name) {
            return res.status(400).json({ error: 'Nome progetto obbligatorio' });
        }

        if (!clientId) {
            return res.status(400).json({ error: 'Cliente obbligatorio' });
        }

        // Verifica esistenza cliente
        const clientCheck = await pool.query(
            'SELECT client_id FROM clients WHERE client_id = $1',
            [clientId]
        );

        if (clientCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente non trovato' });
        }

        // Creazione
        const result = await pool.query(
            `INSERT INTO projects (name, client_id, area, status, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, clientId, area || null, status || 'Pianificato', req.user.userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Errore creazione progetto:', {
            userId: req.user?.userId,
            projectName: req.body?.name,
            error: error.message,
            code: error.code
        });

        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ 
                error: 'Cliente non valido' 
            });
        }

        res.status(500).json({ 
            error: 'Errore interno del server',
            ...(process.env.NODE_ENV === 'development' && { 
                details: error.message 
            })
        });
    }
});
```

### Esempio 2: Aggiornamento con Optimistic Locking

```javascript
router.put('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status, expectedVersion } = req.body;

        // Verifica esistenza
        const checkResult = await pool.query(
            'SELECT version FROM projects WHERE project_id = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Progetto non trovato' });
        }

        // Optimistic locking
        if (expectedVersion !== undefined) {
            const currentVersion = checkResult.rows[0].version;
            if (currentVersion !== expectedVersion) {
                const serverData = await pool.query(
                    'SELECT * FROM projects WHERE project_id = $1',
                    [id]
                );
                return res.status(409).json({
                    error: 'CONCURRENT_MODIFICATION',
                    message: 'Il progetto è stato modificato da un altro utente',
                    currentVersion: currentVersion,
                    expectedVersion: expectedVersion,
                    serverData: serverData.rows[0]
                });
            }
        }

        // Aggiornamento
        const result = await pool.query(
            `UPDATE projects 
             SET name = COALESCE($1, name),
                 status = COALESCE($2, status),
                 updated_at = CURRENT_TIMESTAMP
             WHERE project_id = $3
             RETURNING *`,
            [name, status, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore aggiornamento progetto:', {
            projectId: req.params.id,
            userId: req.user?.userId,
            error: error.message
        });
        res.status(500).json({ error: 'Errore interno del server' });
    }
});
```

## Riferimenti

- **[Optimistic Locking](./Optimistic-Locking.md)** - Gestione conflitti 409
- **[API Endpoints](./API-Endpoints.md)** - Esempi di error handling per ogni endpoint
- **[Monitoring](../MONITORING.md)** - Strategia di logging

---

**Versione**: 1.0  
**Ultimo Aggiornamento**: 2024

