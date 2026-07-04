from backend.app.extensions import db
import uuid
from sqlalchemy.dialects.postgresql import UUID

class FeedbackForm(db.Model):
    __tablename__ = 'feedback_forms'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = db.Column(UUID(as_uuid=True), db.ForeignKey('submissions.id', ondelete='CASCADE'), unique=True, nullable=False)
    
    list_used_tcids = db.Column(db.JSON, nullable=True) # list of IDs the student used
    time_ordered_tcids = db.Column(db.JSON, nullable=True)
    scores = db.Column(db.Integer, nullable=False) # e.g. satisfaction rating 1-5
    feedback = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=db.func.now(), nullable=False)
    
    # Relationships
    submission = db.relationship("Submission", backref=db.backref("form", uselist=False, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": str(self.id),
            "submission_id": str(self.submission_id),
            "list_used_tcids": self.list_used_tcids,
            "time_ordered_tcids": self.time_ordered_tcids,
            "scores": self.scores,
            "feedback": self.feedback,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
