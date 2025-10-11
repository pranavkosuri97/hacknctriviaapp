import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
_sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_random_questions(category: str, n: int):
    params = {
        "p_subject": (category or ""),
        "p_n": int(n)
    }
    resp = _sb.rpc("get_random_questions", params).execute()
    if getattr(resp, "data", None) is None:
        raise RuntimeError(f"Supabase RPC failed: {getattr(resp, 'error', 'unknown error')}")
    return resp.data