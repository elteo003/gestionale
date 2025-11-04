import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../database/connection.js';

const router = express.Router();

// Log per debug
console.log('🔧 Auth router inizializzato');

// Test route GET per verificare che il router funzioni
router.get('/test', (req, res) => {
    res.json({ message: 'Auth router funziona!', path: req.path });
});

// Registrazione nuovo utente
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, area, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, email e password sono obbligatori' });
        }

        // Verifica se l'email esiste già
        const existingUser = await pool.query(
            'SELECT user_id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email già registrata' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Inserisci nuovo utente
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, area, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING user_id, name, email, area, role, created_at`,
            [name, email, passwordHash, area || null, role || 'Socio']
        );

        const user = result.rows[0];

        // Genera JWT token
        const token = jwt.sign(
            { userId: user.user_id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Registrazione completata',
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                area: user.area,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Errore registrazione:', error);
        console.error('Stack:', error.stack);
        
        // Se è un errore di connessione database
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return res.status(500).json({ 
                error: 'Errore di connessione al database. Verifica che il database sia configurato correttamente.' 
            });
        }
        
        res.status(500).json({ 
            error: 'Errore interno del server',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    console.log('🔐 Route /login chiamata');
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`🔐 [LOGIN] ${timestamp}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📥 Richiesta ricevuta:', {
        method: req.method,
        path: req.path,
        headers: {
            'content-type': req.headers['content-type'],
            'origin': req.headers.origin,
            'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
        }
    });

    try {
        const { email, password } = req.body;
        
        console.log('📋 Dati ricevuti:', {
            email: email ? email.substring(0, 20) + '...' : 'MANCANTE',
            passwordLength: password ? password.length : 0,
            hasPassword: !!password
        });

        if (!email || !password) {
            console.log('❌ VALIDAZIONE FALLITA: Email o password mancanti');
            console.log('   Email presente:', !!email);
            console.log('   Password presente:', !!password);
            return res.status(400).json({ error: 'Email e password sono obbligatori' });
        }

        console.log('✅ Validazione campi OK');
        console.log('🔍 Cercando utente nel database...');

        // Trova utente
        const result = await pool.query(
            'SELECT user_id, name, email, password_hash, area, role, is_active FROM users WHERE email = $1',
            [email]
        );

        console.log('📊 Risultato query database:', {
            rowsFound: result.rows.length,
            queryTime: Date.now() - startTime + 'ms'
        });

        if (result.rows.length === 0) {
            console.log('❌ UTENTE NON TROVATO nel database');
            console.log('   Email cercata:', email);
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const user = result.rows[0];
        console.log('✅ Utente trovato:', {
            id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role,
            area: user.area,
            is_active: user.is_active
        });

        if (user.is_active === false) {
            console.log('⚠️  UTENTE DISATTIVATO');
            return res.status(401).json({ error: 'Account disattivato' });
        }

        console.log('🔐 Verificando password...');
        const passwordCheckStart = Date.now();
        
        // Verifica password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        const passwordCheckTime = Date.now() - passwordCheckStart;
        console.log('🔐 Risultato verifica password:', {
            valid: validPassword,
            checkTime: passwordCheckTime + 'ms'
        });

        if (!validPassword) {
            console.log('❌ PASSWORD NON VALIDA');
            console.log('   Password hash nel DB:', user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'NULL');
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        console.log('✅ Password verificata correttamente');
        console.log('🎫 Generando JWT token...');

        // Verifica JWT_SECRET
        if (!process.env.JWT_SECRET) {
            console.error('❌ ERRORE CRITICO: JWT_SECRET non configurato!');
            return res.status(500).json({ error: 'Errore di configurazione del server' });
        }

        // Genera JWT token
        const token = jwt.sign(
            { userId: user.user_id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const totalTime = Date.now() - startTime;
        console.log('✅ Token generato con successo');
        console.log('📤 Invio risposta di successo...');
        console.log('📊 Riepilogo:', {
            success: true,
            userId: user.user_id,
            role: user.role,
            totalTime: totalTime + 'ms',
            tokenLength: token.length
        });
        console.log('═══════════════════════════════════════════════════════════\n');

        res.json({
            message: 'Login effettuato con successo',
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                area: user.area,
                role: user.role
            }
        });
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error('\n❌ ERRORE DURANTE IL LOGIN');
        console.error('═══════════════════════════════════════════════════════════');
        console.error('Tipo errore:', error.name);
        console.error('Messaggio:', error.message);
        console.error('Codice errore:', error.code);
        console.error('Stack:', error.stack);
        console.error('Tempo totale:', totalTime + 'ms');
        console.error('═══════════════════════════════════════════════════════════\n');
        
        // Se è un errore di connessione database
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            console.error('❌ ERRORE CONNESSIONE DATABASE');
            return res.status(500).json({ 
                error: 'Errore di connessione al database. Verifica che il database sia configurato correttamente.' 
            });
        }
        
        res.status(500).json({ 
            error: 'Errore interno del server',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Verifica token (per verificare se l'utente è ancora loggato)
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Token mancante' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Recupera dati utente aggiornati
        const result = await pool.query(
            'SELECT user_id, name, email, area, role FROM users WHERE user_id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        res.json({
            user: {
                id: result.rows[0].user_id,
                name: result.rows[0].name,
                email: result.rows[0].email,
                area: result.rows[0].area,
                role: result.rows[0].role
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token non valido o scaduto' });
        }
        console.error('Errore verifica token:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;

