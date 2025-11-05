# 💾 Backup & Recovery - Database

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Database Administrators** che gestiscono backup
- **DevOps** che configurano procedure di recovery
- **System Administrators** che devono garantire continuità servizio

## Panoramica

Questa guida descrive le procedure di backup e recovery per il database PostgreSQL del gestionale, sia su ambiente locale che su Render/Supabase.

## Strategia di Backup

### Backup Flow

```mermaid
graph TD
    A[Backup Trigger] --> B{Backup Type?}
    B -->|Manual| C[User Initiated]
    B -->|Scheduled| D[Cron Job]
    B -->|Pre-Migration| E[Before Migration]
    
    C --> F[pg_dump]
    D --> F
    E --> F
    
    F --> G[Create SQL Dump]
    G --> H[Compress]
    H --> I[Store Backup]
    I --> J{Storage Location?}
    J -->|Local| K[Local Filesystem]
    J -->|Cloud| L[S3/GCS]
    J -->|Render| M[Render Backups]
    
    I --> N[Verify Backup]
    N --> O{Valid?}
    O -->|No| P[Retry Backup]
    O -->|Yes| Q[Backup Complete]
    
    style A fill:#e1f5ff
    style F fill:#c8e6c9
    style G fill:#fff9c4
    style H fill:#fff9c4
    style I fill:#ccccff
    style N fill:#ffcc99
    style O fill:#ffcc99
    style Q fill:#ccffcc
```

### Tipi di Backup

1. **Full Backup** - Backup completo del database
2. **Incremental Backup** - Solo modifiche dall'ultimo backup
3. **Point-in-Time Recovery (PITR)** - Recovery a un momento specifico (se supportato)

### Frequenza Consigliata

- **Sviluppo**: Backup manuale prima di migrazioni importanti
- **Staging**: Backup automatico giornaliero
- **Produzione**: Backup automatico giornaliero + backup prima di deploy

## Backup Manuale

### Metodo 1: pg_dump (Completo)

**Backup completo** in formato SQL:

```bash
# Formato SQL (testo)
pg_dump "postgresql://user:password@host:port/database" > backup_$(date +%Y%m%d_%H%M%S).sql

# Formato custom (binario, più veloce)
pg_dump -Fc "postgresql://user:password@host:port/database" > backup_$(date +%Y%m%d_%H%M%S).dump

# Solo schema (senza dati)
pg_dump --schema-only "postgresql://user:password@host:port/database" > schema_backup.sql

# Solo dati (senza schema)
pg_dump --data-only "postgresql://user:password@host:port/database" > data_backup.sql
```

### Metodo 2: pgAdmin

1. Apri **pgAdmin**
2. Click destro sul database → **Backup...**
3. Seleziona:
   - **Format**: Plain (SQL) o Custom
   - **Filename**: `backup_YYYYMMDD_HHMMSS.sql`
4. Clicca **Backup**

### Metodo 3: Supabase Dashboard

Se il database è su **Supabase**:

1. Vai su **Database** → **Backups**
2. Clicca **"Create Backup"**
3. Seleziona database e formato
4. Download del backup

### Metodo 4: Render PostgreSQL

Se il database è su **Render**:

1. Vai su **PostgreSQL** → **"Backups"** tab
2. Clicca **"Create Backup"**
3. Render crea backup automatico
4. Download disponibile dopo completamento

**⚠️ LIMITAZIONE**: Render free tier potrebbe non supportare backup automatici. Verifica il piano.

## Backup Automatico

### Script Bash (Linux/Mac)

```bash
#!/bin/bash
# backup-db.sh

DB_URL="postgresql://user:password@host:port/database"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

mkdir -p "$BACKUP_DIR"

pg_dump "$DB_URL" > "$BACKUP_FILE"

# Comprimi backup
gzip "$BACKUP_FILE"

# Mantieni solo ultimi 7 giorni
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

echo "✅ Backup completato: $BACKUP_FILE.gz"
```

**Esecuzione automatica** (cron):

```bash
# Aggiungi a crontab (backup giornaliero alle 2:00)
0 2 * * * /path/to/backup-db.sh
```

### Script Node.js

```javascript
// backend/scripts/backup.js
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_URL = process.env.DATABASE_URL;
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DATE = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_FILE = path.join(BACKUP_DIR, `backup_${DATE}.sql`);

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

exec(`pg_dump "${DB_URL}" > "${BACKUP_FILE}"`, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Errore backup:', error);
        process.exit(1);
    }
    
    console.log('✅ Backup completato:', BACKUP_FILE);
    
    // Comprimi
    exec(`gzip "${BACKUP_FILE}"`, (error) => {
        if (error) {
            console.error('Errore compressione:', error);
        } else {
            console.log('✅ Backup compresso:', `${BACKUP_FILE}.gz`);
        }
    });
});
```

