import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src', 'db', 'migrations');
const distDir = path.join(__dirname, '..', 'dist', 'db', 'migrations');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  fs.cpSync(srcDir, distDir, { recursive: true });
  console.log('[FestConnect Build] Migrations copied to dist/db/migrations');
}
