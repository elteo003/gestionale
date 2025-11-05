# 🔄 API Versioning Strategy

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Sviluppatori Backend** che devono gestire breaking changes
- **Software Architects** che definiscono strategia di versioning
- **Product Managers** che devono gestire backward compatibility

## Panoramica

**⚠️ STATO ATTUALE**: Il sistema **non implementa** ancora un sistema di versioning API formale. Tutte le API sono considerate versione `v1` implicita.

Questo documento descrive la **strategia consigliata** per implementare versioning API in futuro.

## Strategia Consigliata: URL Versioning

### Formato

```
/api/v1/projects
/api/v2/projects  # Nuova versione
```

**Vantaggi**:
- Esplicito e chiaro
- Facile da implementare
- Supporta multiple versioni simultanee

### Implementazione

```javascript
// backend/server.js
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes); // Futuro

// Backward compatibility: redirect v1 a v1 esplicito
app.use('/api/projects', v1Routes); // Mantiene compatibilità
```

## Quando Creare una Nuova Versione

### Breaking Changes che Richiedono v2

1. **Rimozione campo** in risposta
2. **Cambio tipo** di campo (es. `string` → `number`)
3. **Cambio formato** di campo (es. `date` → `timestamp`)
4. **Rimozione endpoint**
5. **Cambio comportamento** significativo (es. logica di filtro)

### Non-Richiedono Nuova Versione

1. **Aggiunta campo** (backward compatible)
2. **Aggiunta endpoint** (non rompe client esistenti)
3. **Bug fix** (comportamento corretto)
4. **Performance improvements** (stesso comportamento)

## Backward Compatibility

### Principio Fondamentale

**Mantieni sempre almeno una versione precedente** per permettere ai client di migrare gradualmente.

### Esempio: Migrazione v1 → v2

```javascript
// v1: Mantiene comportamento originale
router.get('/api/v1/projects', async (req, res) => {
    // Comportamento originale
    const projects = await pool.query('SELECT * FROM projects');
    res.json(projects.rows); // Formato originale
});

// v2: Nuovo formato
router.get('/api/v2/projects', async (req, res) => {
    // Nuovo comportamento
    const projects = await pool.query(`
        SELECT p.*, c.name as client_name 
        FROM projects p 
        LEFT JOIN clients c ON p.client_id = c.client_id
    `);
    res.json({
        data: projects.rows,
        meta: { total: projects.rows.length }
    }); // Nuovo formato
});
```

## Deprecation Policy

### Processo di Deprecazione

1. **Annuncio**: Documenta la deprecazione in changelog
2. **Warning Header**: Aggiungi header `X-API-Deprecation: true` nelle risposte
3. **Periodo Grace**: Mantieni endpoint per 6-12 mesi
4. **Rimozione**: Rimuovi dopo periodo grace

### Esempio: Deprecazione Endpoint

```javascript
router.get('/api/v1/projects', async (req, res) => {
    // Header di deprecazione
    res.setHeader('X-API-Deprecation', 'true');
    res.setHeader('X-API-Deprecation-Date', '2024-12-31');
    res.setHeader('X-API-Sunset', '2025-06-30');
    
    // Log warning per monitoraggio
    console.warn('[DEPRECATED] /api/v1/projects chiamato da:', req.ip);
    
    // Comportamento originale
    const projects = await pool.query('SELECT * FROM projects');
    res.json(projects.rows);
});
```

## Versioning per Moduli Specifici

### Approccio Modulare

Invece di versionare tutta l'API, versiona solo i moduli che cambiano:

```
/api/v1/projects     # Stabile
/api/v1/clients      # Stabile
/api/v2/events       # Nuova versione solo per eventi
```

**Vantaggio**: Evita versioning eccessivo per moduli stabili.

## Best Practices

### 1. Documentazione Changelog

Mantieni un changelog per ogni versione:

```markdown
# API Changelog

## v2.0.0 (2024-12-01)
### Breaking Changes
- `GET /api/v2/projects` ora ritorna `{data: [], meta: {}}` invece di array diretto
- Campo `status` in progetti ora è enum invece di stringa libera

### Added
- `GET /api/v2/projects/:id/timeline` - Nuovo endpoint per timeline progetto

## v1.0.0 (2024-01-01)
- Versione iniziale
```

### 2. Versioning in Header (Alternativa)

Se preferisci non modificare URL, usa header:

```
GET /api/projects
X-API-Version: 2
```

**Svantaggio**: Meno esplicito, richiede header custom.

### 3. Content Negotiation

Usa `Accept` header per versioning:

```
GET /api/projects
Accept: application/vnd.gestionale.v2+json
```

**Svantaggio**: Più complesso da implementare.

## Implementazione Futura

### Fase 1: Preparazione

1. Creare struttura `backend/routes/v1/`
2. Spostare route esistenti in `v1/`
3. Mantenere route `/api/*` come alias a `v1`

### Fase 2: Implementazione v2

1. Creare `backend/routes/v2/` per nuovi endpoint
2. Documentare breaking changes
3. Aggiungere deprecation warnings a v1

### Fase 3: Migrazione Client

1. Aggiornare frontend a v2 gradualmente
2. Monitorare utilizzo v1
3. Deprecare v1 dopo migrazione completa

## Esempio Implementazione

### Struttura Directory

```
backend/routes/
├── v1/
│   ├── projects.js
│   ├── clients.js
│   └── events.js
├── v2/
│   ├── projects.js  # Nuova versione
│   └── events.js    # Nuova versione
└── index.js         # Router principale
```

### Router Principale

```javascript
// backend/routes/index.js
import express from 'express';
import v1Routes from './v1/index.js';
import v2Routes from './v2/index.js';

const router = express.Router();

// Versioned routes
router.use('/v1', v1Routes);
router.use('/v2', v2Routes);

// Backward compatibility: /api/* -> /api/v1/*
router.use('/', v1Routes);

export default router;
```

## Riferimenti

- **[API Endpoints](./API-Endpoints.md)** - Documentazione endpoint attuali
- **[Error Handling](./Error-Handling-Patterns.md)** - Gestione errori versioning

---

**Nota**: Questo documento descrive una strategia **futura**. L'API attuale è considerata `v1` implicita e non implementa versioning formale.

**Versione**: 1.0  
**Ultimo Aggiornamento**: 2024

