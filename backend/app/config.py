from functools import lru_cache
from typing import Annotated

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the Lighthouse chart backend."""

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Lighthouse Charts API"
    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8001
    api_prefix: str = "/api/v1"

    workspace_base_url: str = ""
    workspace_api_key: str = ""
    workspace_id: str = ""
    workspace_number: int = 0
    workspace_verify_ssl: bool = True

    cors_origins: Annotated[list[str], Field(default_factory=lambda: ["*"])]
    gzip_min_size: int = 1024

    @property
    def has_workspace_configuration(self) -> bool:
        return all(
            [
                self.workspace_base_url.strip(),
                self.workspace_api_key.strip(),
            ]
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
