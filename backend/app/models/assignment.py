from backend.app.extensions import db
import uuid
from sqlalchemy.dialects.postgresql import UUID

class StudentOnAssignment(db.Model):
    __tablename__ = 'student_on_assignments'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = db.Column(UUID(as_uuid=True), db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    assignment_id = db.Column(UUID(as_uuid=True), db.ForeignKey('assignments.id', ondelete='CASCADE'), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=db.func.now(), nullable=False)

    __table_args__ = (
        db.UniqueConstraint('student_id', 'assignment_id', name='uq_student_assignment'),
    )

class Assignment(db.Model):
    __tablename__ = 'assignments'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(255), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.DateTime(timezone=True), nullable=False)
    end_date = db.Column(db.DateTime(timezone=True), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    author_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=db.func.now(), nullable=False)

    # Relationships
    author = db.relationship("Teacher", back_populates="assignments")
    students = db.relationship("Student", secondary="student_on_assignments", back_populates="assignments")
    submissions = db.relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "is_active": self.is_active,
            "author_id": str(self.author_id),
            "author_name": self.author.account.name if self.author and self.author.account else ""
        }
