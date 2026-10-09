import time
import uuid
import threading
from typing import Dict, Any, Optional

STEPS = [
    "Dataset uploaded",
    "Dataset validated",
    "Data preprocessing",
    "Feature engineering",
    "Feature scaling",
    "DBSCAN clustering",
    "Evaluation & anomaly detection",
    "Preparing charts & aggregations"
]

class JobManager:
    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()

    def create_job(self) -> str:
        job_id = str(uuid.uuid4())[:8]
        with self.lock:
            self.jobs[job_id] = {
                "id": job_id,
                "status": "pending", # pending, running, completed, failed
                "progress": 0,
                "current_step_index": 0,
                "current_step_name": STEPS[0],
                "steps": [{"name": s, "status": "pending"} for s in STEPS],
                "result": None,
                "error": None,
                "started_at": time.time(),
                "completed_at": None
            }
        return job_id

    def update_step(self, job_id: str, step_index: int, error: Optional[str] = None):
        with self.lock:
            if job_id not in self.jobs:
                return
            job = self.jobs[job_id]
            job["status"] = "running"
            
            # Mark previous steps as done
            for i in range(step_index):
                job["steps"][i]["status"] = "completed"
                
            if error:
                job["status"] = "failed"
                job["error"] = error
                job["steps"][step_index]["status"] = "failed"
                job["completed_at"] = time.time()
                return

            if step_index < len(STEPS):
                job["current_step_index"] = step_index
                job["current_step_name"] = STEPS[step_index]
                job["steps"][step_index]["status"] = "running"
                job["progress"] = int((step_index / len(STEPS)) * 100)
            else:
                job["status"] = "completed"
                job["progress"] = 100
                job["completed_at"] = time.time()
                for s in job["steps"]:
                    s["status"] = "completed"

    def complete_job(self, job_id: str, result: Any):
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]["status"] = "completed"
                self.jobs[job_id]["progress"] = 100
                self.jobs[job_id]["result"] = result
                self.jobs[job_id]["completed_at"] = time.time()
                for s in self.jobs[job_id]["steps"]:
                    s["status"] = "completed"

    def fail_job(self, job_id: str, error_message: str):
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]["status"] = "failed"
                self.jobs[job_id]["error"] = error_message
                self.jobs[job_id]["completed_at"] = time.time()

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return self.jobs.get(job_id)

job_manager = JobManager()
