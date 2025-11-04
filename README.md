# Gestionale JEINS

Un'applicazione web completa per la gestione di clienti, progetti e contabilità. Sviluppata con React, TypeScript e Tailwind CSS.

## 🚀 Funzionalità

### Dashboard
- Panoramica generale con statistiche chiave
- Progetti attivi
- Nuovi prospect
- Fatture da incassare

### Gestione Clienti
- ✅ Visualizzazione lista clienti completa
- ✅ Aggiunta nuovi clienti con form dedicato
- ✅ Modifica stato cliente (Prospect, In Contatto, In Negoziazione, Attivo, Chiuso, Perso)
- ✅ Eliminazione clienti (con gestione automatica progetti e contratti collegati)
- ✅ Informazioni: nome azienda, referente, email, telefono, area di competenza

### Gestione Progetti
- ✅ Visualizzazione progetti con card espandibili
- ✅ Aggiunta nuovi progetti
- ✅ Modifica stato progetto (Pianificato, In Corso, In Revisione, Completato, Sospeso)
- ✅ Eliminazione progetti
- ✅ **To-do List integrata** per ogni progetto:
  - Aggiunta task con priorità (Bassa, Media, Alta)
  - Completamento task
  - Eliminazione task
- ✅ Collegamento automatico con clienti

### Gestione Contabilità
- ✅ Visualizzazione documenti (Contratti, Fatture, Preventivi)
- ✅ Aggiunta nuovi documenti
- ✅ Modifica stato documento (Bozza, Inviato, Firmato, Pagato, Annullato)
- ✅ Eliminazione documenti
- ✅ Collegamento con clienti e progetti
- ✅ Gestione importi e date

## 💾 Persistenza Dati

I dati vengono salvati automaticamente nel **localStorage** del browser, quindi:
- ✅ I dati persistono tra le sessioni
- ✅ Non serve backend o database
- ✅ I dati sono salvati localmente sul tuo browser

## 🛠️ Tecnologie Utilizzate

- **React 19** - Libreria UI
- **TypeScript** - Tipizzazione statica
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utility-first
- **Lucide React** - Icone moderne
- **localStorage** - Persistenza dati lato client

## 📦 Installazione

1. **Clona il repository** (o naviga nella cartella del progetto)

2. **Installa le dipendenze**:
   ```bash
   cd gestionale-app
   npm install
   ```

3. **Avvia il server di sviluppo**:
   ```bash
   npm run dev
   ```

4. **Apri il browser** all'indirizzo mostrato nel terminale (solitamente `http://localhost:5173`)

## 🏗️ Build per Produzione

Per creare una build ottimizzata per la produzione:

```bash
npm run build
```

I file compilati saranno nella cartella `dist/`.

Per vedere un'anteprima della build:

```bash
npm run preview
```

## 📁 Struttura del Progetto

```
gestionale-app/
├── src/
│   ├── App.tsx          # Componente principale con tutta la logica
│   ├── main.tsx         # Entry point dell'applicazione
│   └── index.css        # Stili globali con Tailwind
├── public/              # File statici
├── index.html           # Template HTML
├── package.json         # Dipendenze e script
├── tsconfig.json        # Configurazione TypeScript
├── tailwind.config.js  # Configurazione Tailwind CSS
└── postcss.config.js    # Configurazione PostCSS
```

## 🎨 Caratteristiche UI/UX

- ✅ Design moderno e pulito
- ✅ Responsive design (mobile e desktop)
- ✅ Sidebar collassabile su mobile
- ✅ Modali per l'aggiunta di nuovi elementi
- ✅ Feedback visivo per stati e priorità
- ✅ Selezione stati con colori intuitivi
- ✅ Animazioni e transizioni fluide

## 🔧 Personalizzazione

### Aree di Competenza
Puoi modificare le aree disponibili nel file `App.tsx`:
```typescript
const AREA_OPTIONS = ['CDA', 'Marketing', 'IT', 'Commerciale'];
```

### Stati Clienti
```typescript
const CLIENT_STATUS_OPTIONS = ['Prospect', 'In Contatto', 'In Negoziazione', 'Attivo', 'Chiuso', 'Perso'];
```

### Stati Progetti
```typescript
const PROJECT_STATUS_OPTIONS = ['Pianificato', 'In Corso', 'In Revisione', 'Completato', 'Sospeso'];
```

## 📝 Note

- I dati vengono salvati automaticamente nel localStorage del browser
- Per resettare tutti i dati, puoi svuotare il localStorage dal DevTools del browser
- Le modifiche ai dati sono immediatamente visibili e persistenti

## 🐛 Risoluzione Problemi

### Le classi Tailwind non funzionano
Assicurati di aver installato tutte le dipendenze:
```bash
npm install
```

### I dati non persistono
Controlla che il localStorage sia abilitato nel tuo browser. Su alcuni browser in modalità privata potrebbe essere disabilitato.

## 📄 Licenza

Questo progetto è stato sviluppato per uso interno.

---

**Sviluppato con ❤️ usando React, TypeScript e Tailwind CSS**

