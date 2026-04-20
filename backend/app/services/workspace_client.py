from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

from backend.app.config import get_settings

try:
    from workspace_api.main import Lighthouse, Workspace
except Exception:  # pragma: no cover - optional dependency at runtime
    Lighthouse = None
    Workspace = None


class WorkspaceClientError(RuntimeError):
    """Raised when the workspace client cannot be initialized."""


PROXY_ENV_VARS = (
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
)


def _disable_proxy_env() -> None:
    for key in PROXY_ENV_VARS:
        os.environ.pop(key, None)
    # Ensure requests-style clients skip proxy lookup for all hosts.
    os.environ["NO_PROXY"] = "*"
    os.environ["no_proxy"] = "*"


def _new_lighthouse(base_url: str, api_key: str) -> Any:
    if Lighthouse is None:
        raise WorkspaceClientError(
            "workspace_api.Lighthouse is not available in this Python environment."
        )

    try:
        return Lighthouse(root_url=base_url, api_key=api_key)
    except TypeError:
        return Lighthouse(base_url, api_key)
    except Exception as exc:  # pragma: no cover - runtime integration branch
        raise WorkspaceClientError(f"Unable to initialize Lighthouse client: {exc}") from exc


def _new_workspace(base_url: str, workspace_id: str, api_key: str) -> Any:
    if Workspace is None:
        raise WorkspaceClientError(
            "workspace_api.Workspace is not available in this Python environment."
        )

    try:
        return Workspace(root_url=base_url, id=workspace_id, api_key=api_key)
    except TypeError:
        return Workspace(base_url, workspace_id, api_key)
    except Exception as exc:  # pragma: no cover - runtime integration branch
        raise WorkspaceClientError(f"Unable to initialize Workspace client: {exc}") from exc


@lru_cache(maxsize=1)
def create_workspace_client() -> Any:
    _disable_proxy_env()
    settings = get_settings()

    if not settings.has_workspace_configuration:
        raise WorkspaceClientError(
            "Missing workspace configuration. Set WORKSPACE_BASE_URL and WORKSPACE_API_KEY."
        )

    base_url = settings.workspace_base_url.strip()
    api_key = settings.workspace_api_key.strip()
    workspace_id = settings.workspace_id.strip()

    # Preferred path: use Lighthouse so WORKSPACE_ID can stay optional.
    if Lighthouse is not None:
        lighthouse = _new_lighthouse(base_url, api_key)
        try:
            if workspace_id:
                return lighthouse.get_workspace(workspace_id=workspace_id)
            return lighthouse.get_workspace(number=settings.workspace_number)
        except Exception as exc:
            if not workspace_id:
                raise WorkspaceClientError(
                    "Unable to auto-resolve workspace via Lighthouse. "
                    "Set WORKSPACE_ID explicitly or verify API key/base URL permissions."
                ) from exc

    # Fallback path: direct Workspace client requires explicit workspace ID.
    if workspace_id:
        return _new_workspace(base_url, workspace_id, api_key)

    raise WorkspaceClientError(
        "Workspace client unavailable. Provide WORKSPACE_ID and ensure workspace_api is installed."
    )
