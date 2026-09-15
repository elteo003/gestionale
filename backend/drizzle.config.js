import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error(
        'DATABASE_URL mancante. Per Render da locale usa External Connection String in backend/.env',
    );
}

const useSsl =
    process.env.DRIZZLE_SSL !== 'false' &&
    (databaseUrl.includes('render.com') ||
        databaseUrl.includes('supabase.com') ||
        process.env.NODE_ENV === 'production');

export default defineConfig({
    schema: './database/drizzle/schema.js',
    out: './database/drizzle/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: databaseUrl,
        ...(useSsl ? { ssl: true } : {}),
    },
    verbose: true,
    strict: true,
});
