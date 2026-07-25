import React, { useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import type { Message, CitationSource } from "../../lib/notebook-types";

interface ChatWindowProps {
  messages: Message[];
  isQuerying: boolean;
  sendQuery: (queryText: string) => void;
  selectedMessageId: string | null;
  setSelectedMessageId: (id: string | null) => void;
  onSelectCitation: (citation: CitationSource) => void;
  hasCompletedSources: boolean;
}

export function ChatWindow({
  messages,
  isQuerying,
  sendQuery,
  selectedMessageId,
  setSelectedMessageId,
  onSelectCitation,
  hasCompletedSources,
}: ChatWindowProps) {
  const [inputQuery, setInputQuery] = useState("");
  const quickChips = [
    "Synthesize Key Points",
    "Draft Study Syllabus",
    "Generate Flashcards"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isQuerying) return;
    sendQuery(inputQuery);
    setInputQuery("");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground/60 text-xs py-10 font-semibold leading-relaxed max-w-sm mx-auto text-center">
            Your notebook assistant is ready. Upload source documents and ask any clarifying questions about their contents.
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto pb-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                isSelected={selectedMessageId === msg.id}
                onClick={() => setSelectedMessageId(msg.id)}
                onSelectCitation={onSelectCitation}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input Bar with Quick Chips */}
      <div className="p-5 bg-transparent border-t-0 flex flex-col items-center gap-2 pb-6">
        {/* Suggestion Chips */}
        {hasCompletedSources && (
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 justify-center max-w-3xl w-full scrollbar-none">
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  if (hasCompletedSources && !isQuerying) {
                    setInputQuery(chip);
                  }
                }}
                disabled={!hasCompletedSources || isQuerying}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground bg-card hover:bg-foreground/5 border border-border px-3.5 py-1 rounded-full cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-3xl bg-white dark:bg-stone-900 border border-border shadow-level2 rounded-full p-2 items-center focus-within:border-foreground/30 transition-all duration-300">
          <Input
            placeholder={
              !hasCompletedSources
                ? "Upload and index a source on the left to start..."
                : "Ask a question about your sources..."
            }
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isQuerying || !hasCompletedSources}
            className="flex-1 bg-transparent border-0 focus-visible:ring-0 shadow-none text-foreground placeholder:text-muted-foreground/60 h-10 text-xs md:text-sm font-semibold pl-4"
          />
          <Button
            type="submit"
            disabled={isQuerying || !inputQuery.trim() || !hasCompletedSources}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-10 h-10 rounded-full cursor-pointer shrink-0 transition-all duration-200 flex items-center justify-center p-0"
          >
            {isQuerying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4.5 h-4.5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
export default ChatWindow;
