from backend.app.extensions import db
import uuid
from sqlalchemy.dialects.postgresql import UUID

class Student(db.Model):
    __tablename__ = 'students'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = db.Column(UUID(as_uuid=True), db.ForeignKey('accounts.id', ondelete='CASCADE'), unique=True, nullable=False)
    mssv = db.Column(db.String(50), unique=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=db.func.now(), nullable=False)
    
    # Relationships
    account = db.relationship("Account", back_populates="student")
    submissions = db.relationship("Submission", back_populates="student", cascade="all, delete-orphan")
    assignments = db.relationship("Assignment", secondary="student_on_assignments", back_populates="students")

    def to_dict(self):
        return {
            "id": str(self.id),
            "account_id": str(self.account_id),
            "mssv": self.mssv,
            "name": self.account.name if self.account else "",
            "email": self.account.email if self.account else ""
        }
