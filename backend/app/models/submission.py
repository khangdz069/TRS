from backend.app.extensions import db
import uuid
from sqlalchemy.dialects.postgresql import UUID

class Submission(db.Model):
    __tablename__ = 'submissions'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = db.Column(UUID(as_uuid=True), db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    assignment_id = db.Column(UUID(as_uuid=True), db.ForeignKey('assignments.id', ondelete='CASCADE'), nullable=False)
    
    # Files submitted: list of dicts [{"filename": "...", "content": "..."}] or path
    files = db.Column(db.JSON, nullable=False, default=list)
    
    # Array of booleans [True, False, True] indicating pass/fail for each testcase
    scores = db.Column(db.JSON, nullable=True)
    
    # Status: 'PENDING', 'GRADING', 'SUCCESS', 'FAILED'
    status = db.Column(db.String(50), nullable=False, default='PENDING')
    
    compile_error = db.Column(db.Text, nullable=True)
    runtime_error = db.Column(db.Text, nullable=True)
    
    # Store {"1002": {"expected": "...", "actual": "..."}}
    failed_outputs = db.Column(db.JSON, nullable=True)
    
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=db.func.now(), nullable=False)
    
    # Relationships
    student = db.relationship("Student", back_populates="submissions")
    assignment = db.relationship("Assignment", back_populates="submissions")
    recommendation = db.relationship("Recommendation", back_populates="submission", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": str(self.id),
            "student_id": str(self.student_id),
            "student_name": self.student.account.name if self.student and self.student.account else "",
            "student_mssv": self.student.mssv if self.student else "",
            "assignment_id": str(self.assignment_id),
            "assignment_name": self.assignment.name if self.assignment else "",
            "files": self.files,
            "scores": self.scores,
            "status": self.status,
            "compile_error": self.compile_error,
            "runtime_error": self.runtime_error,
            "failed_outputs": self.failed_outputs,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class Recommendation(db.Model):
    __tablename__ = 'recommendations'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = db.Column(UUID(as_uuid=True), db.ForeignKey('submissions.id', ondelete='CASCADE'), unique=True, nullable=False)
    
    # Status: 'PENDING', 'READY', 'NO_TESTCASE', 'PREVIOUS_TESTCASE_NOT_COMPLETED', 'DAILY_LIMIT_REACHED', 'FAILED'
    status = db.Column(db.String(50), nullable=False, default='PENDING')
    
    # Recommended testcase IDs (e.g., [1001, 1003, 1004])
    recommended_testcases = db.Column(db.JSON, nullable=False, default=list)
    
    # Failed testcase IDs
    failed_testcases = db.Column(db.JSON, nullable=False, default=list)
    
    is_filled_form = db.Column(db.Boolean, default=False, nullable=False)
    
    # Debugging / Meta fields
    model_used = db.Column(db.String(50), nullable=True)
    sampling_group = db.Column(db.String(50), nullable=True)
    is_fallback = db.Column(db.Boolean, nullable=True)
    
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=db.func.now(), nullable=False)
    
    # Relationships
    submission = db.relationship("Submission", back_populates="recommendation")

    def to_dict(self):
        return {
            "id": str(self.id),
            "submission_id": str(self.submission_id),
            "status": self.status,
            "recommended_testcases": self.recommended_testcases,
            "failed_testcases": self.failed_testcases,
            "is_filled_form": self.is_filled_form,
            "model_used": self.model_used,
            "sampling_group": self.sampling_group,
            "is_fallback": self.is_fallback,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
