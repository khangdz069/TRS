import re
from flask import Blueprint, request, jsonify
from backend.app.extensions import db
from backend.app.models.account import Account
from backend.app.models.student import Student
from backend.app.models.teacher import Teacher
from backend.app.services.auth_service import AuthService

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def dev_login():
    data = request.get_json() or {}
    email = data.get("email")
    name = data.get("name", "")
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    # Check if account exists
    account = Account.query.filter_by(email=email).first()
    if not account:
        # Determine role based on email domain
        role = "STUDENT"
        if email.endswith("@hust.edu.vn"):
            role = "TEACHER"
        
        # Parse or default name
        if not name:
            name = email.split('@')[0].replace('.', ' ').title()
            
        account = Account(email=email, name=name, role=role)
        db.session.add(account)
        db.session.flush() # get account.id
        
        if role == "TEACHER":
            teacher = Teacher(account_id=account.id)
            db.session.add(teacher)
        else:
            # Try to extract numbers from email to use as MSSV (e.g. nam.tv231234 -> 20231234)
            mssv_match = re.search(r'\d+', email)
            mssv = mssv_match.group(0) if mssv_match else "20239999"
            student = Student(account_id=account.id, mssv=mssv)
            db.session.add(student)
            
        db.session.commit()
    
    # Generate mock JWT
    token = AuthService.generate_token(account.id, account.email, account.role)
    
    response_data = {
        "token": token,
        "account": account.to_dict()
    }
    
    if account.role == "STUDENT":
        student = Student.query.filter_by(account_id=account.id).first()
        response_data["student"] = student.to_dict() if student else None
    else:
        teacher = Teacher.query.filter_by(account_id=account.id).first()
        response_data["teacher"] = teacher.to_dict() if teacher else None
        
    return jsonify(response_data), 200

@auth_bp.route('/me', methods=['GET'])
@AuthService.login_required
def get_me():
    account = request.current_account
    response_data = {
        "account": account.to_dict()
    }
    if account.role == "STUDENT":
        student = Student.query.filter_by(account_id=account.id).first()
        response_data["student"] = student.to_dict() if student else None
    else:
        teacher = Teacher.query.filter_by(account_id=account.id).first()
        response_data["teacher"] = teacher.to_dict() if teacher else None
        
    return jsonify(response_data), 200
