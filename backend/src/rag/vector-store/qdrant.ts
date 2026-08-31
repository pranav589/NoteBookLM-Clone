import { QdrantVectorStore } from "@langchain/qdrant";
import { config } from "../../lib/config";
import { embeddings } from "../core/embeddings";

let payloadIndexesCreated = false;

/**
 * Helper to ensure payload keyword indexes for notebookId, sourceId, and userId.
 * Essential for strict Qdrant Cloud cluster environments where filtered queries fail if the filter key is not indexed.
 */
export async function ensurePayloadIndexes() {
  const fields = [
    { name: "metadata.notebookId", schema: "keyword" },
    { name: "metadata.sourceId", schema: "keyword" },
    { name: "metadata.userId", schema: "keyword" },
    { name: "metadata.sourceType", schema: "keyword" },
    { name: "metadata.chunkIndex", schema: "integer" },
  ];
  const url = `${config.qdrant.url}/collections/${config.qdrant.collection}/index`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.qdrant.apiKey) {
    headers["api-key"] = config.qdrant.apiKey;
  }

  for (const field of fields) {
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          field_name: field.name,
          field_schema: field.schema,
        }),
      });
      if (res.status === 404) {
        // Collection does not exist yet (will be created when first source is indexed)
        return;
      }
      if (!res.ok) {
        console.warn(`[Qdrant] Warning: Failed to ensure payload index for ${field.name} (${field.schema}): ${res.status} ${await res.text()}`);
      } else {
        console.log(`[Qdrant] Ensured payload index for ${field.name} (${field.schema})`);
      }
    } catch (err) {
      console.warn(`[Qdrant] Error ensuring payload index for ${field.name}:`, err);
    }
  }
  payloadIndexesCreated = true;
}

// Helper to ensure Qdrant vector store
export async function getVectorStore() {
  if (!payloadIndexesCreated) {
    // Attempt to ensure indexes in the background (does not block RAG startup)
    ensurePayloadIndexes().catch((err) => {
      console.warn("[Qdrant] Error in background index creation:", err);
    });
  }

  return QdrantVectorStore.fromExistingCollection(embeddings, {
    url: config.qdrant.url,
    apiKey: config.qdrant.apiKey,
    collectionName: config.qdrant.collection,
  });
}

/**
 * Deletes all points in Qdrant matching a filter query (e.g. metadata.notebookId or metadata.sourceId)
 */
async function deletePointsByFilter(filter: any) {
  const url = `${config.qdrant.url}/collections/${config.qdrant.collection}/points/delete`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.qdrant.apiKey) {
    headers["api-key"] = config.qdrant.apiKey;
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ filter }),
  });

  if (!res.ok) {
    throw new Error(`Failed to delete Qdrant points: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function deleteNotebookVectors(notebookId: string) {
  const filter = {
    must: [
      {
        key: "metadata.notebookId",
        match: { value: notebookId },
      },
    ],
  };
  return deletePointsByFilter(filter);
}

export async function deleteSourceVectors(sourceId: string) {
  const filter = {
    must: [
      {
        key: "metadata.sourceId",
        match: { value: sourceId },
      },
    ],
  };
  return deletePointsByFilter(filter);
}
