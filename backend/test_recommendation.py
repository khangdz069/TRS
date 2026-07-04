import unittest
import os
import sys
import uuid

# Ensure backend is in PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.app.extensions import db
from backend.app.models.account import Account
from backend.app.models.student import Student
from backend.app.models.assignment import Assignment, StudentOnAssignment
from backend.app.models.submission import Submission, Recommendation
from backend.app.models.matrix_factorization import MatrixFactorization
from backend.app.services.recommendation_service import RecommendationService
from backend.app.services.recommendation_engine import RecommendationEngine

class TestRecommendation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Configure app for testing
        os.environ["INIT_DB"] = "True"
        cls.app = create_app()
        cls.app_context = cls.app.app_context()
        cls.app_context.push()
        
        # Ensure clean state for test models
        cls.clear_db()
        
    @classmethod
    def tearDownClass(cls):
        cls.clear_db()
        cls.app_context.pop()
        
    @classmethod
    def clear_db(cls):
        try:
            # Clean test records
            db.session.query(Recommendation).delete()
            db.session.query(Submission).delete()
            db.session.query(MatrixFactorization).delete()
            db.session.query(StudentOnAssignment).delete()
            db.session.query(Assignment).delete()
            db.session.query(Student).delete()
            db.session.query(Account).delete()
            db.session.commit()
        except Exception:
            db.session.rollback()

    def setUp(self):
        self.clear_db()
        
        # Create a teacher account
        self.teacher_acc = Account(email="teacher@hust.edu.vn", name="Test Teacher", role="TEACHER")
        db.session.add(self.teacher_acc)
        db.session.flush()
        
        from backend.app.models.teacher import Teacher
        self.teacher = Teacher(account_id=self.teacher_acc.id)
        db.session.add(self.teacher)
        db.session.flush()
        
        # Create an assignment
        self.assignment = Assignment(
            name="Test Assignment",
            description="Testing recommendation logic",
            start_date=db.func.now(),
            end_date=db.func.now(),
            author_id=self.teacher.id
        )
        db.session.add(self.assignment)
        db.session.flush()
        
        # Create two student accounts
        # Student 1: 2011725 (is in rec_apr1 -> RSVD group)
        self.std_acc_1 = Account(email="std1@sis.hust.edu.vn", name="Student One", role="STUDENT")
        db.session.add(self.std_acc_1)
        db.session.flush()
        self.student_1 = Student(account_id=self.std_acc_1.id, mssv="2011725")
        db.session.add(self.student_1)
        db.session.flush()
        
        # Student 2: 20239999 (not in any group -> unknown / fallback)
        self.std_acc_2 = Account(email="std2@sis.hust.edu.vn", name="Student Two", role="STUDENT")
        db.session.add(self.std_acc_2)
        db.session.flush()
        self.student_2 = Student(account_id=self.std_acc_2.id, mssv="20239999")
        db.session.add(self.student_2)
        db.session.flush()
        
        # Register students to assignment
        reg1 = StudentOnAssignment(student_id=self.student_1.id, assignment_id=self.assignment.id)
        reg2 = StudentOnAssignment(student_id=self.student_2.id, assignment_id=self.assignment.id)
        db.session.add_all([reg1, reg2])
        
        db.session.commit()

    def test_rsvd_matrix_recommendation(self):
        """
        Case 1: Student is in RSVD matrix (rec_apr1) and scores have multiple fails.
        Verify that testcases are ranked according to matrix predictions, not first 3 fails.
        """
        # Ensure models are seeded for this assignment
        RecommendationEngine.ensure_model_records(str(self.assignment.id))
        
        # Let's verify RSVD record exists and inspect its list_student_ids
        rsvd_record = MatrixFactorization.query.filter_by(
            assignment_id=self.assignment.id,
            model_name='RSVD'
        ).first()
        self.assertIsNotNone(rsvd_record)
        self.assertIn("2011725", rsvd_record.list_student_ids)
        
        # Create a submission for student 1 with failed testcases
        # Say, testcases at index 1, 4, 10, 15 are False (i.e. IDs 1002, 1005, 1011, 1016)
        scores = [True] * 109
        scores[1] = False  # 1002
        scores[4] = False  # 1005
        scores[10] = False # 1011
        scores[15] = False # 1016
        
        sub = Submission(
            student_id=self.student_1.id,
            assignment_id=self.assignment.id,
            files=[],
            scores=scores,
            status='SUCCESS'
        )
        db.session.add(sub)
        db.session.commit()
        
        # Generate recommendation
        rec = RecommendationService.generate_recommendation(sub)
        self.assertEqual(rec.status, 'READY')
        self.assertEqual(rec.model_used, 'RSVD')
        self.assertEqual(rec.sampling_group, 'apr1')
        self.assertEqual(rec.is_fallback, False)
        
        # Output should be top 3 of the 4 failed testcases ranked by matrix ratings
        self.assertEqual(len(rec.recommended_testcases), 3)
        for tc in rec.recommended_testcases:
            self.assertIn(tc, [1002, 1005, 1011, 1016])

    def test_unknown_student_fallback(self):
        """
        Case 2: Student is not in any matrix group.
        Verify that it falls back gracefully without crashing (using mean matrix rating or fallback).
        """
        scores = [True] * 109
        scores[0] = False
        scores[1] = False
        scores[2] = False
        scores[3] = False
        
        sub = Submission(
            student_id=self.student_2.id,
            assignment_id=self.assignment.id,
            files=[],
            scores=scores,
            status='SUCCESS'
        )
        db.session.add(sub)
        db.session.commit()
        
        # Recommendation should work and return fallback/mean matrix scores
        rec = RecommendationService.generate_recommendation(sub)
        self.assertEqual(rec.status, 'READY')
        self.assertTrue(rec.is_fallback)
        self.assertEqual(len(rec.recommended_testcases), 3)

    def test_no_failed_testcase(self):
        """
        Case 3: All testcases passed.
        Verify recommendation status is NO_TESTCASE and recommended_testcases is empty.
        """
        scores = [True] * 109
        sub = Submission(
            student_id=self.student_1.id,
            assignment_id=self.assignment.id,
            files=[],
            scores=scores,
            status='SUCCESS'
        )
        db.session.add(sub)
        db.session.commit()
        
        rec = RecommendationService.generate_recommendation(sub)
        self.assertEqual(rec.status, 'NO_TESTCASE')
        self.assertEqual(rec.recommended_testcases, [])

    def test_previous_recommendation_uncompleted(self):
        """
        Case 4: Student has a previous recommendation that hasn't been completed/survey not filled.
        Verify new recommendation requests are blocked with status PREVIOUS_TESTCASE_NOT_COMPLETED.
        """
        # First submission - fails testcase 1002, 1005
        scores_1 = [True] * 109
        scores_1[1] = False
        scores_1[4] = False
        
        sub_1 = Submission(
            student_id=self.student_1.id,
            assignment_id=self.assignment.id,
            files=[],
            scores=scores_1,
            status='SUCCESS'
        )
        db.session.add(sub_1)
        db.session.commit()
        
        rec_1 = RecommendationService.generate_recommendation(sub_1)
        db.session.add(rec_1)
        db.session.commit()
        
        self.assertEqual(rec_1.status, 'READY')
        self.assertFalse(rec_1.is_filled_form) # survey not filled
        
        # Second submission - student tries to submit again without filling the survey
        sub_2 = Submission(
            student_id=self.student_1.id,
            assignment_id=self.assignment.id,
            files=[],
            scores=scores_1,
            status='SUCCESS'
        )
        db.session.add(sub_2)
        db.session.commit()
        
        rec_2 = RecommendationService.generate_recommendation(sub_2)
        self.assertEqual(rec_2.status, 'PREVIOUS_TESTCASE_NOT_COMPLETED')
        self.assertEqual(rec_2.recommended_testcases, [])
        
        # Now fill the survey for recommendation 1
        rec_1.is_filled_form = True
        db.session.commit()
        
        # Submit third time - but still failing the recommended testcases
        # (say we recommended 1002, and it's still false)
        sub_3 = Submission(
            student_id=self.student_1.id,
            assignment_id=self.assignment.id,
            files=[],
            scores=scores_1,
            status='SUCCESS'
        )
        db.session.add(sub_3)
        db.session.commit()
        
        rec_3 = RecommendationService.generate_recommendation(sub_3)
        self.assertEqual(rec_3.status, 'PREVIOUS_TESTCASE_NOT_COMPLETED')

    def test_daily_limit(self):
        """
        Case 5: Student hits daily limit of 5 successful recommendations.
        Verify that the 6th recommendation of the day is blocked with status DAILY_LIMIT_REACHED.
        """
        # Simulate 5 successful recommendations for student 1 today
        for i in range(5):
            scores = [True] * 109
            scores[1] = False # fail at least one
            
            sub = Submission(
                student_id=self.student_1.id,
                assignment_id=self.assignment.id,
                files=[],
                scores=scores,
                status='SUCCESS'
            )
            db.session.add(sub)
            db.session.commit()
            
            rec = Recommendation(
                submission_id=sub.id,
                status='READY',
                recommended_testcases=[1002],
                failed_testcases=[1002],
                is_filled_form=True # mark as filled so it doesn't block the next ones
            )
            db.session.add(rec)
            db.session.commit()
            
        # 6th submission today
        scores_6 = [True] * 109
        scores_6[1] = False
        sub_6 = Submission(
            student_id=self.student_1.id,
            assignment_id=self.assignment.id,
            files=[],
            scores=scores_6,
            status='SUCCESS'
        )
        db.session.add(sub_6)
        db.session.commit()
        
        rec_6 = RecommendationService.generate_recommendation(sub_6)
        self.assertEqual(rec_6.status, 'DAILY_LIMIT_REACHED')
        self.assertEqual(rec_6.recommended_testcases, [])

if __name__ == "__main__":
    unittest.main()
