import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Verifica che DATABASE_URL sia configurato
if (!process.env.DATABASE_URL) {
    console.error('❌ ERRORE: DATABASE_URL non è configurato!');
    console.error('Configura la variabile d\'ambiente DATABASE_URL nel file .env o su Render');
}

const databaseUrl = process.env.DATABASE_URL || '';
const useSsl =
    process.env.DRIZZLE_SSL !== 'false' &&
    (process.env.NODE_ENV === 'production' ||
        databaseUrl.includes('supabase.com') ||
        databaseUrl.includes('render.com'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
});

const isTest = process.env.NODE_ENV === 'test';

if (!isTest && process.env.DATABASE_URL) {
    try {
        const u = new URL(process.env.DATABASE_URL.replace(/^postgresql:/, 'http:'));
        console.log(
            `DB target: host=${u.hostname} port=${u.port || '5432'} user=${u.username} database=${u.pathname}`,
        );
    } catch {
        console.warn('DATABASE_URL presente ma non parsabile come URL');
    }
} else if (!isTest && !process.env.DATABASE_URL) {
    console.warn('DATABASE_URL non impostata');
}

pool.on('connect', () => {
    if (!isTest) console.log('✅ Connesso al database PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Errore database:', err);
});

if (!isTest) {
    pool.query('SELECT NOW()')
        .then(() => console.log('✅ Test connessione database riuscito'))
        .catch((err) => {
            console.error('❌ ERRORE: Impossibile connettersi al database!');
            console.error('Errore:', err.message);
        });
}

export default pool;

