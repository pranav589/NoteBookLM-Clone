# NotebookLM Clone 🧠

An AI-powered cognitive workspace that mimics Google NotebookLM. Upload source materials (PDFs, text files, YouTube transcripts, and web URLs), run semantic searches, chat with an active RAG (Retrieval-Augmented Generation) assistant utilizing inline clickable citations, and generate study resources using the **Study Studio**.

---

## 🏗️ System Architecture

The following diagram illustrates the data ingestion pipelines, RAG query loops, and background asset synthesis workflows:

![System Architecture](architecture_diagram.png)

---

## ✨ Features

### 1. Multi-Format Source Ingestion
*   **PDF Documents**: Stored securely in MongoDB GridFS, extracted, and chunked.
*   **Plain Text**: Simple copy-paste or `.txt` file uploads.
*   **YouTube Videos**: Downloads and parses timestamped captions using official transcripts or fallback scrapers.
*   **Web URLs**: Uses the **Jina Reader API (`https://r.jina.ai`)** to bypass Cloudflare bot challenge restrictions (managed Turnstile pages) and retrieves clean Markdown, falling back to a `CheerioWebBaseLoader` engine on failure.

### 2. Conversational RAG Chat
*   **Structured Citations**: Dynamic citations are parsed on the backend during generation or history retrieval and rendered as clickable tags (`[Source 1]`, `[Source 2, 3]`). Clicking them highlights the exact document snippet in the source viewer.
*   **Asynchronous Processing**: Chat queries are queued in BullMQ and returned over Server-Sent Events (SSE), eliminating the need for client polling.

### 3. Study Studio (5 Cognitive Tools)
*   **Concept Roadmap**: Generates a timeline syllabus of key concepts mapped back to page numbers/timestamps.
*   **Interactive Mind Map**: Visualizes concept nodes and prerequisites in a graph layout using React Flow.
*   **Synthetic Audio Podcast**: Generates a script and synthetic audio dialogue between two hosts (Andrew & Emma) using Microsoft Edge TTS.
*   **Quizzes**: Generates MCQs, True/False, and Short Answer questionnaires with detailed explanations.
*   **Spaced Repetition Flashcards**: Uses the **SM-2 spaced repetition algorithm** to adjust review intervals based on difficulty ratings, and supports exporting decks to native Anki `.apkg` formats.

---

## 🛠️ Tech Stack

*   **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, TanStack React Query, Lucide Icons, React Flow, React Markdown.
*   **Backend**: Node.js, Express, TypeScript, Mongoose (MongoDB).
*   **AI Orchestration**: LangChain & LangGraph.
*   **Vector Database**: Qdrant Cloud.
*   **Background Jobs**: Redis & BullMQ.

---

## 🚀 Setup & Installation

### Prerequisites
Make sure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18+)
*   [MongoDB](https://www.mongodb.com/) (Local or Atlas)
*   [Redis](https://redis.io/) (For BullMQ)

### 1. Configuration
Create a `.env.local` file inside the `backend` directory matching the following variables:

```env
# Mistral API Credentials
MISTRAL_BASE_URL=https://api.mistral.ai/v1
MISTRAL_API_KEY="your_mistral_api_key"
EMBEDDING_MODEL=mistral-embed
CHAT_MODEL=mistral-small-latest

# Qdrant Vector Store Config
QDRANT_URL=https://your-qdrant-instance.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=documents

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database

# JWT Secrets
JWT_SECRET="some_jwt_signing_secret"
REFRESH_SECRET="some_refresh_signing_secret"
```

Configure `frontend/.env.local` to point to the backend server:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

### 2. Run Backend API & Workers
Navigate to `backend` and install dependencies:
```bash
cd backend
npm install
```

Start the Express API server in development mode:
```bash
npm run dev
```

In a separate terminal, start the background queue workers:
```bash
npm run worker
```

### 3. Run Frontend
Navigate to `frontend` and install dependencies:
```bash
cd ../frontend
npm install
```

Start the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.
