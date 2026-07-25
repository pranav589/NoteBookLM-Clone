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
        <p className="mt-1.5 text-xs md:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium">
          {content}
        </p>
      );
    }

    const parts = content.split(/(\[Source\s+\d+\])/gi);
    return (
      <p className="mt-1.5 text-xs md:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium">
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
                  className="mx-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-foreground hover:bg-accent hover:text-white dark:hover:bg-accent border border-border transition-all duration-200 text-[10px] font-bold cursor-pointer"
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
      className={`flex gap-4 p-5 rounded-[24px] cursor-pointer transition-all duration-250 border ${
        isSelected
          ? "border-accent bg-white dark:bg-stone-900 shadow-level1"
          : "border-border hover:border-foreground/20 bg-card/65"
      } ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className="flex-shrink-0">
        {isUser ? (
          <Avatar className="border border-border text-foreground w-9 h-9">
            <AvatarFallback className="bg-stone-100 dark:bg-stone-800 font-bold text-xs"><User className="w-4 h-4" /></AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="border border-border text-foreground w-9 h-9">
            <AvatarFallback className="bg-stone-100 dark:bg-stone-800 font-bold text-xs"><Bot className="w-4 h-4" /></AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className={`flex-1 min-w-0 ${isUser ? "text-right" : "text-left"}`}>
        <div className={`flex items-center gap-2 ${isUser ? "justify-end" : "justify-between"} mb-1`}>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {isUser ? "You" : "Assistant"}
          </span>
          {!isUser && msg.status === "pending" && (
            <Badge variant="secondary" className="text-[9px] font-bold bg-card text-foreground border border-border py-0.5 px-2 flex items-center gap-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin text-accent" />
              Reviewing sources...
            </Badge>
          )}
          {!isUser && msg.status === "failed" && (
            <Badge variant="destructive" className="text-[9px] font-bold py-0.5 px-2 rounded-full">
              <AlertCircle className="w-3 h-3 mr-1" />
              Error
            </Badge>
          )}
        </div>
        
        {isUser ? (
          <div className="mt-1.5 inline-block text-foreground bg-white dark:bg-stone-900 p-4 rounded-[20px] rounded-tr-none text-left border border-border text-xs md:text-sm leading-relaxed font-semibold max-w-xl shadow-xs">
            {msg.content}
          </div>
        ) : msg.status === "pending" ? (
          <div className="space-y-2.5 mt-2.5 max-w-2xl">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-11/12 rounded-full" />
            <Skeleton className="h-4 w-4/5 rounded-full" />
          </div>
        ) : (
          <div className="mt-1 text-foreground leading-relaxed font-semibold text-xs md:text-sm max-w-2xl">
            {renderResponseWithCitations(msg.content, msg.sources)}
          </div>
        )}
      </div>
    </div>
  );
}
export default ChatMessage;
