from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DECIMAL
from sqlalchemy.orm import relationship
from database import Base

class Port(Base):
    __tablename__ = "ports"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    country = Column(String)
    lat = Column(DECIMAL(10, 8))
    lng = Column(DECIMAL(11, 8))
    is_origin = Column(Boolean, default=False)

class RouteSegment(Base):
    __tablename__ = "route_segments"
    id = Column(Integer, primary_key=True, index=True)
    from_port_id = Column(Integer, ForeignKey("ports.id"))
    to_port_id = Column(Integer, ForeignKey("ports.id"))
    mode = Column(String)
    distance_km = Column(DECIMAL(10, 2))
    base_lead_time_days = Column(Integer, nullable=True) # Kolom baru
    is_active = Column(Boolean, default=True)
