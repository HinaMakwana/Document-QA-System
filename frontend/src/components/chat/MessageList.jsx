import React, { useRef, useEffect } from 'react';
import { Loader2, Sparkles, Brain, Search, Info } from 'lucide-react';
import MessageItem from './MessageItem';

const MessageList = ({ messages, loading, streamingMessage, convLoading, user, onQuickPrompt }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (convLoading) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-14 h-14 glass-panel rounded-2xl flex items-center justify-center mb-4 animate-pulse border-white/10">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase opacity-70">Preparing your assistant...</p>
        </div>
    );
  }

  if (messages.length === 0 && !streamingMessage) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto py-12 px-6">
            <div className="w-16 h-16 bg-primary-600/10 rounded-2xl flex items-center justify-center mb-6 text-primary-500 ring-1 ring-primary-500/20">
                <Brain size={32} />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-3 text-center">
                How can I help you today, {user?.username || 'there'}?
            </h1>
            <p className="text-slate-400 text-sm text-center mb-10 max-w-sm">
                I can summarize documents, extract insights, and answer questions based on your knowledge base.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                <button 
                     onClick={() => onQuickPrompt("Summarize all documents in my knowledge base.")}
                     className="p-4 rounded-xl hover:bg-white/5 transition-all text-left border border-white/5 active:scale-95 group text-slate-300 hover:text-white"
                >
                    <div className="flex items-center space-x-2 text-sm font-medium mb-1 group-hover:text-primary-400 transition-colors">
                        <Sparkles size={16} />
                        <span>Executive Summary</span>
                    </div>
                    <p className="text-xs text-slate-500">Synthesize key themes and risks.</p>
                </button>
                <button 
                     onClick={() => onQuickPrompt("What are the key technical findings mentioned in the docs?")}
                     className="p-4 rounded-xl hover:bg-white/5 transition-all text-left border border-white/5 active:scale-95 group text-slate-300 hover:text-white"
                >
                    <div className="flex items-center space-x-2 text-sm font-medium mb-1 group-hover:text-primary-400 transition-colors">
                        <Search size={16} />
                        <span>Technical Insights</span>
                    </div>
                    <p className="text-xs text-slate-500">Extract contextual data.</p>
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-4 lg:p-8 relative scroll-smooth message-list-container">
        <div className="max-w-3xl mx-auto pb-6">
            {messages.map((msg, i) => (
                <MessageItem key={i} message={msg} />
            ))}
            {streamingMessage && (
                <div className="flex w-full mb-6 justify-start animate-fade-in">
                    <div className="max-w-[85%] lg:max-w-[75%] flex flex-row">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 mr-4 flex items-center justify-center mt-1">
                            <Loader2 size={16} className="text-white animate-spin" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="text-slate-200 py-2 transition-all duration-200">
                                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                                    {streamingMessage}
                                    <span className="inline-block w-1.5 h-4 bg-primary-500 ml-1.5 align-middle animate-pulse rounded-full"></span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
        </div>
    </div>
  );
};

export default MessageList;
