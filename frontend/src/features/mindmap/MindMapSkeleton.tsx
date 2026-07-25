"use client";

import React from "react";
import { Network, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MindMapSkeletonProps {
  isDark: boolean;
}

export function MindMapSkeleton({ isDark }: MindMapSkeletonProps) {
  return (
    <div className="flex-1 p-6 bg-background overflow-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="border-b border-border pb-4 space-y-2">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-accent animate-pulse" />
            <Skeleton className="h-5 w-52 bg-muted" />
          </div>
          <Skeleton className="h-3 w-80 bg-muted" />
          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-2 pt-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
            Extracting concepts and relationships with AI...
          </p>
        </div>

        {/* Interactive ReactFlow Simulation Viewport */}
        <div
          className="relative w-full h-[380px] rounded-[20px] border border-border bg-card overflow-hidden shadow-xs"
          style={{
            backgroundImage: isDark
              ? "radial-gradient(#2e2e2e 1.5px, transparent 1.5px)"
              : "radial-gradient(#e7e5e4 1.5px, transparent 1.5px)",
            backgroundSize: "16px 16px",
          }}
        >
          {/* SVG Connecting Edges */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 10 5 L 0 8 z" fill="#CF4500" />
              </marker>
            </defs>
            {/* Dotted paths simulating animated edges */}
            <path
              d="M 400 128 L 400 194 L 220 194 L 220 260"
              stroke="#CF4500"
              strokeWidth="2"
              strokeDasharray="4 4"
              fill="none"
              markerEnd="url(#arrow)"
              className="opacity-70"
            />
            <path
              d="M 400 128 L 400 194 L 580 194 L 580 260"
              stroke="#CF4500"
              strokeWidth="2"
              strokeDasharray="4 4"
              fill="none"
              markerEnd="url(#arrow)"
              className="opacity-70"
            />
          </svg>

          {/* Parent Concept Node Skeleton */}
          <div className="absolute left-[calc(50%-80px)] top-[60px] w-[160px] h-[68px] bg-blue-500/10 dark:bg-blue-950/20 border-2 border-blue-300 dark:border-blue-900 rounded-[20px] p-4 flex flex-col justify-center items-center shadow-xs animate-pulse z-10">
            {/* Node handles */}
            <div className="absolute -top-1 w-2 h-2 rounded-full bg-accent" />
            <Skeleton className="h-3.5 w-5/6 bg-muted-foreground/30" />
            <div className="absolute -bottom-1 w-2 h-2 rounded-full bg-accent" />
          </div>

          {/* Child Concept Node Skeleton 1 (YouTube) */}
          <div className="absolute left-[calc(27.5%-80px)] top-[260px] w-[160px] h-[68px] bg-red-500/10 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-900 rounded-[20px] p-4 flex flex-col justify-center items-center shadow-xs animate-pulse z-10">
            <div className="absolute -top-1 w-2 h-2 rounded-full bg-accent" />
            <Skeleton className="h-3.5 w-3/4 bg-muted-foreground/30" />
            <div className="absolute -bottom-1 w-2 h-2 rounded-full bg-accent" />
          </div>

          {/* Child Concept Node Skeleton 2 (PDF) */}
          <div className="absolute left-[calc(72.5%-80px)] top-[260px] w-[160px] h-[68px] bg-amber-500/10 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-900 rounded-[20px] p-4 flex flex-col justify-center items-center shadow-xs animate-pulse z-10">
            <div className="absolute -top-1 w-2 h-2 rounded-full bg-accent" />
            <Skeleton className="h-3.5 w-4/5 bg-muted-foreground/30" />
            <div className="absolute -bottom-1 w-2 h-2 rounded-full bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MindMapSkeleton;
