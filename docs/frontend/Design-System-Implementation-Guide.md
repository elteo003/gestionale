# 🚀 Design System Implementation Guide

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Sviluppatori** che migrano il codice esistente al nuovo Design System
- **Team Leads** che pianificano la migrazione
- **Code Reviewers** che verificano l'adozione del Design System

## Panoramica Implementazione

Questa guida descrive come implementare le **12 modifiche macro** del Design System nel progetto esistente, con esempi pratici e best practices.

## Modifiche Implementate

### ✅ 1. Design System Centralizzato

**File Creati**:
- `src/design-system/theme.ts` - Configurazione tema completa
- `src/design-system/tailwind-theme.ts` - Estensione Tailwind

**Utilizzo**:
```typescript
import { colors, typography, spacing, shadows } from '../design-system/theme';

// Usa colori
<div style={{ backgroundColor: colors.primary[600] }}>

// Usa typography
<h1 style={{ fontSize: typography.heading.h1.fontSize }}>
```

### ✅ 2. Componenti UI Riutilizzabili

**Componenti Creati**:
- `Button` - Con varianti, sizes, loading states
- `Modal` - Con focus trap, keyboard navigation
- `Card` - Con varianti (outlined, filled, elevated)
- `Input` - Con validazione, error handling
- `Select` - Con styling migliorato
- `Badge` - Per stati e etichette
- `Toast` - Sistema notifiche (sostituisce alert)
- `Loading` - Spinner, Skeleton, LoadingOverlay
- `Form` - Form strutturato con validazione
- `EmptyState` - Stati vuoti
- `DataTable` - Tabelle dati
- `Tabs` - Sistema tab

**Esempio Migrazione**:
```typescript
// Prima
<button className="px-4 py-2 bg-blue-600 text-white rounded">
  Click me
</button>

// Dopo
import { Button } from '../components/ui';
<Button variant="primary" size="md">Click me</Button>
```

### ✅ 3. Accessibilità

**Implementazioni**:
- ARIA attributes su tutti i componenti
- Focus trap in modals
- Keyboard navigation completa
- Skip links
- Screen reader support

**Esempio**:
```typescript
<Button
  aria-label="Chiudi modal"
  aria-describedby="modal-description"
>
  Chiudi
</Button>
```

### ✅ 4. Responsive Design

**Implementazioni**:
- Mobile-first approach
- Breakpoints definiti (sm, md, lg, xl, 2xl)
- Grid system responsive
- Touch-friendly (target 44x44px)

**Esempio**:
```typescript
<Grid
  cols={3}
  responsive={{
    sm: 1,  // Mobile: 1 colonna
    md: 2,  // Tablet: 2 colonne
    lg: 3,  // Desktop: 3 colonne
  }}
>
```

### ✅ 5. Loading States

**Componenti**:
- `Spinner` - Loading spinner
- `Skeleton` - Skeleton loader
- `LoadingOverlay` - Overlay con loading

**Esempio**:
```typescript
<LoadingOverlay isLoading={loading} message="Caricamento...">
  <YourContent />
</LoadingOverlay>
```

### ✅ 6. Typography System

**Implementazioni**:
- Scale tipografica strutturata
- Heading styles (H1-H6)
- Body text styles
- Caption style

**Utilizzo**:
Le classi Tailwind utilizzano automaticamente il sistema tipografico:
```typescript
<h1 className="text-4xl font-bold">Titolo</h1>
```

### ✅ 7. Animazioni e Micro-Interactions

**Animazioni**:
- `fadeIn` - Fade in con slide
- `shake` - Shake per errori
- `pulse` - Pulse per loading
- `wave` - Wave per skeleton

**Transizioni**:
- Durate standardizzate (150ms, 200ms, 300ms)
- Easing functions

### ✅ 8. Form Design

**Componenti**:
- `Form` - Container form
- `FormField` - Campo form con label/error
- `FormGroup` - Gruppo campi con grid

**Esempio**:
```typescript
<Form onSubmit={handleSubmit}>
  <FormGroup columns={2}>
    <FormField label="Nome" required error={errors.name}>
      <Input value={name} onChange={...} />
    </FormField>
    <FormField label="Email" required error={errors.email}>
      <Input type="email" value={email} onChange={...} />
    </FormField>
  </FormGroup>
</Form>
```

### ✅ 9. Dashboard con Charts

**Componenti**:
- `SimpleLineChart` - Line chart
- `SimpleBarChart` - Bar chart
- `SimplePieChart` - Pie chart
- `MetricCard` - Card con metrica

**Esempio**:
```typescript
<Grid cols={3}>
  <MetricCard
    title="Utenti"
    value="1,234"
    change={{ value: 12, label: 'mese scorso' }}
    trend="up"
    icon={<Users />}
  />
</Grid>
```

### ✅ 10. Dark Mode

**Implementazioni**:
- `ThemeContext` per gestione tema
- `ThemeToggle` component
- Palette colori dark mode
- Persistenza preferenza utente

**Utilizzo**:
```typescript
import { useTheme } from '../contexts/ThemeContext';

const { theme, toggleTheme } = useTheme();
```

### ✅ 11. Iconografia Standardizzata

**Standard**:
- Solo Lucide React
- Sizes standardizzati (16px, 20px, 24px)
- Icon semantiche

### ✅ 12. Spacing e Layout System

**Componenti**:
- `Container` - Container responsive
- `Grid` - Grid system

**Utilizzo**:
```typescript
<Container size="lg" padding>
  <Grid cols={3} gap="lg">
    {/* Content */}
  </Grid>
</Container>
```

## Piano di Migrazione

### Fase 1: Setup (Completato ✅)

- [x] Creare Design System
- [x] Creare componenti UI base
- [x] Configurare Tailwind
- [x] Implementare Dark Mode

### Fase 2: Sostituzione Alert (Da Fare)

**Task**:
1. Sostituire tutti `alert()` con Toast
2. Aggiungere `ToastContainer` in `App.tsx`
3. Usare `useToast` hook

**Esempio**:
```typescript
// Prima
alert('Operazione completata!');

// Dopo
const { success } = useToast();
success('Operazione completata!');
```

### Fase 3: Sostituzione Button (Da Fare)

**Task**:
1. Identificare tutti i button custom
2. Sostituire con `<Button>`
3. Verificare varianti e sizes

### Fase 4: Sostituzione Modal (Da Fare)

**Task**:
1. Identificare modals custom
2. Sostituire con `<Modal>`
3. Migrare logica focus trap

### Fase 5: Sostituzione Form (Da Fare)

**Task**:
1. Identificare form custom
2. Sostituire con `<Form>`, `<FormField>`
3. Migrare validazione

### Fase 6: Implementazione Dark Mode (Da Fare)

**Task**:
1. Aggiungere `ThemeProvider` in `main.tsx` (✅ Fatto)
2. Aggiungere `ThemeToggle` in sidebar/header
3. Testare tutti i componenti in dark mode

## Checklist Migrazione

### Per Ogni Componente

- [ ] Sostituito con componente Design System
- [ ] Accessibilità verificata (ARIA, keyboard)
- [ ] Responsive design verificato
- [ ] Dark mode testato
- [ ] Loading states implementati
- [ ] Error states implementati
- [ ] Toast invece di alert
- [ ] Documentazione aggiornata

## Riferimenti

- **[Design System](./Design-System.md)** - Documentazione completa Design System
- **[Component Architecture](./Component-Architecture.md)** - Architettura componenti

---

**Versione**: 1.0  
**Ultimo Aggiornamento**: 2024

