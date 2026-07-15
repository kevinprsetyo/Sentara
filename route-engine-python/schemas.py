from pydantic import BaseModel, field_validator
from typing import List, Optional
from enum import Enum

class TransportMode(str, Enum):
    SEA = "SEA"
    LAND = "LAND"

class RouteRequest(BaseModel):
    origin_id: int
    destination_id: int
    mode: TransportMode = TransportMode.SEA
    weight_distance: float = 0.5
    weight_time: float = 0.5
    
    @field_validator('weight_distance', 'weight_time')
    @classmethod
    def validate_weights(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Weights must be between 0 and 1')
        return v

class RouteStep(BaseModel):
    from_id: int
    to_id: int
    mode: str
    distance: float

class RouteResponse(BaseModel):
    total_distance_km: float
    total_lead_time_days: float
    steps: List[RouteStep]
