import os
from supabase import create_client, Client
from dotenv import load_dotenv
import random

load_dotenv()
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
_sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_random_questions(categories: list[str], n: int):
    resp = _sb.table("questions").select("*").execute()
    if getattr(resp, "data", None) is None:
        raise RuntimeError(f"Supabase query failed: {getattr(resp, 'error', 'unknown error')}")
    data = resp.data
    random.shuffle(data)
    return data[:n]