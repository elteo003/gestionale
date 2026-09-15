import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = path.join(root, 'gestionale-app', 'dist');
const dest = path.join(root, 'desktop', 'renderer');

if (!fs.existsSync(src)) {
    console.error('Manca gestionale-app/dist. Esegui prima la build del frontend.');
    process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Renderer copiato in desktop/renderer');
