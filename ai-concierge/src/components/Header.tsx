import * as React from 'react';
import { Menu, Bookmark, Trash2, Settings, X } from 'lucide-react';
import { User } from 'firebase/auth';
import { Chat } from '../types';
import { PROVIDER_COLORS } from '../constants';

interface HeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  selectedChat: Chat | undefined;
  toggleBookmark: (id: string) => void;
  deleteChat: (id: string) => void;
  setIsSettingsOpen: (open: boolean) => void;
  user: User;
  logout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  selectedChat,
  toggleBookmark,
  deleteChat,
  setIsSettingsOpen,
  user,
  logout
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title={isSidebarOpen ? "Close Menu" : "Open Menu"}
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        {selectedChat && (
          <div className="flex items-center gap-3">
            <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${PROVIDER_COLORS[selectedChat.provider]}`}>
              {selectedChat.provider}
            </div>
            <h2 className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-md">
              {selectedChat.title}
            </h2>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {selectedChat && (
          <>
            <button 
              onClick={() => toggleBookmark(selectedChat.id)}
              className={`p-2 rounded-lg transition-colors ${selectedChat.isBookmarked ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <Bookmark className={`w-5 h-5 ${selectedChat.isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <button 
              onClick={() => deleteChat(selectedChat.id)}
              className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </>
        )}
        <div className="w-px h-6 bg-slate-200 mx-2" />
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs overflow-hidden">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
          ) : (
            user.displayName?.charAt(0) || 'U'
          )}
        </div>
        <button 
          onClick={logout}
          className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
          title="Sign Out"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
