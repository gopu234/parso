import { JwtDecoded, JwtHeader, JwtPayload } from '../types';

export function base64UrlDecode(str: string): string {
  // Add padding if missing
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    const raw = atob(base64);
    // Convert to UTF-8
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    throw new Error('Invalid Base64Url string');
  }
}

export function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeJwt(token: string): JwtDecoded {
  if (!token || typeof token !== 'string') {
    return {
      rawHeader: '',
      rawPayload: '',
      rawSignature: '',
      header: null,
      payload: null,
      isValidStructure: false,
      error: 'Empty token',
    };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return {
      rawHeader: parts[0] || '',
      rawPayload: parts[1] || '',
      rawSignature: parts[2] || '',
      header: null,
      payload: null,
      isValidStructure: false,
      error: `JWT must have 3 dot-separated parts (found ${parts.length})`,
    };
  }

  const [rawHeader, rawPayload, rawSignature] = parts;

  let header: JwtHeader | null = null;
  let payload: JwtPayload | null = null;
  let error: string | undefined;

  try {
    const decodedHeader = base64UrlDecode(rawHeader);
    header = JSON.parse(decodedHeader);
  } catch (e: any) {
    error = `Malformed Header: ${e.message}`;
  }

  try {
    const decodedPayload = base64UrlDecode(rawPayload);
    payload = JSON.parse(decodedPayload);
  } catch (e: any) {
    error = error ? `${error}; Malformed Payload: ${e.message}` : `Malformed Payload: ${e.message}`;
  }

  return {
    rawHeader,
    rawPayload,
    rawSignature,
    header,
    payload,
    isValidStructure: !!header && !!payload,
    error,
  };
}

export async function verifyHs256Signature(
  rawHeader: string,
  rawPayload: string,
  rawSignature: string,
  secret: string
): Promise<{ verified: boolean; message: string }> {
  if (!secret) {
    return { verified: false, message: 'Secret key is empty' };
  }
  if (!window.crypto?.subtle) {
    return { verified: false, message: 'Web Crypto API unavailable in this browser context' };
  }

  try {
    const enc = new TextEncoder();
    const keyData = enc.encode(secret);
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['verify', 'sign']
    );

    const dataToVerify = enc.encode(`${rawHeader}.${rawPayload}`);
    
    // Decode given signature into bytes
    let sigBase64 = rawSignature.replace(/-/g, '+').replace(/_/g, '/');
    while (sigBase64.length % 4) {
      sigBase64 += '=';
    }
    const sigBinary = atob(sigBase64);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i);
    }

    const isValid = await window.crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      dataToVerify
    );

    return {
      verified: isValid,
      message: isValid ? 'Valid signature! Token verified.' : 'Invalid signature for this secret',
    };
  } catch (e: any) {
    return { verified: false, message: `Verification failed: ${e.message}` };
  }
}

export async function signHs256(
  headerObj: object,
  payloadObj: object,
  secret: string
): Promise<string> {
  const enc = new TextEncoder();
  const headerStr = JSON.stringify(headerObj);
  const payloadStr = JSON.stringify(payloadObj);

  const rawHeader = base64UrlEncode(headerStr);
  const rawPayload = base64UrlEncode(payloadStr);
  const dataToSign = enc.encode(`${rawHeader}.${rawPayload}`);

  const keyData = enc.encode(secret);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, dataToSign);
  const rawSignature = bufferToBase64Url(signatureBuffer);

  return `${rawHeader}.${rawPayload}.${rawSignature}`;
}

export function formatUnixTimestamp(ts?: number): { formatted: string; relative: string; status: 'active' | 'expired' | 'none' } {
  if (!ts) {
    return { formatted: 'N/A', relative: 'No timestamp provided', status: 'none' };
  }
  const date = new Date(ts * 1000);
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const isExpired = diffMs < 0;

  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  let relative = '';
  if (diffSeconds < 60) {
    relative = `${diffSeconds}s ${isExpired ? 'ago' : 'from now'}`;
  } else if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    relative = `${mins}m ${isExpired ? 'ago' : 'from now'}`;
  } else if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    relative = `${hours}h ${isExpired ? 'ago' : 'from now'}`;
  } else {
    const days = Math.floor(diffSeconds / 86400);
    relative = `${days}d ${isExpired ? 'ago' : 'from now'}`;
  }

  return {
    formatted: date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }),
    relative,
    status: isExpired ? 'expired' : 'active',
  };
}

export const SAMPLE_TOKENS = {
  validHs256: {
    name: 'HS256 Standard Auth Token',
    secret: 'super-secret-developer-key-2026',
    token: '', // We will generate dynamically on load
  },
  expired: {
    name: 'Expired Session Token',
    secret: 'my-app-secret',
    token: '',
  },
  rbac: {
    name: 'Admin RBAC Token with Claims',
    secret: 'enterprise-shared-secret',
    token: '',
  },
};
