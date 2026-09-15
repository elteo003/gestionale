import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import pool from './database/connection.js';
import { requestLog, requestBodyLog } from './middleware/requestLog.js';
import { apiLimiter } from './middleware/rateLimit.js';

import authRoutes from './routes/auth.js';
import clientsRoutes from './routes/clients.js';
import projectsRoutes from './routes/projects.js';
import contractsRoutes from './routes/contracts.js';
import eventsRoutes from './routes/events.js';
import eventReportsRoutes from './routes/eventReports.js';
import usersRoutes from './routes/users.js';
import tasksRoutes from './routes/tasks.js';
import sprintsRoutes from './routes/sprints.js';
import activitiesRoutes from './routes/activities.js';
import timeEntriesRoutes from './routes/timeEntries.js';
import messagesRoutes from './routes/messages.js';
import notificationsRoutes from './routes/notifications.js';
import pollsRoutes from './routes/polls.js';
import candidatesRoutes from './routes/candidates.js';
import onboardingRoutes from './routes/onboarding.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function buildCorsOptions() {
    const allowedOrigins = (process.env.FRONTEND_URL
        || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173,https://gestionale-i5bj.onrender.com')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    return {
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            if (origin === 'file://' || origin.startsWith('file://') || origin.startsWith('jeins:')) {
                return cb(null, true);
            }
            if (allowedOrigins.includes(origin)) return cb(null, true);
            if (isProduction) {
                console.warn('CORS rifiutato:', origin);
                return cb(new Error('Origin non consentita'), false);
            }
            console.warn('CORS dev: origin non in lista, permessa:', origin);
            return cb(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    };
}

export function createApp() {
    const app = express();

    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use(requestLog);
    app.use(cors(buildCorsOptions()));
    app.use(cookieParser());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(requestBodyLog);
    app.use('/api', apiLimiter);

    function parseDatabaseUrlUser() {
        const raw = process.env.DATABASE_URL;
        if (!raw) return null;
        try {
            return new URL(raw.replace(/^postgresql:/, 'http:')).username || null;
        } catch {
            return null;
        }
    }

    async function healthHandler(req, res) {
        let dbStatus = 'ok';
        let dbError = null;
        try {
            await pool.query('SELECT 1');
        } catch (error) {
            dbStatus = 'error';
            dbError = error.message;
        }
        const response = { status: 'OK', db: dbStatus, timestamp: new Date().toISOString() };
        if (dbError) {
            response.dbError = dbError;
            response.dbUserFromUrl = parseDatabaseUrlUser();
        }
        res.json(response);
    }

    // Pubblico, senza JWT. /api/health non deve passare da router /api con auth (es. messages).
    app.get('/health', healthHandler);
    app.get('/api/health', healthHandler);

    app.get('/', (req, res) => {
        res.status(200).json({ status: 'online', message: 'Gestionale JEINS API is running' });
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/clients', clientsRoutes);
    app.use('/api/projects', projectsRoutes);
    app.use('/api/contracts', contractsRoutes);
    app.use('/api/events', eventsRoutes);
    app.use('/api/events', eventReportsRoutes);
    app.use('/api/polls', pollsRoutes);
    app.use('/api/candidates', candidatesRoutes);
    app.use('/api/onboarding', onboardingRoutes);
    app.use('/api/users', usersRoutes);
    app.use('/api/tasks', tasksRoutes);
    app.use('/api/sprints', sprintsRoutes);
    app.use('/api/activities', activitiesRoutes);
    app.use('/api/time-entries', timeEntriesRoutes);
    app.use('/api', notificationsRoutes);
    app.use('/api', messagesRoutes);

    app.use((err, req, res, next) => {
        if (err.message === 'Origin non consentita') {
            return res.status(403).json({ error: 'Origin non consentita' });
        }
        const status = err.status || 500;
        if (status >= 500) console.error('Errore:', err);
        res.status(status).json({
            error: err.message || 'Errore interno del server',
            ...(err.code && { code: err.code }),
            ...(!isProduction && err.stack && { stack: err.stack }),
        });
    });

    app.use((req, res) => {
        res.status(404).json({ error: 'Route non trovata', path: req.path, method: req.method });
    });

    return app;
}
