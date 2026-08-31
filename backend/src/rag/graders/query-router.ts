/**
 * 1. Query Analyzer: Check if we need to retrieve custom documents (RAG)
 */
export async function analyzeQuery(query: string): Promise<{ need_rag: boolean; reason: string }> {
  const lower = query.trim().toLowerCase();
  const SKIP_RAG_PATTERNS = [
    /^(hi+|hello|hey|good (morning|evening|afternoon)|how are you|what's up)/i,
    /^(calculate|compute|solve|what is \d[\d\s\+\-\*\/\^\(\)]*$)/i,
    /\b(search (the )?(web|internet|google|online) for|find me on (google|web))\b/i,
  ];

  for (const pattern of SKIP_RAG_PATTERNS) {
    if (pattern.test(lower)) {
      console.log(`[Self-RAG] Query: "${query}" -> Needs RAG? false (Heuristic: non-document query detected)`);
      return { need_rag: false, reason: "Heuristic: non-document query detected" };
    }
  }

  console.log(`[Self-RAG] Query: "${query}" -> Needs RAG? true (Heuristic: defaulting to RAG)`);
  return { need_rag: true, reason: "Heuristic: defaulting to RAG" };
}
