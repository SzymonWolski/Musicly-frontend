const ALGORITHM = 'AES-CBC';

/**
 * Generates a deterministic encryption key based on timestamp
 */
async function generateKeyFromTimestamp(timestamp: number): Promise<CryptoKey> {
  const seed = timestamp.toString();
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  
  // Hash the timestamp to create a key
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Import the hash as a key
  return await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts text using timestamp-based key
 */
export async function encryptMessage(text: string, keyTimestamp: number): Promise<string> {
  const key = await generateKeyFromTimestamp(keyTimestamp);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv },
    key,
    data
  );
  
  // Convert to hex and prepend IV
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return ivHex + ':' + encryptedHex;
}

/**
 * Decrypts text using timestamp-based key
 */
export async function decryptMessage(encryptedText: string, keyTimestamp: number): Promise<string> {
  const key = await generateKeyFromTimestamp(keyTimestamp);
  
  // Extract IV and encrypted data
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted message format');
  }
  
  const iv = new Uint8Array(parts[0].match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const encrypted = new Uint8Array(parts[1].match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv },
    key,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Generates current timestamp for key creation
 */
export function generateKeyTimestamp(): number {
  return Date.now();
}
