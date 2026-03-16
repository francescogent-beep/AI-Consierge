import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { Chat } from '../types';

interface ChatViewProps {
  selectedChat: Chat | undefined;
  isTyping: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({ selectedChat, isTyping }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 bg-[#F8F9FA]">
      {selectedChat ? (
        <>
          <AnimatePresence mode="popLayout">
            {selectedChat.messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 rounded-tl-none'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <div className={`mt-2 text-[10px] ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  </div>
                  <span className="text-xs text-slate-400 italic">Thinking...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="h-20" /> {/* Spacer for input */}
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-slate-400">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="font-bold text-slate-800 mb-1">Select a conversation</h3>
          <p className="text-sm">Choose a chat from the sidebar to start organizing</p>
        </div>
      )}
    </div>
  );
};
