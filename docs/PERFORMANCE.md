# ⚡ Performance Optimization Guide

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Sviluppatori** che ottimizzano codice
- **DevOps** che configurano infrastruttura
- **Performance Engineers** che analizzano bottleneck

## Panoramica

Questa guida descrive le ottimizzazioni di performance per il gestionale, dai problemi attuali alle soluzioni consigliate.

## Problemi di Performance Identificati

### 1. N+1 Queries

**Problema**: Query multiple invece di una singola query con JOIN.

**Esempio**: `backend/routes/projects.js`

```javascript
// ❌ MALE: N+1 queries
for (const project of projects) {
    const todos = await pool.query(
        'SELECT * FROM todos WHERE project_id = $1',
        [project.id]
    );
    project.todos = todos.rows;
}
```

**Soluzione**: Usa JOIN o query batch:

```javascript
// ✅ BENE: Single query con JOIN
const projects = await pool.query(`
    SELECT 
        p.*,
        json_agg(t.*) as todos
    FROM projects p
    LEFT JOIN todos t ON p.project_id = t.project_id
    GROUP BY p.project_id
`);

// Oppure: Batch query
const projectIds = projects.map(p => p.id);
const todos = await pool.query(
    'SELECT * FROM todos WHERE project_id = ANY($1)',
    [projectIds]
);
// Map todos to projects
```

### 2. Mancanza di Caching

**Problema**: Ogni richiesta esegue query al database.

**Soluzione**: Implementa caching:

```javascript
// Backend: Cache con Redis (o in-memory per piccolo scale)
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minuti

router.get('/api/clients', async (req, res) => {
    const cacheKey = 'clients_all';
    let clients = cache.get(cacheKey);
    
    if (!clients) {
        const result = await pool.query('SELECT * FROM clients');
        clients = result.rows;
        cache.set(cacheKey, clients);
    }
    
    res.json(clients);
});
```

### 3. Query Non Ottimizzate

**Problema**: Query senza indici o con JOIN non ottimizzati.

**Soluzione**: Aggiungi indici e ottimizza query:

```sql
-- Indici per query frequenti
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
```

### 4. Componenti Frontend Non Ottimizzati

**Problema**: `App.tsx` e `Calendar.tsx` troppo grandi, re-render eccessivi.

**Soluzione**: Vedi [Component Architecture](./frontend/Component-Architecture.md)

## Ottimizzazioni Database

### Indicizzazione

**Indici esistenti** (verifica in `schema.sql`):

```sql
-- Verifica indici esistenti
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Indici consigliati aggiuntivi**:

```sql
-- Per query frequenti su date
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);

-- Per filtri area
CREATE INDEX IF NOT EXISTS idx_projects_area ON projects(area);
CREATE INDEX IF NOT EXISTS idx_users_area ON users(area);

-- Per ricerca full-text (se necessario)
CREATE INDEX IF NOT EXISTS idx_clients_name_search ON clients USING gin(to_tsvector('italian', name));
```

### Query Optimization

**1. Usa EXPLAIN ANALYZE**

```sql
EXPLAIN ANALYZE
SELECT * FROM projects 
WHERE area = 'IT' AND status = 'Attivo';
```

**2. Evita SELECT ***

```javascript
// ❌ MALE: Seleziona tutto
SELECT * FROM projects;

// ✅ BENE: Seleziona solo colonne necessarie
SELECT project_id, name, status, area FROM projects;
```

**3. Usa LIMIT per Liste Grandi**

```javascript
// ✅ BENE: Limita risultati
SELECT * FROM projects 
ORDER BY created_at DESC 
LIMIT 50;
```

### Connection Pooling

**Attuale**: Usa `pg.Pool` ✅

```javascript
// backend/database/connection.js
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Max connessioni
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

**Ottimizzazione**: Tune pool size in base a carico:

```javascript
// Per applicazioni con molte connessioni simultanee
max: 50,
// Per applicazioni con poche connessioni
max: 10,
```

## Ottimizzazioni Backend

### Response Compression

**Implementa gzip compression**:

```javascript
import compression from 'compression';

app.use(compression()); // Comprime risposte > 1KB
```

### Pagination

**Implementa pagination** per liste grandi:

```javascript
router.get('/api/projects', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const [projects, count] = await Promise.all([
        pool.query(
            'SELECT * FROM projects ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        ),
        pool.query('SELECT COUNT(*) FROM projects')
    ]);
    
    res.json({
        data: projects.rows,
        pagination: {
            page,
            limit,
            total: parseInt(count.rows[0].count),
            totalPages: Math.ceil(parseInt(count.rows[0].count) / limit)
        }
    });
});
```

