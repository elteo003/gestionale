# 🔒 Security Best Practices

## Pubblico di Destinazione

Questa documentazione è destinata a:
- **Sviluppatori** che implementano funzionalità
- **DevOps** che configurano deployment
- **Security Engineers** che auditano il sistema

## Panoramica

Questa guida descrive le best practices di sicurezza per il gestionale, dalle configurazioni di base alle considerazioni avanzate.

## Security Layers Architecture

```mermaid
graph TD
    A[Client Request] -->|HTTPS| B[Frontend<br/>React]
    B -->|JWT Token| C[Backend API<br/>Express]
    C -->|CORS Check| D{Origin Allowed?}
    D -->|No| E[403 Forbidden]
    D -->|Yes| F[Auth Middleware]
    F -->|Verify JWT| G{Token Valid?}
    G -->|No| H[401 Unauthorized]
    G -->|Yes| I[Rate Limiting<br/>Future]
    I -->|Check Limits| J{Within Limits?}
    J -->|No| K[429 Too Many Requests]
    J -->|Yes| L[Input Validation]
    L -->|Sanitize| M[Business Logic]
    M -->|SQL Injection Prevention| N[Database<br/>PostgreSQL]
    
    style A fill:#e1f5ff
    style B fill:#c8e6c9
    style C fill:#fff9c4
    style D fill:#ffcccc
    style E fill:#ffcccc
    style F fill:#ffcc99
    style G fill:#ffcc99
    style H fill:#ffcccc
    style I fill:#ffffcc
    style J fill:#ffcc99
    style K fill:#ffcccc
    style L fill:#ccffcc
    style M fill:#ccccff
    style N fill:#f3e5f5
```

## Autenticazione e Autorizzazione

### JWT Token

#### Configurazione Attuale

- **Expiry**: 7 giorni
- **Secret**: `JWT_SECRET` (variabile d'ambiente)
- **Storage**: `localStorage` (frontend)

#### Best Practices

**1. Secret Robusti**

```javascript
// ✅ BENE: Secret lungo e casuale
JWT_SECRET=your-super-secret-key-min-32-chars-random-string

// ❌ MALE: Secret debole
JWT_SECRET=secret123
```

**2. Refresh Token (Non Implementato)**

**⚠️ LIMITAZIONE ATTUALE**: Il sistema non implementa refresh token. I token JWT scadono dopo 7 giorni e l'utente deve rieffettuare login.

**Soluzione Consigliata**:

```javascript
// Backend: Genera refresh token
const refreshToken = jwt.sign(
    { userId: user.userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
);

// Salva refresh token in database (tabella refresh_tokens)
await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.userId, refreshToken, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
);
```

**3. Token Storage**

**Attuale**: `localStorage` (vulnerabile a XSS)

**Consigliato**: `httpOnly` cookies (non accessibili da JavaScript):

```javascript
// Backend: Set cookie
res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni
});

// Frontend: Token non in localStorage, automaticamente incluso in requests
```

**⚠️ TRADE-OFF**: Cookies richiedono configurazione CORS aggiuntiva.

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant D as Database
    
    U->>F: Login (email, password)
    F->>B: POST /api/auth/login
    B->>D: Query user by email
    D-->>B: User data
    B->>B: Verify password (bcrypt)
    alt Password Valid
        B->>B: Generate JWT token
        B-->>F: { token, user }
        F->>F: Store token (localStorage)
        F-->>U: Redirect to dashboard
    else Password Invalid
        B-->>F: 401 Unauthorized
        F-->>U: Show error message
    end
```

### Rate Limiting

**⚠️ NON IMPLEMENTATO**: Il sistema attualmente non implementa rate limiting.

**Soluzione Consigliata**:

```javascript
// backend/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5, // 5 tentativi per IP
    message: 'Troppi tentativi di login. Riprova tra 15 minuti.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Uso
router.post('/login', loginLimiter, async (req, res) => {
    // ...
});
```

## CORS (Cross-Origin Resource Sharing)

### Configurazione Attuale

```javascript
// backend/server.js
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
```

### Best Practices

**1. Specificare Origin Espliciti**

```javascript
// ✅ BENE: Origin specifici
const allowedOrigins = [
    'https://gestionale-i5bj.onrender.com',
    'http://localhost:5173'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
```

**2. Headers Specifici**

```javascript
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'] // Headers esposti al frontend
}));
```

**3. Preflight Caching**

```javascript
app.use(cors({
    // ...
    maxAge: 86400 // Cache preflight per 24 ore
}));
```

## Validazione Input

### Backend Validation

**SEMPRE validare** input nel backend, anche se validato nel frontend:

```javascript
// ✅ BENE: Validazione backend
router.post('/api/clients', async (req, res) => {
    const { name, email } = req.body;
    
    // Validazione campi obbligatori
    if (!name || !email) {
        return res.status(400).json({ error: 'Nome ed email obbligatori' });
    }
    
    // Validazione formato email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Formato email non valido' });
    }
    
    // Validazione lunghezza
    if (name.length > 255) {
        return res.status(400).json({ error: 'Nome troppo lungo' });
    }
    
    // Sanitizzazione (trim)
    const sanitizedName = name.trim();
    
    // Query con parametri preparati (previene SQL injection)
    await pool.query(
        'INSERT INTO clients (name, email) VALUES ($1, $2)',
        [sanitizedName, email]
    );
});
```

### SQL Injection Prevention

**SEMPRE usare parametri preparati**:

```javascript
// ✅ BENE: Parametri preparati
await pool.query(
    'SELECT * FROM clients WHERE name = $1',
    [req.query.name]
);

