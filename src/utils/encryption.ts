// Defining encryption algorithm used throughout the module
const ALGORITHM = 'AES-CBC';

// Creates a cryptographic key from a timestamp to ensure consistent encryption/decryption
async function generateKeyFromTimestamp(timestamp: number): Promise<CryptoKey> {
  const seed = timestamp.toString();
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  
  // Convert timestamp to a secure hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Create a cryptographic key from the hash
  return await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypts a string message using a timestamp-based key
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
  
  // Format result as hexadecimal with IV prepended
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return ivHex + ':' + encryptedHex;
}

// Decrypts a previously encrypted message using the same timestamp-based key
export async function decryptMessage(encryptedText: string, keyTimestamp: number): Promise<string> {
  const key = await generateKeyFromTimestamp(keyTimestamp);
  
  // Split and parse the IV and encrypted data components
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
  
  // Convert decrypted data back to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Generates current timestamp for key creation
 */
export function generateKeyTimestamp(): number {
  return Date.now();
}
