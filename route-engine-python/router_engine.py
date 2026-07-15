import networkx as nx
from sqlalchemy.orm import Session
import models
import schemas
import math


class RouteGraph:
    def __init__(self, db_session):
        self.db = db_session
        self.graph = nx.DiGraph()
        self.weight_distance = 0.5
        self.weight_time = 0.5

    def build_graph(self, request_mode: str, w_dist: float, w_time: float):
        self.weight_distance = w_dist
        self.weight_time = w_time
        
        ports = self.db.query(models.Port).all()
        segments = self.db.query(models.RouteSegment).filter(models.RouteSegment.is_active == True).all()

        for port in ports:
            self.graph.add_node(port.id, pos=(float(port.lat), float(port.lng)), name=port.name)

        for seg in segments:
            # 1. Hitung Estimasi Waktu (Jika di DB kosong, hitung manual)
            if seg.base_lead_time_days:
                time_days = float(seg.base_lead_time_days)
            else:
                # Fallback speed logic
                speed = 30 if seg.mode == 'SEA' else 60
                time_days = float(seg.distance_km) / speed / 24

            # 2. Normalisasi Cost (Jarak vs Waktu)
            # Asumsi konversi: 1 Hari setara 'biaya' menempuh X km (misal 500km)
            # Ini agar 1000km tidak kalah dengan 1 hari (1 vs 1000 itu timpang)
            normalized_time_cost = time_days * 500 

            base_cost = (float(seg.distance_km) * self.weight_distance) + (normalized_time_cost * self.weight_time)

            # 3. Mode Penalty (Jika mode tidak sesuai request, beri cost mahal)
            if seg.mode != request_mode:
                base_cost *= 1000 # Penalty berat

            self.graph.add_edge(
                seg.from_port_id, 
                seg.to_port_id, 
                weight=base_cost,
                distance=float(seg.distance_km),
                mode=seg.mode,
                time_days=time_days
            )
    
    def heuristic(self, node1, node2):
        """Heuristic function for A* (Haversine distance)"""
        if node1 not in self.graph.nodes or node2 not in self.graph.nodes:
            return 0
        
        pos1 = self.graph.nodes[node1]['pos']
        pos2 = self.graph.nodes[node2]['pos']
        
        lat1, lng1 = pos1
        lat2, lng2 = pos2
        
        # Haversine formula
        R = 6371  # Earth radius in km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c
        
        # Return heuristic cost (with same weight logic)
        return distance * self.weight_distance
    
    def find_shortest_path(self, origin_id: int, destination_id: int):
        """Find shortest path using A* algorithm"""
        if origin_id not in self.graph.nodes:
            raise ValueError(f"Origin port {origin_id} not found in graph")
        
        if destination_id not in self.graph.nodes:
            raise ValueError(f"Destination port {destination_id} not found in graph")
        
        try:
            # Use A* algorithm with heuristic
            path = nx.astar_path(
                self.graph,
                origin_id,
                destination_id,
                heuristic=self.heuristic,
                weight='weight'
            )
            
            # Calculate total distance and time
            total_distance = 0
            total_time = 0
            steps = []
            
            for i in range(len(path) - 1):
                from_id = path[i]
                to_id = path[i + 1]
                
                edge_data = self.graph[from_id][to_id]
                
                total_distance += edge_data['distance']
                total_time += edge_data['time_days']
                
                steps.append({
                    'from_id': from_id,
                    'to_id': to_id,
                    'mode': edge_data['mode'],
                    'distance': edge_data['distance']
                })
            
            return {
                'path': path,
                'total_distance_km': total_distance,
                'total_lead_time_days': total_time,
                'steps': steps
            }
            
        except nx.NetworkXNoPath:
            raise ValueError(f"No path found from port {origin_id} to port {destination_id}")
        except Exception as e:
            raise Exception(f"Error finding path: {str(e)}")
