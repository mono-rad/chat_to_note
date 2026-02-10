ARTICLE_GENERATION_PROMPT = """あなたは技術ライターです。以下のチャット会話を、構造化された{output_mode_label}に変換してください。
Markdown形式で出力してください。

## 出力モード: {output_mode_label}

{mode_instruction}

## 長さガイドライン: {length_label}
{length_instruction}

## 出力形式
最初の行に「# タイトル」の形式でタイトルを入れてください。
その後に本文を続けてください。
"""

MODE_INSTRUCTIONS = {
    "article": "読み物として成立する記事を作成してください。導入・本文・まとめの構成で、見出しを適切に使い、読者に語りかけるような文体で書いてください。",
    "summary": "要点を簡潔にまとめてください。箇条書きやポイント整理を中心に、復習・整理に適した形式で出力してください。",
}

LENGTH_INSTRUCTIONS = {
    "short": "約500〜800文字程度の短い内容にしてください。",
    "standard": "約1500〜2000文字程度の標準的な長さにしてください。",
    "long": "約3000〜4000文字程度の詳細な内容にしてください。",
}

LENGTH_LABELS = {
    "short": "短め",
    "standard": "標準",
    "long": "長め",
}

OUTPUT_MODE_LABELS = {
    "article": "記事",
    "summary": "要約",
}


def build_generation_prompt(output_mode: str, length: str) -> str:
    return ARTICLE_GENERATION_PROMPT.format(
        output_mode_label=OUTPUT_MODE_LABELS.get(output_mode, "記事"),
        mode_instruction=MODE_INSTRUCTIONS.get(output_mode, MODE_INSTRUCTIONS["article"]),
        length_label=LENGTH_LABELS.get(length, "標準"),
        length_instruction=LENGTH_INSTRUCTIONS.get(length, LENGTH_INSTRUCTIONS["standard"]),
    )


CLEANUP_PROMPT = """以下の文章を自然な日本語に書き直してください。

【指示】
- 「ですね」「ですよ」「ましょう」「ますね」の連続を避ける
- 体言止めを適度に使う
- 専門用語はそのまま残す
- 過度に丁寧な表現を避け、読者に語りかけるようなトーンに
- 箇条書きの羅列を避け、文章として流れるように
- 「することができます」→「できます」
- 「という点が挙げられます」→ より直接的な表現に
"""

CONSISTENCY_CHECK_PROMPT = """以下の「新規記事」と「過去記事一覧」を比較し、一貫性をチェックしてください。

【チェック項目】
1. 主張の矛盾：新規記事の主張が過去記事と矛盾していないか
2. 用語・表現の統一性：同じ概念に異なる用語を使っていないか
3. トーン・文体の一貫性：文体が過去記事と大きく異なっていないか
4. 重複チェック：過去記事と内容が重複していないか

【出力形式】
必ず以下のJSON形式で回答してください。他のテキストは含めないでください。

{
  "issues": [
    {
      "type": "contradiction | terminology | tone | duplication",
      "severity": "high | medium | low",
      "description": "問題の説明",
      "suggestion": "改善提案"
    }
  ],
  "summary": "全体的な一貫性評価"
}

問題がない項目はissuesに含めないでください。
"""