### Batch Operations

**Raggruppa operazioni simili**:

```javascript
// ❌ MALE: Multiple query separate
for (const id of ids) {
    await pool.query('UPDATE projects SET status = $1 WHERE project_id = $2', ['Completato', id]);
}

// ✅ BENE: Single query batch
await pool.query(
    'UPDATE projects SET status = $1 WHERE project_id = ANY($2)',
    ['Completato', ids]
);
```

## Ottimizzazioni Frontend

### Code Splitting

**Implementa lazy loading** per componenti grandi:

```typescript
// App.tsx
import { lazy, Suspense } from 'react';

const Calendar = lazy(() => import('./components/Calendar'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

function App() {
    return (
        <Suspense fallback={<div>Caricamento...</div>}>
            <Calendar />
        </Suspense>
    );
}
```

### Memoization

**Usa `useMemo` e `useCallback`**:

```typescript
function ProjectCard({ project, users }: Props) {
    // Memoizza calcolo costoso
    const isManager = useMemo(() => {
        return calculateIsManager(project, users);
    }, [project, users]);
    
    // Memoizza callback
    const handleUpdate = useCallback(async (data: any) => {
        await updateProject(project.id, data);
    }, [project.id]);
    
    return <div>...</div>;
}
```

### Virtual Scrolling

**Per liste molto lunghe**:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function ProjectsList({ projects }: Props) {
    const parentRef = useRef<HTMLDivElement>(null);
    
    const virtualizer = useVirtualizer({
        count: projects.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 100,
    });
    
    return (
        <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
            {virtualizer.getVirtualItems().map(virtualItem => (
                <ProjectCard 
                    key={virtualItem.key}
                    project={projects[virtualItem.index]}
                    style={{ height: virtualItem.size }}
                />
            ))}
        </div>
    );
}
```

### Debouncing/Throttling

**Per input di ricerca**:

```typescript
import { useDebouncedCallback } from 'use-debounce';

function ClientSearch() {
    const [searchTerm, setSearchTerm] = useState('');
    
    const debouncedSearch = useDebouncedCallback(
        async (term: string) => {
            const results = await clientsAPI.search(term);
            setResults(results);
        },
        300 // 300ms delay
    );
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        debouncedSearch(e.target.value);
    };
    
    return <input value={searchTerm} onChange={handleChange} />;
}
```

## Monitoring Performance

### Backend Metrics

**Monitora**:
- Response time (ms)
- Throughput (req/sec)
- Error rate (%)
- Database query time
- Memory usage

**Implementazione**:

```javascript
// Middleware per logging performance
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${duration}ms`);
        
        // Log lento se > 1s
        if (duration > 1000) {
            console.warn(`⚠️ Slow request: ${req.method} ${req.path} - ${duration}ms`);
        }
    });
    
    next();
});
```

### Frontend Metrics

**Monitora**:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Cumulative Layout Shift (CLS)

**Implementazione**:

```typescript
// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        console.log('Performance:', {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        });
    });
}
```

## Best Practices

### 1. Database Indexing

**Aggiungi indici** per:
- Foreign keys (automatico in PostgreSQL, ma verifica)
- Colonne usate in WHERE
- Colonne usate in ORDER BY
- Colonne usate in JOIN

### 2. Query Optimization

- **Usa EXPLAIN ANALYZE** per identificare query lente
- **Evita SELECT *** quando possibile
- **Usa LIMIT** per liste grandi
- **Usa pagination** invece di caricare tutto

### 3. Caching Strategy

- **Cache dati statici** (clienti, utenti)
- **Cache con TTL** appropriato (5-15 minuti)
- **Invalidate cache** dopo modifiche

### 4. Frontend Optimization

- **Code splitting** per bundle più piccoli
- **Lazy loading** per componenti pesanti
- **Memoization** per calcoli costosi
- **Debouncing** per input ricerca

### 5. Monitoring

- **Monitora** performance metrics
- **Alert** su performance degradation
- **Profile** periodicamente per identificare bottleneck

## Riferimenti

- **[Component Architecture](./frontend/Component-Architecture.md)** - Ottimizzazioni componenti
- **[Database Schema](./data/Database-Schema.md)** - Indicizzazione
- **[Monitoring](./MONITORING.md)** - Monitoring e logging

---

**Versione**: 1.0  
**Ultimo Aggiornamento**: 2024

