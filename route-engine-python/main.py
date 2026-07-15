from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Port
from schemas import RouteRequest, RouteResponse, RouteStep
from router_engine import RouteGraph
from typing import List

app = FastAPI(title="Route Engine API", version="1.0.0")


@app.get("/")
def health_check():
    """Health check endpoint"""
    return {"status": "Route Engine Ready"}


@app.get("/test-db")
def test_database_connection(db: Session = Depends(get_db)):
    """Test database connection by fetching first 5 ports"""
    try:
        ports = db.query(Port).limit(5).all()
        
        ports_data = [
            {
                "id": port.id,
                "name": port.name,
                "lat": port.lat,
                "lng": port.lng
            }
            for port in ports
        ]
        
        return {
            "status": "success",
            "message": "Database connection successful",
            "ports_count": len(ports_data),
            "ports": ports_data
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Database connection failed: {str(e)}"
        }


@app.post("/calculate", response_model=RouteResponse)
def calculate_route(request: RouteRequest, db: Session = Depends(get_db)):
    """
    Calculate optimal route using A* algorithm
    
    - **origin_id**: ID of origin port
    - **destination_id**: ID of destination port
    - **mode**: Transportation mode ('SEA' or 'LAND')
    - **weight_distance**: Weight for distance factor (0-1)
    - **weight_time**: Weight for time factor (0-1)
    """
    try:
        # Initialize route graph
        route_graph = RouteGraph(db_session=db)
        
        # Build the graph from database with mode and weights
        route_graph.build_graph(
            request_mode=request.mode.value,
            w_dist=request.weight_distance,
            w_time=request.weight_time
        )
        
        # Find shortest path using A*
        result = route_graph.find_shortest_path(
            origin_id=request.origin_id,
            destination_id=request.destination_id
        )
        
        # Convert steps to RouteStep objects
        steps = [
            RouteStep(
                from_id=step['from_id'],
                to_id=step['to_id'],
                mode=step['mode'],
                distance=step['distance']
            )
            for step in result['steps']
        ]
        
        # Return response
        return RouteResponse(
            total_distance_km=round(result['total_distance_km'], 2),
            total_lead_time_days=round(result['total_lead_time_days'], 2),
            steps=steps
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
