import jwt
import datetime
from flask import request, jsonify
from functools import wraps
from backend.app.models.account import Account
from backend.app.models.student import Student
from backend.app.models.teacher import Teacher

JWT_SECRET = "dev-secret-key-trs-rebuild"
JWT_ALGORITHM = "HS256"

class AuthService:
    @staticmethod
    def generate_token(account_id, email, role):
        payload = {
            "account_id": str(account_id),
            "email": email,
            "role": role,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    @staticmethod
    def verify_token(token):
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            account = Account.query.filter_by(id=payload["account_id"], is_active=True).first()
            return account
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None

    @classmethod
    def login_required(cls, f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid authorization token"}), 401
            
            token = auth_header.split(" ")[1]
            account = cls.verify_token(token)
            if not account:
                return jsonify({"error": "Invalid or expired token"}), 401
            
            request.current_account = account
            return f(*args, **kwargs)
        return decorated

    @classmethod
    def role_required(cls, allowed_roles):
        def decorator(f):
            @wraps(f)
            @cls.login_required
            def decorated(*args, **kwargs):
                account = request.current_account
                if account.role not in allowed_roles:
                    return jsonify({"error": "Permission denied"}), 403
                
                # Attach specific models
                if account.role == 'STUDENT':
                    request.current_student = Student.query.filter_by(account_id=account.id).first()
                    if not request.current_student:
                        return jsonify({"error": "Student profile not found"}), 404
                elif account.role == 'TEACHER':
                    request.current_teacher = Teacher.query.filter_by(account_id=account.id).first()
                    if not request.current_teacher:
                        return jsonify({"error": "Teacher profile not found"}), 404
                
                return f(*args, **kwargs)
            return decorated
        return decorator
