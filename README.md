# RAG Chat: FastAPI + pgvector + React + OpenRouter

A beginner-friendly **Retrieval-Augmented Generation (RAG)** app. Upload `.txt` or `.pdf` documents, ask questions, and get answers **grounded in your documents**, **streamed word by word**, with the source chunks shown under each answer.

## How it works

1. **Ingest:** file → text → overlapping chunks (~500 chars) → embeddings (`openai/text-embedding-3-small`, 1536 dimensions) → stored in Postgres with **pgvector**
2. **Retrieve:** the question is embedded the same way, and pgvector finds the closest chunks by cosine distance (using an **HNSW index**)
3. **Generate:** the top chunks are sent with the question to an LLM via **OpenRouter**, with the instruction to answer only from that context. The answer is **streamed** to the browser as it is generated.

## Features

- Upload, list, and delete `.txt` / `.pdf` documents (deleting a document also deletes its chunks)
- Semantic search with pgvector + **HNSW index** (`vector_cosine_ops`)
- **Streaming answers** over NDJSON: sources first, then answer tokens
- Answers show their **sources** (filename, similarity score, chunk text)
- **Safe error handling:** full errors and tracebacks are logged on the server, users see short generic messages
- Fully **async** backend: FastAPI, SQLAlchemy async, `AsyncOpenAI`

## Tech stack

| Part | Tech |
|---|---|
| Backend | FastAPI (async), SQLAlchemy 2.1 (async) + psycopg 3 |
| Database | PostgreSQL 16 + pgvector |
| LLM + embeddings | OpenRouter (OpenAI-compatible API) |
| Frontend | React + Vite |

## Project structure

```
backend/app/
├── main.py            # app, logging, CORS, routers, create tables on startup
├── config.py          # settings from .env
├── database.py        # async engine, sessions, pgvector extension
├── models/            # SQLAlchemy tables: documents, chunks
├── schemas/           # Pydantic request/response shapes
├── repositories/      # database queries (incl. vector search)
├── services/          # text, embedding, LLM (normal + streaming), and RAG logic
└── routes/            # /health, /documents, /chat
frontend/src/
├── api.js             # all backend calls (incl. stream reader)
├── App.jsx            # shared state + layout
└── components/        # UploadForm, DocumentList, AskForm, AnswerCard, SourceList, BackendStatus
```

## Setup

### Requirements
- Python 3.12+, Node 20+
- PostgreSQL with the [pgvector](https://github.com/pgvector/pgvector) extension installed
- An [OpenRouter API key](https://openrouter.ai/keys)

### 1. Database
```bash
sudo -u postgres psql -c "CREATE DATABASE rag_db_002;"
```
The `vector` extension, tables, and the HNSW index are created automatically when the backend starts.

> **Existing database from an older version?** `create_all` does not add indexes to tables that already exist. Create the HNSW index once by hand:
> ```sql
> CREATE INDEX IF NOT EXISTS ix_chunks_embedding_hnsw ON chunks
> USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
> ```

### 2. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
Create `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/rag_db_002
OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=openai/gpt-4o-mini
EMBEDDING_MODEL=openai/text-embedding-3-small
```
Run:
```bash
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## API

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Backend status |
| POST | `/documents/upload` | Upload a `.txt` / `.pdf` (multipart field `file`) |
| GET | `/documents` | List documents |
| DELETE | `/documents/{document_id}` | Delete a document and its chunks |
| POST | `/chat/ask` | `{ "question": "..." }` → `{ answer, sources[] }` (whole answer at once) |
| POST | `/chat/stream` | `{ "question": "..." }` → NDJSON stream (used by the UI) |

### Streaming format (`/chat/stream`)

One JSON object per line (`application/x-ndjson`):
```
{"type": "sources", "sources": [{"filename": "...", "content": "...", "score": 0.61}]}
{"type": "token", "text": "BgvDev"}
{"type": "token", "text": " employees get 27 days"}
{"type": "done"}
```
If something fails mid-answer, the stream sends `{"type": "error", "message": "..."}`.

Try it from the terminal (`-N` disables buffering so you see the stream live):
```bash
curl -N -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"question": "How many days of annual leave do BgvDev employees get?"}'
```

## Try it

Upload `sample_policy.txt` and ask:
- *How many days of annual leave do BgvDev employees get?*
- *What keyboard do new joiners get?*
- *What is the capital of France?* (should say it's not in the documents)

## Future improvements

- [ ] **Chunk counts** in the document list
- [ ] **Smarter chunking:** split on sentences or paragraphs instead of fixed characters
- [ ] **Chat history:** keep previous questions and answers on screen
- [ ] **Database migrations** with Alembic instead of `create_all` (would also apply new indexes to existing databases)
