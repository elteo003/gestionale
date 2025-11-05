# 📊 KPI Analytics - Metriche e Query SQL

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Analisti Dati** che creano report e dashboard
- **Management** che deve comprendere le metriche
- **Sviluppatori Backend** che implementano endpoint dashboard

## Definizione delle Metriche

Ogni KPI definito nelle **Sezioni 1-7** del `dashboard_design.md` è mappato a una specifica logica di business e query SQL implementabile.

---

## Dashboard: Presidente (Sezione 1)

### KPI: Fatturato Totale (Anno)

**Descrizione**: Somma di tutti i contratti con status `'Firmato'` o fatture con status `'Pagato'` nell'anno solare corrente.

**Query SQL**:
```sql
SELECT 
    COALESCE(SUM(amount), 0) as fatturato_totale
FROM contracts
WHERE 
    (type = 'Contratto' AND status = 'Firmato')
    OR (type = 'Fattura' AND status = 'Pagato')
    AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE);
```

**Logica Business**:
- Contratti firmati: Valore garantito anche se non ancora pagato
- Fatture pagate: Valore effettivamente incassato
- Anno solare: Dal 1 gennaio al 31 dicembre dell'anno corrente

---

### KPI: Progetti Attivi (Totali)

**Descrizione**: Conteggio di tutti i progetti con status `'In Corso'`.

**Query SQL**:
```sql
SELECT COUNT(*) as progetti_attivi
FROM projects
WHERE status = 'In Corso';
```

**Logica Business**: Progetti attualmente in esecuzione, indipendentemente dall'area.

---

### KPI: Nuovi Clienti (Ultimi 90gg)

**Descrizione**: Conteggio di clienti creati negli ultimi 90 giorni.

**Query SQL**:
```sql
SELECT COUNT(*) as nuovi_clienti
FROM clients
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';
```

**Logica Business**: Metriche di crescita e acquisizione nuovi clienti.

---

### KPI: Membri Attivi

**Descrizione**: Conteggio totale degli utenti attivi nel sistema.

**Query SQL**:
```sql
SELECT COUNT(*) as membri_attivi
FROM users
WHERE is_active = TRUE;
```

**Logica Business**: Include tutti i ruoli (Manager, Associati, Admin, ecc.).

---

### Grafico: Fatturato per Area

**Descrizione**: Somma fatturato raggruppato per area dei progetti.

**Query SQL**:
```sql
SELECT 
    COALESCE(p.area, 'Nessuna Area') as area,
    COALESCE(SUM(c.amount), 0) as fatturato
FROM contracts c
LEFT JOIN projects p ON c.project_id = p.project_id
WHERE 
    (c.type = 'Contratto' AND c.status = 'Firmato')
    OR (c.type = 'Fattura' AND c.status = 'Pagato')
    AND EXTRACT(YEAR FROM c.date) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY p.area
ORDER BY fatturato DESC;
```

---

### Grafico: Progetti per Area

**Descrizione**: Distribuzione progetti per area (torta).

**Query SQL**:
```sql
SELECT 
    COALESCE(area, 'Nessuna Area') as area,
    COUNT(*) as numero_progetti
FROM projects
GROUP BY area
ORDER BY numero_progetti DESC;
```

---

### Lista: Contratti Chiave in Negoziazione

**Descrizione**: Contratti con importo elevato in stato di negoziazione.

**Query SQL**:
```sql
SELECT 
    c.contract_id,
    c.amount,
    c.type,
    c.status,
    c.date,
    cl.name as cliente,
    p.name as progetto
FROM contracts c
LEFT JOIN clients cl ON c.client_id = cl.client_id
LEFT JOIN projects p ON c.project_id = p.project_id
WHERE 
    c.status IN ('Bozza', 'Inviato')
    AND c.amount > 5000  -- Soglia configurabile
ORDER BY c.amount DESC
LIMIT 10;
```

---

### Lista: Prossime Riunioni CDA

**Descrizione**: Prossimi eventi di tipo CDA o riunioni strategiche.

