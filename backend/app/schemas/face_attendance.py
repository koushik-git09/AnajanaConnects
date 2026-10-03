from pydantic import BaseModel, Field
from typing import List, Optional


class FaceRecognitionEmployee(BaseModel):
    employee_id: str
    employee_code: str
    name: str
    embeddings: List[List[float]]


class FaceRecognitionSessionResponse(BaseModel):
    session_id: str
    expires_at: str
    model_name: str = "opencv-sface"
    model_version: str = "2021dec-int8"
    embedding_dimension: int = 128
    employees: List[FaceRecognitionEmployee]


class FaceAttendanceMarkRequest(BaseModel):
    recognition_session_id: str = Field(..., description="Active recognition session ID")
    employee_id: str = Field(..., description="ID of the identified active employee")


class FaceAttendanceMarkResponse(BaseModel):
    status: str = Field(
        ...,
        description="Outcome: 'marked' | 'already_marked' | 'already_marked_absent'",
    )
    message: str
    employee_id: str
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    date: str
    marked_at: Optional[str] = None
    attendance_status: Optional[str] = None
