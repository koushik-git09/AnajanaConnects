import math
from pydantic import BaseModel, Field, field_validator


class FaceRegistrationRequest(BaseModel):
    embeddings: list[list[float]] = Field(
        ...,
        min_length=1,
        max_length=10,
        description="Captured normalized face embedding vectors (typically 5 samples)",
    )
    model_name: str = Field(
        ...,
        min_length=2,
        max_length=50,
        description="Name of the model used (e.g. opencv-sface)",
    )
    model_version: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Version/tag of the model (e.g. 2021dec-int8)",
    )
    embedding_dimension: int = Field(
        ...,
        ge=64,
        le=1024,
        description="Dimension of the embedding vectors (e.g. 128 for SFace)",
    )

    @field_validator("embeddings")
    @classmethod
    def validate_embeddings(cls, vectors: list[list[float]], values) -> list[list[float]]:
        if not vectors:
            raise ValueError("At least one face embedding sample is required.")

        for i, vec in enumerate(vectors):
            if not isinstance(vec, list) or len(vec) == 0:
                raise ValueError(f"Sample {i+1} is not a valid vector array.")
            for val in vec:
                if not isinstance(val, (int, float)):
                    raise ValueError(f"Sample {i+1} contains non-numeric value: {val}")
                if math.isnan(val) or math.isinf(val):
                    raise ValueError(f"Sample {i+1} contains invalid NaN or Infinity value.")

            # Validate that vector is not all zeros
            norm_sq = sum(x * x for x in vec)
            if norm_sq < 1e-6:
                raise ValueError(f"Sample {i+1} has near-zero magnitude and is invalid.")

        return vectors


class FaceRegistrationStatusResponse(BaseModel):
    registered: bool
    model_name: str | None = None
    model_version: str | None = None
    embedding_dimension: int | None = None
    sample_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None


class FaceDeleteResponse(BaseModel):
    message: str
    employee_id: str