**Query SQL**:
```sql
SELECT 
    e.event_id,
    e.title,
    e.start_time,
    e.end_time,
    e.description
FROM events e
WHERE 
    e.start_time >= NOW()
    AND (
        e.title ILIKE '%CDA%'
        OR e.title ILIKE '%consiglio%'
        OR e.invitation_rules->>'groups' LIKE '%CDA%'
    )
ORDER BY e.start_time ASC
LIMIT 10;
```

---

## Dashboard: Tesoreria (Sezione 2)

### KPI: Incassato (Anno Corrente)

**Descrizione**: Somma di contratti/fatture con status `'Pagato'` nell'anno solare corrente.

**Query SQL**:
```sql
SELECT 
    COALESCE(SUM(amount), 0) as incassato
FROM contracts
WHERE 
    status = 'Pagato'
    AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE);
```

**Logica Business**: Solo valori effettivamente incassati (non contratti firmati ma non pagati).

---

### KPI: Da Incassare (In Sospeso)

**Descrizione**: Somma di fatture con status `'Inviata'` (non ancora pagate).

**Query SQL**:
```sql
SELECT 
    COALESCE(SUM(amount), 0) as da_incassare
FROM contracts
WHERE 
    type = 'Fattura'
    AND status = 'Inviata';
```

**Logica Business**: Fatture emesse ma non ancora pagate dal cliente.

---

### KPI: Fatture Scadute (Valore)

**Descrizione**: Somma di fatture `'Inviate'` la cui data di scadenza (assumendo 30 giorni dalla data fattura) è nel passato.

**Query SQL**:
```sql
SELECT 
    COALESCE(SUM(amount), 0) as fatture_scadute
FROM contracts
WHERE 
    type = 'Fattura'
    AND status = 'Inviata'
    AND (date + INTERVAL '30 days') < CURRENT_DATE;
```

**Logica Business**: Fatture con scadenza superata (30 giorni dalla data emissione, configurabile).

---

### KPI: Preventivi da Approvare (Valore)

**Descrizione**: Somma di preventivi con status `'Inviato'` (in attesa di approvazione).

**Query SQL**:
```sql
SELECT 
    COALESCE(SUM(amount), 0) as preventivi_da_approvare
FROM contracts
WHERE 
    type = 'Preventivo'
    AND status = 'Inviato';
```

**Logica Business**: Preventivi inviati al cliente ma non ancora convertiti in contratto.

---

### Grafico: Flusso di Cassa (Ultimi 6 Mesi)

**Descrizione**: Somma mensile di incassi (fatture pagate) degli ultimi 6 mesi.

**Query SQL**:
```sql
SELECT 
    DATE_TRUNC('month', date) as mese,
    COALESCE(SUM(amount), 0) as incassato
FROM contracts
WHERE 
    status = 'Pagato'
    AND date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', date)
ORDER BY mese ASC;
```

**Formato Output**:
```json
[
  { "mese": "2024-01", "incassato": 15000.00 },
  { "mese": "2024-02", "incassato": 18000.00 },
  ...
]
```

---

### Lista: Fatture Scadute (Azione Richiesta)

**Descrizione**: Dettaglio fatture scadute con informazioni cliente.

**Query SQL**:
```sql
SELECT 
    c.contract_id,
    c.amount,
    c.date,
    c.date + INTERVAL '30 days' as scadenza,
    CURRENT_DATE - (c.date + INTERVAL '30 days') as giorni_scadenza,
    cl.name as cliente,
    cl.email as email_cliente,
    cl.phone as telefono_cliente
FROM contracts c
LEFT JOIN clients cl ON c.client_id = cl.client_id
WHERE 
    c.type = 'Fattura'
    AND c.status = 'Inviata'
    AND (c.date + INTERVAL '30 days') < CURRENT_DATE
ORDER BY c.date ASC;
```

---

### Lista: Progetti da Fatturare

**Descrizione**: Progetti completati senza fattura associata.

**Query SQL**:
```sql
SELECT 
    p.project_id,
    p.name as progetto,
    p.status,
    p.created_at,
    cl.name as cliente,
    COALESCE(SUM(c.amount), 0) as fatturato_attuale
FROM projects p
LEFT JOIN clients cl ON p.client_id = cl.client_id
LEFT JOIN contracts c ON c.project_id = p.project_id 
    AND c.type = 'Fattura' 
    AND c.status = 'Pagato'
WHERE 
    p.status = 'Completato'
GROUP BY p.project_id, p.name, p.status, p.created_at, cl.name
HAVING COALESCE(SUM(c.amount), 0) = 0  -- Nessuna fattura pagata
ORDER BY p.created_at DESC;
```

