"use client";

import React, { use } from "react";
import { NotebookWorkspace } from "@/components/NotebookWorkspace";

interface NotebookPageProps {
  params: Promise<{ id: string }>;
}

export default function NotebookPage({ params }: NotebookPageProps) {
  const resolvedParams = use(params);

  return <NotebookWorkspace notebookId={resolvedParams.id} />;
}
