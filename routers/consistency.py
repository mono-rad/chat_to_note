from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.claude_client import claude_client

router = APIRouter()


class PastArticle(BaseModel):
    title: str
    content: str


class ConsistencyRequest(BaseModel):
    new_article: str
    past_articles: list[PastArticle]


@router.post("/check")
def check_consistency(req: ConsistencyRequest):
    if not req.past_articles:
        return {"issues": [], "summary": "比較対象の過去記事がありません。"}
    try:
        result = claude_client.check_consistency(
            req.new_article,
            [a.model_dump() for a in req.past_articles],
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
