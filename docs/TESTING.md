# 🧪 Testing Strategy

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Sviluppatori** che scrivono test
- **QA Engineers** che definiscono strategia testing
- **Team Leads** che organizzano processi QA

## Panoramica

**⚠️ STATO ATTUALE**: Il sistema **non implementa** ancora test automatici. Questo documento descrive la **strategia consigliata** per implementare testing in futuro.

## Strategia di Testing

### Piramide di Testing

```
        /\
       /  \      E2E Tests (Pochi, costosi)
      /----\
     /      \    Integration Tests (Alcuni)
    /--------\
   /          \  Unit Tests (Molti, veloci)
  /------------\
```

### Livelli di Testing

1. **Unit Tests** (70%): Test singole funzioni/componenti
2. **Integration Tests** (20%): Test interazione componenti/API
3. **E2E Tests** (10%): Test flussi completi utente

## Backend Testing

### Framework

**Consigliato**: **Jest** + **Supertest**

### Setup

```bash
cd backend
npm install --save-dev jest supertest @types/jest
```

**File**: `backend/jest.config.js`

```javascript
export default {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'routes/**/*.js',
        'middleware/**/*.js',
        '!**/node_modules/**'
    ]
};
```

### Unit Tests

**Esempio**: Test funzione utility

```javascript
// backend/utils/validation.test.js
import { validateEmail, validatePassword } from './validation.js';

describe('Validation Utils', () => {
    describe('validateEmail', () => {
        test('should return true for valid email', () => {
            expect(validateEmail('test@example.com')).toBe(true);
        });
        
        test('should return false for invalid email', () => {
            expect(validateEmail('invalid')).toBe(false);
        });
    });
});
```

### Integration Tests

**Esempio**: Test endpoint API

```javascript
// backend/routes/__tests__/projects.test.js
import request from 'supertest';
import express from 'express';
import projectsRouter from '../projects.js';

const app = express();
app.use(express.json());
app.use('/api/projects', projectsRouter);

describe('GET /api/projects', () => {
    test('should return 401 without token', async () => {
        const response = await request(app)
            .get('/api/projects')
            .expect(401);
        
        expect(response.body.error).toBe('Token di autenticazione mancante');
    });
    
    test('should return projects with valid token', async () => {
        const token = 'valid-jwt-token';
        const response = await request(app)
            .get('/api/projects')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```

### Test Database

**Setup test database**:

```javascript
// backend/__tests__/setup.js
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const testPool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL
});

beforeAll(async () => {
    // Esegui migrazioni test database
    await testPool.query('CREATE TABLE IF NOT EXISTS projects (...)');
});

afterAll(async () => {
    await testPool.end();
});

afterEach(async () => {
    // Pulisci dati test
    await testPool.query('TRUNCATE TABLE projects CASCADE');
});
```

## Frontend Testing

### Framework

**Consigliato**: **Jest** + **React Testing Library**

### Setup

```bash
cd gestionale-app
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**File**: `gestionale-app/jest.config.js`

```javascript
export default {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};
```

### Unit Tests

**Esempio**: Test componente

```typescript
// gestionale-app/src/components/__tests__/TaskItem.test.tsx
import { render, screen } from '@testing-library/react';
import { TaskItem } from '../TaskItem';

describe('TaskItem', () => {
    const mockTask = {
        id: '1',
        description: 'Test task',
        status: 'Da Fare',
        priority: 'Alta'
    };
    
    test('should render task description', () => {
        render(<TaskItem task={mockTask} />);
        expect(screen.getByText('Test task')).toBeInTheDocument();
    });
    
    test('should display priority badge', () => {
        render(<TaskItem task={mockTask} />);
        expect(screen.getByText('Alta')).toBeInTheDocument();
    });
});
```

### Integration Tests

**Esempio**: Test interazione componenti

```typescript
// gestionale-app/src/components/__tests__/ProjectCard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCard } from '../ProjectCard';
import { projectsAPI } from '../../services/api';

