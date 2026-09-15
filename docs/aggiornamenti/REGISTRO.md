# Registro aggiornamenti JEINS

Ogni riga è un progetto chiuso o in corso. Il **numero** è nel titolo del blueprint. **Data e ora** di progettazione (e, a valle, di implementazione) stanno qui e nel documento di progetto, fuso `Europe/Rome`.

Prossimo numero libero: **011**.

| # | Titolo | Progettato | Implementato | Stato | Blueprint |
|---|--------|------------|--------------|-------|-----------|
| 010 | Dropdown: fuori dal glass, curva e viaggio visibili | 2026-09-15 15:13 | 2026-09-15 15:16 | implementato | [010-dropdown-portal-curva.md](./010-dropdown-portal-curva.md) |
| 009 | Dropdown: transizione CSS dal trigger, non uno scatto | 2026-09-15 15:06 | 2026-09-15 15:12 | implementato | [009-dropdown-css-interruptibile.md](./009-dropdown-css-interruptibile.md) |
| 008 | Installer Windows nitido, senza wizard 1998 | 2026-09-15 15:05 | 2026-09-15 15:10 | implementato | [008-installer-hidpi-oneclick.md](./008-installer-hidpi-oneclick.md) |
| 007 | Client Electron: toast di sistema e installer | 2026-09-15 13:05 | 2026-09-15 13:10 | implementato | [007-electron-installer-push-sistema.md](./007-electron-installer-push-sistema.md) |
| 006 | Motion fluido: un clock, solo composite | 2026-09-15 12:39 | 2026-09-15 12:45 | implementato | [006-motion-fluido-composite.md](./006-motion-fluido-composite.md) |
| 005 | Client notifiche: campanella, push, chat / lavori / call | 2026-09-15 12:34 | 2026-09-15 12:40 | implementato | [005-frontend-notifiche-push.md](./005-frontend-notifiche-push.md) |
| 004 | Rispondi vs @cita persone in chat | 2026-09-15 12:00 | 2026-09-15 12:09 | implementato | [004-rispondi-e-menzione-chiocciola.md](./004-rispondi-e-menzione-chiocciola.md) |
| 003 | Citazioni in chat (stesso stile Oggi) e documenti dell’area | 2026-09-15 11:48 | 2026-09-15 11:55 | implementato | [003-citazioni-chat-documenti-area.md](./003-citazioni-chat-documenti-area.md) |
| 002 | Notifiche push: un dispatch, due client (web e desktop) | 2026-09-15 11:30 | 2026-09-15 11:35 | implementato | [002-notifiche-push-web-desktop.md](./002-notifiche-push-web-desktop.md) |
| 001 | Kanban drag overlay: origine 1:1 sotto il dito | 2026-09-15 11:12 | 2026-09-15 11:21 | implementato | [001-kanban-drag-overlay-origine.md](./001-kanban-drag-overlay-origine.md) |

## Come si aggiunge una riga

1. Copia `TEMPLATE-BLUEPRINT.md` → `NNN-slug.md`.
2. Titolo del file e H1: `NNN — …`.
3. Compila la tabella orari nel blueprint **prima** del codice.
4. Aggiungi la riga in questa tabella, in cima al prossimo slot numerico (non riutilizzare numeri).
5. Dopo il merge mentale dell’implementazione, aggiorna `Implementato` e `Stato`.

Regola Cursor: `.cursor/rules/blueprint-aggiornamenti.mdc`.