---

## Dashboard: Marketing (Manager) (Sezione 3)

### KPI: Nuovi Prospect (Mese)

**Descrizione**: Conteggio clienti creati nel mese corrente con status `'Prospect'`.

**Query SQL**:
```sql
SELECT COUNT(*) as nuovi_prospect
FROM clients
WHERE 
    status = 'Prospect'
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE);
```

**Logica Business**: Metriche di lead generation mensile.

---

### KPI: Tasso Conversione (Prospect -> Attivo)

**Descrizione**: Percentuale di clienti passati da `'Prospect'` a `'Attivo'`.

**Query SQL**:
```sql
WITH prospect_total AS (
    SELECT COUNT(*) as total
    FROM clients
    WHERE status = 'Prospect'
),
attivi_total AS (
    SELECT COUNT(*) as total
    FROM clients
    WHERE status = 'Attivo'
)
SELECT 
    CASE 
        WHEN prospect_total.total > 0 
        THEN ROUND((attivi_total.total::NUMERIC / prospect_total.total::NUMERIC) * 100, 2)
        ELSE 0 
    END as tasso_conversione
FROM prospect_total, attivi_total;
```

**Logica Business**: Metriche di efficacia del processo di vendita.

---

### KPI: Progetti Marketing Attivi

**Descrizione**: Conteggio progetti con area `'Marketing'` e status `'In Corso'`.

**Query SQL**:
```sql
SELECT COUNT(*) as progetti_marketing_attivi
FROM projects
WHERE 
    area = 'Marketing'
    AND status = 'In Corso';
```

---

### KPI: Task Marketing Aperti

**Descrizione**: Conteggio task non completati nei progetti di marketing.

**Query SQL**:
```sql
SELECT COUNT(*) as task_marketing_aperti
FROM tasks t
JOIN projects p ON t.project_id = p.project_id
WHERE 
    p.area = 'Marketing'
    AND t.status != 'Completato';
```

---

### Grafico: Funnel Pipeline Cliente

**Descrizione**: Distribuzione clienti per stato (funnel di conversione).

**Query SQL**:
```sql
SELECT 
    status,
    COUNT(*) as numero_clienti
FROM clients
WHERE area = 'Marketing'  -- Filtro area manager
GROUP BY status
ORDER BY 
    CASE status
        WHEN 'Prospect' THEN 1
        WHEN 'In Contatto' THEN 2
        WHEN 'In Negoziazione' THEN 3
        WHEN 'Attivo' THEN 4
        WHEN 'Chiuso' THEN 5
        WHEN 'Perso' THEN 6
    END;
```

**Formato Output** (per grafico funnel):
```json
[
  { "status": "Prospect", "numero_clienti": 25 },
  { "status": "In Contatto", "numero_clienti": 15 },
  { "status": "In Negoziazione", "numero_clienti": 8 },
  { "status": "Attivo", "numero_clienti": 5 }
]
```

---

### Lista: Campagne/Progetti Marketing

**Descrizione**: Progetti marketing con informazioni dettagliate.

**Query SQL**:
```sql
SELECT 
    p.project_id,
    p.name,
    p.status,
    cl.name as cliente,
    COUNT(DISTINCT t.task_id) as task_totali,
    COUNT(DISTINCT CASE WHEN t.status = 'Completato' THEN t.task_id END) as task_completati
FROM projects p
LEFT JOIN clients cl ON p.client_id = cl.client_id
LEFT JOIN tasks t ON t.project_id = p.project_id
WHERE p.area = 'Marketing'
GROUP BY p.project_id, p.name, p.status, cl.name
ORDER BY p.created_at DESC;
```

---

### Lista: Ultimi Prospect Inseriti

**Descrizione**: Ultimi 10 clienti prospect creati.

**Query SQL**:
```sql
SELECT 
    client_id,
    name,
    email,
    contact_person,
    created_at
FROM clients
WHERE 
    status = 'Prospect'
    AND area = 'Marketing'  -- Filtro area manager
ORDER BY created_at DESC
LIMIT 10;
```

