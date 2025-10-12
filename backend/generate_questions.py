import os, json, time, random, unicodedata
from dataclasses import dataclass
from typing import List, Optional, Tuple

import regex as re
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError, field_validator
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

BATCH_SIZE = int(os.getenv("BATCH_SIZE", "25"))
MIN_LEN = int(os.getenv("MIN_LEN", "350"))
MAX_LEN = int(os.getenv("MAX_LEN", "550"))

GEN_TEMPERATURE = float(os.getenv("GEN_TEMPERATURE", "0.2"))
JUDGE_TEMPERATURE = 0.1

TARGET_CONTEXT_LEN = int(os.getenv("TARGET_CONTEXT_LEN", "1400"))
USE_JUDGE = os.getenv("USE_JUDGE", "true").lower() in {"1","true","yes","y"}
CHEAP_JUDGE = os.getenv("CHEAP_JUDGE", "true").lower() in {"1","true","yes","y"}
JUDGE_MODEL = os.getenv("JUDGE_MODEL", "gpt-4o-mini")

class QGItem(BaseModel):
    skip: bool = False
    stem: Optional[str] = None
    choices: Optional[List[str]] = None
    answer_idx: Optional[int] = Field(default=None)
    support_quote: Optional[str] = None
    support_start: Optional[int] = None
    support_end: Optional[int] = None
    difficulty_hint: Optional[str] = Field(default=None)

    @field_validator("choices")
    @classmethod
    def four_choices(cls, v):
        if v is None:
            return v
        if len(v) != 4:
            raise ValueError("choices must have exactly 4 items")
        return v

    @field_validator("answer_idx")
    @classmethod
    def idx_in_range(cls, v):
        if v is None:
            return v
        if v not in (0, 1, 2, 3):
            raise ValueError("answer_idx must be 0..3")
        return v

    @field_validator("difficulty_hint")
    @classmethod
    def diff_1_to_10(cls, v):
        if v is None:
            return v
        if v not in {str(i) for i in range(1, 11)}:
            raise ValueError("difficulty_hint must be string '1'..'10'")
        return v


@dataclass
class Chunk:
    id: str
    text: str
    source_item_title: Optional[str]
    source_item_url: Optional[str]
    page_start: Optional[int]
    page_end: Optional[int]


SYSTEM_MSG = "You generate single-correct, strictly supported PUB-QUIZ style multiple-choice items from the given context window."

PROMPT_INSTRUCTIONS = """You write PUB-QUIZ style, SINGLE-CORRECT multiple-choice questions from ONE context window. Heavy emphasis on the vibe of the question being trivia and not test-like. Emphasis on a questions being generated equally through a scale from 1-10 (no only easy questions).

HARD STYLE RULES
- NEVER write phrases like “according to the text/passage,” “based on the text,” or meta-language. The question must be self-contained.
- Anchor the stem to AT LEAST ONE named entity or specific term that appears in the context (a person, place, event, polity, artifact, date, or title). No vague stems.
- Ask exactly ONE explicit fact stated in the context (who/what/which/where/when OR a stated cause→effect). No inference beyond the context window.

CHOICES (exactly 4)
- EXACTLY ONE is strictly correct per the context with no overlap between answers.
- The correct choice MUST be a verbatim substring of the context (to guarantee truth).
- The three incorrect choices must be completely incorrect but still plausible.
- All choices must be grammatically correct and capitalized correctly.

BANNED
- Hedging (“may,” “might,” “is considered”) unless those exact words are used in the context for the tested fact.
- Definitions that don’t name something from the context.
- Generic stems like “Which factor influenced …” — make it specific with a named entity.

PATTERNS (not required but, pick whichever fits the context best)
- Who/What did X?  | “Who led…”, “Which city…”, “Which empire…”
- Where/When did X occur?
- Which term/name/title refers to Y described in the passage?
- Which immediate outcome followed X (as stated)?
- Which ruler/empire/creed/law is associated with the described action/object?
- What is X?

STRICT JSON ONLY (no markdown, no prose; no trailing commas)
{
  "skip": false,
  "stem": "string",
  "choices": ["string","string","string","string"],
  "answer_idx": 0,
  "support_quote": "string",
  "support_start": 0,
  "support_end": 0,
  "difficulty_hint": "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"
}

OUTPUT RULES
- The support_quote MUST be copy-pasted from the context and be an exact substring of the context.
- The correct choice string must be copy-pasted from the context.
- If the context lacks a clean, single-correct fact with a named entity, return {"skip": true, "reason": "..."}.
- Maintain a healthy spread of difficulty questions generated.
"""

