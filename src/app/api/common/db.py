import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "5432")

def get_conn():
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT,
        )
        
        # Test the connection
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
            
        # Create extension if needed
        try:
            with conn.cursor() as cur:
                cur.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")
                conn.commit()
        except Exception as e:
            print(f"Warning: Could not create unaccent extension: {e}")
            conn.rollback()
            
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        print(f"DB_HOST: {DB_HOST}")
        print(f"DB_NAME: {DB_NAME}")
        print(f"DB_USER: {DB_USER}")
        print(f"DB_PORT: {DB_PORT}")
        raise e