---

## Dashboard: Commerciale (Manager) (Sezione 4)

### KPI: Valore Firmato (Mese Corrente)

**Descrizione**: Somma contratti con status `'Firmato'` creati nel mese corrente.

**Query SQL**:
```sql
SELECT 
    COALESCE(SUM(amount), 0) as valore_firmato
FROM contracts
WHERE 
    type = 'Contratto'
    AND status = 'Firmato'
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE);
```

---

### KPI: Valore in Negoziazione

**Descrizione**: Somma totale di preventivi e contratti in stato `'Bozza'` o `'Inviato'`.

**Query SQL**:
```sql
SELECT 
    COALESCE(SUM(amount), 0) as valore_in_negoziazione
FROM contracts
WHERE 
    status IN ('Bozza', 'Inviato');
```

**Logica Business**: Pipeline di vendita attiva.

---

### KPI: Tasso di Chiusura

**Descrizione**: Percentuale di preventivi inviati che diventano `'Firmato'`.

**Query SQL**:
```sql
WITH preventivi_inviati AS (
    SELECT COUNT(*) as total
    FROM contracts
    WHERE type = 'Preventivo' AND status = 'Inviato'
),
preventivi_firmati AS (
    SELECT COUNT(*) as total
    FROM contracts c1
    WHERE 
        c1.type = 'Contratto'
        AND c1.status = 'Firmato'
        AND EXISTS (
            SELECT 1 FROM contracts c2
            WHERE c2.type = 'Preventivo'
            AND c2.client_id = c1.client_id
            AND c2.project_id = c1.project_id
        )
)
SELECT 
    CASE 
        WHEN preventivi_inviati.total > 0
        THEN ROUND((preventivi_firmati.total::NUMERIC / preventivi_inviati.total::NUMERIC) * 100, 2)
        ELSE 0
    END as tasso_chiusura
FROM preventivi_inviati, preventivi_firmati;
```

**Nota**: Questa query è semplificata. In produzione, potrebbe essere necessario un campo `preventivo_id` in `contracts` per tracciare la conversione.

---

### KPI: Call/Meeting Effettuati (Mese)

**Descrizione**: Conteggio eventi tipo `'call'` legati all'area commerciale nel mese.

**Query SQL**:
```sql
SELECT COUNT(*) as call_effettuate
FROM events
WHERE 
    event_type = 'call'
    AND (
        area = 'Commerciale'
        OR event_subtype = 'call_clienti'
    )
    AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM start_time) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND start_time < NOW();  -- Solo eventi passati
```

---

### Grafico: Valore Chiuso vs Obiettivo (Mensile)

**Descrizione**: Confronto valore chiuso mensile con obiettivo (richiede tabella `obiettivi` o configurazione).

**Query SQL**:
```sql
SELECT 
    DATE_TRUNC('month', created_at) as mese,
    COALESCE(SUM(amount), 0) as valore_chiuso
FROM contracts
WHERE 
    type = 'Contratto'
    AND status = 'Firmato'
    AND created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mese ASC;
```

**Nota**: Gli obiettivi dovrebbero essere configurati in una tabella separata o in configurazione.

---

### Lista: Top 5 Negoziazioni Aperte

**Descrizione**: Le 5 negoziazioni (preventivi/contratti) con valore più alto.

**Query SQL**:
```sql
SELECT 
    c.contract_id,
    c.amount,
    c.type,
    c.status,
    cl.name as cliente,
    p.name as progetto,
    c.created_at
FROM contracts c
LEFT JOIN clients cl ON c.client_id = cl.client_id
LEFT JOIN projects p ON c.project_id = p.project_id
WHERE 
    c.status IN ('Bozza', 'Inviato')
ORDER BY c.amount DESC
LIMIT 5;
```

---

### Lista: Clienti da Ricontattare

**Descrizione**: Clienti con ultimo contatto > 30 giorni fa.

