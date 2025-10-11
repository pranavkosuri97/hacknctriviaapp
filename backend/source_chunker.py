import re, hashlib, os
from typing import List, Tuple
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTChar, LTAnno
from supabase import create_client, Client

from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
PDF_PATH = "/Users/pranavkosuri/Downloads/openstax-history-2-trimmed.pdf"

SOURCE_NAME = "OpenStax: World History, Volume 1 (to 1500)"
SOURCE_URL  = "https://openstax.org/books/world-history-volume-1/pages/1-introduction"

CHUNK_MIN = 350
CHUNK_MAX = 550
OVERLAP   = 70


def normalize_text(s: str) -> str:
    s = s.replace("\r", "")
    s = re.sub(r"(\w)-\n(\w)", r"\1\2", s)
    s = re.sub(r"[ \t]*\n(?!\n)", " ", s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n\s*\n+", "\n\n", s).strip()
    return s

def page_to_text(page_layout) -> str:
    parts = []
    for element in page_layout:
        if isinstance(element, LTTextContainer):
            parts.append(element.get_text())
    return "".join(parts)

def split_paragraphs(s: str) -> List[str]:
    paras = [p.strip() for p in s.split("\n\n") if p.strip()]
    return paras

def sentence_split(p: str) -> List[str]:
    chunks = re.split(r'(?<=[\.\?\!])\s+(?=[A-Z(“"])', p)
    return [c.strip() for c in chunks if c.strip()]

def paragraph_to_chunks(p: str, min_c=CHUNK_MIN, max_c=CHUNK_MAX, overlap=OVERLAP) -> List[str]:
    sents = sentence_split(p)
    buf = ""
    chunks = []
    for sent in sents:
        if not buf:
            buf = sent
        elif len(buf) + 1 + len(sent) <= max_c:
            buf = f"{buf} {sent}"
        else:
            chunks.append(buf)
            buf = sent
    if buf:
        chunks.append(buf)

    merged = []
    i = 0
    while i < len(chunks):
        cur = chunks[i]
        if len(cur) < min_c and i + 1 < len(chunks):
            nxt = chunks[i + 1]
            if len(cur) + 1 + len(nxt) <= max_c:
                merged.append(f"{cur} {nxt}")
                i += 2
                continue
        merged.append(cur)
        i += 1

    with_overlap = []
    for j, c in enumerate(merged):
        if j == 0:
            with_overlap.append(c)
        else:
            prev_tail = with_overlap[-1][-overlap:]
            c_pref = c[:overlap]
            with_overlap.append(c)
    return with_overlap

def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def infer_section(page_num: int) -> Tuple[str, str]:
    return ("World History Vol. 1 (OpenStax)", SOURCE_URL)


def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    src = supabase.table("history_sources").select("id").eq("name", SOURCE_NAME).limit(1).execute()
    if not src.data:
        raise RuntimeError("history_sources row not found—insert it first.")
    source_id = src.data[0]["id"]

    for pageno, layout in enumerate(extract_pages(PDF_PATH), start=1):
        raw = page_to_text(layout)
        if not raw.strip():
            continue
        norm = normalize_text(raw)

        if len(norm) < 200:
            continue

        paras = split_paragraphs(norm)
        if not paras:
            continue

        item_title, item_url = infer_section(pageno)

        for para in paras:
            for chunk in paragraph_to_chunks(para):
                if len(chunk) < CHUNK_MIN:
                    continue

                checksum = sha256_hex(chunk)
                row = {
                    "source_id": source_id,
                    "source_item_title": item_title,
                    "source_item_url": item_url,
                    "text": chunk,
                    "char_start": 0,
                    "char_end": len(chunk),
                    "checksum": checksum,
                    "page_start": pageno,
                    "page_end": pageno,
                    "section_path": None
                }
                supabase.table("history_chunks").upsert(row, on_conflict="source_id,checksum").execute()

    print("Ingest complete.")

if __name__ == "__main__":
    main()