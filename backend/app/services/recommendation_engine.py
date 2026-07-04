import os
import json
import logging
import numpy as np

logger = logging.getLogger(__name__)

# Paths resolving
current_dir = os.path.dirname(os.path.dirname(__file__)) # backend/app/
group_file_path = os.path.join(current_dir, 'files', 'input', 'A2_group_std.npz')

class RecommendationEngine:
    @staticmethod
    def get_sampling_group(student_mssv: str) -> str:
        """
        Determines the learner group of a student based on A2_group_std.npz
        """
        if not os.path.exists(group_file_path):
            logger.warning(f"Learner sampling group file not found: {group_file_path}")
            return 'unknown'
            
        try:
            npz = np.load(group_file_path, allow_pickle=True)
            rec_apr1 = set(npz.get('rec_apr1', []))
            rec_apr2 = set(npz.get('rec_apr2', []))
            rec_apr3 = set(npz.get('rec_apr3', []))
            
            # Check integer representation
            try:
                mssv_int = int(student_mssv)
            except ValueError:
                mssv_int = -1
                
            if mssv_int in rec_apr1 or str(student_mssv) in rec_apr1:
                return 'apr1'
            elif mssv_int in rec_apr2 or str(student_mssv) in rec_apr2:
                return 'apr2'
            elif mssv_int in rec_apr3 or str(student_mssv) in rec_apr3:
                return 'apr3'
        except Exception as e:
            logger.exception(f"Error loading learner groups: {str(e)}")
            
        return 'unknown'

    @staticmethod
    def ensure_model_records(assignment_id: str):
        """
        Ensures that MatrixFactorization entries exist in the database for the given assignment_id.
        If they do not exist, seeds them using the pre-trained templates.
        """
        from backend.app.models.matrix_factorization import MatrixFactorization
        from backend.app.extensions import db
        
        try:
            # Check if records already exist
            exists = MatrixFactorization.query.filter_by(assignment_id=assignment_id).first()
            if exists:
                return
                
            logger.info(f"Seeding MatrixFactorization records for assignment_id: {assignment_id}")
            
            # Load student groups and testcases from NPZ template
            if os.path.exists(group_file_path):
                npz = np.load(group_file_path, allow_pickle=True)
                rec_apr1 = [str(x) for x in npz.get('rec_apr1', [])]
                rec_apr2 = [str(x) for x in npz.get('rec_apr2', [])]
                rec_apr3 = [str(x) for x in npz.get('rec_apr3', [])]
                list_tcs = [int(x) + 1000 for x in npz.get('list_testcase_ids', [])]
            else:
                rec_apr1, rec_apr2, rec_apr3 = [], [], []
                list_tcs = [1001 + i for i in range(109)]
                
            # Load list of padding students from roster if available
            padding_students = []
            project_root = os.path.dirname(os.path.dirname(current_dir))
            student_ids_json = os.path.join(project_root, 'project', 'examples', 'student_ids.json')
            if os.path.exists(student_ids_json):
                try:
                    with open(student_ids_json, 'r') as fd:
                        padding_students = json.load(fd)
                except Exception:
                    pass
                    
            existing_set = set(rec_apr1 + rec_apr2 + rec_apr3)
            padding_pool = [s for s in padding_students if s not in existing_set]
            
            def pad_list(base_list, target_len):
                res = list(base_list)
                if len(res) >= target_len:
                    return res[:target_len]
                needed = target_len - len(res)
                res.extend(padding_pool[:needed])
                while len(res) < target_len:
                    res.append(f"2023{len(res):04d}")
                return res
                
            rsvd_students = pad_list(rec_apr1, 295)
            lstm_students = pad_list(rec_apr3, 295)
            
            # timeSVD needs 4630 entries
            timesvd_students = []
            if rec_apr2:
                while len(timesvd_students) < 4630:
                    timesvd_students.extend(rec_apr2)
            timesvd_students = pad_list(timesvd_students, 4630)
            
            # Insert models
            rsvd = MatrixFactorization(
                assignment_id=assignment_id,
                model_name='RSVD',
                matrix_npz_path=os.path.join(current_dir, 'files', 'matries', '20240501_190028_mf_RSVD.npz'),
                list_student_ids=rsvd_students,
                list_testcase_ids=list_tcs
            )
            db.session.add(rsvd)
            
            lstm = MatrixFactorization(
                assignment_id=assignment_id,
                model_name='LSTM',
                matrix_npz_path=os.path.join(current_dir, 'files', 'matries', '20240501_190453_mf_LSTM.npz'),
                list_student_ids=lstm_students,
                list_testcase_ids=list_tcs
            )
            db.session.add(lstm)
            
            timesvd = MatrixFactorization(
                assignment_id=assignment_id,
                model_name='timeSVD',
                matrix_npz_path=os.path.join(current_dir, 'files', 'matries', '20240501_191307_mf_timeSVD.npz'),
                list_student_ids=timesvd_students,
                list_testcase_ids=list_tcs
            )
            db.session.add(timesvd)
            
            db.session.commit()
            logger.info("Successfully seeded all MatrixFactorization templates.")
        except Exception as e:
            logger.exception(f"Error seeding matrix factorization models: {str(e)}")

    @staticmethod
    def get_prediction_scores(assignment_id: str, model_name: str, student_mssv: str):
        """
        Loads the model prediction matrix and returns a dictionary mapping testcase_id to predicted rating.
        If student is not found, computes the mean column score as a fallback.
        """
        from backend.app.models.matrix_factorization import MatrixFactorization
        
        # Ensure model is seeded
        RecommendationEngine.ensure_model_records(assignment_id)
        
        record = MatrixFactorization.query.filter_by(
            assignment_id=assignment_id,
            model_name=model_name
        ).order_by(MatrixFactorization.created_at.desc()).first()
        
        if not record:
            raise FileNotFoundError(f"MatrixFactorization database record not found for {model_name}")
            
        if not os.path.exists(record.matrix_npz_path):
            raise FileNotFoundError(f"Matrix file not found at path: {record.matrix_npz_path}")
            
        data = np.load(record.matrix_npz_path, allow_pickle=True)
        matrix = data['matrix']
        
        list_student_ids = record.list_student_ids
        list_testcase_ids = record.list_testcase_ids
        
        # Find index of student in matrix row representation
        student_mssv_str = str(student_mssv)
        idx = -1
        if student_mssv_str in list_student_ids:
            idx = list_student_ids.index(student_mssv_str)
        else:
            try:
                mssv_int_str = str(int(student_mssv))
                if mssv_int_str in list_student_ids:
                    idx = list_student_ids.index(mssv_int_str)
            except ValueError:
                pass
                
        is_fallback = False
        if idx != -1:
            row = matrix[idx]
            if model_name == 'LSTM' and row.ndim == 2:
                row = row[0] # row was (1, 109) -> (109,)
            predicted_ratings = row
        else:
            if model_name == 'LSTM':
                mean_matrix = np.mean(matrix, axis=0)
                predicted_ratings = mean_matrix[0]
            else:
                predicted_ratings = np.mean(matrix, axis=0)
            is_fallback = True
            
        # Map ratings to testcase IDs
        scores_map = {}
        for col_idx, tc_id in enumerate(list_testcase_ids):
            if col_idx < len(predicted_ratings):
                scores_map[int(tc_id)] = float(predicted_ratings[col_idx])
                
        return scores_map, is_fallback
