import os
import json
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import anthropic

load_dotenv()

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """あなたは新NISA（少額投資非課税制度）の専門アドバイザーです。
ユーザーの回答をもとに、個別に最適化された新NISA活用プランを提供します。

以下のルールを守ってください：
- 親しみやすい日本語で、専門用語は必ず分かりやすく説明する
- 具体的な数字（月額、年額、想定資産額）を必ず含める
- つみたて投資枠と成長投資枠の最適な使い方を必ず説明する
- おすすめの投資信託カテゴリを1〜2個提示する（具体的な商品名は避ける）
- 5〜10年後の想定資産額シミュレーションを含める
- 最後に「次のアクション」として証券口座開設を自然に促す
- 回答は800〜1200字程度にまとめる
- 必ず免責事項を最後に1行添える"""

def build_user_prompt(answers: dict) -> str:
    return f"""以下のユーザー情報に基づいて、新NISA活用プランを診断してください。

【ユーザー情報】
- 年齢: {answers.get('age', '不明')}
- 毎月の積立可能額: {answers.get('monthly', '不明')}
- 投資目標: {answers.get('goal', '不明')}
- リスク許容度: {answers.get('risk', '不明')}
- 投資経験: {answers.get('experience', '不明')}

この方に最適化した新NISA活用プランを、以下の構成でお伝えください：

1. 📊 あなたへのNISA設定診断
   - つみたて投資枠と成長投資枠の推奨比率と理由

2. 💰 具体的な積立設計
   - 月額の配分案と年間投資額

3. 📈 {answers.get('goal', '目標')}に向けたシミュレーション
   - 5年後・10年後の想定資産額（年利5%想定）

4. 🏦 おすすめの投資信託カテゴリ
   - あなたのリスク許容度に合ったカテゴリ

5. ⚡ 今すぐやること
   - 具体的な最初の一歩（証券口座開設から）"""

async def stream_diagnosis(answers: dict):
    prompt = build_user_prompt(answers)
    with client.messages.stream(
        model="claude-haiku-4-5-20251001",
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    ) as stream:
        for text in stream.text_stream:
            yield f"data: {json.dumps({'text': text})}\n\n"
    yield "data: [DONE]\n\n"

@app.get("/", response_class=HTMLResponse)
async def index():
    with open("templates/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.post("/api/diagnose")
async def diagnose(request: Request):
    answers = await request.json()
    return StreamingResponse(
        stream_diagnosis(answers),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
