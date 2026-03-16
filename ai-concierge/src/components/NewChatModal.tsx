import * as React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { AIProvider } from '../types';
import { PROVIDER_ICONS } from '../constants';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  setTitle: (title: string) => void;
  provider: AIProvider;
  setProvider: (provider: AIProvider) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  title,
  setTitle,
  provider,
  setProvider,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-xl">New Conversation</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Conversation Title
            </label>
            <input 
              autoFocus
              type="text"
              placeholder="e.g. Project Brainstorming"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Select AI Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['ChatGPT', 'Claude', 'Gemini', 'Perplexity'] as AIProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${
                    provider === p 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/10' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'
                  }`}
                >
                  {PROVIDER_ICONS[p]}
                  <span className="font-medium">{p}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="pt-2">
            <button 
              type="submit"
              disabled={!title.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200"
            >
              Start Chatting
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
