# 🗄️ Database Migrations - Guida Completa

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Sviluppatori Backend** che devono eseguire o creare nuove migrazioni
- **DevOps** che devono gestire il database in produzione
- **Database Administrators** che devono comprendere lo schema

## Panoramica

Il sistema di migrazioni del gestionale è basato su file SQL incrementali che modificano lo schema del database in modo controllato e reversibile (dove possibile).

**⚠️ IMPORTANTE**: Attualmente **non esiste un sistema di versioning automatico**. Le migrazioni devono essere eseguite manualmente nell'ordine corretto.

## Struttura Migrazioni

### File di Migrazione Disponibili

Le migrazioni si trovano in `backend/database/`:

1. **`schema.sql`** - Schema base iniziale (tabelle core)
2. **`migration_tasks_and_assignments.sql`** - Task management e assegnazioni team
3. **`migration_add_version_optimistic_locking.sql`** - Versioning per controllo concorrenza
4. **`migration_advanced_events.sql`** - Eventi avanzati (tipi, ricorrenza, inviti)
5. **`migration_event_reports_and_polls.sql`** - Reportistica eventi e sondaggi
6. **`migration_hr_recruiting.sql`** - Modulo HR (candidati, onboarding)
7. **`migration_add_last_seen.sql`** - Tracking utenti online (se presente)

### Ordine di Esecuzione (CRITICO)

Le migrazioni **devono** essere eseguite nell'ordine cronologico per garantire l'integrità referenziale:

```mermaid
graph TD
    A[schema.sql] --> B[migration_tasks_and_assignments.sql]
    B --> C[migration_add_version_optimistic_locking.sql]
    C --> D[migration_advanced_events.sql]
    D --> E[migration_event_reports_and_polls.sql]
    E --> F[migration_hr_recruiting.sql]
    F --> G[migration_add_last_seen.sql]
    
    style A fill:#c8e6c9
    style B fill:#fff9c4
    style C fill:#fff9c4
    style D fill:#fff9c4
    style E fill:#fff9c4
    style F fill:#fff9c4
    style G fill:#fff9c4
```

**⚠️ NON SALTARE ALCUNA MIGRAZIONE** - Ogni migrazione dipende dalle precedenti.

## Esecuzione Migrazioni

### Metodo 1: Script Migrate (Solo Schema Base)

Lo script `backend/scripts/migrate.js` esegue **solo** `schema.sql`:

```bash
cd backend
npm run migrate
```

**Limitazione**: Non esegue le migrazioni incrementali successive.

### Metodo 2: Esecuzione Manuale (Consigliato)

Per un database nuovo o per applicare tutte le migrazioni:

#### Passo 1: Connetti al Database

```bash
# Usando psql
psql "postgresql://user:password@host:port/database"

# O usando pgAdmin / DBeaver
# Connetti tramite connection string
```

#### Passo 2: Esegui le Migrazioni in Ordine

```sql
-- 1. Schema base
\i backend/database/schema.sql

-- 2. Task management
\i backend/database/migration_tasks_and_assignments.sql

-- 3. Optimistic locking
\i backend/database/migration_add_version_optimistic_locking.sql

-- 4. Eventi avanzati
\i backend/database/migration_advanced_events.sql

-- 5. Report e sondaggi
\i backend/database/migration_event_reports_and_polls.sql

-- 6. HR recruiting
\i backend/database/migration_hr_recruiting.sql

-- 7. Last seen (se presente)
\i backend/database/migration_add_last_seen.sql
```

#### Passo 3: Verifica

```sql
-- Verifica che tutte le tabelle esistano
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Dovresti vedere:
-- candidates
-- clients
-- contracts
-- event_reports
-- events
-- participants
-- poll_time_slots
-- poll_votes
-- project_assignments
-- projects
-- scheduling_polls
-- tasks
-- todos (legacy)
-- users
```

### Metodo 3: Script Node.js Personalizzato

Crea uno script per eseguire tutte le migrazioni in sequenza:

```javascript
// backend/scripts/migrate-all.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../database/connection.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations = [
    'schema.sql',
    'migration_tasks_and_assignments.sql',
    'migration_add_version_optimistic_locking.sql',
    'migration_advanced_events.sql',
    'migration_event_reports_and_polls.sql',
    'migration_hr_recruiting.sql',
    'migration_add_last_seen.sql', // Se presente
];

async function migrateAll() {
    try {
        console.log('🔄 Avvio migrazione completa database...\n');
        
        for (const migrationFile of migrations) {
            const migrationPath = path.join(__dirname, '../database', migrationFile);
            
            if (!fs.existsSync(migrationPath)) {
                console.warn(`⚠️  File non trovato: ${migrationFile} (saltato)`);
                continue;
            }
            
            console.log(`📄 Eseguendo: ${migrationFile}...`);
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            
            await pool.query(migrationSQL);
            console.log(`✅ ${migrationFile} completata\n`);
        }
        
        console.log('✅ Tutte le migrazioni completate con successo!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Errore durante la migrazione:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

migrateAll();
```

Esegui:
```bash
node backend/scripts/migrate-all.js
```

## Verifica Stato Migrazioni

### Controllo Manuale

Verifica quali tabelle/colonne esistono:

```sql
-- Verifica tabelle
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verifica colonne version (optimistic locking)
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'version' AND table_schema = 'public';

-- Verifica colonne candidate_id (HR module)
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'candidate_id' AND table_schema = 'public';
```

### Sistema di Versioning (Futuro)

**⚠️ ATTUALMENTE NON IMPLEMENTATO**

Per tracciare quali migrazioni sono state eseguite, si consiglia di creare una tabella `migrations`:

