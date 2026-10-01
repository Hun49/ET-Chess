export interface GameTicketPayload {
  ticketId: string;
  gameId: string;
  userId: string;
  displayName: string;
  issuedAt: number;
  expiresAt: number;
}

function base64UrlEncode(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createGameTicket(
  payload: Omit<GameTicketPayload, 'ticketId' | 'issuedAt' | 'expiresAt'>,
  secret: string,
  ttlMs = 60_000,
): Promise<string> {
  const fullPayload: GameTicketPayload = {
    ...payload,
    ticketId: crypto.randomUUID(),
    issuedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };
  const payloadJson = JSON.stringify(fullPayload);
  const encodedPayload = base64UrlEncode(payloadJson);
  const key = await getHmacKey(secret);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  const sigEncoded = base64UrlEncode(new Uint8Array(sigBuffer));
  return `${encodedPayload}.${sigEncoded}`;
}

export async function verifyGameTicket(
  ticket: string,
  secret: string,
): Promise<GameTicketPayload | null> {
  try {
    const parts = ticket.split('.');
    if (parts.length !== 2) return null;
    const [encodedPayload, sigEncoded] = parts;
    if (!encodedPayload || !sigEncoded) return null;
    const key = await getHmacKey(secret);
    const signature = base64UrlDecode(sigEncoded);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature as unknown as BufferSource,
      new TextEncoder().encode(encodedPayload),
    );
    if (!isValid) return null;
    const payloadBytes = base64UrlDecode(encodedPayload);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    const payload: GameTicketPayload = JSON.parse(payloadJson);
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
