import React, { useState, useEffect } from 'react';
import { decodeJwt, verifyHs256Signature, signHs256, formatUnixTimestamp } from '../utils/jwt';
import {
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Clock,
  Terminal,
} from 'lucide-react';

export const JwtDebugger: React.FC = () => {
  // Pre-seed with a standard active token
  const defaultPayload = {
    sub: 'usr_89201fba4',
    name: 'Full Name',
    email: 'developer@domain.com',
    role: 'admin',
    permissions: ['read:all', 'write:projects', 'deploy:production'],
    iat: Math.floor(Date.now() / 1000) - 1800, // issued 30m ago
    exp: Math.floor(Date.now() / 1000) + 86400 * 2, // expires in 2 days
    iss: 'https://auth.devformat.io',
    aud: 'https://api.devformat.io',
  };

  const defaultHeader = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const defaultSecret = 'super-developer-jwt-secret-key-2026';

  const [encodedToken, setEncodedToken] = useState<string>('');
  const [headerJson, setHeaderJson] = useState<string>(JSON.stringify(defaultHeader, null, 2));
  const [payloadJson, setPayloadJson] = useState<string>(JSON.stringify(defaultPayload, null, 2));
  const [secretKey, setSecretKey] = useState<string>(defaultSecret);
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    message: string;
    checked: boolean;
  }>({ verified: false, message: '', checked: false });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Initialize initial token on load
  useEffect(() => {
    signHs256(defaultHeader, defaultPayload, defaultSecret).then((signed) => {
      setEncodedToken(signed);
    });
  }, []);

  // When encoded token changes, decode header & payload
  useEffect(() => {
    if (!encodedToken) {
      setVerificationResult({ verified: false, message: 'No token entered', checked: false });
      return;
    }

    const decoded = decodeJwt(encodedToken);
    if (decoded.header) {
      setHeaderJson(JSON.stringify(decoded.header, null, 2));
    }
    if (decoded.payload) {
      setPayloadJson(JSON.stringify(decoded.payload, null, 2));
    }

    // Verify signature
    if (decoded.rawHeader && decoded.rawPayload && decoded.rawSignature) {
      verifyHs256Signature(
        decoded.rawHeader,
        decoded.rawPayload,
        decoded.rawSignature,
        secretKey
      ).then((res) => {
        setVerificationResult({
          verified: res.verified,
          message: res.message,
          checked: true,
        });
      });
    } else {
      setVerificationResult({
        verified: false,
        message: decoded.error || 'Invalid token structure',
        checked: true,
      });
    }
  }, [encodedToken, secretKey]);

  // Handler to generate new signed token when user edits decoded JSON or secret
  const handleRegenerateToken = async () => {
    try {
      const h = JSON.parse(headerJson);
      const p = JSON.parse(payloadJson);
      const newSigned = await signHs256(h, p, secretKey);
      setEncodedToken(newSigned);
    } catch (e: any) {
      alert(`JSON Parse Error: ${e.message}`);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Extract expiration & issued-at metadata
  let parsedPayload: any = null;
  try {
    parsedPayload = JSON.parse(payloadJson);
  } catch {
    parsedPayload = null;
  }

  const expInfo = formatUnixTimestamp(parsedPayload?.exp);
  const iatInfo = formatUnixTimestamp(parsedPayload?.iat);

  const parts = encodedToken.split('.');
  const partHeader = parts[0] || '';
  const partPayload = parts[1] || '';
  const partSignature = parts[2] || '';

  // Preset loaders
  const loadPreset = async (type: 'active' | 'expired' | 'clerk') => {
    if (type === 'active') {
      const now = Math.floor(Date.now() / 1000);
      const p = {
        sub: 'usr_active_982',
        email: 'developer@acme.com',
        role: 'engineer',
        team: 'platform-infrastructure',
        iat: now,
        exp: now + 86400 * 7,
        iss: 'https://auth0.acme.com/',
        aud: 'https://api.acme.com',
      };
      const signed = await signHs256(defaultHeader, p, secretKey);
      setEncodedToken(signed);
    } else if (type === 'expired') {
      const now = Math.floor(Date.now() / 1000);
      const p = {
        sub: 'usr_expired_110',
        email: 'logged_out@example.org',
        role: 'user',
        iat: now - 86400 * 30,
        exp: now - 86400 * 5, // expired 5 days ago
        iss: 'https://clerk.example.com',
      };
      const signed = await signHs256(defaultHeader, p, secretKey);
      setEncodedToken(signed);
    } else if (type === 'clerk') {
      const now = Math.floor(Date.now() / 1000);
      const p = {
        sub: 'user_2N9xL...clerk',
        first_name: 'Test',
        last_name: 'User',
        email: 'user@example.com',
        org_id: 'org_enterprise_99',
        org_role: 'org:admin',
        org_permissions: ['org:billing:manage', 'org:members:invite'],
        iat: now - 120,
        exp: now + 3600,
        iss: 'https://clerk.auth.provider',
      };
      const signed = await signHs256(defaultHeader, p, 'clerk-jwt-secret-xyz');
      setSecretKey('clerk-jwt-secret-xyz');
      setEncodedToken(signed);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info & Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            JWT Debugger & Signature Verifier
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Zero-latency HMAC-SHA256 signature verification, claims inspector, and instant token generator.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs text-slate-400 font-medium">Quick Presets:</span>
          <button
            id="btn-jwt-preset-active"
            onClick={() => loadPreset('active')}
            className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition"
          >
            Active 7-Day Token
          </button>
          <button
            id="btn-jwt-preset-expired"
            onClick={() => loadPreset('expired')}
            className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-rose-300 border border-rose-900/40 transition"
          >
            Expired Token
          </button>
          <button
            id="btn-jwt-preset-clerk"
            onClick={() => loadPreset('clerk')}
            className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-indigo-900/40 transition"
          >
            RBAC Clerk/Auth0
          </button>
        </div>
      </div>

      {/* Main Grid: Left Encoded, Right Decoded */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Encoded Token (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="encoded-jwt-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Encoded JWT
              </label>
              <div className="flex items-center space-x-2">
                <button
                  id="btn-copy-bearer"
                  onClick={() => copyToClipboard(`Authorization: Bearer ${encodedToken}`, 'bearer')}
                  className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1"
                  title="Copy HTTP Authorization Header"
                >
                  {copiedKey === 'bearer' ? <Check className="w-3 h-3 text-emerald-400" /> : <Terminal className="w-3 h-3" />}
                  <span>{copiedKey === 'bearer' ? 'Copied' : 'Copy Bearer'}</span>
                </button>
                <button
                  id="btn-copy-jwt"
                  onClick={() => copyToClipboard(encodedToken, 'jwt')}
                  className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1"
                >
                  {copiedKey === 'jwt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'jwt' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Visual Color-coded Token Preview */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs break-all leading-relaxed select-all mb-3 max-h-48 overflow-y-auto">
              <span className="text-rose-400 font-semibold" title="Header (Algorithm & Token Type)">
                {partHeader || '...'}
              </span>
              <span className="text-slate-500">.</span>
              <span className="text-purple-400 font-semibold" title="Payload (Claims & User Data)">
                {partPayload || '...'}
              </span>
              <span className="text-slate-500">.</span>
              <span className="text-cyan-400 font-semibold" title="Signature">
                {partSignature || '...'}
              </span>
            </div>

            {/* Editable Raw Input */}
            <div className="flex-1 flex flex-col">
              <div className="text-[11px] text-slate-500 mb-1 flex items-center justify-between">
                <span>Paste or edit raw token string:</span>
                <span className="font-mono">{encodedToken.length} chars</span>
              </div>
              <textarea
                id="encoded-jwt-input"
                rows={7}
                value={encodedToken}
                onChange={(e) => setEncodedToken(e.target.value.trim())}
                placeholder="Paste JWT here (header.payload.signature)..."
                className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Header</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Payload</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>Signature</span>
                </span>
              </div>
              <span className="text-slate-500">RFC 7519</span>
            </div>
          </div>
        </div>

        {/* Right Column: Decoded Sections & Signature Verifier (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Decoded Header */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                  Header (Algorithm & Token Type)
                </h3>
              </div>
              <button
                id="btn-copy-header"
                onClick={() => copyToClipboard(headerJson, 'header')}
                className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center space-x-1"
              >
                {copiedKey === 'header' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <textarea
              id="jwt-header-textarea"
              rows={3}
              value={headerJson}
              onChange={(e) => setHeaderJson(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-rose-300 focus:outline-none focus:border-rose-500/50"
            />
          </div>

          {/* Decoded Payload */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                  Payload (Claims & Data)
                </h3>
              </div>
              <button
                id="btn-copy-payload"
                onClick={() => copyToClipboard(payloadJson, 'payload')}
                className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center space-x-1"
              >
                {copiedKey === 'payload' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>

            {/* Expiration Status Bar */}
            {parsedPayload?.exp && (
              <div
                className={`mb-3 px-3 py-2 rounded-lg border text-xs flex items-center justify-between ${
                  expInfo.status === 'active'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">
                    {expInfo.status === 'active' ? 'Token Active' : 'Token Expired'}
                  </span>
                  <span className="text-slate-400">({expInfo.relative})</span>
                </div>
                <span className="font-mono text-[11px] text-slate-300">{expInfo.formatted}</span>
              </div>
            )}

            <textarea
              id="jwt-payload-textarea"
              rows={9}
              value={payloadJson}
              onChange={(e) => setPayloadJson(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-purple-200 focus:outline-none focus:border-purple-500/50"
            />

            {/* Quick Claims Inspector Pills */}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              {parsedPayload?.sub && (
                <div className="px-2 py-1 rounded bg-slate-800 border border-slate-700/60 text-slate-300">
                  <span className="text-slate-500">sub:</span> <span className="font-mono text-purple-300">{parsedPayload.sub}</span>
                </div>
              )}
              {parsedPayload?.role && (
                <div className="px-2 py-1 rounded bg-slate-800 border border-slate-700/60 text-slate-300">
                  <span className="text-slate-500">role:</span> <span className="font-mono text-amber-300">{parsedPayload.role}</span>
                </div>
              )}
              {parsedPayload?.iss && (
                <div className="px-2 py-1 rounded bg-slate-800 border border-slate-700/60 text-slate-300">
                  <span className="text-slate-500">iss:</span> <span className="font-mono text-blue-300">{parsedPayload.iss}</span>
                </div>
              )}
              {iatInfo.status !== 'none' && (
                <div className="px-2 py-1 rounded bg-slate-800 border border-slate-700/60 text-slate-300">
                  <span className="text-slate-500">issued:</span> <span className="font-mono">{iatInfo.relative}</span>
                </div>
              )}
            </div>
          </div>

          {/* Signature Verification & Key Generator */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Verify & Sign Signature (HMAC-SHA256)
                </h3>
              </div>

              {/* Status Badge */}
              {verificationResult.checked && (
                <div
                  className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 border ${
                    verificationResult.verified
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {verificationResult.verified ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>{verificationResult.verified ? 'Signature Verified' : 'Invalid Signature'}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                  <span>Secret Key / Salt (used for HMAC-SHA256):</span>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-slate-400 hover:text-slate-200 text-xs flex items-center space-x-1"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSecret ? 'Hide' : 'Show'}</span>
                  </button>
                </label>
                <input
                  id="jwt-secret-input"
                  type={showSecret ? 'text' : 'password'}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter secret key..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-cyan-200 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-500 flex items-center space-x-1">
                  <Info className="w-3 h-3" />
                  <span>Never leaves your browser (verified using Web Crypto API)</span>
                </p>

                <button
                  id="btn-regenerate-jwt"
                  onClick={handleRegenerateToken}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center space-x-1.5 transition shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Update & Sign Token</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
