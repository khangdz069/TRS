import unittest
import os
import sys
from unittest.mock import patch

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

class TestIntegrationMatrix(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["INIT_DB"] = "True"
        cls.app = create_app()
        cls.app_context = cls.app.app_context()
        cls.app_context.push()
        
    @classmethod
    def tearDownClass(cls):
        cls.app_context.pop()

    def test_real_matrix_prediction_and_ranking(self):
        # 1. Clean previous run state
        try:
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
            
        # 2. Setup mock assignment and student in RSVD group (MSSV 2011725 is in rec_apr1)
        teacher_acc = Account(email="teacher_int@hust.edu.vn", name="Teacher Int", role="TEACHER")
        db.session.add(teacher_acc)
        db.session.flush()
        
        from backend.app.models.teacher import Teacher
        teacher = Teacher(account_id=teacher_acc.id)
        db.session.add(teacher)
        db.session.flush()
        
        assignment = Assignment(
            name="Int Assignment",
            description="Integration Testing",
            start_date=db.func.now(),
            end_date=db.func.now(),
            author_id=teacher.id
        )
        db.session.add(assignment)
        db.session.flush()
        
        std_acc = Account(email="std_int@sis.hust.edu.vn", name="Student Int", role="STUDENT")
        db.session.add(std_acc)
        db.session.flush()
        student = Student(account_id=std_acc.id, mssv="2011725")
        db.session.add(student)
        db.session.flush()
        
        reg = StudentOnAssignment(student_id=student.id, assignment_id=assignment.id)
        db.session.add(reg)
        db.session.commit()
        
        # 3. Ensure the model records are seeded
        RecommendationEngine.ensure_model_records(str(assignment.id))
        
        # 4. Find the RSVD matrix record and print/verify the file path
        record = MatrixFactorization.query.filter_by(
            assignment_id=assignment.id,
            model_name='RSVD'
        ).first()
        
        print("\n" + "="*50)
        print("VERIFYING MATRIX ARTIFACT FILE EXISTENCE")
        print(f"Loaded matrix artifact path: {record.matrix_npz_path}")
        file_exists = os.path.exists(record.matrix_npz_path)
        print(f"File exists on disk: {file_exists}")
        print("="*50 + "\n")
        
        self.assertTrue(file_exists, f"Matrix file at {record.matrix_npz_path} does not exist!")
        
        # 5. Create submission where scores has failed testcases:
        # failed testcases are 1001, 1002, 1003, 1004
        # (index 0, 1, 2, 3 are False, rest are True)
        scores = [True] * 109
        scores[0] = False # 1001
        scores[1] = False # 1002
        scores[2] = False # 1003
        scores[3] = False # 1004
        
        sub = Submission(
            student_id=student.id,
            assignment_id=assignment.id,
            files=[],
            scores=scores,
            status='SUCCESS'
        )
        db.session.add(sub)
        db.session.commit()
        
        # 6. Mock prediction scores so they rank: 1002 > 1004 > 1003 > 1001
        mocked_scores = {
            1001: 0.1,
            1002: 0.9,
            1003: 0.4,
            1004: 0.7
        }
        
        with patch('backend.app.services.recommendation_engine.RecommendationEngine.get_prediction_scores', 
                   return_value=(mocked_scores, False)) as mock_predict:
            
            # Generate recommendation
            rec = RecommendationService.generate_recommendation(sub)
            
            # Assertions
            self.assertEqual(rec.status, 'READY')
            self.assertEqual(rec.is_fallback, False)
            self.assertIn(rec.model_used, ['RSVD', 'timeSVD', 'LSTM'])
            self.assertEqual(rec.sampling_group, 'apr1')
            
            # Assert expected recommendation is [1002, 1004, 1003] based on mocked scores
            # (1002 rating: 0.9, 1004 rating: 0.7, 1003 rating: 0.4, 1001 rating: 0.1)
            self.assertEqual(rec.recommended_testcases, [1002, 1004, 1003])
            
            # Assert the output is not simply failed_testcases[:3] (which would be [1001, 1002, 1003])
            self.assertNotEqual(rec.recommended_testcases, [1001, 1002, 1003])
            
            print("Integration test passed successfully!")

if __name__ == "__main__":
    unittest.main()
