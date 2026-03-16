import * as React from 'react';
import { motion } from 'motion/react';
import { Search, MessageSquare, X, Plus, Bookmark } from 'lucide-react';
import { Chat, AIProvider } from '../types';
import { PROVIDER_ICONS } from '../constants';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilter: AIProvider | 'All';
  setActiveFilter: (filter: AIProvider | 'All') => void;
  connectedProviders: Record<AIProvider, boolean>;
  filteredChats: Chat[];
  selectedChatId: string | null;
  setSelectedChatId: (id: string) => void;
  setIsNewChatModalOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
  connectedProviders,
  filteredChats,
  selectedChatId,
  setSelectedChatId,
  setIsNewChatModalOpen
}) => {
  return (
    <motion.aside 
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed lg:relative inset-y-0 left-0 w-[280px] sm:w-[320px] bg-white border-r border-slate-200 flex flex-col h-full z-50 lg:z-20 shadow-2xl lg:shadow-none"
    >
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">AI Organizer</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="p-1.5 hover:bg-slate-100 rounded-md lg:hidden"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {['All', 'ChatGPT', 'Claude', 'Gemini', 'Perplexity'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === filter 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter !== 'All' && (
                <div className={`w-1.5 h-1.5 rounded-full ${connectedProviders[filter as AIProvider] ? 'bg-emerald-400' : 'bg-slate-300'}`} />
              )}
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Search className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">No chats found</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={`w-full text-left p-3 rounded-xl transition-all group relative ${
                selectedChatId === chat.id 
                  ? 'bg-indigo-50 border-indigo-100' 
                  : 'hover:bg-slate-50 border-transparent'
              } border`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 overflow-hidden">
                  {PROVIDER_ICONS[chat.provider]}
                  <span className="font-semibold text-sm truncate">{chat.title}</span>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                  {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1 pr-4">
                {chat.lastMessage}
              </p>
              {chat.isBookmarked && (
                <Bookmark className="absolute right-2 bottom-3 w-3 h-3 text-indigo-400 fill-indigo-400" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={() => setIsNewChatModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-indigo-200"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
      </div>
    </motion.aside>
  );
};
