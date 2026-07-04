from backend.app.extensions import db
import uuid
from sqlalchemy.dialects.postgresql import UUID

class Account(db.Model):
    __tablename__ = 'accounts'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False) # 'TEACHER' or 'STUDENT'
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=db.func.now(), nullable=False)
    
    # Relationships
    student = db.relationship("Student", back_populates="account", uselist=False, cascade="all, delete-orphan")
    teacher = db.relationship("Teacher", back_populates="account", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": str(self.id),
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
