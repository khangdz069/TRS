from backend.app.extensions import db
import uuid
from sqlalchemy.dialects.postgresql import UUID

class Teacher(db.Model):
    __tablename__ = 'teachers'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = db.Column(UUID(as_uuid=True), db.ForeignKey('accounts.id', ondelete='CASCADE'), unique=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=db.func.now(), nullable=False)
    
    # Relationships
    account = db.relationship("Account", back_populates="teacher")
    assignments = db.relationship("Assignment", back_populates="author", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": str(self.id),
            "account_id": str(self.account_id),
            "name": self.account.name if self.account else "",
            "email": self.account.email if self.account else ""
        }
