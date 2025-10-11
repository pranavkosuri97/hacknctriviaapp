import os, re, time, math
from typing import List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

PAGE_SIZE = int(os.getenv("PAGE_SIZE", "1000"))
INSERT_BATCH = int(os.getenv("INSERT_BATCH", "500"))
SLEEP_BETWEEN_PAGES = float(os.getenv("SLEEP_BETWEEN_PAGES", "0.2"))

SPLIT = re.compile(r'(?<=[\.\?\!])\s+(?=[A-Z(“"])')
YEAR = re.compile(r'\b(1[0-9]{3}|[2-9][0-9]{2,3})\b')
PROPN = re.compile(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+')
THEORY = re.compile(r'\b(theory|model|hypothesis|may|might|likely|suggests|proposed|believe)\b', re.I)
FACT_VERBS = re.compile(r'\b(founded|captured|signed|defeated|conquered|ruled|reigned|built|converted|invented|discovered|established|issued|codified|invaded|sacked|was born|died)\b', re.I)

def split_sents(text: str) -> List[str]:
    return [s.strip() for s in SPLIT.split(text or "") if s and s.strip()]

def trivia_score(s: str) -> float:
    score = 0.0
    if YEAR.search(s): score += 0.35
    pn = len(PROPN.findall(s))
    score += min(pn * 0.12, 0.36)
    if FACT_VERBS.search(s): score += 0.25
    if len(s) < 50 or len(s) > 280: score -= 0.2
    if THEORY.search(s): score -= 0.5
    return max(0.0, min(1.0, score))

def upsert_rows(sb: Client, rows: List[Dict[str, Any]]):
    for i in range(0, len(rows), INSERT_BATCH):
        batch = rows[i:i+INSERT_BATCH]
        sb.table("history_sentences").upsert(batch, on_conflict="chunk_id,sent_idx").execute()

def main():
    sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    processed_chunks = 0
    page = 0

    while True:
        start = page * PAGE_SIZE
        end = start + PAGE_SIZE - 1
        resp = sb.table("history_chunks") \
            .select("id,text,page_start,page_end,created_at") \
            .order("created_at", desc=False) \
            .range(start, end) \
            .execute()

        rows = resp.data or []
        if not rows:
            break  # done

        out: List[Dict[str, Any]] = []
        for row in rows:
            chunk_id = row["id"]
            text = row.get("text") or ""
            if not text.strip():
                continue

            sents = split_sents(text)
            for idx, s in enumerate(sents):
                out.append({
                    "chunk_id": chunk_id,
                    "sent_idx": idx,
                    "text": s,
                    "page_start": row.get("page_start"),
                    "page_end": row.get("page_end"),
                    "score": trivia_score(s),
                    "has_year": bool(YEAR.search(s)),
                    "proper_nouns": len(PROPN.findall(s)),
                    "flagged_theory": bool(THEORY.search(s)),
                })

        if out:
            upsert_rows(sb, out)

        processed_chunks += len(rows)
        print(f"Page {page} | chunks: {len(rows)} | sentences upserted: {len(out)} | total chunks processed: {processed_chunks}")
        page += 1
        time.sleep(SLEEP_BETWEEN_PAGES)

    print("Done populating history_sentences with pagination.")

if __name__ == "__main__":
    main()