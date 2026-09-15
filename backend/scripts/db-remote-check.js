/**
 * Verifica connessione al PostgreSQL (locale o Render External URL).
 * Uso: npm run db:check
 */
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('❌ DATABASE_URL mancante in backend/.env');
        process.exit(1);
    }

    const hostHint = (() => {
        try {
            return new URL(url.replace(/^postgresql:/, 'http:')).hostname;
        } catch {
            return '(url non parsabile)';
        }
    })();

    const useSsl =
        process.env.DRIZZLE_SSL !== 'false' &&
        (url.includes('render.com') ||
            url.includes('supabase.com') ||
            process.env.NODE_ENV === 'production');

    const client = new Client({
        connectionString: url,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
    });

    try {
        await client.connect();
        const now = await client.query('SELECT NOW() AS ts, current_database() AS db');
        const tables = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        console.log('✅ Connessione OK');
        console.log('   Host:', hostHint);
        console.log('   Database:', now.rows[0].db);
        console.log('   Server time:', now.rows[0].ts);
        console.log('   Tabelle public:', tables.rows.length);
        if (tables.rows.length) {
            console.log('   ', tables.rows.map((r) => r.table_name).join(', '));
        }
    } catch (err) {
        console.error('❌ Connessione fallita:', err.message);
        if (err.code === '28P01') {
            console.error('   → Password errata: copia di nuovo External Database URL da Render.');
        }
        if (hostHint.includes('render.com')) {
            console.error('   → Da locale serve External URL (non Internal).');
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
