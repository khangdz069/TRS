import logging
from backend.app.models.submission import Recommendation, Submission
from backend.app.constants import TESTCASE_IDS

logger = logging.getLogger(__name__)

class RecommendationService:
    @staticmethod
    def generate_recommendation(submission):
        """
        Generates testcase recommendations using learner sampling and prediction matrices.
        Only recommends up to 3 failed testcases.
        """
        # 1. Check basic validity of scores
        if not submission.scores or not isinstance(submission.scores, (dict, list)):
            return Recommendation(
                submission_id=submission.id,
                status='NO_TESTCASE',
                recommended_testcases=[],
                failed_testcases=[]
            )
            
        # 2. Get list of failed testcase IDs.
        # New grader responses use {"1001": true, "1002": false}; older runs used
        # a 109-item boolean list in TESTCASE_IDS order.
        if isinstance(submission.scores, dict):
            failed_tc_ids = [int(tc_id) for tc_id, passed in submission.scores.items() if not passed]
        elif isinstance(submission.scores, list):
            failed_tc_ids = [
                TESTCASE_IDS[idx]
                for idx, passed in enumerate(submission.scores)
                if idx < len(TESTCASE_IDS) and not passed
            ]
        else:
            return Recommendation(
                submission_id=submission.id,
                status='NO_TESTCASE',
                recommended_testcases=[],
                failed_testcases=[]
            )
        
        if not failed_tc_ids:
            return Recommendation(
                submission_id=submission.id,
                status='NO_TESTCASE',
                recommended_testcases=[],
                failed_testcases=[]
            )
            
        # 3. Check business rule: Daily Limit (5 per day)
        try:
            from datetime import date, datetime, time
            today = date.today()
            start_of_day = datetime.combine(today, time(0, 0, 0))
            
            daily_count = (Recommendation.query
                           .join(Submission, Recommendation.submission_id == Submission.id)
                           .filter(Submission.student_id == submission.student_id)
                           .filter(Recommendation.status == 'READY')
                           .filter(Recommendation.created_at >= start_of_day)
                           .count())
                           
            if daily_count >= 5:
                logger.info(f"Daily limit reached for student {submission.student_id}")
                return Recommendation(
                    submission_id=submission.id,
                    status='DAILY_LIMIT_REACHED',
                    recommended_testcases=[],
                    failed_testcases=failed_tc_ids
                )
        except Exception as e:
            logger.warning(f"Error checking daily limit: {str(e)}")
            
        # 4. Check business rule: Uncompleted previous recommendation
        try:
            last_rec = (Recommendation.query
                        .join(Submission, Recommendation.submission_id == Submission.id)
                        .filter(Submission.student_id == submission.student_id)
                        .filter(Submission.assignment_id == submission.assignment_id)
                        .filter(Submission.id != submission.id)
                        .filter(Recommendation.status == 'READY')
                        .order_by(Recommendation.created_at.desc())
                        .first())
                        
            if last_rec:
                # Feedback is useful research data, but it should not block the next
                # recommendation once the learner passes the previous suggested tests.
                if not last_rec.is_filled_form:
                    logger.info(f"Previous recommendation form not filled for student {submission.student_id}")
                # Rule 4a: Must pass all recommended testcases in this submission
                if last_rec.recommended_testcases:
                    for tc_id in last_rec.recommended_testcases:
                        if isinstance(submission.scores, dict):
                            passed = submission.scores.get(str(tc_id), False)
                        elif isinstance(submission.scores, list) and tc_id in TESTCASE_IDS:
                            tc_idx = TESTCASE_IDS.index(tc_id)
                            passed = submission.scores[tc_idx] if tc_idx < len(submission.scores) else False
                        else:
                            passed = False
                        if not passed:
                            logger.info(f"Student failed previously recommended testcase {tc_id}")
                            return Recommendation(
                                submission_id=submission.id,
                                status='PREVIOUS_TESTCASE_NOT_COMPLETED',
                                recommended_testcases=last_rec.recommended_testcases or [],
                                failed_testcases=failed_tc_ids
                            )
        except Exception as e:
            logger.warning(f"Error checking previous recommendation state: {str(e)}")

        # 5. Core Recommendation Engine
        try:
            from backend.app.services.recommendation_engine import RecommendationEngine
            
            # Determine group
            student_mssv = submission.student.mssv if submission.student else ""
            sampling_group = RecommendationEngine.get_sampling_group(student_mssv)
            
            # Map group to model
            if sampling_group == 'apr1':
                model_name = 'RSVD'
            elif sampling_group == 'apr2':
                model_name = 'timeSVD'
            elif sampling_group == 'apr3':
                model_name = 'LSTM'
            else:
                # Default fallback model
                model_name = 'RSVD'
                
            # Load predicted scores from model
            scores_map, is_fallback = RecommendationEngine.get_prediction_scores(
                assignment_id=str(submission.assignment_id),
                model_name=model_name,
                student_mssv=student_mssv
            )
            
            # Rank failed testcases by score descending (higher predicted rating = more suitable to recommend)
            ranked_failed = sorted(
                failed_tc_ids,
                key=lambda tc: scores_map.get(tc, 0.0),
                reverse=True
            )
            
            recommended = ranked_failed[:3]
            
            rec = Recommendation(
                submission_id=submission.id,
                status='READY',
                recommended_testcases=recommended,
                failed_testcases=failed_tc_ids
            )
            rec.model_used = model_name
            rec.sampling_group = sampling_group
            rec.is_fallback = is_fallback
            return rec
            
        except Exception as e:
            logger.warning(f"Error in recommendation engine inference: {str(e)}. Falling back to simple recommendation.")
            # Fallback to simple recommendation (first 3 failed testcases)
            recommended = failed_tc_ids[:3]
            rec = Recommendation(
                submission_id=submission.id,
                status='READY',
                recommended_testcases=recommended,
                failed_testcases=failed_tc_ids
            )
            rec.model_used = "Fallback (Simple)"
            rec.sampling_group = "Unknown"
            rec.is_fallback = True
            return rec

    @staticmethod
    def get_model_recommendation(submission, model_name="RSVD"):
        """
        Kept for backward compatibility interface, delegates directly to generate_recommendation.
        """
        return RecommendationService.generate_recommendation(submission)
