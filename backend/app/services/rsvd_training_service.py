import logging
import os
from datetime import datetime

import numpy as np

from backend.app.constants import TESTCASE_IDS
from backend.app.extensions import db
from backend.app.models.matrix_factorization import MatrixFactorization
from backend.app.models.student import Student
from backend.app.models.submission import Submission

logger = logging.getLogger(__name__)


class RSVDModel:
    """Regularized matrix factorization model used by the original TRS system."""

    def __init__(self, ratings, factors=20, seed=42):
        self.ratings = np.array(ratings, dtype=float)
        self.factors = factors
        self.item_bias = {}
        self.user_bias = {}
        self.item_factors = {}
        self.user_factors = {}
        self.random = np.random.default_rng(seed)
        self.global_mean = float(np.mean(self.ratings[:, 2])) if len(self.ratings) else 0.0

        for user_id, item_id, _rating in self.ratings:
            user_id = int(user_id)
            item_id = int(item_id)
            self.item_bias.setdefault(item_id, 0.0)
            self.user_bias.setdefault(user_id, 0.0)
            self.item_factors.setdefault(item_id, self._new_factor())
            self.user_factors.setdefault(user_id, self._new_factor())

    def _new_factor(self):
        return self.random.random((self.factors, 1)) / 10 * np.sqrt(self.factors)

    def predict(self, user_id, item_id):
        user_id = int(user_id)
        item_id = int(item_id)

        self.item_bias.setdefault(item_id, 0.0)
        self.user_bias.setdefault(user_id, 0.0)
        self.item_factors.setdefault(item_id, np.zeros((self.factors, 1)))
        self.user_factors.setdefault(user_id, np.zeros((self.factors, 1)))

        rating = (
            self.global_mean
            + self.item_bias[item_id]
            + self.user_bias[user_id]
            + float(np.sum(self.item_factors[item_id] * self.user_factors[user_id]))
        )
        return min(1.0, max(0.0, rating))

    def train(self, steps=10, gamma=0.001, regularization=0.05):
        for _step in range(steps):
            squared_error = 0.0

            for user_id, item_id, rating in self.ratings:
                user_id = int(user_id)
                item_id = int(item_id)
                error = float(rating) - self.predict(user_id, item_id)
                squared_error += error ** 2

                self.user_bias[user_id] += gamma * (
                    error - regularization * self.user_bias[user_id]
                )
                self.item_bias[item_id] += gamma * (
                    error - regularization * self.item_bias[item_id]
                )

                item_vector = self.item_factors[item_id].copy()
                user_vector = self.user_factors[user_id].copy()
                self.item_factors[item_id] += gamma * (
                    error * user_vector - regularization * item_vector
                )
                self.user_factors[user_id] += gamma * (
                    error * item_vector - regularization * user_vector
                )

            gamma *= 0.9


class RSVDTrainingService:
    @staticmethod
    def scores_to_list(scores):
        if isinstance(scores, dict):
            return [bool(scores.get(str(tc_id), False)) for tc_id in TESTCASE_IDS]
        if isinstance(scores, list):
            return [bool(scores[idx]) if idx < len(scores) else False for idx in range(len(TESTCASE_IDS))]
        return []

    @staticmethod
    def get_latest_scored_submissions(assignment_id):
        rows = (
            Submission.query
            .filter(Submission.assignment_id == assignment_id)
            .filter(Submission.status == "SUCCESS")
            .filter(Submission.scores.isnot(None))
            .order_by(Submission.student_id.asc(), Submission.updated_at.desc())
            .all()
        )

        latest_by_student = {}
        for submission in rows:
            latest_by_student.setdefault(str(submission.student_id), submission)
        return list(latest_by_student.values())

    @staticmethod
    def build_training_rows(submissions):
        ratings = []
        students = []

        for submission in submissions:
            student = submission.student or Student.query.get(submission.student_id)
            if not student:
                continue

            try:
                student_key = int(student.mssv)
            except (TypeError, ValueError):
                logger.info("Skipping non-numeric MSSV for RSVD training: %s", student.mssv)
                continue

            scores = RSVDTrainingService.scores_to_list(submission.scores)
            if not scores:
                continue

            students.append(str(student_key))
            for idx, passed in enumerate(scores):
                ratings.append([student_key, TESTCASE_IDS[idx], 1.0 if passed else 0.0])

        unique_students = list(dict.fromkeys(students))
        return unique_students, ratings

    @staticmethod
    def train_assignment(assignment_id, steps=10, gamma=0.001, regularization=0.05):
        submissions = RSVDTrainingService.get_latest_scored_submissions(assignment_id)
        list_student_ids, ratings = RSVDTrainingService.build_training_rows(submissions)

        if not ratings or not list_student_ids:
            raise ValueError("Not enough scored submissions to train RSVD")

        model = RSVDModel(ratings)
        model.train(steps=steps, gamma=gamma, regularization=regularization)

        matrix = []
        for student_id in list_student_ids:
            row = [model.predict(int(student_id), tc_id) for tc_id in TESTCASE_IDS]
            matrix.append(row)

        matrix_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "files",
            "matries",
        )
        os.makedirs(matrix_dir, exist_ok=True)

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        matrix_path = os.path.join(matrix_dir, f"{timestamp}_mf_RSVD_rebuild.npz")
        np.savez(file=matrix_path, matrix=np.array(matrix), allow_pickle=True)

        record = MatrixFactorization(
            assignment_id=assignment_id,
            model_name="RSVD",
            matrix_npz_path=matrix_path,
            list_student_ids=list_student_ids,
            list_testcase_ids=TESTCASE_IDS,
        )
        db.session.add(record)
        db.session.commit()

        logger.info(
            "Trained RSVD for assignment %s with %s students and %s ratings",
            assignment_id,
            len(list_student_ids),
            len(ratings),
        )

        return {
            "model_id": str(record.id),
            "model_name": record.model_name,
            "matrix_npz_path": record.matrix_npz_path,
            "student_count": len(list_student_ids),
            "rating_count": len(ratings),
            "testcase_count": len(TESTCASE_IDS),
            "steps": steps,
            "gamma": gamma,
            "regularization": regularization,
        }