JUDGE_PROMPT = """Respond with strict JSON only: {"ok": true/false, "reason": "string"}.
Checks:
1) Stem contains NONE of: ["according to the text","based on the text","the passage","the text states"] (case-insensitive).
2) Stem references at least one named entity/term from CONTEXT (person, place, empire, polity, event, title, artifact, date).
3) Exactly one choice is strictly supported by CONTEXT, and that choice string appears as a substring in CONTEXT.
4) support_quote is a substring of CONTEXT and proves the correct choice (not just loosely related).
5) Distractors use plausible terms from CONTEXT but are not strictly true.
"""


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def get_openai() -> OpenAI:
    return OpenAI(api_key=OPENAI_API_KEY)


def _canon(s: str) -> str:
    s = unicodedata.normalize("NFC", s)
    s = s.replace("“", '"').replace("”", '"').replace("„", '"')
    s = s.replace("‘", "'").replace("’", "'").replace("‚", "'")
    s = s.replace("\u2013", "-").replace("\u2014", "-").replace("\u2212", "-")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def _quote_pattern(q: str) -> re.Pattern:
    esc = re.escape(q)
    esc = esc.replace(r"\ ", r"\s+")
    esc = esc.replace(r"\"", r"[\"“”]").replace(r"\'", r"[\'‘’]")
    esc = esc.replace(r"\-", r"[-\u2013\u2014\u2212]")
    return re.compile(esc, re.DOTALL)


def find_span_in_chunk(quote: str, chunk: str) -> Optional[Tuple[int, int]]:
    i = chunk.find(quote)
    if i != -1:
        return (i, i + len(quote))
    m = _quote_pattern(quote).search(chunk)
    if m:
        return (m.start(), m.end())
    cq, cc = _canon(quote), _canon(chunk)
    j = cc.find(cq)
    if j == -1:
        return None
    raw_start = None
    raw_idx = 0
    canon_so_far = ""
    while raw_idx < len(chunk):
        canon_so_far = _canon(chunk[:raw_idx])
        if raw_start is None and len(canon_so_far) >= j:
            raw_start = raw_idx
            break
        raw_idx += 1
    if raw_start is None:
        return None
    raw_end = raw_start
    while raw_end <= len(chunk):
        if _canon(chunk[raw_start:raw_end]).startswith(cq) and len(_canon(chunk[raw_start:raw_end])) >= len(cq):
            return (raw_start, raw_end)
        raw_end += 1
    return None

def prep_context_for_model(s: str) -> str:
    s = unicodedata.normalize("NFC", s)
    s = s.replace("ﬁ", "fi").replace("ﬂ", "fl")
    s = s.replace("“", '"').replace("”", '"').replace("„", '"')
    s = s.replace("‘", "'").replace("’", "'").replace("‚", "'")
    s = s.replace("\u2013", "-").replace("\u2014", "-").replace("\u2212", "-")
    s = s.replace("]rst", "first")
    s = re.sub(r"\s+", " ", s).strip()
    return s

def derive_support_from_answer(context: str, answer: str):
    """
    Find an evidence span proving the answer:
    1) locate the correct answer in the RAW context (tolerant),
    2) expand to the containing sentence; if long, clip to ±120 chars.
    Returns (start, end, quote) or None.
    """
    hit = find_span_in_chunk(answer, context)
    if not hit:
        return None
    a_start, a_end = hit

    left_dots = max(context.rfind('.', 0, a_start), context.rfind('?', 0, a_start), context.rfind('!', 0, a_start))
    sent_start = 0 if left_dots == -1 else left_dots + 1

    right_candidates = [x for x in (context.find('.', a_end), context.find('?', a_end), context.find('!', a_end)) if x != -1]
    sent_end = max(a_end + 1, min(right_candidates)) if right_candidates else len(context)

    quote_start = max(sent_start, a_start - 120)
    quote_end = min(sent_end, a_end + 120)
    quote = context[quote_start:quote_end].strip()
    return (quote_start, quote_end, quote)

def shuffle_choices(choices: List[str], answer_idx: int) -> Tuple[List[str], int]:
    pairs = list(enumerate(choices))
    random.shuffle(pairs)
    new_choices = [c for _, c in pairs]
    new_answer_idx = next(i for i, (old_i, _) in enumerate(pairs) if old_i == answer_idx)
    return new_choices, new_answer_idx


