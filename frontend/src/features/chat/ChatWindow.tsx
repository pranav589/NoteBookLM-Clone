import React, { useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isQuerying) return;
    sendQuery(inputQuery);
    setInputQuery("");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FCFAF6]/60">
      <ScrollArea className="flex-1 px-6 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-stone-400 text-xs py-10 font-medium leading-relaxed max-w-sm mx-auto text-center">
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
      </ScrollArea>

      {/* Input Bar */}
      <div className="p-5 bg-transparent border-t-0 flex justify-center pb-6">
        <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-3xl bg-white/80 backdrop-blur-md border border-border shadow-premium rounded-2xl p-2 items-center focus-within:border-amber-450 focus-within:ring-2 focus-within:ring-amber-200 transition-all duration-300">
          <Input
            placeholder={
              !hasCompletedSources
                ? "Upload and index a source on the left to start..."
                : "Ask a question about your sources..."
            }
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isQuerying || !hasCompletedSources}
            className="flex-1 bg-transparent border-0 focus-visible:ring-0 shadow-none text-stone-850 placeholder:text-stone-450 h-10.5 text-xs md:text-sm font-semibold pl-3"
          />
          <Button
            type="submit"
            disabled={isQuerying || !inputQuery.trim() || !hasCompletedSources}
            className="bg-primary hover:bg-primary/95 text-white font-semibold px-4.5 h-10 cursor-pointer rounded-xl shadow-sm shrink-0 transition-all duration-200"
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
