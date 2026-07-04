from flask import Blueprint, request, jsonify
from backend.app.models.submission import Submission, Recommendation
from backend.app.services.auth_service import AuthService
from backend.app.constants import TESTCASE_IDS

recommendation_bp = Blueprint("recommendation", __name__)


def get_testcase_metadata(tc_id):
    run_arg = int(tc_id) - 1000
    metadata = {
        "parameters": f"argv[1]={run_arg}",
        "output": "stdout của chương trình",
    }

    sizes = [10, 50, 100, -1]

    if 1181 <= tc_id <= 1200:
        groups = [2, 3, 5, 10, 20]
        offset = tc_id - 1181
        k = groups[offset // 4]
        size_x = sizes[offset % 4]
        metadata["parameters"] = (
            f"argv[1]={run_arg}; k={k}; size_X={size_x}; "
            "test_size=0.2; dataset=mnist.csv"
        )
        metadata["output"] = "y_pred và y_test từ kNN.predict"

    if 1201 <= tc_id <= 1220:
        groups = [5, 10, 20, 2, 3]
        offset = tc_id - 1201
        k = groups[offset // 4]
        size_x = sizes[offset % 4]
        metadata["parameters"] = (
            f"argv[1]={run_arg}; k={k}; size_X={size_x}; "
            "test_size=0.2; dataset=mnist.csv"
        )
        metadata["output"] = "Accuracy từ kNN.score"

    return metadata


def get_passed_status(scores, tc_id):
    if isinstance(scores, dict):
        return bool(scores.get(str(tc_id), False))
    if isinstance(scores, list) and tc_id in TESTCASE_IDS:
        idx = TESTCASE_IDS.index(tc_id)
        return bool(scores[idx]) if idx < len(scores) else False
    return False


def get_previous_ready_recommendation(submission):
    return (
        Recommendation.query
        .join(Submission, Recommendation.submission_id == Submission.id)
        .filter(Submission.student_id == submission.student_id)
        .filter(Submission.assignment_id == submission.assignment_id)
        .filter(Submission.id != submission.id)
        .filter(Recommendation.status == "READY")
        .order_by(Recommendation.created_at.desc())
        .first()
    )


def build_testcase_details(submission, testcase_ids):
    details = []
    failed_outputs = submission.failed_outputs or {}

    for tc_id in testcase_ids:
        tc_id = int(tc_id)
        tc_info = failed_outputs.get(str(tc_id), {})
        metadata = get_testcase_metadata(tc_id)
        passed = get_passed_status(submission.scores, tc_id)
        real_output = tc_info.get("actual") or tc_info.get("error")
        expected_output = tc_info.get("expected")

        details.append({
            "id": tc_id,
            "input": metadata["parameters"],
            "parameters": metadata["parameters"],
            "output": metadata["output"],
            "expected_output": expected_output or ("Khớp" if passed else "N/A"),
            "your_output": real_output or ("Khớp" if passed else "N/A"),
            "real_output": real_output or ("Khớp" if passed else "N/A"),
            "passed": passed,
            "status": "Đúng" if passed else "Sai",
        })

    return details


@recommendation_bp.route("", methods=["GET"])
@AuthService.role_required(["STUDENT"])
def get_recommendation_details():
    submission_id = request.args.get("submission_id")
    if not submission_id:
        return jsonify({"error": "submission_id is required"}), 400

    submission = Submission.query.filter_by(
        id=submission_id,
        student_id=request.current_student.id,
    ).first()
    if not submission:
        return jsonify({"error": "Submission not found or unauthorized"}), 404

    recommendation = Recommendation.query.filter_by(submission_id=submission.id).first()
    if not recommendation:
        return jsonify({"error": "No recommendation found for this submission"}), 404

    res_dict = recommendation.to_dict()
    display_tc_ids = recommendation.recommended_testcases or []

    if recommendation.status == "PREVIOUS_TESTCASE_NOT_COMPLETED" and not display_tc_ids:
        previous_rec = get_previous_ready_recommendation(submission)
        if previous_rec:
            display_tc_ids = previous_rec.recommended_testcases or []
            res_dict["recommended_testcases"] = display_tc_ids
            res_dict["previous_recommendation_id"] = str(previous_rec.id)

    res_dict["details"] = build_testcase_details(submission, display_tc_ids)
    return jsonify(res_dict), 200
