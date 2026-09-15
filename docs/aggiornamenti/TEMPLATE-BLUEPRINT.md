# NNN — [Titolo corto, esito visibile o causa, non il file toccato]

| Campo | Valore |
|-------|--------|
| Numero | `NNN` |
| Stato | `progettato` \| `in implementazione` \| `implementato` \| `verificato` |
| Progettato il | `YYYY-MM-DD HH:mm` Europe/Rome |
| Implementato il | `YYYY-MM-DD HH:mm` Europe/Rome (vuoto finché non c’è codice) |
| Superficie | path dei file / area di dominio |
| Autore del progetto | (chi ha chiuso la diagnosi, non lo strumento) |

---

## 1. Cosa si rompe in uso reale

Due–sei frasi da persona che usa il prodotto, non da diff. Chi, dove, quanto è visibile, quanto costa in fiducia.

Metti qui il **primo Mermaid** se il bug è un disallineamento di flussi, coordinate, stati o ownership. Il diagramma deve rendere ovvia la dissonanza prima che si parli di API.

## 2. Causa radice (una sola, nominata)

Nome il meccanismo (containing block, id duplicato, race, lock, ecc.). Poi le prove nel codice. Se ci sono concause, distingui **causa** da **amplificatori**.

Secondo Mermaid: lo stato “sbagliato” vs lo stato “giusto”, oppure la macchina a stati (track / release, request / response).

## 3. Vincoli che non si negociano

- Cosa deve restare vero (RBAC, italiano UI, niente seconda libreria, 60fps, interruptibilità, …)
- Cosa è fuori scope in questo numero

## 4. Alternative e perché cadono

Tabella: opzione → cosa risolve → cosa rompe tra 6 mesi → verdetto.

Il terzo Mermaid sta qui se la scelta è un bivio (portal vs compensare pixel, lock vs retry, …). Il diamante del flowchart è la decisione, i rami sono le alternative della tabella.

## 5. Design scelto

Come si comporta il sistema dopo, in fasi. File e responsabilità. Nessun “magari”.

Quarto Mermaid: sequenza o DOM target — solo se aggiunge informazione che il testo non ha già.

## 6. Rischi residui e non-goals

Cosa resta debole, cosa qualcuno chiederà domani e andrà in un numero successivo.

## 7. Piano di verifica

Passi da utente reale, non “sembra ok”. Viewport, colonna, tema, reduced motion, se rilevanti. Criterio di fallimento numerico se il bug era geometrico (±1px, stesso offset su due colonne, …).

## 8. File toccati

| Path | Ruolo della modifica |
|------|----------------------|
| | |

**Fuori scope:** …

---

*Template blueprint JEINS — ogni aggiornamento ha un numero, un’ora di progetto, e i Mermaid dove spiegano, non dove decorano.*