Esegui:
```bash
node backend/scripts/backup.js
```

## Recovery da Backup

### Recovery Flow

```mermaid
graph TD
    A[Disaster Occurs] --> B{Data Loss?}
    B -->|Yes| C[Identify Issue]
    B -->|No| D[Service Issue]
    
    C --> E[Select Backup]
    E --> F{Backup Type?}
    F -->|Full| G[Full Restore]
    F -->|Partial| H[Partial Restore]
    F -->|Point-in-Time| I[PITR Restore]
    
    G --> J[Stop Application]
    H --> J
    I --> J
    
    J --> K[Create Backup of Current State]
    K --> L[Restore from Backup]
    L --> M{Restore Success?}
    M -->|No| N[Troubleshoot]
    N --> L
    M -->|Yes| O[Verify Data]
    O --> P{Data Valid?}
    P -->|No| Q[Restore Different Backup]
    Q --> L
    P -->|Yes| R[Restart Application]
    R --> S[Monitor]
    
    style A fill:#ffcccc
    style C fill:#ffcccc
    style E fill:#ffffcc
    style G fill:#fff9c4
    style H fill:#fff9c4
    style I fill:#fff9c4
    style J fill:#ffcc99
    style K fill:#ccccff
    style L fill:#c8e6c9
    style M fill:#ffcc99
    style O fill:#ccccff
    style P fill:#ffcc99
    style R fill:#c8e6c9
    style S fill:#ccffcc
```

### Metodo 1: pg_restore (da SQL)

```bash
# Restore da file SQL
psql "postgresql://user:password@host:port/database" < backup_20240115_120000.sql

# Oppure con psql interattivo
psql "postgresql://user:password@host:port/database"
\i backup_20240115_120000.sql
```

### Metodo 2: pg_restore (da Custom Format)

```bash
# Restore da formato custom
pg_restore -d "postgresql://user:password@host:port/database" backup_20240115_120000.dump

# Restore solo schema
pg_restore --schema-only -d "postgresql://..." backup.dump

# Restore solo dati
pg_restore --data-only -d "postgresql://..." backup.dump
```

### Metodo 3: pgAdmin

1. Apri **pgAdmin**
2. Click destro sul database → **Restore...**
3. Seleziona file backup
4. Configura opzioni (schema only, data only, ecc.)
5. Clicca **Restore**

### ⚠️ Attenzione: Recovery Completa

**Recovery completo sovrascrive tutti i dati esistenti**:

```bash
# ⚠️ PERICOLOSO: Elimina tutto e ripristina
DROP DATABASE gestionale;
CREATE DATABASE gestionale;
psql "postgresql://..." < backup.sql
```

**Alternativa più sicura**: Restore in database nuovo:

```bash
# Crea database temporaneo
createdb gestionale_restore

# Restore nel database temporaneo
psql gestionale_restore < backup.sql

# Verifica dati
psql gestionale_restore -c "SELECT COUNT(*) FROM projects;"

# Se OK, swap database
```

## Point-in-Time Recovery (PITR)

### Requisiti

- **WAL (Write-Ahead Logging)** abilitato
- **Continuous Archiving** configurato
- **Base Backup** periodici

### Configurazione PostgreSQL

**File**: `postgresql.conf`

```conf
# Abilita WAL archiving
wal_level = replica
archive_mode = on
archive_command = 'cp %p /path/to/archive/%f'

# Backup continuo
max_wal_senders = 3
```

### Recovery a Punto Specifico

```bash
# 1. Stop PostgreSQL
# 2. Restore base backup
pg_basebackup -D /var/lib/postgresql/data -Ft -z -P

# 3. Configura recovery
echo "recovery_target_time = '2024-01-15 12:00:00'" >> postgresql.conf
echo "restore_command = 'cp /path/to/archive/%f %p'" >> postgresql.conf

# 4. Start PostgreSQL (recovery automatica)
```

**⚠️ COMPLESSO**: Richiede configurazione avanzata. Consulta documentazione PostgreSQL per dettagli.

## Backup su Render/Supabase

### Render PostgreSQL

**Backup Automatici**:
- Render offre backup automatici per piani a pagamento
- Free tier: Backup manuale tramite dashboard

**Backup Manuale**:
1. Vai su **PostgreSQL** → **"Backups"**
2. Clicca **"Create Backup"**
3. Download disponibile dopo completamento

**Recovery**:
1. Vai su **PostgreSQL** → **"Backups"**
2. Seleziona backup
3. Clicca **"Restore"** (se disponibile)
4. Oppure download e restore manuale

### Supabase

**Backup Automatici**:
- Supabase offre backup automatici giornalieri
- Retention: 7 giorni (free tier), 30 giorni (pro)

