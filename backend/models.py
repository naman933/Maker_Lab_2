import uuid
from sqlalchemy import Column, String, Boolean, DateTime, func

from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = 'users'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(200), nullable=False)
    email = Column(String(255), default='')
    role = Column(String(50), nullable=False, default='AdCom Member')
    is_admin_access = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'name': self.name,
            'email': self.email or '',
            'role': self.role,
            'isAdminAccess': self.is_admin_access,
        }
