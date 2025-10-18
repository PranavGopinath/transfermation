from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..players.search import router as players_router
from ..teams.search import router as team_router
from ..prediction.predict import router as prediction_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://transfermation.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(players_router)
app.include_router(team_router)
app.include_router(prediction_router)

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