**Backup Manuale**:
1. Dashboard → **Database** → **Backups**
2. Clicca **"Create Backup"**
3. Download SQL dump

**Recovery**:
1. Dashboard → **Database** → **Backups**
2. Seleziona backup
3. Clicca **"Restore"**
4. Oppure download e restore manuale

## Best Practices

### 1. Backup Prima di Migrazioni

**SEMPRE** eseguire backup prima di applicare migrazioni:

```bash
# Backup prima di migrazione
pg_dump "$DATABASE_URL" > backup_pre_migration_$(date +%Y%m%d).sql

# Esegui migrazione
psql "$DATABASE_URL" < migration.sql

# Se errore, restore
psql "$DATABASE_URL" < backup_pre_migration_20240115.sql
```

### 2. Test Restore Periodicamente

**Non aspettare un disastro** per testare il restore:

```bash
# Test restore mensile
createdb gestionale_test_restore
psql gestionale_test_restore < backup_latest.sql
# Verifica dati
psql gestionale_test_restore -c "SELECT COUNT(*) FROM projects;"
dropdb gestionale_test_restore
```

### 3. Backup Critici

Backup **obbligatori** prima di:
- Migrazioni database
- Aggiornamenti major
- Operazioni di manutenzione
- Deploy in produzione

### 4. Retention Policy

**Conserva**:
- Ultimi 7 giorni: Backup giornalieri
- Ultimi 4 settimane: Backup settimanali
- Ultimi 12 mesi: Backup mensili

**Script cleanup**:

```bash
#!/bin/bash
# cleanup-old-backups.sh

BACKUP_DIR="./backups"

# Mantieni ultimi 7 giorni
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

# Mantieni ultimi 4 settimane (settimanali)
find "$BACKUP_DIR" -name "backup_weekly_*.sql.gz" -mtime +28 -delete

# Mantieni ultimi 12 mesi (mensili)
find "$BACKUP_DIR" -name "backup_monthly_*.sql.gz" -mtime +365 -delete
```

### 5. Verifica Integrità Backup

**Verifica** che i backup siano validi:

```bash
# Verifica che il file SQL sia valido
head -n 20 backup.sql | grep -q "PostgreSQL database dump"

# Verifica che il dump sia completo
grep -q "PostgreSQL database dump complete" backup.sql

# Test restore in database temporaneo
createdb test_restore
psql test_restore < backup.sql
# Se OK, backup è valido
dropdb test_restore
```

## Disaster Recovery Plan

### Scenario 1: Database Corrotto

1. **Stop applicazione** (prevenire ulteriori danni)
2. **Valuta danno**: Quanto dati sono persi?
3. **Restore ultimo backup**
4. **Verifica integrità** dati
5. **Riavvia applicazione**
6. **Monitora** per 24-48 ore

### Scenario 2: Cancellazione Accidentale

1. **Stop applicazione**
2. **Identifica** data/ora dell'incidente
3. **Restore backup** più recente PRIMA dell'incidente
4. **Verifica** dati ripristinati
5. **Riavvia applicazione**

### Scenario 3: Migrazione Fallita

1. **Stop applicazione**
2. **Restore backup pre-migrazione**
3. **Analizza** errore migrazione
4. **Correggi** migrazione
5. **Riprova** migrazione

## Automazione Backup

### GitHub Actions (CI/CD)

```yaml
# .github/workflows/backup-db.yml
name: Daily Database Backup

on:
  schedule:
    - cron: '0 2 * * *' # Ogni giorno alle 2:00 UTC
  workflow_dispatch: # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup Database
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql
          gzip backup_$(date +%Y%m%d).sql
          
      - name: Upload to S3/GCS
        # Upload backup a storage cloud
```

### Cron Job (Server)

```bash
# /etc/cron.daily/backup-db
#!/bin/bash
/path/to/backup-db.sh
```

## Monitoring Backup

### Verifica Backup Completati

```bash
# Lista backup recenti
ls -lh backups/ | tail -10

# Verifica dimensione backup
du -sh backups/

# Verifica ultimo backup
ls -lt backups/ | head -2
```

### Alerting

Configura alert se backup fallisce:

```bash
# backup-db.sh con notifica
if [ $? -eq 0 ]; then
    echo "✅ Backup completato"
else
    echo "❌ Backup fallito"
    # Invia email/notifica
    mail -s "Backup Fallito" admin@example.com < /dev/null
fi
```

## Riferimenti

- **[Database Migrations](../backend/Database-Migrations.md)** - Backup prima di migrazioni
- **[Troubleshooting](../TROUBLESHOOTING.md)** - Problemi comuni

---

**Versione**: 1.0  
**Ultimo Aggiornamento**: 2024

