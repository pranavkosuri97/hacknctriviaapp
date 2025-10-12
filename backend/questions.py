import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
_sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_random_questions(categories: list[str], n: int):
    query = _sb.table("questions").select("*")
    if categories:
        query = query.in_("subject", categories)
    resp = query.order("random()").limit(int(n)).execute()
    if getattr(resp, "data", None) is None:
        raise RuntimeError(f"Supabase query failed: {getattr(resp, 'error', 'unknown error')}")
    return resp.data