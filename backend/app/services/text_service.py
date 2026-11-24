import io

from pypdf import PdfReader

SUPPORTED_EXTENSIONS = (".txt", ".pdf")


def extract_text(filename: str, data: bytes) -> str:
    """Turn an uploaded file (raw bytes) into plain text."""
    name = filename.lower()

    if name.endswith(".txt"):
        text = data.decode("utf-8", errors="ignore")
    elif name.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages)
    else:
        raise ValueError(f"Unsupported file type. Use one of: {SUPPORTED_EXTENSIONS}")

    # Some PDFs turn symbols like "-", "–", "(" into NUL characters (\x00).
    # Postgres text columns can't store NUL, so replace them with a space.
    return text.replace("\x00", " ")


def split_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Cut text into pieces of ~chunk_size characters.
    Each piece repeats the last `overlap` characters of the previous one,
    so a sentence cut at a boundary still appears whole in one chunk."""
    text = " ".join(text.split())  # collapse extra spaces / newlines

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap  # step back a little to create the overlap

    return chunks
