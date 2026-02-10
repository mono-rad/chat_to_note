import json

import anthropic

from config import settings
from services.prompts import build_generation_prompt, CLEANUP_PROMPT, CONSISTENCY_CHECK_PROMPT


class ClaudeClient:
    def _get_client(self) -> anthropic.Anthropic:
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("APIキーが設定されていません。設定画面からAPIキーを入力してください。")
        return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def generate_article(
        self,
        chat_content: str,
        chat_title: str,
        output_mode: str,
        length: str,
        custom_prompt: str | None = None,
    ) -> dict:
        client = self._get_client()
        system_prompt = custom_prompt or build_generation_prompt(output_mode, length)
        max_tokens = (
            settings.MAX_TOKENS_ARTICLE
            if output_mode == "article"
            else settings.MAX_TOKENS_SUMMARY
        )

        message = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"チャットタイトル: {chat_title}\n\n{chat_content}",
                }
            ],
        )

        content = message.content[0].text
        title = chat_title
        lines = content.split("\n")
        if lines and lines[0].startswith("# "):
            title = lines[0][2:].strip()

        return {
            "title": title,
            "content": content,
            "token_usage": {
                "input": message.usage.input_tokens,
                "output": message.usage.output_tokens,
            },
        }

    def cleanup_text(self, content: str, custom_prompt: str | None = None) -> dict:
        client = self._get_client()
        prompt = custom_prompt or CLEANUP_PROMPT

        message = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.MAX_TOKENS_CLEANUP,
            system=prompt,
            messages=[{"role": "user", "content": content}],
        )

        return {"content": message.content[0].text}

    def check_consistency(self, new_article: str, past_articles: list[dict]) -> dict:
        client = self._get_client()
        past_text = "\n\n---\n\n".join(
            f"### {a['title']}\n{a['content']}" for a in past_articles
        )

        message = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.MAX_TOKENS_CONSISTENCY,
            system=CONSISTENCY_CHECK_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"【新規記事】\n{new_article}\n\n【過去記事一覧】\n{past_text}",
                }
            ],
        )

        try:
            result = json.loads(message.content[0].text)
        except json.JSONDecodeError:
            result = {"issues": [], "summary": message.content[0].text}

        return result


claude_client = ClaudeClient()