// ❌ MALE: String interpolation (VULNERABILE)
await pool.query(
    `SELECT * FROM clients WHERE name = '${req.query.name}'`
);
```

### XSS Prevention

**Frontend**: React sanitizza automaticamente output:

```typescript
// ✅ BENE: React sanitizza automaticamente
<div>{user.name}</div>

// ❌ MALE: dangerouslySetInnerHTML (solo se necessario e sanitizzato)
<div dangerouslySetInnerHTML={{ __html: userBio }} />
```

**Backend**: Sanitizza input prima di salvare:

```javascript
// Rimuovi tag HTML
const sanitized = input.replace(/<[^>]*>/g, '');
```

## Password Security

### Hashing

**Attuale**: bcrypt con 10 salt rounds ✅

```javascript
const passwordHash = await bcrypt.hash(password, 10);
```

**Best Practice**: 10 salt rounds è adeguato. Non aumentare eccessivamente (performance).

### Password Policy

**⚠️ NON IMPLEMENTATO**: Nessuna policy di complessità password.

**Soluzione Consigliata**:

```javascript
// Validazione password
function validatePassword(password) {
    if (password.length < 8) {
        return 'Password deve essere almeno 8 caratteri';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password deve contenere almeno una lettera maiuscola';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password deve contenere almeno una lettera minuscola';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password deve contenere almeno un numero';
    }
    return null; // Password valida
}
```

## Logging e Monitoring

### Cosa NON Loggare

**Mai loggare**:
- ❌ Password (anche hash, se possibile)
- ❌ Token JWT completi
- ❌ Dati sensibili (carte di credito, SSN, ecc.)
- ❌ Stack trace in produzione (solo in development)

### Cosa Loggare

**Logga**:
- ✅ User ID (non email completa)
- ✅ Operazioni eseguite
- ✅ Errori con contesto (senza dati sensibili)
- ✅ Timestamp
- ✅ Request ID (per tracciamento)

```javascript
// ✅ BENE: Log sicuro
console.log('Progetto creato:', {
    userId: req.user.userId,
    projectId: project.id,
    timestamp: new Date().toISOString()
});

