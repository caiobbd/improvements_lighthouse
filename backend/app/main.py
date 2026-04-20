from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from backend.app.api import charts
from backend.app.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title=settings.app_name)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=max(256, int(settings.gzip_min_size)))

    app.include_router(charts.router, prefix=f"{settings.api_prefix}/charts", tags=["charts"])

    @app.get("/")
    def root() -> dict[str, str]:
        return {"name": settings.app_name, "status": "running"}

    return app


app = create_app()
