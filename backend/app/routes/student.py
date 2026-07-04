import csv
import io
import pandas as pd
from flask import Blueprint, request, jsonify
from backend.app.extensions import db
from backend.app.models.account import Account
from backend.app.models.student import Student
from backend.app.models.assignment import Assignment, StudentOnAssignment
from backend.app.services.auth_service import AuthService

student_bp = Blueprint('student', __name__)

@student_bp.route('/import', methods=['POST'])
@AuthService.role_required(['TEACHER'])
def import_students():
    assignment_id = request.form.get("assignment_id")
    if not assignment_id:
        return jsonify({"error": "assignment_id is required"}), 400
        
    assignment = Assignment.query.filter_by(id=assignment_id).first()
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404
        
    # Check upload files
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400
        
    # Read file content
    try:
        if file.filename.endswith('.csv'):
            stream = io.StringIO(file.stream.read().decode("UTF-8"), newline=None)
            df = pd.read_csv(stream)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file.stream)
        else:
            return jsonify({"error": "Only CSV and Excel files are supported"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to read file: {str(e)}"}), 400
        
    # Find matching columns case-insensitively
    cols = {col.lower().strip(): col for col in df.columns}
    
    # Identify key columns: MSSV/ID, Name, Email
    mssv_col = None
    name_col = None
    email_col = None
    
    for c_lower, c_orig in cols.items():
        if 'mssv' in c_lower or 'id number' in c_lower or 'mã sinh viên' in c_lower:
            mssv_col = c_orig
        elif 'name' in c_lower or 'họ tên' in c_lower or 'họ và tên' in c_lower or 'fullname' in c_lower:
            name_col = c_orig
        elif 'email' in c_lower or 'thư điện tử' in c_lower or 'address' in c_lower:
            email_col = c_orig
            
    # Fallback to column indices if not found by name
    if not mssv_col and len(df.columns) > 0:
        mssv_col = df.columns[0]
    if not name_col and len(df.columns) > 1:
        name_col = df.columns[1]
    if not email_col and len(df.columns) > 2:
        email_col = df.columns[2]
        
    if not mssv_col or not email_col:
        return jsonify({"error": "Could not identify MSSV or Email columns in the uploaded file"}), 400
        
    imported_count = 0
    errors = []
    
    for idx, row in df.iterrows():
        try:
            mssv = str(row[mssv_col]).strip().split('.')[0] # remove decimals if pandas treated it as float
            email = str(row[email_col]).strip()
            name = str(row[name_col]).strip() if name_col and not pd.isna(row[name_col]) else email.split('@')[0]
            
            if not mssv or mssv == 'nan' or not email or email == 'nan':
                continue
                
            # Check if account exists
            account = Account.query.filter_by(email=email).first()
            if not account:
                account = Account(email=email, name=name, role="STUDENT")
                db.session.add(account)
                db.session.flush()
                
            student = Student.query.filter_by(account_id=account.id).first()
            if not student:
                # Double check student by mssv to prevent duplicate mssv error
                student = Student.query.filter_by(mssv=mssv).first()
                if not student:
                    student = Student(account_id=account.id, mssv=mssv)
                    db.session.add(student)
                    db.session.flush()
                else:
                    # Link existing student to this account
                    student.account_id = account.id
                    
            # Register in assignment
            registered = StudentOnAssignment.query.filter_by(student_id=student.id, assignment_id=assignment.id).first()
            if not registered:
                registered = StudentOnAssignment(student_id=student.id, assignment_id=assignment.id)
                db.session.add(registered)
                
            imported_count += 1
        except Exception as e:
            errors.append(f"Row {idx+2}: {str(e)}")
            
    db.session.commit()
    
    return jsonify({
        "message": f"Successfully registered {imported_count} students to assignment {assignment.name}",
        "imported_count": imported_count,
        "errors": errors
    }), 200
