import os
from flask import Flask
from backend.app.extensions import db
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# Assuming standard backend setup
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/trs_db")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def run_migration():
    with app.app_context():
        try:
            # Check what dialect it is. For SQLite it's JSON, for PG it's JSONB
            dialect = db.engine.dialect.name
            
            # Use raw SQL to add the new column
            col_type = "JSONB" if dialect == "postgresql" else "JSON"
            
            # Check if column exists first
            inspector = db.inspect(db.engine)
            columns = [c['name'] for c in inspector.get_columns('submissions')]
            
            if 'failed_outputs' not in columns:
                print(f"Adding failed_outputs ({col_type}) to submissions table...")
                db.session.execute(text(f"ALTER TABLE submissions ADD COLUMN failed_outputs {col_type};"))
                db.session.commit()
                print("Column added successfully.")
            else:
                print("Column failed_outputs already exists.")
                
        except Exception as e:
            print(f"Migration error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    run_migration()