**Query SQL**:
```sql
SELECT DISTINCT
    cl.client_id,
    cl.name,
    cl.email,
    cl.contact_person,
    MAX(e.start_time) as ultimo_contatto,
    CURRENT_DATE - MAX(e.start_time)::DATE as giorni_da_ultimo_contatto
FROM clients cl
LEFT JOIN events e ON e.client_id = cl.client_id
WHERE 
    cl.status IN ('Prospect', 'In Contatto')
    AND (e.start_time IS NULL OR e.start_time < CURRENT_DATE - INTERVAL '30 days')
GROUP BY cl.client_id, cl.name, cl.email, cl.contact_person
ORDER BY giorni_da_ultimo_contatto DESC NULLS LAST;
```

---

## Dashboard: IT (Manager) (Sezione 5)

### KPI: Progetti IT Attivi

**Descrizione**: Conteggio progetti con area `'IT'` e status `'In Corso'`.

**Query SQL**:
```sql
SELECT COUNT(*) as progetti_it_attivi
FROM projects
WHERE 
    area = 'IT'
    AND status = 'In Corso';
```

---

### KPI: Progetti IT In Ritardo

**Descrizione**: Progetti IT con deadline superata (richiede colonna `deadline` in `projects`).

**Query SQL**:
```sql
SELECT COUNT(*) as progetti_in_ritardo
FROM projects
WHERE 
    area = 'IT'
    AND status = 'In Corso'
    AND deadline IS NOT NULL
    AND deadline < CURRENT_DATE;
```

**Nota**: Questa query richiede una colonna `deadline DATE` nella tabella `projects`. Se non presente, questo KPI non è calcolabile.

---

### KPI: Task Aperti (Totali IT)

**Descrizione**: Conteggio task non completati nei progetti IT.

**Query SQL**:
```sql
SELECT COUNT(*) as task_aperti_it
FROM tasks t
JOIN projects p ON t.project_id = p.project_id
WHERE 
    p.area = 'IT'
    AND t.status != 'Completato';
```

---

### KPI: Task Completati (Ultimi 7gg)

**Descrizione**: Conteggio task completati negli ultimi 7 giorni nei progetti IT.

**Query SQL**:
```sql
SELECT COUNT(*) as task_completati_7gg
FROM tasks t
JOIN projects p ON t.project_id = p.project_id
WHERE 
    p.area = 'IT'
    AND t.status = 'Completato'
    AND t.updated_at >= CURRENT_DATE - INTERVAL '7 days';
```

---

### Grafico: Stato Progetti IT

**Descrizione**: Distribuzione progetti IT per stato (barre).

**Query SQL**:
```sql
SELECT 
    status,
    COUNT(*) as numero_progetti
FROM projects
WHERE area = 'IT'
GROUP BY status
ORDER BY 
    CASE status
        WHEN 'Pianificato' THEN 1
        WHEN 'In Corso' THEN 2
        WHEN 'In Revisione' THEN 3
        WHEN 'Completato' THEN 4
        WHEN 'Sospeso' THEN 5
    END;
```

---

### Lista: Task Aperti (Assegnati a Me)

**Descrizione**: Task IT non completati assegnati al manager loggato.

**Query SQL**:
```sql
SELECT 
    t.task_id,
    t.description,
    t.status,
    t.priority,
    p.name as progetto,
    t.created_at
FROM tasks t
JOIN projects p ON t.project_id = p.project_id
WHERE 
    p.area = 'IT'
    AND t.assigned_to_user_id = :user_id  -- Parametro: ID utente loggato
    AND t.status != 'Completato'
ORDER BY 
    CASE t.priority
        WHEN 'Alta' THEN 1
        WHEN 'Media' THEN 2
        WHEN 'Bassa' THEN 3
    END,
    t.created_at ASC;
```

---

### Lista: Progetti in Revisione

**Descrizione**: Progetti IT con status `'In Revisione'`.

**Query SQL**:
```sql
SELECT 
    p.project_id,
    p.name,
    p.status,
    cl.name as cliente,
    COUNT(DISTINCT t.task_id) as task_totali,
    COUNT(DISTINCT CASE WHEN t.status = 'Completato' THEN t.task_id END) as task_completati
FROM projects p
LEFT JOIN clients cl ON p.client_id = cl.client_id
LEFT JOIN tasks t ON t.project_id = p.project_id
WHERE 
    p.area = 'IT'
    AND p.status = 'In Revisione'
GROUP BY p.project_id, p.name, p.status, cl.name
ORDER BY p.updated_at DESC;
```

