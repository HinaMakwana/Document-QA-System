import React from 'react';
import { Plus, MessageSquare, X } from 'lucide-react';

const ChatSidebar = ({ 
    conversations, 
    currentConversation, 
    onLoadConversation, 
    onCreateConversation, 
    onDeleteConversation 
}) => {
  return (
    <div className="hidden md:flex flex-col w-64 border-r border-white/5 bg-slate-900/20 backdrop-blur-md">
        <div className="p-5 pt-8">
            <button
                onClick={onCreateConversation}
                className="w-full h-10 flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-all shadow-sm active:scale-95 group"
            >
                <Plus size={16} className="transition-transform group-hover:rotate-90 duration-300" />
                <span className="text-sm">New Chat</span>
            </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
            <div className="px-2 pt-2 pb-3">
                <h3 className="text-xs font-semibold text-slate-500">Recent</h3>
            </div>
            {conversations.length === 0 ? (
                <div className="px-3 py-4 text-center">
                    <p className="text-xs text-slate-600 font-medium">No history yet</p>
                </div>
            ) : (
                conversations.map(conv => (
                    <div
                        key={conv.id}
                        onClick={() => onLoadConversation(conv.id)}
                        className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                            currentConversation?.id === conv.id
                                ? 'bg-primary-600/10 text-primary-400'
                                : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <div className="flex items-center space-x-3 min-w-0">
                            <MessageSquare size={16} className={currentConversation?.id === conv.id ? 'text-primary-500' : 'opacity-70'} />
                            <span className="text-sm truncate font-medium">
                                {conv.title || 'Untitled Chat'}
                            </span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};

export default ChatSidebar;
