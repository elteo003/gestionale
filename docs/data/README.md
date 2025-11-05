# 📊 Documentazione Dati & Analytics

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Analisti Dati** che creano report e query SQL
- **Ingegneri del Software** che progettano schema database
- **Sviluppatori Backend** che scrivono query ottimizzate

## Panoramica

Il Data Layer del gestionale è basato su **PostgreSQL**, un database relazionale robusto e scalabile. Il database supporta funzionalità avanzate come JSONB per dati strutturati flessibili, triggers per integrità referenziale automatica e indicizzazione per performance ottimali.

## Posizione Database

### Ambiente Produzione

- **Hosting**: Render PostgreSQL / Supabase
- **Tipo**: PostgreSQL 14+
- **Accesso**: Tramite connection string in variabile d'ambiente `DATABASE_URL`

### Ambiente Sviluppo

- **Locale**: PostgreSQL locale o Docker container
- **Connection String**: Configurata in `backend/.env`

## Strumenti di Connessione

### Opzione 1: pgAdmin

1. Scarica e installa [pgAdmin](https://www.pgadmin.org/)
2. Crea nuova connessione:
   - **Host**: Dalla connection string Render/Supabase
   - **Port**: 5432 (default)
   - **Database**: Nome database
   - **Username**: User database
   - **Password**: Password database
3. Connetti e naviga le tabelle

### Opzione 2: DBeaver

1. Scarica [DBeaver](https://dbeaver.io/)
2. Crea nuova connessione PostgreSQL
3. Inserisci credenziali da connection string
4. Testa connessione e connetti

### Opzione 3: psql (CLI)

```bash
# Estrai credenziali da DATABASE_URL
# Formato: postgresql://user:password@host:port/database

psql "postgresql://user:password@host:port/database"
```

### Opzione 4: Supabase Dashboard

Se il database è su Supabase:
1. Accedi al dashboard Supabase
2. Vai su "SQL Editor"
3. Esegui query direttamente

## Struttura Database

### Schema Principale

Il database è organizzato in moduli logici:

1. **Core**: Users, Clients, Projects, Contracts
2. **Task Management**: Tasks, Project_Assignments, Todos (legacy)
3. **Events**: Events, Participants, Event_Reports
4. **Planning**: Scheduling_Polls, Poll_Time_Slots, Poll_Votes
5. **HR**: Candidates

### Migration Files

Le migration SQL si trovano in `backend/database/`:

- `schema.sql`: Schema base iniziale
- `migration_tasks_and_assignments.sql`: Task management
- `migration_add_version_optimistic_locking.sql`: Versioning per concorrenza
- `migration_advanced_events.sql`: Eventi avanzati
- `migration_event_reports_and_polls.sql`: Report e sondaggi
- `migration_hr_recruiting.sql`: Modulo HR

**Ordine di Esecuzione**: Eseguire le migration nell'ordine cronologico per mantenere integrità referenziale.

## Convenzioni di Nomenclatura

### Tabelle
- **Plurale**: `users`, `clients`, `projects`
- **Snake_case**: `project_assignments`, `poll_time_slots`

### Colonne
- **Primary Key**: `{table_name}_id` (es. `user_id`, `project_id`)
- **Foreign Key**: `{referenced_table}_id` (es. `client_id`, `creator_id`)
- **Timestamps**: `created_at`, `updated_at`, `last_seen`
- **Snake_case**: `assigned_to_user_id`, `area_competenza`

### Indici
- **Prefisso**: `idx_{table}_{column}` (es. `idx_events_event_type`)

## Tipi di Dati

### UUID
- **Uso**: Primary keys e foreign keys
- **Generazione**: `gen_random_uuid()` (PostgreSQL)
- **Formato**: `550e8400-e29b-41d4-a716-446655440000`

### JSONB
- **Uso**: Dati strutturati flessibili
- **Esempi**: 
  - `invitation_rules`: `{groups: ["manager"], individuals: ["uuid"]}`
  - Dati dinamici per eventi

### TIMESTAMP / TIMESTAMPTZ
- **TIMESTAMP**: Timestamp senza timezone
- **TIMESTAMPTZ**: Timestamp con timezone (consigliato)
- **Default**: `CURRENT_TIMESTAMP`

### CHECK Constraints
- **Status**: Valori enumerati (es. `status IN ('In Corso', 'Completato')`)
- **Ruoli**: `role IN ('Manager', 'Admin', ...)`

## Query Optimization

### Best Practices

1. **Usa Indici**: Tutte le FK e colonne in WHERE/ORDER BY hanno indici
2. **SELECT Specifici**: `SELECT id, name` invece di `SELECT *`
3. **LIMIT**: Applica limit su query che ritornano molti risultati
4. **JOIN vs Subquery**: Preferisci JOIN espliciti quando possibile

### Esempio Query Ottimizzata

```sql
-- ✅ OTTIMIZZATA (usa indici)
SELECT p.project_id, p.name, c.name as client_name
FROM projects p
JOIN clients c ON p.client_id = c.client_id
WHERE p.area = 'IT' AND p.status = 'In Corso'
ORDER BY p.created_at DESC
LIMIT 10;

-- ❌ NON OTTIMIZZATA (subquery, SELECT *)
SELECT *
FROM projects
WHERE project_id IN (
    SELECT project_id FROM projects WHERE area = 'IT'
);
```

## Riferimenti

- **[Database Schema](./Database-Schema.md)** - ERD completo e dizionario dati
- **[KPI Analytics](./KPI-Analytics.md)** - Metriche e query per dashboard

---

**Versione**: 1.0  
**Mantainer**: Team Data & Analytics

