from fastapi import APIRouter

# A router is a small group of related routes.
# main.py will "include" this router into the app.
router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health_check():
    # Simple endpoint to confirm the backend is running.
    return {"status": "ok"}
