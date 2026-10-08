import { webcrypto } from 'node:crypto';
import { passwordHash } from '../lib/auth.js';

const [username, role] = process.argv.slice(2);
const password = process.env.SITE_USER_PASSWORD;
if (!/^[a-z0-9._-]{3,40}$/.test(username || '') || !['admin', 'author'].includes(role) || !password || password.length < 12) {
  process.stderr.write('Uso: defina SITE_USER_PASSWORD com pelo menos 12 caracteres e execute node scripts/create-user.mjs nome admin|author\n');
  process.exit(1);
}
const salt = Buffer.from(webcrypto.getRandomValues(new Uint8Array(24))).toString('hex');
const hash = await passwordHash(password, salt);
process.stdout.write(`INSERT INTO users (username,role,password_salt,password_hash) VALUES ('${username}','${role}','${salt}','${hash}') ON CONFLICT(username) DO UPDATE SET role=excluded.role,password_salt=excluded.password_salt,password_hash=excluded.password_hash;\n`);
