import os, json, time, hashlib
from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client
from openai import OpenAI
import regex as re
import random

# --- CAPS NORMALIZATION HELPERS ---
import re as _re  # alias to avoid clashing with regex import name

SMALL_WORDS = {"a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "per", "the", "to", "vs", "via", "with"}
ACRONYMS = {"US", "USA", "UK", "UAE", "UN", "EU", "NATO", "FBI", "CIA", "NBA", "NFL", "MLB", "NHL", "U2"}
ROMAN_NUMERAL_RE = _re.compile(r"^(?=[MDCLXVI])M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$", _re.I)

def _smart_title_token(token: str, is_first: bool, is_last: bool) -> str:
    if not token:
        return token
    m = _re.match(r"^([\(\"'\[]?)(.*?)([\)\"'\]\.,!?:;]?)$", token)
    prefix, mid, suffix = (m.group(1), m.group(2), m.group(3)) if m else ("", token, "")
    t = mid
    if t.isupper() and (t in ACRONYMS or ROMAN_NUMERAL_RE.match(t)):
        return prefix + t + suffix
    lower_t = t.lower()
    if not is_first and not is_last and lower_t in SMALL_WORDS:
        return prefix + lower_t + suffix
    return prefix + (t[:1].upper() + t[1:].lower()) + suffix

def normalize_caps(text: str) -> str:
    """Normalize ALL-CAPS text into proper case while preserving acronyms, Roman numerals,
    and lowercase small words unless first/last in the phrase."""
    if not text:
        return text
    letters = [c for c in text if c.isalpha()]
    if letters:
        upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
        if upper_ratio < 0.7:
            return text
    parts = text.split()
    out = []
    for i, p in enumerate(parts):
        subs = p.split('-')
        new_subs = []
        for j, s in enumerate(subs):
            new_subs.append(_smart_title_token(s, is_first=(i == 0 and j == 0), is_last=(i == len(parts) - 1 and j == len(subs) - 1)))
        out.append('-'.join(new_subs))
    return ' '.join(out)

# ----------------------------
# ENV / Clients
# ----------------------------
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

XLSX_PATH = os.getenv("XLSX_PATH", '/Users/pranavkosuri/Downloads/Trivia Printable.xlsx')
XLSX_BASENAME = os.path.basename(XLSX_PATH.rstrip("/"))

SHEETS = [
    "Millionaire - Easy Q",
    "Millionaire - Hard Q",
    "Smarther Than a 5th Grader",
]

CHEAP_MODEL = os.getenv("CHEAP_MODEL", "gpt-4o-mini")
GEN_MODEL = os.getenv("GEN_MODEL", "gpt-4.1-mini")

BATCH_LIMIT = int(os.getenv("BATCH_LIMIT", "15000"))
SUBJECTS = ["history", "science", "arts", "geography", "pop culture", "sports"]

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
ai = OpenAI(api_key=OPENAI_API_KEY)

# ----------------------------
# Dataclass
# ----------------------------
@dataclass
class QA:
    sheet: str
    question: str
    answer: str

# ----------------------------
# Parsers
# ----------------------------
LANES = [("A", "B"), ("D", "E"), ("G", "H")]
FALLBACK_LANES = [("G", "F")]

def _cell(df: pd.DataFrame, row_idx: int, col_letter: str) -> Optional[str]:
    try:
        return str(df[col_letter].iloc[row_idx]).strip()
    except Exception:
        return None

def extract_qa_from_sheet(df: pd.DataFrame, sheet_name: str) -> List[QA]:
    out: List[QA] = []
    if not set(["A","B","C","D","E","F","G","H"]).issubset(set(df.columns)):
        mapping = {}
        for idx, col in enumerate(df.columns):
            mapping[col] = chr(ord('A') + idx)
        df = df.rename(columns=mapping)
    n = len(df)
    for i in range(n):
        for (qc, ac) in LANES:
            q = _cell(df, i, qc)
            a = _cell(df, i, ac)
            if q and q.lower() != "nan" and a and a.lower() != "nan":
                ql = q.strip().lower()
                al = a.strip().lower()
                if ql in {"question", "questions"} or al in {"answer", "answers"}:
                    continue
                out.append(QA(sheet=sheet_name, question=q, answer=a))
        for (qc, ac) in FALLBACK_LANES:
            q = _cell(df, i, qc)
            a = _cell(df, i, ac)
            if q and q.lower() != "nan" and a and a.lower() != "nan":
                ql = q.strip().lower()
                al = a.strip().lower()
                if ql in {"question", "questions"} or al in {"answer", "answers"}:
                    continue
                out.append(QA(sheet=sheet_name, question=q, answer=a))
    return out

def read_all_sheets(xlsx_path: str) -> List[QA]:
    try:
        xl = pd.ExcelFile(xlsx_path)
    except Exception as e:
        raise RuntimeError(f"Failed to open Excel: {e}")
    all_qas: List[QA] = []
    for sheet in SHEETS:
        if sheet not in xl.sheet_names:
            print(f"[WARN] Sheet not found: {sheet} (available: {xl.sheet_names})")
            continue
        df = pd.read_excel(xl, sheet_name=sheet, header=None)
        df.columns = [chr(ord('A') + i) for i in range(df.shape[1])]
        qas = extract_qa_from_sheet(df, sheet)
        all_qas.extend(qas)
    return all_qas

# ----------------------------
# Classification
# ----------------------------
CLASSIFY_SYS = "You classify trivia Q&A by subject and difficulty."
CLASSIFY_USER_TMPL = """Classify the following trivia item into one subject and a difficulty 1-10.

Allowed subjects (lowercase exactly): history, science, arts, geography, pop culture, sports.

Return STRICT JSON:
{{"subject":"<one of the 6>","difficulty":<1-10 integer>}}

Q: {question}
A: {answer}"""

def classify_subject_and_difficulty(q: str, a: str) -> Tuple[str, int]:
    msg = [
        {"role": "system", "content": CLASSIFY_SYS},
        {"role": "user", "content": CLASSIFY_USER_TMPL.format(question=q, answer=a)}
    ]
    r = ai.chat.completions.create(model=CHEAP_MODEL, messages=msg, temperature=0, max_tokens=60)
    txt = r.choices[0].message.content.strip()
    try:
        obj = json.loads(txt)
        subj = str(obj.get("subject", "history")).strip().lower()
        if subj not in SUBJECTS:
            subj = "history"
        diff = int(obj.get("difficulty", 4))
        return subj, max(1, min(10, diff))
    except Exception:
        return "history", 4

# ----------------------------
# Distractor Generation
# ----------------------------
DISTRACTOR_SYS = "You generate three plausible but incorrect multiple-choice distractors."
DISTRACTOR_USER_TMPL = """Generate 3 incorrect but plausible answer choices for a pub-quiz question.

Question: {question}
Correct answer: {answer}
Subject: {subject}

Return STRICT JSON ONLY:
["distractor 1","distractor 2","distractor 3"]"""

def generate_distractors(question: str, answer: str, subject: str) -> List[str]:
    msg = [
        {"role": "system", "content": DISTRACTOR_SYS},
        {"role": "user", "content": DISTRACTOR_USER_TMPL.format(question=question, answer=answer, subject=subject)}
    ]
    r = ai.chat.completions.create(model=GEN_MODEL, messages=msg, temperature=0.4, max_tokens=90)
    txt = r.choices[0].message.content.strip()
    try:
        arr = json.loads(txt)
        if not isinstance(arr, list):
            raise ValueError("not a list")
        arr = [str(x).strip() for x in arr if str(x).strip()]
        seen = set()
        clean = []
        for d in arr:
            key = d.lower()
            if key == answer.lower() or key in seen:
                continue
            seen.add(key)
            clean.append(d)
        while len(clean) < 3:
            clean.append(f"{answer} (not this)")
        return clean[:3]
    except Exception:
        return [f"{answer} (close but not this)", f"Not {answer}", f"{answer} (incorrect)"][:3]

# ----------------------------
# QC & Database
# ----------------------------
HEADER_TOKENS = {"question", "questions", "answer", "answers", "category", "difficulty"}
def is_header_like(s: Optional[str]) -> bool:
    return bool(s and s.strip().lower() in HEADER_TOKENS)

HEDGE = re.compile(r"\b(might|may|likely|theory|model|hypothesis|believed|suggests?|possibly|probably)\b", re.I)
def is_ok_question(stem: str, answer: str, choices: List[str]) -> Tuple[bool, str]:
    if not stem or len(stem.strip()) < 10:
        return False, "short stem"
    if HEDGE.search(stem):
        return False, "hedged stem"
    norm = set()
    for c in choices:
        k = re.sub(r"\s+", " ", c.strip().lower())
        if k in norm:
            return False, "duplicate choices"
        norm.add(k)
    if any(len(c) > 80 for c in choices):
        return False, "long choice"
    return True, "ok"

def stem_exists(stem: str) -> bool:
    try:
        r = sb.table("questions").select("id").eq("stem", stem).limit(1).execute()
        return bool(r.data)
    except Exception:
        return False

def insert_row(subject: str, stem: str, choices: List[str], answer_idx: int, difficulty: int,
               context_snapshot: Optional[str] = None, source_name: Optional[str] = None, source_ref: Optional[str] = None):
    item = {
        "subject": subject, "stem": stem, "choices": choices, "answer_idx": answer_idx,
        "difficulty_hint": difficulty, "support_quote": None, "support_start": None,
        "support_end": None, "context_snapshot": context_snapshot,
        "source_name": source_name, "source_ref": source_ref,
    }
    payload = {**item, "item_json": item}
    payload = {k: v for k, v in payload.items() if v is not None}
    try:
        sb.table("questions").insert(payload).execute()
    except Exception:
        sb.table("questions").insert(payload).execute()

# ----------------------------
# Main Pipeline
# ----------------------------
def main():
    qas = read_all_sheets(XLSX_PATH)
    if not qas:
        print("No questions found in the specified sheets.")
        return

    print(f"Found {len(qas)} QA pairs. Ingesting up to {BATCH_LIMIT}…")
    created = skipped = failed = 0

    for qa in qas:
        if created >= BATCH_LIMIT:
            break

        stem = qa.question.strip()
        correct = normalize_caps(qa.answer.strip())

        if is_header_like(stem) or is_header_like(correct):
            skipped += 1
            continue
        if stem_exists(stem):
            skipped += 1
            continue

        subject, difficulty = classify_subject_and_difficulty(stem, correct)
        distractors = generate_distractors(stem, correct, subject)
        choices = [correct] + distractors
        random.shuffle(choices)
        answer_idx = choices.index(correct)

        ok, _ = is_ok_question(stem, correct, choices)
        if not ok:
            skipped += 1
            continue

        try:
            insert_row(subject, stem, choices, answer_idx, difficulty,
                       context_snapshot=None,
                       source_name=f"{qa.sheet} (Excel import)",
                       source_ref=XLSX_BASENAME or "Excel import")
            created += 1
        except Exception as e:
            failed += 1
            print(f"[FAIL] insert :: {e}")

    print(f"Done. created={created} skipped={skipped} failed={failed}")

if __name__ == "__main__":
    main()