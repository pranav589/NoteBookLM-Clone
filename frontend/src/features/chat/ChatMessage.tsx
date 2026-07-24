import React from "react";
import { User, Bot, Loader2, AlertCircle } from "lucide-react";
import type { Message, CitationSource } from "../../lib/notebook-types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatMessageProps {
  msg: Message;
  isSelected: boolean;
  onClick: () => void;
  onSelectCitation: (citation: CitationSource) => void;
}

export function ChatMessage({
  msg,
  isSelected,
  onClick,
  onSelectCitation,
}: ChatMessageProps) {
  const renderResponseWithCitations = (
    content: string,
    responseSources?: CitationSource[]
  ) => {
    if (!responseSources || responseSources.length === 0) {
      return (
        <p className="mt-1.5 text-xs md:text-sm text-stone-850 leading-relaxed whitespace-pre-wrap font-medium">
          {content}
        </p>
      );
    }

    const parts = content.split(/(\[Source\s+\d+\])/gi);
    return (
      <p className="mt-1.5 text-xs md:text-sm text-stone-850 leading-relaxed whitespace-pre-wrap font-medium">
        {parts.map((part, index) => {
          const match = part.match(/\[Source\s+(\d+)\]/i);
          if (match) {
            const citeIndex = parseInt(match[1], 10);
            const matchedSource = responseSources.find((s) => s.index === citeIndex);

            if (matchedSource) {
              return (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCitation(matchedSource);
                  }}
                  className="mx-1 inline-flex items-center justify-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 text-[10px] font-bold border border-amber-200/50 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer"
                >
                  Source {citeIndex}
                </button>
              );
            }
          }
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
  };

  const isUser = msg.role === "user";

  return (
    <div
      onClick={onClick}
      className={`flex gap-4 p-5 rounded-2xl cursor-pointer transition-all duration-300 border 
        
      } ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className="flex-shrink-0">
        {isUser ? (
          <Avatar size="sm" className="bg-amber-100 border border-amber-250 text-amber-700 w-9 h-9">
            <AvatarFallback className="bg-amber-50 font-bold text-xs"><User className="w-4 h-4" /></AvatarFallback>
          </Avatar>
        ) : (
          <Avatar size="sm" className="bg-stone-100 border border-stone-250 text-stone-700 w-9 h-9">
            <AvatarFallback className="bg-stone-50 font-bold text-xs"><Bot className="w-4 h-4" /></AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className={`flex-1 min-w-0 ${isUser ? "text-right" : "text-left"}`}>
        <div className={`flex items-center gap-2 ${isUser ? "justify-end" : "justify-between"} mb-1`}>
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
            {isUser ? "You" : "Notebook Assistant"}
          </span>
          {!isUser && msg.status === "pending" && (
            <Badge variant="secondary" className="text-[9px] font-bold bg-amber-50 text-amber-700 animate-pulse border border-amber-200/40 py-0.5 px-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 text-primary" />
              Reviewing sources...
            </Badge>
          )}
          {!isUser && msg.status === "failed" && (
            <Badge variant="destructive" className="text-[9px] font-bold py-0.5 px-2">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              Error
            </Badge>
          )}
        </div>
        
        {isUser ? (
          <div className="mt-1.5 inline-block text-stone-900 bg-amber-50/70 p-4.5 rounded-2xl rounded-tr-none text-left border border-amber-200/45 text-xs md:text-sm leading-relaxed font-semibold max-w-xl shadow-[0_1px_2px_rgba(0,0,0,0.015)]">
            {msg.content}
          </div>
        ) : msg.status === "pending" ? (
          <div className="space-y-2.5 mt-2.5 max-w-2xl">
            <Skeleton className="h-4 w-full bg-stone-200/60" />
            <Skeleton className="h-4 w-11/12 bg-stone-200/60" />
            <Skeleton className="h-4 w-4/5 bg-stone-200/60" />
          </div>
        ) : (
          <div className="mt-1 text-stone-850 leading-relaxed font-semibold text-xs md:text-sm max-w-2xl">
            {renderResponseWithCitations(msg.content, msg.sources)}
          </div>
        )}
      </div>
    </div>
  );
}
export default ChatMessage;