jest.mock('../../services/api');

describe('ProjectCard', () => {
    test('should update project status on button click', async () => {
        const mockProject = { id: '1', name: 'Progetto', status: 'Pianificato' };
        const mockUpdate = jest.fn().mockResolvedValue({ ...mockProject, status: 'In Corso' });
        (projectsAPI.update as jest.Mock) = mockUpdate;
        
        render(<ProjectCard project={mockProject} />);
        
        const updateButton = screen.getByText('Inizia');
        await userEvent.click(updateButton);
        
        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith('1', { status: 'In Corso' });
        });
    });
});
```

## E2E Testing

### Framework

**Consigliato**: **Playwright**

### Setup

```bash
npm install --save-dev @playwright/test
npx playwright install
```

**File**: `e2e/playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    use: {
        baseURL: 'http://localhost:5173',
        headless: true,
    },
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
    },
});
```

### E2E Test Example

```typescript
// e2e/tests/login.spec.ts
import { test, expect } from '@playwright/test';

test('should login successfully', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('input[type="email"]', 'admin@gestionale.it');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Dashboard')).toBeVisible();
});

test('should create new project', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@gestionale.it');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Navigate to projects
    await page.click('text=Progetti');
    
    // Create project
    await page.click('text=Aggiungi Progetto');
    await page.fill('input[name="name"]', 'Nuovo Progetto');
    await page.selectOption('select[name="clientId"]', '1');
    await page.click('button[type="submit"]');
    
    // Verify
    await expect(page.locator('text=Nuovo Progetto')).toBeVisible();
});
```

## Test Coverage

### Target Coverage

- **Backend**: 80%+ coverage
- **Frontend**: 70%+ coverage
- **Critical paths**: 100% coverage

### Generazione Report

```bash
# Backend
cd backend
npm test -- --coverage

# Frontend
cd gestionale-app
npm test -- --coverage
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm test
      - run: cd backend && npm test -- --coverage
      
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd gestionale-app && npm install
      - run: cd gestionale-app && npm test
      
  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: microsoft/playwright@v1
      - run: npm install
      - run: npx playwright test
```

## Best Practices

### 1. Test Naming

**Usa descrizioni chiare**:

```javascript
// ✅ BENE
test('should return 401 when token is missing', () => { });
test('should create project with valid data', () => { });

// ❌ MALE
test('test1', () => { });
test('works', () => { });
```

### 2. AAA Pattern

**Arrange, Act, Assert**:

```javascript
test('should update project status', () => {
    // Arrange
    const project = { id: '1', status: 'Pianificato' };
    const newStatus = 'In Corso';
    
    // Act
    const updated = updateProjectStatus(project, newStatus);
    
    // Assert
    expect(updated.status).toBe('In Corso');
});
```

### 3. Test Isolation

**Ogni test deve essere indipendente**:

```javascript
// ✅ BENE: Test isolato
test('should create project', () => {
    const project = createProject({ name: 'Test' });
    expect(project).toBeDefined();
});

// ❌ MALE: Dipende da test precedente
let project;
test('should create project', () => {
    project = createProject({ name: 'Test' });
});
test('should update project', () => {
    updateProject(project.id, { name: 'Updated' }); // Dipende da test precedente
});
```

### 4. Mock External Dependencies

**Mocka** API calls, database, file system:

```typescript
// Mock API
jest.mock('../../services/api', () => ({
    projectsAPI: {
        getAll: jest.fn(),
        create: jest.fn(),
    }
}));
```

### 5. Test Edge Cases

**Testa**:
- Valori null/undefined
- Stringhe vuote
- Array vuoti
- Valori limite
- Errori

## Riferimenti

- **Jest**: https://jestjs.io/
- **React Testing Library**: https://testing-library.com/react
- **Playwright**: https://playwright.dev/

---

**Nota**: Questo documento descrive una strategia **futura**. Il sistema attuale non implementa test automatici.

**Versione**: 1.0  
**Ultimo Aggiornamento**: 2024

