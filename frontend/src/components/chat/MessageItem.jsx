import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React from 'react';
import { Brain, FileText, AlertCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const MessageItem = ({ message }) => {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex w-full mb-6 ${isAssistant ? 'justify-start' : 'justify-end animate-fade-in'}`}>
      <div className={`max-w-[85%] lg:max-w-[75%] flex ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
            isAssistant
                ? message.is_error
                    ? 'bg-red-500/10 text-red-500 mr-4'
                    : 'bg-primary-600 mr-4'
                : 'hidden'
        }`}>
          {isAssistant && (
            message.is_error ? <AlertCircle size={16} /> : <Brain size={16} className="text-white" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className={`transition-all duration-200 ${
            isAssistant
              ? message.is_error
                ? 'bg-red-500/5 text-red-400 p-4 rounded-xl border border-red-500/20'
                : 'text-slate-200 py-1'
              : 'bg-slate-800/80 border border-white/5 text-slate-100 px-5 py-2.5 rounded-3xl rounded-br-sm shadow-sm'
          }`}>
            {isAssistant ? (
                <div className="markdown-body text-[15px] leading-relaxed space-y-4">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-3 text-white" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-white" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2 text-primary-300" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="text-slate-300" {...props} />,
                            a: ({node, ...props}) => <a className="text-primary-400 hover:text-primary-300 underline underline-offset-2" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                            code: ({inline, ...props}) => 
                                inline 
                                ? <code className="bg-slate-800 text-primary-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                : <div className="bg-slate-900 rounded-lg p-4 mb-4 overflow-x-auto border border-white/5"><code className="text-sm font-mono text-slate-300" {...props} /></div>,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary-500 pl-4 py-1 italic text-slate-400 mb-4 bg-primary-500/5 rounded-r-lg" {...props} />,
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                </div>
            ) : (
                <p className="whitespace-pre-wrap leading-relaxed text-[15px] font-medium">
                    {message.content}
                </p>
            )}

            {isAssistant && message.citations?.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Sources</span>
                <div className="flex flex-wrap gap-2">
                  {message.citations.map((cite, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] bg-slate-900 text-primary-400 px-3 py-1.5 rounded-lg border border-white/5 flex items-center cursor-help transition-all active:scale-95 hover:bg-white/5"
                      title={cite.content_preview}
                    >
                      <FileText size={12} className="mr-1.5 opacity-70" />
                      <span className="truncate max-w-[150px] font-medium">{cite.document_title}</span>
                      <span className="mx-1.5 text-slate-600">•</span>
                      <span className="opacity-80">p.{cite.page_number}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className={`flex items-center mt-1.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
             <span className="text-[10px] text-slate-500 font-medium opacity-60">
                {format(new Date(message.created_at || Date.now()), 'h:mm a')}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
