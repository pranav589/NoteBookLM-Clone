import React from "react";
import { Clock, X, Video, FileText } from "lucide-react";
import type { CitationSource } from "../../lib/notebook-types";
import { Badge } from "@/components/ui/badge";

interface CitationCardProps {
  viewingCitation: CitationSource;
  onClose: () => void;
}

export function CitationCard({ viewingCitation, onClose }: CitationCardProps) {
  const getYoutubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4 bg-card">
      <div className="border-b border-border pb-3 flex items-center justify-between flex-shrink-0">
        <div className="min-w-0 pr-4">
          <h4
            className="font-bold text-sm text-stone-850 truncate"
            title={viewingCitation.source}
          >
            {viewingCitation.source}
          </h4>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="secondary" className="text-[9px] uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-md">
              {viewingCitation.metadata?.sourceType}
            </Badge>
            {viewingCitation.metadata?.pageNumber && (
              <span className="text-[10px] text-stone-500 font-semibold">
                Page {viewingCitation.metadata.pageNumber}
              </span>
            )}
            {viewingCitation.metadata?.timestamp !== undefined && (
              <span className="text-[10px] text-stone-500 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {new Date(viewingCitation.metadata.timestamp * 1000)
                  .toISOString()
                  .substr(14, 5)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 flex-shrink-0 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* YouTube Player Embed */}
      {viewingCitation.metadata?.sourceType === "youtube" && (
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-stone-900 border border-border flex-shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <iframe
            src={`https://www.youtube.com/embed/${getYoutubeVideoId(
              viewingCitation.metadata.url || ""
            )}?start=${viewingCitation.metadata.timestamp || 0}&autoplay=1`}
            title="YouTube source context"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      )}

      {/* Document Text Content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-stone-50/40 border border-border rounded-2xl p-4">
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2.5 block border-b border-stone-100 pb-2">
          Cited Context Excerpt
        </span>
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs text-stone-800 leading-relaxed whitespace-pre-wrap bg-white p-3.5 border border-border/80 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] font-medium">
            {viewingCitation.text}
          </p>
        </div>
      </div>
    </div>
  );
}
export default CitationCard;
