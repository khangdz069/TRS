import os
import sys
import logging
from flask import Flask
from flask_cors import CORS
from sqlalchemy import text
from backend.app.extensions import db

# Import routes/blueprints
from backend.app.routes.auth import auth_bp
from backend.app.routes.assignment import assignment_bp
from backend.app.routes.student import student_bp
from backend.app.routes.submission import submission_bp
from backend.app.routes.form import form_bp
from backend.app.routes.recommendation import recommendation_bp

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Configure database URI from environment
    DB_USER = os.getenv("POSTGRES_USER", "trs_user")
    DB_PASS = os.getenv("POSTGRES_PASSWORD", "trs_pass")
    DB_NAME = os.getenv("POSTGRES_DB", "trs_db")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "55432")
    
    app.config["SQLALCHEMY_DATABASE_URI"] = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    db.init_app(app)

    @app.route("/api/health")
    def health_check():
        return {"status": "ok", "service": "backend"}
    
    # Test connection and fail fast if PostgreSQL is unavailable
    with app.app_context():
        try:
            db.session.execute(text("SELECT 1"))
            logging.info("Successfully connected to PostgreSQL database.")
        except Exception as e:
            logging.critical("DATABASE CONNECTION ERROR: Failed to connect to PostgreSQL. App exiting...")
            logging.exception(e)
            sys.exit(1)
            
    # Early bootstrapping (optional, for local development only)
    if os.getenv("INIT_DB", "False").lower() in ("true", "1", "yes"):
        with app.app_context():
            db.create_all()
            logging.info("Database tables initialized with db.create_all().")
            try:
                db.session.execute(text("ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS model_used VARCHAR(50);"))
                db.session.execute(text("ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS sampling_group VARCHAR(50);"))
                db.session.execute(text("ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS is_fallback BOOLEAN;"))
                db.session.execute(text("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS failed_outputs JSON;"))
                db.session.commit()
                logging.info("Database compatibility columns successfully migrated.")
            except Exception as e:
                db.session.rollback()
                logging.warning(f"Failed to alter compatibility columns: {e}")
            
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(assignment_bp, url_prefix='/api/assignments')
    app.register_blueprint(student_bp, url_prefix='/api/students')
    app.register_blueprint(submission_bp, url_prefix='/api/submissions')
    app.register_blueprint(form_bp, url_prefix='/api/forms')
    app.register_blueprint(recommendation_bp, url_prefix='/api/testcases')
    
    return app
