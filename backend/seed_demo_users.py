"""
CivicFlowAI: Seed Demo Citizen and Admin Users
This script provisions:
  1. Citizen: citizen@civicflow.gov.in / Citizen@123
  2. Admin:   admin@civicflow.gov.in / Admin@123
Supports both live Supabase projects and local fallback store.
"""
import sys
import logging
from app.supabase_client import is_supabase_connected, supabase, SupabaseService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("seed_users")

DEMO_USERS = [
    {
        "id": "c0000000-0000-0000-0000-000000000001",
        "email": "citizen@civicflow.gov.in",
        "password": "Citizen@123",
        "full_name": "Aarav Sharma",
        "role": "citizen",
        "ward": "Ward 112 - Indiranagar",
        "department": None
    },
    {
        "id": "a0000000-0000-0000-0000-000000000002",
        "email": "admin@civicflow.gov.in",
        "password": "Admin@123",
        "full_name": "Dr. Meera Iyer",
        "role": "admin",
        "ward": "City Central Command",
        "department": "Municipal Corporation HQ"
    }
]

def seed():
    logger.info(f"Supabase connection status: {'Connected' if is_supabase_connected else 'Local Mode'}")
    
    for u in DEMO_USERS:
        # 1. Register via Supabase Auth if connected
        if is_supabase_connected and supabase:
            try:
                res = supabase.auth.sign_up({
                    "email": u["email"],
                    "password": u["password"],
                    "options": {
                        "data": {
                            "full_name": u["full_name"],
                            "role": u["role"]
                        }
                    }
                })
                logger.info(f"Created Supabase Auth user for {u['email']}")
            except Exception as e:
                logger.info(f"Note for {u['email']}: {e}")

        # 2. Save into Profiles
        profile = {
            "id": u["id"],
            "email": u["email"],
            "full_name": u["full_name"],
            "role": u["role"],
            "department": u["department"],
            "ward": u["ward"]
        }
        SupabaseService.save_profile(profile)
        logger.info(f"Provisioned profile for {u['full_name']} ({u['role']}) -> {u['email']}")

    print("\n" + "="*60)
    print(" DEMO USERS PROVISIONED SUCCESSFULLY")
    print("="*60)
    print(" 1. Citizen Portal:")
    print("    Email:    citizen@civicflow.gov.in")
    print("    Password: Citizen@123")
    print("    Role:     Citizen (Ward 112 - Indiranagar)")
    print("-" * 60)
    print(" 2. Municipal Admin & Authority Command Centre:")
    print("    Email:    admin@civicflow.gov.in")
    print("    Password: Admin@123")
    print("    Role:     Admin / Authority (Municipal HQ)")
    print("="*60 + "\n")

if __name__ == "__main__":
    seed()
