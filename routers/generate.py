from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.claude_client import claude_client

router = APIRouter()


class ArticleRequest(BaseModel):
    chat_content: str
    chat_title: str = "無題"
    output_mode: str = "article"
    length: str = "standard"
    custom_prompt: str | None = None


class CleanupRequest(BaseModel):
    content: str
    custom_prompt: str | None = None


@router.post("/article")
def generate_article(req: ArticleRequest):
    try:
        result = claude_client.generate_article(
            req.chat_content,
            req.chat_title,
            req.output_mode,
            req.length,
            req.custom_prompt,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cleanup")
def cleanup_text(req: CleanupRequest):
    try:
        result = claude_client.cleanup_text(req.content, req.custom_prompt)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