---

## Dashboard: CDA (Sezione 6)

### KPI: Fatturato (Anno Corrente)

**Descrizione**: Identico a Presidente (somma contratti firmati + fatture pagate).

**Query SQL**: Vedi [Dashboard Presidente - Fatturato Totale](#kpi-fatturato-totale-anno)

---

### KPI: Progetti Attivi (Totali)

**Descrizione**: Identico a Presidente.

**Query SQL**: Vedi [Dashboard Presidente - Progetti Attivi](#kpi-progetti-attivi-totali)

---

### KPI: Marginalità Media Progetto (Avanzato)

**Descrizione**: Calcolo avanzato che richiede costi progetti (non implementato nel database attuale).

**Query SQL**:
```sql
-- ⚠️ PLACEHOLDER: Richiede colonna 'costi' in projects o tabella separata
SELECT 
    AVG(
        CASE 
            WHEN p.costi IS NOT NULL AND p.costi > 0
            THEN ((c.amount - p.costi) / c.amount) * 100
            ELSE NULL
        END
    ) as marginalita_media
FROM projects p
LEFT JOIN contracts c ON c.project_id = p.project_id 
    AND c.type = 'Contratto' 
    AND c.status = 'Firmato'
WHERE p.costi IS NOT NULL;
```

**Nota**: Questa metrica richiede una tabella `project_costs` o colonna `costi` che non è presente nello schema attuale.

---

### KPI: Numero Soci Attivi

**Descrizione**: Identico a "Membri Attivi" di Presidente.

**Query SQL**: Vedi [Dashboard Presidente - Membri Attivi](#kpi-membri-attivi)

---

### Grafico: Fatturato per Area

**Descrizione**: Identico a Presidente.

**Query SQL**: Vedi [Dashboard Presidente - Fatturato per Area](#grafico-fatturato-per-area)

---

### Lista: Progetti Strategici (> X €)

**Descrizione**: Progetti con valore contratto superiore a una soglia (es. 10000 €).

**Query SQL**:
```sql
SELECT 
    p.project_id,
    p.name,
    p.area,
    p.status,
    cl.name as cliente,
    COALESCE(MAX(c.amount), 0) as valore_contratto
FROM projects p
LEFT JOIN clients cl ON p.client_id = cl.client_id
LEFT JOIN contracts c ON c.project_id = p.project_id 
    AND c.type = 'Contratto' 
    AND c.status = 'Firmato'
GROUP BY p.project_id, p.name, p.area, p.status, cl.name
HAVING COALESCE(MAX(c.amount), 0) > 10000  -- Soglia configurabile
ORDER BY valore_contratto DESC;
```

---

### Lista: Prossime Riunioni CDA

**Descrizione**: Identico a Presidente.

**Query SQL**: Vedi [Dashboard Presidente - Prossime Riunioni CDA](#lista-prossime-riunioni-cda)

---

## Dashboard: Audit (Sezione 7)

### KPI: Contratti Mancanti

**Descrizione**: Progetti `'In Corso'` senza contratto `'Firmato'`.

**Query SQL**:
```sql
SELECT COUNT(*) as contratti_mancanti
FROM projects p
WHERE 
    p.status = 'In Corso'
    AND NOT EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.project_id = p.project_id
        AND c.type = 'Contratto'
        AND c.status = 'Firmato'
    );
```

**Logica Business**: Anomalia di processo: progetto senza contratto formale.

---

### KPI: Fatture Scadute

**Descrizione**: Identico a Tesoreria.

**Query SQL**: Vedi [Dashboard Tesoreria - Fatture Scadute](#kpi-fatture-scadute-valore)

---

### KPI: Progetti Non Fatturati

**Descrizione**: Progetti `'Completato'` senza fattura associata.

**Query SQL**:
```sql
SELECT COUNT(*) as progetti_non_fatturati
FROM projects p
WHERE 
    p.status = 'Completato'
    AND NOT EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.project_id = p.project_id
        AND c.type = 'Fattura'
        AND c.status IN ('Inviata', 'Pagato')
    );
```

---

### KPI: Anomalie Dati

**Descrizione**: Record "orfani" (righe con FK non valide o inconsistenze).

**Query SQL**:
```sql
-- Esempio: Tasks con assigned_to_user_id non valido
SELECT COUNT(*) as anomalie_tasks
FROM tasks t
WHERE 
    t.assigned_to_user_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM users u
        WHERE u.user_id = t.assigned_to_user_id
    );

-- Esempio: Events con creator_id non valido
SELECT COUNT(*) as anomalie_events
FROM events e
WHERE 
    e.creator_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM users u
        WHERE u.user_id = e.creator_id
    );
```

**Logica Business**: Indica problemi di integrità referenziale o dati inconsistenti.

---

### Lista: Anomalie Contrattuali

**Descrizione**: Dettaglio anomalie contrattuali (progetti senza contratto, contratti senza progetto, ecc.).

**Query SQL**:
```sql
-- Progetti In Corso senza contratto
SELECT 
    'Progetto senza contratto' as tipo_anomalia,
    p.project_id,
    p.name as progetto,
    cl.name as cliente
FROM projects p
LEFT JOIN clients cl ON p.client_id = cl.client_id
WHERE 
    p.status = 'In Corso'
    AND NOT EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.project_id = p.project_id
        AND c.type = 'Contratto'
        AND c.status = 'Firmato'
    )

UNION ALL

-- Contratti senza progetto associato
SELECT 
    'Contratto senza progetto' as tipo_anomalia,
    c.contract_id,
    c.type as progetto,
    cl.name as cliente
FROM contracts c
LEFT JOIN clients cl ON c.client_id = cl.client_id
WHERE 
    c.project_id IS NULL
    AND c.type = 'Contratto';
```

---

### Lista: Anomalie di Fatturazione

**Descrizione**: Dettaglio anomalie di fatturazione (progetti completati non fatturati, fatture senza progetto, ecc.).

**Query SQL**:
```sql
-- Progetti Completati senza fattura
SELECT 
    'Progetto completato non fatturato' as tipo_anomalia,
    p.project_id,
    p.name as progetto,
    cl.name as cliente,
    p.status,
    p.updated_at as data_completamento
FROM projects p
LEFT JOIN clients cl ON p.client_id = cl.client_id
WHERE 
    p.status = 'Completato'
    AND NOT EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.project_id = p.project_id
        AND c.type = 'Fattura'
        AND c.status IN ('Inviata', 'Pagato')
    )
ORDER BY p.updated_at DESC;
```

---

### Lista: Log Ultime Modifiche (Avanzato)

**Descrizione**: Tracciamento delle ultime modifiche a record critici (richiede tabella `audit_log`).

**Query SQL**:
```sql
-- ⚠️ PLACEHOLDER: Richiede tabella audit_log
SELECT 
    table_name,
    record_id,
    action,
    user_id,
    changed_at,
    old_values,
    new_values
FROM audit_log
WHERE 
    table_name IN ('contracts', 'projects', 'clients')
ORDER BY changed_at DESC
LIMIT 50;
```

**Nota**: Questa funzionalità richiede una tabella `audit_log` con trigger su UPDATE/DELETE che non è presente nello schema attuale. Da implementare in futuro.

---

## Query Ottimizzate per Dashboard

### Endpoint: GET /api/dashboard

**Backend Implementation**: Questo endpoint dovrebbe:

1. Ricevere `role` come query parameter
2. Eseguire tutte le query KPI per quel ruolo
3. Eseguire query per grafici
4. Eseguire query per liste
5. Ritornare JSON strutturato:

```json
{
  "kpis": [
    { "name": "Fatturato Totale", "value": 150000.00, "unit": "€" },
    { "name": "Progetti Attivi", "value": 12, "unit": "" }
  ],
  "charts": [
    {
      "type": "bar",
      "title": "Fatturato per Area",
      "data": [
        { "area": "IT", "fatturato": 50000 },
        { "area": "Marketing", "fatturato": 30000 }
      ]
    }
  ],
  "lists": [
    {
      "title": "Contratti Chiave in Negoziazione",
      "items": [...]
    }
  ]
}
```

---

**Versione**: 1.0  
**Ultimo Aggiornamento**: 2024

