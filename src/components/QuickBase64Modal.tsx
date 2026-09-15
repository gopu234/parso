import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Binary, RefreshCw, Hash } from 'lucide-react';

interface QuickBase64ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickBase64Modal: React.FC<QuickBase64ModalProps> = ({ isOpen, onClose }) => {
  const [inputText, setInputText] = useState<string>('Hello Parso! 🚀');
  const [base64Output, setBase64Output] = useState<string>('');
  const [urlEncoded, setUrlEncoded] = useState<string>('');
  const [hexOutput, setHexOutput] = useState<string>('');
  const [sha256Hash, setSha256Hash] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    try {
      // Base64 encode with Unicode support
      const bytes = new TextEncoder().encode(inputText);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
      }
      setBase64Output(btoa(bin));

      // Hex
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
      setHexOutput(hex);

      // URL encode
      setUrlEncoded(encodeURIComponent(inputText));

      // SHA-256
      if (window.crypto?.subtle) {
        window.crypto.subtle.digest('SHA-256', bytes).then((hashBuffer) => {
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
          setSha256Hash(hashHex);
        });
      }
    } catch {
      // ignore
    }
  }, [inputText, isOpen]);

  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const decodeBase64Input = (b64: string) => {
    try {
      const raw = atob(b64);
      const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      setInputText(decoded);
    } catch {
      alert('Invalid Base64 string');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Binary className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-100">Quick Base64 / URL / Hash Converter</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Input Plaintext (or type Base64 to decode)
          </label>
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
          />
        </div>

        <div className="space-y-3 text-xs">
          {/* Base64 */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Base64 Encoded:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => decodeBase64Input(base64Output)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  Decode Back
                </button>
                <button
                  onClick={() => copy(base64Output, 'b64')}
                  className="text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  {copiedField === 'b64' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'b64' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <div className="font-mono text-indigo-300 break-all">{base64Output}</div>
          </div>

          {/* URL Encoded */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">URL Encoded (Percent-encoded):</span>
              <button
                onClick={() => copy(urlEncoded, 'url')}
                className="text-slate-400 hover:text-white flex items-center space-x-1"
              >
                {copiedField === 'url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'url' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="font-mono text-emerald-300 break-all">{urlEncoded}</div>
          </div>

          {/* SHA-256 Hash */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">SHA-256 Hash:</span>
              <button
                onClick={() => copy(sha256Hash, 'sha')}
                className="text-slate-400 hover:text-white flex items-center space-x-1"
              >
                {copiedField === 'sha' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'sha' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="font-mono text-amber-300 break-all">{sha256Hash}</div>
          </div>

          {/* Hex */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Hex Bytes:</span>
              <button
                onClick={() => copy(hexOutput, 'hex')}
                className="text-slate-400 hover:text-white flex items-center space-x-1"
              >
                {copiedField === 'hex' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'hex' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="font-mono text-slate-300 break-all">{hexOutput}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