```sql
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64) -- Hash del contenuto SQL per verificare modifiche
);

-- Dopo ogni migrazione, inserisci:
INSERT INTO migrations (filename) VALUES ('migration_tasks_and_assignments.sql');
```

## Rollback Migrazioni

### ⚠️ Limitazione Attuale

**Le migrazioni attuali NON sono reversibili automaticamente**. Non contengono comandi `ROLLBACK` o `DROP`.

### Rollback Manuale

Per rollback, devi creare script SQL inversi manualmente:

```sql
-- Esempio: Rollback migration_hr_recruiting.sql
ALTER TABLE events DROP COLUMN IF EXISTS candidate_id;
ALTER TABLE scheduling_polls DROP COLUMN IF EXISTS candidate_id;
DROP TABLE IF EXISTS candidates CASCADE;
```

**⚠️ ATTENZIONE**: Il rollback può causare perdita di dati. **Sempre eseguire backup prima**.

## Best Practices

### 1. Backup Prima di Migrazioni

**SEMPRE** eseguire un backup completo prima di applicare migrazioni:

```bash
# Backup completo database
pg_dump "postgresql://user:password@host:port/database" > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Test in Ambiente di Sviluppo

**MAI** applicare migrazioni in produzione senza averle testate in sviluppo/staging.

### 3. Migrazioni Idempotenti

Le migrazioni utilizzano `IF NOT EXISTS` e `ADD COLUMN IF NOT EXISTS` per essere idempotenti (possono essere rieseguite senza errori).

### 4. Transazioni

Le migrazioni complesse (es. `migration_hr_recruiting.sql`) utilizzano transazioni per garantire atomicità.

### 5. Verifica Post-Migrazione

Dopo ogni migrazione, verifica:
- Che le tabelle siano state create/modificate correttamente
- Che gli indici siano stati creati
- Che i trigger funzionino
- Che i constraint siano validi

## Problemi Comuni

### Errore: "relation already exists"

**Causa**: La tabella/colonna esiste già.  
**Soluzione**: Le migrazioni usano `IF NOT EXISTS`, quindi è sicuro rieseguirle. Se l'errore persiste, verifica manualmente lo schema.

### Errore: "column does not exist"

**Causa**: La migrazione precedente non è stata eseguita.  
**Soluzione**: Verifica l'ordine di esecuzione e riparti dalla migrazione mancante.

### Errore: "constraint violation"

**Causa**: Dati esistenti violano i nuovi constraint.  
**Soluzione**: Pulisci o migra i dati esistenti prima di applicare il constraint.

### Errore: "foreign key violation"

**Causa**: Riferimenti a tabelle/colonne non esistenti.  
**Soluzione**: Verifica che tutte le migrazioni precedenti siano state eseguite.

## Migrazioni per Ambiente

### Sviluppo Locale

```bash
# 1. Crea database locale
createdb gestionale_dev

# 2. Esegui tutte le migrazioni
# (vedi Metodo 2 o 3 sopra)

# 3. Crea utente admin
npm run create-user
```

### Staging/Produzione (Render)

1. **Connetti via SSH** al servizio Render (se disponibile)
2. **Oppure** usa "PostgreSQL" → "Connect" → "External Connection"
3. Esegui le migrazioni tramite client PostgreSQL (pgAdmin, DBeaver, psql)

**⚠️ NON usare** `npm run migrate` in produzione - esegue solo `schema.sql`.

## Creare Nuove Migrazioni

### Template

```sql
-- Migration: Nome Descrittivo
-- Data: YYYY-MM-DD
-- Descrizione: Cosa fa questa migrazione

-- ============================================
-- 1. MODIFICA TABELLA ESISTENTE
-- ============================================
ALTER TABLE nome_tabella 
ADD COLUMN IF NOT EXISTS nuova_colonna VARCHAR(255);

-- ============================================
-- 2. CREA NUOVA TABELLA
-- ============================================
CREATE TABLE IF NOT EXISTS nuova_tabella (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- colonne...
);

-- ============================================
-- 3. INDICI
-- ============================================
CREATE INDEX IF NOT EXISTS idx_nome_tabella_colonna 
ON nome_tabella(colonna);

-- ============================================
-- 4. TRIGGER (se necessario)
-- ============================================
CREATE TRIGGER IF NOT EXISTS trigger_nome
BEFORE UPDATE ON nome_tabella
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Convenzioni

1. **Nome file**: `migration_<descrizione_breve>.sql`
2. **Commenti**: Spiega ogni sezione
3. **Idempotenza**: Usa sempre `IF NOT EXISTS` / `IF EXISTS`
4. **Transazioni**: Per operazioni multiple, usa `BEGIN` / `COMMIT`
5. **Rollback**: Documenta come fare rollback manualmente

## Checklist Pre-Migrazione

- [ ] Backup database eseguito
- [ ] Migrazione testata in ambiente di sviluppo
- [ ] Verificato ordine di esecuzione
- [ ] Documentato rollback procedure
- [ ] Notificato team del downtime (se necessario)
- [ ] Preparato script di verifica post-migrazione

## Checklist Post-Migrazione

- [ ] Verificato che tutte le tabelle esistano
- [ ] Verificato che tutte le colonne esistano
- [ ] Verificato che gli indici siano stati creati
- [ ] Testato funzionalità che usano le nuove tabelle/colonne
- [ ] Verificato che non ci siano errori nei log
- [ ] Aggiornato documentazione se necessario

## Riferimenti

- **[Database Schema](../data/Database-Schema.md)** - Schema completo del database
- **[Troubleshooting](../TROUBLESHOOTING.md)** - Problemi comuni e soluzioni
- **[Backup & Recovery](../data/Backup-Recovery.md)** - Procedure di backup

---

**Versione**: 1.0  
**Ultimo Aggiornamento**: 2024