// ❌ MALE: Log dati sensibili
console.log('Login:', {
    email: req.body.email,
    password: req.body.password // ❌ MAI!
});
```

## Error Handling

### Non Esporre Dettagli Interni

```javascript
// ✅ BENE: Errore generico in produzione
catch (error) {
    console.error('Errore interno:', error); // Log dettagliato
    res.status(500).json({ 
        error: 'Errore interno del server' // Messaggio generico
    });
}

// ❌ MALE: Espone dettagli
catch (error) {
    res.status(500).json({ 
        error: error.message,
        stack: error.stack,
        query: error.query // Espone query SQL
    });
}
```

### Gestione Errori Sensibili

```javascript
// Non rivelare se email esiste o meno
if (!user || !await bcrypt.compare(password, user.password_hash)) {
    // Stesso messaggio per entrambi i casi (previene user enumeration)
    return res.status(401).json({ 
        error: 'Email o password non validi' 
    });
}
```

## Environment Variables

### Gestione Secure

**✅ BENE**: Variabili d'ambiente per dati sensibili:

```javascript
// .env (non committato)
DATABASE_URL=postgresql://...
JWT_SECRET=super-secret-key
FRONTEND_URL=https://...

// .gitignore
.env
.env.local
.env.production
```

**❌ MALE**: Hardcoded secrets:

```javascript
// ❌ MAI!
const JWT_SECRET = 'secret123';
```

### Rotazione Secrets

**Best Practice**: Ruota secrets periodicamente:
1. Genera nuovo secret
2. Aggiorna `.env`
3. Invalida token esistenti (se necessario)
4. Riavvia applicazione

## HTTPS

### Produzione

**SEMPRE usa HTTPS** in produzione:

- Render: HTTPS automatico per servizi web ✅
- Supabase: HTTPS automatico ✅

### Sviluppo Locale

Per sviluppo locale, considera mkcert per certificati locali:

```bash
# Installa mkcert
brew install mkcert # Mac
# o
choco install mkcert # Windows

# Crea certificato locale
mkcert -install
mkcert localhost 127.0.0.1
```

## Database Security

### Connection String

**✅ BENE**: Connection string con password:

```javascript
DATABASE_URL=postgresql://user:password@host:port/database
```

**⚠️ ATTENZIONE**: Non esporre connection string pubblicamente.

### Row Level Security (RLS)

**⚠️ NON IMPLEMENTATO**: PostgreSQL RLS non è configurato.

**Soluzione Consigliata** (per multi-tenancy):

```sql
-- Abilita RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Utenti vedono solo progetti del loro cliente
CREATE POLICY project_isolation ON projects
    FOR ALL
    USING (client_id IN (
        SELECT client_id FROM clients 
        WHERE owner_id = current_setting('app.user_id')::uuid
    ));
```

## API Security

### Headers Sicuri

```javascript
// Express Helmet (consigliato)
import helmet from 'helmet';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
```

### Request Size Limits

```javascript
// Limita dimensione body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

## Security Headers

### Headers Consigliati

```javascript
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});
```

## Audit e Testing

### Security Audit Checklist

- [ ] Password policy implementata
- [ ] Rate limiting su endpoint sensibili
- [ ] Input validation in backend
- [ ] SQL injection prevention (parametri preparati)
- [ ] XSS prevention (sanitizzazione)
- [ ] CORS configurato correttamente
- [ ] HTTPS in produzione
- [ ] Secrets in variabili d'ambiente
- [ ] Error handling non espone dettagli
- [ ] Logging non include dati sensibili

### Penetration Testing

**Considera**:
- OWASP Top 10 checklist
- Automated security scanning (es. Snyk, Dependabot)
- Manual penetration testing (periodico)

## Riferimenti

- **[Error Handling Patterns](./backend/Error-Handling-Patterns.md)** - Gestione errori sicura
- **[API Endpoints](./backend/API-Endpoints.md)** - Endpoint con autenticazione
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/

---

**Versione**: 1.0  
**Ultimo Aggiornamento**: 2024

