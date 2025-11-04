import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server avviato sulla porta ${PORT}`);
    console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`🔗 Database URL configurato: ${process.env.DATABASE_URL ? 'Sì' : 'NO ⚠️'}`);
    console.log(`🔐 JWT Secret configurato: ${process.env.JWT_SECRET ? 'Sì' : 'NO ⚠️'}`);
    
    if (!process.env.DATABASE_URL) {
        console.error('⚠️  ATTENZIONE: DATABASE_URL non è configurato!');
    }
    if (!process.env.JWT_SECRET) {
        console.error('⚠️  ATTENZIONE: JWT_SECRET non è configurato!');
    }
});

