import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './database/connection.js';

// Import routes
import authRoutes from './routes/auth.js';
import clientsRoutes from './routes/clients.js';
import projectsRoutes from './routes/projects.js';
import contractsRoutes from './routes/contracts.js';
import eventsRoutes from './routes/events.js';
import usersRoutes from './routes/users.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware per logging delle richieste
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] ${req.method} ${req.path}`);
    console.log('   Origin:', req.headers.origin || 'N/A');
    console.log('   Content-Type:', req.headers['content-type'] || 'N/A');
    
    // Log del body solo per POST/PUT (senza password)
    if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
        const bodyCopy = { ...req.body };
        if (bodyCopy.password) {
            bodyCopy.password = '***HIDDEN***';
        }
        console.log('   Body:', JSON.stringify(bodyCopy).substring(0, 200));
    }
    
    next();
});

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
    console.log('🏥 Health check richiesto');
    let dbStatus = 'ok';
    let dbError = null;
    
    try {
        console.log('   Testando connessione database...');
        const startTime = Date.now();
        await pool.query('SELECT 1');
        const queryTime = Date.now() - startTime;
        console.log(`   ✅ Database OK (${queryTime}ms)`);
    } catch (error) {
        console.error('   ❌ Errore database:', error.message);
        console.error('   Codice errore:', error.code);
        dbStatus = 'error';
        dbError = error.message;
    }
    
    const response = { 
        status: 'OK', 
        db: dbStatus,
        timestamp: new Date().toISOString() 
    };
    
    if (dbError) {
        response.dbError = dbError;
    }
    
    res.json(response);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/users', usersRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Errore:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Errore interno del server',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trovata' });
});

// Test connessione database all'avvio
async function testDatabaseConnection() {
    try {
        console.log('🔍 Test connessione database all\'avvio...');
        const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ Database connesso con successo!');
        console.log('   Ora server DB:', result.rows[0].current_time);
        console.log('   Versione PostgreSQL:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);
    } catch (error) {
        console.error('❌ ERRORE CONNESSIONE DATABASE:');
        console.error('   Messaggio:', error.message);
        console.error('   Codice:', error.code);
        console.error('   Stack:', error.stack);
    }
}

// Start server
app.listen(PORT, async () => {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🚀 SERVER AVVIATO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📡 Porta: ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? 'Configurato ✅' : 'NON CONFIGURATO ⚠️'}`);
    console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configurato ✅' : 'NON CONFIGURATO ⚠️'}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (!process.env.DATABASE_URL) {
        console.error('⚠️  ATTENZIONE: DATABASE_URL non è configurato!');
    }
    if (!process.env.JWT_SECRET) {
        console.error('⚠️  ATTENZIONE: JWT_SECRET non è configurato!');
    }
    
    // Test connessione database
    await testDatabaseConnection();
    
    console.log('\n📝 Logging attivo: tutte le richieste verranno loggate');
    console.log('═══════════════════════════════════════════════════════════\n');
});

