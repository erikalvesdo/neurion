const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const secretPath = path.join(root, 'secrets', 'openai-key.txt');
const outputPath = path.join(root, 'electron', 'openai-key.bundle.json');
const secret = 'NEURION_OS_OPENAI_KEY_BUNDLE_V1';

function removeOutput() {
  try {
    fs.rmSync(outputPath, { force: true });
  } catch {}
}

if (!fs.existsSync(secretPath)) {
  removeOutput();
  console.log('[openai-key] secrets/openai-key.txt nao encontrado. Build seguira sem chave embutida.');
  process.exit(0);
}

const apiKey = fs.readFileSync(secretPath, 'utf8').trim();

if (!apiKey) {
  removeOutput();
  console.log('[openai-key] secrets/openai-key.txt esta vazio. Build seguira sem chave embutida.');
  process.exit(0);
}

if (!apiKey.startsWith('sk-')) {
  removeOutput();
  throw new Error('[openai-key] A chave OpenAI precisa comecar com "sk-".');
}

const key = crypto.createHash('sha256').update(secret).digest();
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();

fs.writeFileSync(outputPath, JSON.stringify({
  version: 1,
  value: encrypted.toString('base64'),
  iv: iv.toString('base64'),
  tag: tag.toString('base64'),
}, null, 2));

console.log('[openai-key] Chave OpenAI empacotada para o build.');
