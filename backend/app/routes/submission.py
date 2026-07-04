import os
import requests
import base64
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import zipfile
import threading
from backend.app.extensions import db
from backend.app.models.submission import Submission, Recommendation
from backend.app.models.assignment import Assignment, StudentOnAssignment
from backend.app.services.auth_service import AuthService
from backend.app.services.recommendation_service import RecommendationService

submission_bp = Blueprint('submission', __name__)

GRADER_URL = os.getenv("GRADER_URL", "http://localhost:5103/api/grader")
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


def extract_zip_submission(zip_filepath, zip_filename, saved_files):
    extract_dir = os.path.join(UPLOAD_FOLDER, f"extract_{zip_filename}")
    os.makedirs(extract_dir, exist_ok=True)

    with zipfile.ZipFile(zip_filepath, 'r') as zip_ref:
        for member in zip_ref.infolist():
            # Zip Slip protection
            if member.filename.startswith('/') or '..' in member.filename:
                continue

            ext = os.path.splitext(member.filename)[1].lower()
            if ext not in ['.cpp', '.hpp', '.h', '.c']:
                continue

            zip_ref.extract(member, extract_dir)
            extracted_path = os.path.join(extract_dir, member.filename)
            saved_files.append({
                "filename": member.filename,
                "path": extracted_path
            })

@submission_bp.route('', methods=['POST'])
@AuthService.role_required(['STUDENT'])
def create_submission():
    assignment_id = request.form.get("assignment_id")
    if not assignment_id:
        # Try getting from JSON if it was sent as json
        if request.is_json:
            assignment_id = request.json.get("assignment_id")
            
    if not assignment_id:
        return jsonify({"error": "assignment_id is required"}), 400
        
    assignment = Assignment.query.filter_by(id=assignment_id).first()
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404
        
    # Verify student is on this assignment
    registered = StudentOnAssignment.query.filter_by(student_id=request.current_student.id, assignment_id=assignment.id).first()
    if not registered:
        return jsonify({"error": "You are not registered for this assignment"}), 403
        
    # Check if deadline passed
    if assignment.end_date and datetime.utcnow() > assignment.end_date.replace(tzinfo=None):
        return jsonify({"error": "Submission deadline has passed"}), 400
        
    # Save files
    saved_files = []
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Try multipart file upload first
    if 'files[]' in request.files or 'file' in request.files:
        files = request.files.getlist('files[]') if 'files[]' in request.files else request.files.getlist('file')
        for file in files:
            if file.filename:
                # If zip file, handle safely
                if file.filename.lower().endswith('.zip'):
                    zip_filename = secure_filename(f"{request.current_student.mssv}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}")
                    zip_filepath = os.path.join(UPLOAD_FOLDER, zip_filename)
                    file.save(zip_filepath)
                    extract_zip_submission(zip_filepath, zip_filename, saved_files)
                else:
                    filename = secure_filename(f"{request.current_student.mssv}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}")
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    saved_files.append({
                        "filename": file.filename,
                        "path": filepath
                    })
    # Fallback to JSON editor contents
    elif request.is_json and 'files' in request.json:
        for f_data in request.json.get('files', []):
            original_filename = f_data['filename']
            filename = secure_filename(f"{request.current_student.mssv}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{original_filename}")
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if f_data.get("encoding") == "base64":
                content_bytes = base64.b64decode(f_data.get('content', ''))
                with open(filepath, 'wb') as f:
                    f.write(content_bytes)
            else:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(f_data.get('content', ''))

            if original_filename.lower().endswith('.zip'):
                extract_zip_submission(filepath, filename, saved_files)
            else:
                saved_files.append({
                    "filename": original_filename,
                    "path": filepath
                })
            
    if not saved_files:
        return jsonify({"error": "No solution files submitted or no valid C++ source files found in zip"}), 400
        
    # Create Submission record
    submission = Submission(
        student_id=request.current_student.id,
        assignment_id=assignment.id,
        files=saved_files,
        status='GRADING'
    )
    db.session.add(submission)
    db.session.commit()
    
    # Read file contents to send in payload to the grader
    files_with_content = []
    for sf in saved_files:
        try:
            with open(sf["path"], 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception:
            content = ""
        files_with_content.append({
            "filename": sf["filename"],
            "path": sf["path"],
            "content": content
        })

    # Call Grader API
    payload = {
        "submission_id": str(submission.id),
        "assignment_id": str(assignment.id),
        "student_id": str(request.current_student.mssv),
        "files": files_with_content
    }
    # Define background grading function
    def background_grade(app_context, payload, submission_id):
        with app_context:
            sub = Submission.query.get(submission_id)
            if not sub:
                return
                
            try:
                # 15s timeout for g++, 5s*109 for tc = max ~560s, so using 600s timeout
                response = requests.post(GRADER_URL, json=payload, timeout=600)
                if response.status_code == 200:
                    res_data = response.json()
                    sub.status = res_data.get("status", "SUCCESS")
                    sub.scores = res_data.get("scores", {})
                    sub.failed_outputs = res_data.get("failed_outputs", {})
                    sub.compile_error = res_data.get("compile_error")
                    sub.runtime_error = res_data.get("runtime_error")
                else:
                    sub.status = 'FAILED'
                    sub.runtime_error = f"Grader service returned status code {response.status_code}"
            except requests.RequestException as e:
                sub.status = 'FAILED'
                sub.runtime_error = f"Failed to contact grader service: {str(e)}"
            except Exception as e:
                sub.status = 'FAILED'
                sub.runtime_error = f"Internal server error during grading: {str(e)}"
                
            db.session.commit()
            
            # Generate Recommendation after grading finishes
            try:
                recommendation = RecommendationService.generate_recommendation(sub)
                db.session.add(recommendation)
                db.session.commit()
            except Exception as e:
                print(f"Error generating recommendation: {e}")
                
    # Start background thread
    thread = threading.Thread(target=background_grade, args=(current_app.app_context(), payload, submission.id))
    thread.start()
    
    return jsonify({
        "submission": submission.to_dict(),
        "message": "Submission received and is being graded in the background."
    }), 201

@submission_bp.route('', methods=['GET'])
@AuthService.login_required
def get_submissions():
    assignment_id = request.args.get("assignment_id")
    if not assignment_id:
        return jsonify({"error": "assignment_id is required"}), 400
        
    account = request.current_account
    if account.role == 'TEACHER':
        submissions = Submission.query.filter_by(assignment_id=assignment_id).order_by(Submission.created_at.desc()).all()
    else:
        student = account.student
        submissions = Submission.query.filter_by(assignment_id=assignment_id, student_id=student.id).order_by(Submission.created_at.desc()).all()
        
    return jsonify([s.to_dict() for s in submissions]), 200
