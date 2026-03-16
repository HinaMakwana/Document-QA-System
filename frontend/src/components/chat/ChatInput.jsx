import React, { useRef, useEffect } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';

const ChatInput = ({ input, setInput, onSend, loading, onToggleDocs, showDocs, selectedDocsCount }) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend(e);
    }
  };

  return (
    <div className="px-6 pb-6 bg-transparent relative z-20">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto bg-slate-800/60 rounded-2xl p-2 pr-3 flex items-end focus-within:ring-2 focus-within:ring-primary-500/50 transition-all duration-200"
      >
        <button
            type="button"
            onClick={onToggleDocs}
            className={`w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0 relative mb-0.5 ${
                showDocs
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
        >
            <Paperclip size={18} />
            {selectedDocsCount > 0 && !showDocs && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-800">
                    {selectedDocsCount}
                </span>
            )}
        </button>
        <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedDocsCount > 0 ? `Ask about ${selectedDocsCount} active documents...` : "Message Knowledge Assistant..."}
            className="flex-1 bg-transparent border-none text-white px-3 py-2.5 min-h-[44px] max-h-48 focus:ring-0 outline-none resize-none text-[15px] placeholder-slate-500"
            rows={1}
        />
        <button
            type="submit"
            disabled={!input.trim() || loading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 mb-0.5 ${
                input.trim() && !loading
                ? 'bg-primary-600 text-white shadow-md hover:bg-primary-500'
                : 'bg-transparent text-slate-500 cursor-not-allowed'
            }`}
        >
            {loading ? <Loader2 size={18} className="animate-spin text-primary-500" /> : <Send size={18} className="translate-x-[1px]" />}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
