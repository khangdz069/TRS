import uuid
from backend.app.extensions import db
from sqlalchemy.dialects.postgresql import UUID

class MatrixFactorization(db.Model):
    __tablename__ = 'matrix_factorizations'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = db.Column(UUID(as_uuid=True), db.ForeignKey('assignments.id', ondelete='CASCADE'), nullable=False)
    model_name = db.Column(db.String(50), nullable=False) # 'RSVD', 'timeSVD', 'LSTM'
    matrix_npz_path = db.Column(db.String(512), nullable=False)
    
    # Store list of student mssvs mapping to row index (e.g. ["20231234", "20235678"])
    list_student_ids = db.Column(db.JSON, nullable=False, default=list)
    # Store list of testcase IDs mapping to column index (e.g. [1001, 1002, 1003])
    list_testcase_ids = db.Column(db.JSON, nullable=False, default=list)
    
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=db.func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": str(self.id),
            "assignment_id": str(self.assignment_id),
            "model_name": self.model_name,
            "matrix_npz_path": self.matrix_npz_path,
            "list_student_ids": self.list_student_ids,
            "list_testcase_ids": self.list_testcase_ids,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
