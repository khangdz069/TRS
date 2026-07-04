from flask import Blueprint, request, jsonify
from backend.app.extensions import db
from backend.app.models.form import FeedbackForm
from backend.app.models.submission import Submission, Recommendation
from backend.app.services.auth_service import AuthService

form_bp = Blueprint('form', __name__)

@form_bp.route('', methods=['POST'])
@AuthService.role_required(['STUDENT'])
def submit_feedback():
    data = request.get_json() or {}
    submission_id = data.get("submission_id")
    scores = data.get("scores") # rating satisfaction e.g. 1-5
    list_used_tcids = data.get("list_used_tcids", [])
    time_ordered_tcids = data.get("time_ordered_tcids", [])
    feedback = data.get("feedback", "")
    
    if not submission_id or scores is None:
        return jsonify({"error": "submission_id and scores are required"}), 400
        
    submission = Submission.query.filter_by(id=submission_id, student_id=request.current_student.id).first()
    if not submission:
        return jsonify({"error": "Submission not found or unauthorized"}), 404
        
    # Check if form already submitted
    existing_form = FeedbackForm.query.filter_by(submission_id=submission.id).first()
    if existing_form:
        return jsonify({"error": "Feedback form already submitted for this submission"}), 400
        
    # Save feedback form
    form = FeedbackForm(
        submission_id=submission.id,
        scores=scores,
        list_used_tcids=list_used_tcids,
        time_ordered_tcids=time_ordered_tcids,
        feedback=feedback
    )
    db.session.add(form)
    
    # Update recommendation
    recommendation = Recommendation.query.filter_by(submission_id=submission.id).first()
    if recommendation:
        recommendation.is_filled_form = True
        
    db.session.commit()
    
    return jsonify(form.to_dict()), 201

@form_bp.route('/analytics', methods=['GET'])
@AuthService.role_required(['TEACHER'])
def get_analytics():
    assignment_id = request.args.get("assignment_id")
    if not assignment_id:
        return jsonify({"error": "assignment_id is required"}), 400
        
    # Get all feedback forms for the assignment
    forms = db.session.query(FeedbackForm).join(Submission, FeedbackForm.submission_id == Submission.id).filter(Submission.assignment_id == assignment_id).all()
    
    total_forms = len(forms)
    if total_forms == 0:
        return jsonify({
            "total": 0,
            "average_rating": 0,
            "testcase_stats": {},
            "feedbacks": []
        }), 200
        
    total_rating = 0
    testcase_stats = {}
    feedbacks = []
    
    for form in forms:
        total_rating += form.scores
        for tc in form.list_used_tcids:
            if tc not in testcase_stats:
                testcase_stats[tc] = 0
            testcase_stats[tc] += 1
            
        if form.feedback:
            feedbacks.append({
                "rating": form.scores,
                "text": form.feedback,
                "created_at": form.created_at.isoformat() if form.created_at else None
            })
            
    return jsonify({
        "total": total_forms,
        "average_rating": total_rating / total_forms,
        "testcase_stats": testcase_stats,
        "feedbacks": feedbacks
    }), 200
