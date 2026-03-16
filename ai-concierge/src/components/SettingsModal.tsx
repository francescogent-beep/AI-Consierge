import * as React from 'react';
import { motion } from 'motion/react';
import { X, Settings, Copy, CheckCircle2, Zap, Loader2 } from 'lucide-react';
import { AIProvider } from '../types';
import { PROVIDER_ICONS } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectedProviders: Record<AIProvider, boolean>;
  connectingProvider: AIProvider | null;
  handleConnectProvider: (p: AIProvider) => void;
  apiKeys: Record<AIProvider, string>;
  setApiKeys: (keys: Record<AIProvider, string>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  connectedProviders,
  connectingProvider,
  handleConnectProvider,
  apiKeys,
  setApiKeys
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-xl">Settings & Integrations</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <h4 className="text-sm font-bold text-indigo-900 mb-1">OAuth Configuration</h4>
            <p className="text-[11px] text-indigo-700 mb-3">
              Add this Redirect URI to your provider's dashboard (OpenAI, Anthropic, etc.) to enable real logins.
            </p>
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-indigo-200">
              <code className="text-[9px] flex-1 break-all font-mono text-slate-600">
                {window.location.origin}/auth/callback
              </code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/auth/callback`);
                  alert("Copied to clipboard!");
                }}
                className="p-1.5 hover:bg-indigo-50 rounded-md text-indigo-600 transition-colors"
                title="Copy to clipboard"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-4">Platform Connections</h4>
            <p className="text-xs text-slate-500 mb-4">
              Connect your AI accounts to sync conversations and data.
            </p>
            <div className="space-y-3">
              {(['ChatGPT', 'Claude', 'Gemini', 'Perplexity'] as AIProvider[]).map((p) => (
                <div key={p} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      {PROVIDER_ICONS[p]}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{p}</div>
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${connectedProviders[p] ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          {connectedProviders[p] ? 'Connected' : 'Not Linked'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleConnectProvider(p)}
                    disabled={connectingProvider === p}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                      connectedProviders[p] 
                        ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    }`}
                  >
                    {connectingProvider === p ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      connectedProviders[p] ? 'Disconnect' : 'Log In'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-4">Advanced: API Keys</h4>
            <div className="space-y-3">
              {(['ChatGPT', 'Claude', 'Gemini', 'Perplexity'] as AIProvider[]).map((p) => (
                <div key={p} className="flex items-center gap-4">
                  <div className="w-24 shrink-0 flex items-center gap-2">
                    {PROVIDER_ICONS[p]}
                    <span className="text-xs font-semibold">{p}</span>
                  </div>
                  <div className="flex-1 relative">
                    <input 
                      type="password"
                      placeholder={`Enter ${p} API Key`}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] focus:ring-2 focus:ring-indigo-500/20 outline-none pr-16"
                      value={apiKeys[p]}
                      onChange={(e) => setApiKeys({ ...apiKeys, [p]: e.target.value })}
                    />
                    {apiKeys[p] && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-bold">
                        <CheckCircle2 className="w-2 h-2" />
                        Linked
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <h4 className="text-xs font-bold text-indigo-800 mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" /> How it works
            </h4>
            <p className="text-[11px] text-indigo-700 leading-relaxed">
              Once keys are provided, AI Concierge uses official SDKs to fetch your conversation history and send new messages directly to the AI providers. Your data never touches our servers.
            </p>
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
};
