# DocChat

**Chat with your documents. Every answer cites its source.**

Upload your own `.txt` and `.pdf` files and ask questions about them. Answers come only from your documents and list their sources.

Built with FastAPI, PostgreSQL + pgvector, React, and OpenRouter. The agent uses plain tool calling, with no LangChain or LangGraph.

![DocChat](docs/screenshots/chat-desktop.png)

## Two answer modes

| Mode | How it works |
|---|---|
| **Normal** | A fixed pipeline: embed the question, fetch the top 3 chunks from pgvector, then stream the answer. |
| **Agent** | The LLM decides which tools to call and in what order (parallel or chained, up to 5 rounds). It streams its steps live, remembers the conversation, and asks you before changing anything. |

### Agent tools

| Tool | Purpose |
|---|---|
| `search_documents` | Semantic search for specific facts |
| `list_documents` | List the uploaded files and their ids |
| `read_document` | Read a whole document in order, for summaries and "list all" questions |
| `get_neighbouring_chunks` | Read the text around a search result that was cut off |
| `delete_document` | **Propose** a delete. Nothing happens until you click **Delete** in the chat. |

## Setup

You need Python 3.12+, Node 20+, PostgreSQL with [pgvector](https://github.com/pgvector/pgvector), and an [OpenRouter API key](https://openrouter.ai/keys).

```bash
# 1. Database
sudo -u postgres psql -c "CREATE DATABASE rag_db_002;"

# 2. Backend (run from backend/)
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head            # creates the pgvector extension, tables and indexes
uvicorn app.main:app --reload   # http://localhost:8000/docs

# 3. Frontend (run from frontend/)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Create `backend/.env` before you run the backend:

```env
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/rag_db_002
OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
LLM_MODEL=openai/gpt-4o-mini
EMBEDDING_MODEL=openai/text-embedding-3-small
```

To change the database schema, edit a model and run `alembic revision --autogenerate -m "..."`, then `alembic upgrade head`.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Backend status |
| POST | `/documents/upload` | Upload a `.txt` or `.pdf` file (multipart field `file`) |
| GET | `/documents` | List documents |
| DELETE | `/documents/{id}` | Delete a document and its chunks |
| POST | `/chat/stream` | Normal mode, NDJSON stream |
| POST | `/chat/agent/stream` | Agent mode, NDJSON stream. Accepts an optional `history` (the last 20 messages). |
| POST | `/chat/ask`, `/chat/agent` | The same as above, but returned as one JSON response |

The streams send one JSON object per line. Each object has a `type`:
- `step`: a tool call (Agent mode only)
- `confirm`: an action waiting for your approval (Agent mode only)
- `sources`: the chunks used for the answer
- `token`: a piece of the answer text
- `done`: the answer is finished
- `error`: something went wrong

## Project structure

```
backend/app/
├── routes/         HTTP endpoints
├── services/       RAG pipeline, agent loop, tools, LLM and embedding calls
├── repositories/   SQL, including the vector search
├── models/         SQLAlchemy tables (documents, chunks)
└── schemas/        Pydantic request and response models
frontend/src/
├── api/            backend calls and the NDJSON stream reader
├── hooks/          useChat (messages, streaming, memory) and useDocuments
└── components/     chat/ (thread, messages, composer) and sidebar/ (upload, document list)
```
