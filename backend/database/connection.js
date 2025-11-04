import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connessione
pool.on('connect', () => {
    console.log('✅ Connesso al database PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Errore database:', err);
});

export default pool;

