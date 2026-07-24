import React from "react";
import { CheckCircle2, Loader2, AlertCircle, RefreshCw, Trash2, FileText, Globe, Video, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { SourceDoc } from "../../lib/notebook-types";
import { Badge } from "@/components/ui/badge";

interface SourceListProps {
  sources: SourceDoc[];
  onDeleteSource: (sourceId: string) => void;
  onReindexSource: (sourceId: string) => void;
}

export function SourceList({
  sources,
  onDeleteSource,
  onReindexSource,
}: SourceListProps) {
  const getSourceIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-3.5 h-3.5 text-amber-600" />;
      case "url":
        return <Globe className="w-3.5 h-3.5 text-amber-600" />;
      case "youtube":
        return <Video className="w-3.5 h-3.5 text-red-600" />;
      case "transcript":
        return <Clock className="w-3.5 h-3.5 text-stone-600" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <div className="p-4 bg-stone-50 border-b border-border/80 flex-shrink-0">
      <h3 className="text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-2.5">
        Knowledge Materials Source Documents
      </h3>
      {sources.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-6 text-center text-xs text-stone-450 bg-white/50">
          No sources ingested yet. Select "Add Source" to index PDFs, URLs, plain notes, or video files.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {sources.map((s) => (
            <Card key={s._id} className="w-48 bg-card border-border/80 text-stone-850 flex-shrink-0 rounded-2xl shadow-premium group hover:border-amber-450 hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300">
              <CardHeader className="p-3 pb-1.5 flex flex-row items-start justify-between space-y-0">
                <div className="min-w-0 pr-1 flex items-center gap-2 w-full">
                  <div className="bg-stone-50 border border-stone-200/60 p-2 rounded-xl shrink-0">
                    {getSourceIcon(s.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-[11.5px] font-bold truncate text-stone-800 tracking-wide" title={s.name}>
                      {s.name}
                    </CardTitle>
                    <span className="text-[8.5px] uppercase font-bold text-stone-400 block mt-0.5 tracking-wider">
                      {s.type}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3.5 pt-1.5 flex items-center justify-between">
                <div>
                  {s.status === "completed" && (
                    <Badge variant="secondary" className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 py-0.5 px-2 rounded-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Ready
                    </Badge>
                  )}
                  {s.status === "indexing" && (
                    <Badge variant="secondary" className="text-[8.5px] font-bold text-amber-700 bg-amber-50 border border-amber-100 py-0.5 px-2 rounded-md flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-500" />
                      Indexing
                    </Badge>
                  )}
                  {s.status === "failed" && (
                    <Badge variant="secondary" title={s.error} className="text-[8.5px] font-bold text-red-700 bg-red-50 border border-red-150 py-0.5 px-2 rounded-md flex items-center gap-1 cursor-help">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Failed
                    </Badge>
                  )}
                </div>

                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
                  <button
                    onClick={() => onReindexSource(s._id)}
                    title="Re-index Source"
                    className="text-stone-400 hover:text-primary p-0.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteSource(s._id)}
                    title="Delete Source"
                    className="text-stone-400 hover:text-destructive p-0.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
export default SourceList;
