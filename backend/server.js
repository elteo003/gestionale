import http from 'http';
import { createApp } from './app.js';
import pool from './database/connection.js';
import { attachChatHub } from './lib/chatHub.js';

const PORT = process.env.PORT || 3000;
const app = createApp();
const server = http.createServer(app);

async function testDatabaseConnection() {
    try {
        await pool.query('SELECT NOW()');
        console.log('Database connesso');
    } catch (error) {
        console.error('Errore database:', error.message);
    }
}

if (process.env.NODE_ENV !== 'test') {
    server.on('error', (err) => {
        console.error('HTTP server:', err.message);
        process.exit(1);
    });
    server.listen(PORT, async () => {
        attachChatHub(server);
        console.log(`Server su porta ${PORT}`);
        await testDatabaseConnection();
    });
}

export default app;