def looks_trivia_friendly(text: str) -> bool:
    if re.search(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+", text):
        return True
    if re.search(r"\b\d{3,4}\b", text):
        return True
    return False


def fetch_unused_chunks(sb: Client, limit: int) -> List[Chunk]:
    resp = sb.table("history_chunks") \
        .select("id,text,source_item_title,source_item_url,page_start,page_end,created_at") \
        .order("created_at", desc=False) \
        .limit(limit * 6) \
        .execute()

    used = set(row["chunk_id"] for row in sb.table("history_questions").select("chunk_id").execute().data)

    items: List[Chunk] = []
    for r in resp.data:
        if r["id"] in used:
            continue
        t = r["text"]
        if t is None:
            continue
        if not (MIN_LEN <= len(t) <= MAX_LEN):
            continue
        if not looks_trivia_friendly(t):
            continue
        items.append(Chunk(
            id=r["id"],
            text=t,
            source_item_title=r.get("source_item_title"),
            source_item_url=r.get("source_item_url"),
            page_start=r.get("page_start"),
            page_end=r.get("page_end"),
        ))
    random.shuffle(items)
    return items[:limit]


def build_context_window(sb: Client, seed_chunk_id: str, target_len: int = TARGET_CONTEXT_LEN) -> Tuple[str, Optional[int], Optional[int]]:
    seed = sb.table("history_chunks") \
        .select("id,text,page_start,page_end,created_at") \
        .eq("id", seed_chunk_id).single().execute().data
    if not seed:
        return "", None, None
    page = seed.get("page_start")
    rows = sb.table("history_chunks") \
        .select("id,text,created_at,page_start,page_end") \
        .eq("page_start", page) \
        .order("created_at", desc=False) \
        .limit(400).execute().data

    buf, started, pg_start, pg_end = "", False, seed.get("page_start"), seed.get("page_end")
    for r in rows:
        if not started and r["id"] != seed["id"]:
            continue
        if not started and r["id"] == seed["id"]:
            started = True
        piece = r["text"]
        if not piece:
            continue
        if not buf:
            buf = piece
            pg_start = r.get("page_start")
            pg_end = r.get("page_end")
        else:
            if len(buf) + 1 + len(piece) > target_len:
                break
            buf = f"{buf} {piece}"
            pg_end = r.get("page_end")
    return (buf or seed["text"], pg_start, pg_end)


def call_model(client: OpenAI, context: str) -> str:
    model_ctx = prep_context_for_model(context)
    msg = [
        {"role": "system", "content": SYSTEM_MSG},
        {"role": "user", "content": f"{PROMPT_INSTRUCTIONS}\n\nCONTEXT START\n{model_ctx}\nCONTEXT END"}
    ]
    r = client.chat.completions.create(model=MODEL, messages=msg, temperature=GEN_TEMPERATURE, max_tokens=400)
    return r.choices[0].message.content.strip()


def judge_item(ai: OpenAI, context_window: str, raw_json) -> bool:
    payload = raw_json if isinstance(raw_json, str) else json.dumps(raw_json, ensure_ascii=False)
    msg = [
        {"role": "system", "content": "You are a strict MCQ validator."},
        {"role": "user", "content": f"CONTEXT WINDOW:\n{context_window}\n\nITEM JSON:\n{payload}\n\n{JUDGE_PROMPT}"}
    ]
    r = ai.chat.completions.create(model=MODEL, messages=msg, temperature=JUDGE_TEMPERATURE, max_tokens=160)
    txt = r.choices[0].message.content.strip()
    try:
        obj = json.loads(txt)
        return bool(obj.get("ok", False))
    except Exception:
        return False

def cheap_judge_item(ai: OpenAI, raw_json) -> bool:
    """
    Low-token, context-free judge for pub-quiz readiness.
    Uses a small model and enforces: self-contained stem, concrete fact, on-type choices,
    no meta/hedge words, and a single precise correct choice.
    """
    payload = raw_json if isinstance(raw_json, str) else json.dumps(raw_json, ensure_ascii=False)
    prompt = (
        "You are a binary classifier for pub-quiz MCQs. "
        "Given an item JSON, answer with strict JSON: {\"ok\": true/false, \"reason\": \"...\"}.\n"
        "Pass only if this question has the right vibe of a trivia question and not a test question.\n"
        #"1) Stem is self-contained (no 'according to the text', no hedging like 'might/likely').\n"
        #"2) Stem clearly asks for a concrete fact (who/what/which/where/when).\n"
        #"3) Choices are of the same type as implied by the stem (e.g., if stem asks 'Which species', all choices are species/animals; reject abstract nouns like 'warming' or 'process').\n"
        #"4) Exactly one choice is clearly most specific/correct; others are plausible but not the same.\n"
        #"5) No slurs or graphic content.\n"
        #"6) This question makes sense as a trivia question.\n"
        "Return only the JSON."
    )
    msg = [
        {"role": "system", "content": "Be strict. Optimize for pub-quiz quality. Output JSON only."},
        {"role": "user", "content": f"ITEM JSON:\n{payload}\n\n{prompt}"}
    ]
    try:
        r = ai.chat.completions.create(model=JUDGE_MODEL, messages=msg, temperature=0, max_tokens=80)
        txt = r.choices[0].message.content.strip()
        obj = json.loads(txt)
        return bool(obj.get("ok", False))
    except Exception:
        return False


def validate_and_check(item_text: str, context_text: str) -> QGItem:
    try:
        obj = json.loads(item_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")

    q = QGItem.model_validate(obj)

    if q.skip:
        return q

    if q.choices is None or q.stem is None or q.answer_idx is None:
        raise ValueError("Missing required fields (stem/choices/answer_idx)")

    banned = ("according to the text", "based on the text", "the passage", "the text states")
    if any(b in (q.stem or "").lower() for b in banned):
        raise ValueError("Meta-language in stem")

    correct = q.choices[q.answer_idx]
    if not find_span_in_chunk(correct, context_text):
        cleaned = prep_context_for_model(context_text)
        if correct not in cleaned or not find_span_in_chunk(correct, context_text):
            raise ValueError("Correct choice not found in raw context")

    span = derive_support_from_answer(context_text, correct)
    if not span:
        raise ValueError("Could not derive support span from answer")
    ss, se, quote = span
    q.support_start = ss
    q.support_end = se
    q.support_quote = quote

    if q.difficulty_hint and q.difficulty_hint not in {str(i) for i in range(1, 11)}:
        raise ValueError("Invalid difficulty_hint")

    return q

def insert_question(sb: Client,
                    chunk_id: str,
                    q: QGItem,
                    context_snapshot: str,
                    pg_start: Optional[int],
                    pg_end: Optional[int]) -> None:
    payload = {
        "subject": "history",
        "chunk_id": chunk_id,
        "stem": q.stem,
        "choices": q.choices,
        "answer_idx": q.answer_idx,
        "difficulty_hint": int(q.difficulty_hint) if q.difficulty_hint else None,
        "support_quote": q.support_quote,
        "support_start": q.support_start,
        "support_end": q.support_end,
        "item_json": json.loads(q.model_dump_json()),
        "context_snapshot": context_snapshot[:8000] if context_snapshot else None,
        "context_page_start": pg_start,
        "context_page_end": pg_end
    }
    try:
        sb.table("history_questions").insert(payload).execute()
    except Exception:
        minimal = {k: payload[k] for k in [
            "subject", "chunk_id", "stem", "choices", "answer_idx",
            "difficulty_hint", "support_quote", "support_start", "support_end", "item_json"
        ]}
        sb.table("history_questions").insert(minimal).execute()


def main():
    sb = get_supabase()
    ai = get_openai()

    chunks = fetch_unused_chunks(sb, BATCH_SIZE)
    if not chunks:
        print("No eligible chunks found (maybe all used or filters too strict).")
        return

    made, skips, fails = 0, 0, 0
    for ch in chunks:
        try:
            window, pg_start, pg_end = build_context_window(sb, ch.id, target_len=TARGET_CONTEXT_LEN)
            if not window or len(window) < MIN_LEN:
                skips += 1
                continue

            raw = call_model(ai, window)
            q = validate_and_check(raw, window)
            if q.skip:
                skips += 1
                continue

            q.choices, q.answer_idx = shuffle_choices(q.choices, q.answer_idx)

            if USE_JUDGE:
                ok = True
                if CHEAP_JUDGE:
                    ok = cheap_judge_item(ai, q.model_dump())
                if not ok:
                    skips += 1
                    continue

            insert_question(sb, ch.id, q, window, pg_start, pg_end)
            made += 1
            time.sleep(0.2)

        except (ValidationError, ValueError) as e:
            fails += 1
            print(f"[FAIL] chunk={ch.id[:8]}… :: {e}")
        except Exception as e:
            fails += 1
            print(f"[ERR ] chunk={ch.id[:8]}… :: {e}")

    print(f"Done. created={made} skipped={skips} failed={fails}")


if __name__ == "__main__":
    main()