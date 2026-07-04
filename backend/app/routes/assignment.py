from flask import Blueprint, request, jsonify
from backend.app.extensions import db
from backend.app.models.assignment import Assignment, StudentOnAssignment
from backend.app.models.student import Student
from backend.app.models.account import Account
from backend.app.services.auth_service import AuthService
from backend.app.services.rsvd_training_service import RSVDTrainingService
from datetime import datetime

assignment_bp = Blueprint('assignment', __name__)

@assignment_bp.route('', methods=['POST'])
@AuthService.role_required(['TEACHER'])
def create_assignment():
    data = request.get_json() or {}
    name = data.get("name")
    description = data.get("description", "")
    start_date_str = data.get("start_date")
    end_date_str = data.get("end_date")
    
    if not name or not start_date_str or not end_date_str:
        return jsonify({"error": "Missing name, start_date or end_date"}), 400
    
    try:
        # standard ISO format parsing
        start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
        end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
    except ValueError:
        # fallback for simplified formats
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid date format. Use ISO-8601 format."}), 400
        
    # Check if name unique
    existing = Assignment.query.filter_by(name=name).first()
    if existing:
        return jsonify({"error": "Assignment name already exists"}), 400
        
    assignment = Assignment(
        name=name,
        description=description,
        start_date=start_date,
        end_date=end_date,
        author_id=request.current_teacher.id
    )
    db.session.add(assignment)
    db.session.commit()
    
    return jsonify(assignment.to_dict()), 201

@assignment_bp.route('', methods=['GET'])
@AuthService.login_required
def get_assignments():
    account = request.current_account
    if account.role == 'TEACHER':
        teacher = account.teacher
        assignments = Assignment.query.filter_by(author_id=teacher.id).order_by(Assignment.created_at.desc()).all()
    else:
        student = account.student
        assignments = Assignment.query.join(StudentOnAssignment).filter(StudentOnAssignment.student_id == student.id, StudentOnAssignment.is_active == True).order_by(Assignment.created_at.desc()).all()
        
    return jsonify([a.to_dict() for a in assignments]), 200

@assignment_bp.route('/<string:id>', methods=['GET'])
@AuthService.login_required
def get_assignment_detail(id):
    assignment = Assignment.query.filter_by(id=id).first()
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404
        
    # Check permission
    account = request.current_account
    if account.role == 'STUDENT':
        student = account.student
        registered = StudentOnAssignment.query.filter_by(student_id=student.id, assignment_id=assignment.id, is_active=True).first()
        if not registered:
            return jsonify({"error": "You are not registered in this assignment"}), 403
            
    response_data = assignment.to_dict()
    
    # If teacher, return the student roster as well
    if account.role == 'TEACHER':
        # Retrieve all students on this assignment
        students = Student.query.join(StudentOnAssignment).filter(StudentOnAssignment.assignment_id == assignment.id, StudentOnAssignment.is_active == True).all()
        response_data["student_list"] = [s.to_dict() for s in students]
        
    return jsonify(response_data), 200

@assignment_bp.route('/<string:id>/models/rsvd/rebuild', methods=['POST'])
@AuthService.role_required(['TEACHER'])
def rebuild_rsvd_model(id):
    assignment = Assignment.query.filter_by(id=id).first()
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404

    if assignment.author_id != request.current_teacher.id:
        return jsonify({"error": "Permission denied"}), 403

    data = request.get_json(silent=True) or {}
    try:
        result = RSVDTrainingService.train_assignment(
            assignment_id=id,
            steps=int(data.get("steps", 10)),
            gamma=float(data.get("gamma", 0.001)),
            regularization=float(data.get("regularization", 0.05)),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to rebuild RSVD model: {exc}"}), 500

    return jsonify(result), 200
