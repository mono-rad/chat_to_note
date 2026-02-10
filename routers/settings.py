from pathlib import Path

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import settings

router = APIRouter()


class ApiKeyRequest(BaseModel):
    api_key: str


@router.get("")
def get_settings():
    return {"api_key_configured": bool(settings.ANTHROPIC_API_KEY)}


@router.post("/apikey")
def save_api_key(req: ApiKeyRequest):
    try:
        client = anthropic.Anthropic(api_key=req.api_key)
        client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=10,
            messages=[{"role": "user", "content": "test"}],
        )
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=400, detail="無効なAPIキーです。")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"APIキーの検証に失敗しました: {e}")

    settings.ANTHROPIC_API_KEY = req.api_key

    try:
        _update_env_file("ANTHROPIC_API_KEY", req.api_key)
    except Exception:
        pass

    return {"success": True}


def _update_env_file(key: str, value: str) -> None:
    env_path = Path(".env")
    lines: list[str] = []
    found = False

    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines(keepends=True)

    new_lines: list[str] = []
    for line in lines:
        if line.startswith(f"{key}="):
            new_lines.append(f"{key}={value}\n")
            found = True
        else:
            new_lines.append(line)

    if not found:
        new_lines.append(f"{key}={value}\n")

    env_path.write_text("".join(new_lines), encoding="utf-8")
