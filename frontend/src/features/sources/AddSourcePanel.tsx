import React, { useState, useRef } from "react";
import { UploadCloud, Globe, Video, Clock, FileText, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SourceType } from "../../lib/notebook-types";

interface AddSourcePanelProps {
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  isUploading: boolean;
}

export function AddSourcePanel({
  onClose,
  onSubmit,
  isUploading,
}: AddSourcePanelProps) {
  const [sourceType, setSourceType] = useState<SourceType>("pdf");
  const [webUrl, setWebUrl] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [pastedTextName, setPastedTextName] = useState("");
  const [pastedTextContent, setPastedTextContent] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSubmit(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSubmit(e.target.files[0]);
    }
  };

  const handleFileSubmit = (file: File) => {
    const formData = new FormData();
    formData.append("type", sourceType);
    formData.append("file", file);
    onSubmit(formData);
  };

  const handleTextOrUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("type", sourceType);

    if (sourceType === "text") {
      formData.append("name", pastedTextName.trim());
      formData.append("text", pastedTextContent.trim());
    } else if (sourceType === "url") {
      formData.append("url", webUrl.trim());
    } else if (sourceType === "youtube") {
      formData.append("url", ytUrl.trim());
    }

    onSubmit(formData);
  };

  const formDataHasText = () => {
    return pastedTextName.trim().length > 0 || pastedTextContent.trim().length > 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-all">
        <div className="p-4 border-b border-border flex items-center justify-between bg-stone-50/50">
          <h3 className="font-bold text-stone-855 flex items-center gap-2 text-sm">
            <UploadCloud className="w-5 h-5 text-primary" />
            Ingest Source to Workspace
          </h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-2 block">
              Choose Source Type
            </label>
            <div className="grid grid-cols-5 gap-1.5 bg-stone-50 p-1.5 border border-border rounded-xl">
              {[
                { id: "pdf", label: "PDF", icon: FileText },
                { id: "text", label: "Text", icon: FileText },
                { id: "url", label: "Website", icon: Globe },
                { id: "youtube", label: "YouTube", icon: Video },
                { id: "transcript", label: "VTT File", icon: Clock },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSourceType(tab.id as SourceType)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all text-center cursor-pointer ${
                      sourceType === tab.id
                        ? "bg-white text-stone-900 font-semibold shadow-sm border border-amber-250/30"
                        : "text-stone-500 hover:text-stone-950 hover:bg-white/40 text-[10px]"
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1 text-primary/80" />
                    <span className="text-[9px] tracking-wide">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {sourceType === "pdf" || sourceType === "transcript" || (sourceType === "text" && !dragActive) ? (
            sourceType !== "text" || !formDataHasText() ? (
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                  Select {sourceType === "pdf" ? "PDF Document" : sourceType === "transcript" ? "WebVTT Subtitle file (.vtt)" : "Plain Text file (.txt)"}
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-250 ${
                    dragActive
                      ? "border-primary bg-amber-50/50"
                      : "border-stone-200 hover:border-amber-400 bg-stone-50/20"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={
                      sourceType === "pdf"
                        ? "application/pdf"
                        : sourceType === "transcript"
                        ? ".vtt"
                        : ".txt,text/plain"
                    }
                    className="hidden"
                  />
                  <UploadCloud className="w-12 h-12 text-stone-300 mb-2.5 group-hover:text-primary transition-colors" />
                  <p className="text-xs text-stone-750 font-semibold">
                    Drag & drop or <span className="text-primary hover:underline">browse</span> your file
                  </p>
                  <p className="text-[10px] text-stone-450 mt-1 leading-relaxed">
                    Document source is parsed and vector-indexed automatically
                  </p>
                </div>
              </div>
            ) : null
          ) : null}

          {sourceType === "text" && (
            <form onSubmit={handleTextOrUrlSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  Document Title / Name
                </label>
                <Input
                  placeholder="e.g. Project Notes, API Spec..."
                  value={pastedTextName}
                  onChange={(e) => setPastedTextName(e.target.value)}
                  required
                  className="bg-card border-border text-stone-850 text-xs rounded-lg focus-visible:ring-primary shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  Paste Text Content
                </label>
                <textarea
                  placeholder="Write or paste your custom notes here..."
                  value={pastedTextContent}
                  onChange={(e) => setPastedTextContent(e.target.value)}
                  required
                  rows={8}
                  className="w-full bg-card border border-border rounded-xl p-3 text-stone-850 placeholder:text-stone-400 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={isUploading}
                className="w-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs h-9 rounded-lg shadow-sm"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Ingest Plain Text"
                )}
              </Button>
            </form>
          )}

          {sourceType === "url" && (
            <form onSubmit={handleTextOrUrlSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  Website URL to Scrape
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com/article-path"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  required
                  className="bg-card border-border text-stone-850 text-xs rounded-lg focus-visible:ring-primary shadow-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={isUploading}
                className="w-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs h-9 rounded-lg shadow-sm"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Ingest Website URL"
                )}
              </Button>
            </form>
          )}

          {sourceType === "youtube" && (
            <form onSubmit={handleTextOrUrlSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  YouTube Video Link (Requires English subtitles)
                </label>
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  required
                  className="bg-card border-border text-stone-850 text-xs rounded-lg focus-visible:ring-primary shadow-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={isUploading}
                className="w-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs h-9 rounded-lg shadow-sm"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Ingest YouTube Video"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
export default AddSourcePanel;
