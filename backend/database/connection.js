import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Verifica che DATABASE_URL sia configurato
if (!process.env.DATABASE_URL) {
    console.error('❌ ERRORE: DATABASE_URL non è configurato!');
    console.error('Configura la variabile d\'ambiente DATABASE_URL nel file .env o su Render');
}

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
    console.error('Verifica che DATABASE_URL sia configurato correttamente');
});

// Test connessione all'avvio
pool.query('SELECT NOW()')
    .then(() => {
        console.log('✅ Test connessione database riuscito');
    })
    .catch((err) => {
        console.error('❌ ERRORE: Impossibile connettersi al database!');
        console.error('Errore:', err.message);
        console.error('DATABASE_URL configurato:', process.env.DATABASE_URL ? 'Sì' : 'NO');
        if (!process.env.DATABASE_URL) {
            console.error('⚠️  Configura DATABASE_URL nel file .env o su Render');
        }
    });

export default pool;

