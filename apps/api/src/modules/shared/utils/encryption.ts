/**
 * Utilitário de criptografia AES-256 para senhas
 * @module encryption
 */

import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key_32_characters_long!';
const IV_LENGTH = 16;

// Garante que a chave tenha 32 caracteres
const KEY = crypto
  .createHash('sha256')
  .update(String(ENCRYPTION_KEY))
  .digest('base64')
  .substring(0, 32);

/**
 * Criptografa uma string usando AES-256-CBC
 * @param {string} text - Texto a ser criptografado
 * @returns {string} Texto criptografado no formato: iv:encrypted
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] Erro ao criptografar:', error);
    throw new Error('Falha na criptografia');
  }
}

/**
 * Descriptografa uma string criptografada com AES-256-CBC
 * @param {string} encryptedText - Texto criptografado no formato: iv:encrypted
 * @returns {string} Texto descriptografado
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Formato de texto criptografado inválido');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY), iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Encryption] Erro ao descriptografar:', error);
    throw new Error('Falha na descriptografia');
  }
}

/**
 * Cria um hash SHA-256 de um objeto/string
 * @param {any} data - Dados a serem hasheados
 * @returns {string} Hash em formato hexadecimal
 */
export function createHash(data: any): string {
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(str).digest('hex');
  } catch (error) {
    console.error('[Encryption] Erro ao criar hash:', error);
    throw new Error('Falha ao criar hash');
  }
}

/**
 * Compara dois hashes de forma segura
 * @param {string} hash1 - Primeiro hash
 * @param {string} hash2 - Segundo hash
 * @returns {boolean} True se os hashes são iguais
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(hash1), Buffer.from(hash2));
  } catch (error) {
    // Se os buffers têm tamanhos diferentes, não são iguais
    return false;
  }
}

/**
 * Gera um ID único
 * @returns {string} ID único em formato hexadecimal
 */
export function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Sanitiza dados sensíveis para logging
 * @param {any} data - Dados a serem sanitizados
 * @returns {any} Dados sanitizados
 */
export function sanitizeForLog(data: any): any {
  if (!data) return data;

  const sensitiveFields = [
    'senha',
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'senhaEncriptada',
  ];

  if (typeof data === 'object' && !Array.isArray(data)) {
    const sanitized: any = {};
    for (const key in data) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof data[key] === 'object') {
        sanitized[key] = sanitizeForLog(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    }
    return sanitized;
  }

  return data;
}

export default {
  encrypt,
  decrypt,
  createHash,
  compareHashes,
  generateId,
  sanitizeForLog,
};
