# Claude APIで「新NISA診断ツール」を2週間で作って公開した話

## はじめに

「新NISAって結局何をすればいいの？」

周りから聞かれるたびに毎回同じ説明をしていた。
つみたて投資枠と成長投資枠の違い、証券会社の選び方、積立額の決め方……。

**これ、AIに全部やらせればよくない？**

そう思って作ったのが **[NISAナビ](https://nisa-navi.onrender.com/)** です。

5問答えるだけで、AIがあなた専用のNISA設定を診断してくれます。

---

## 作ったもの

https://nisa-navi.onrender.com/

![NISAナビのスクリーンショット](診断フォームのUI)

- 5問のステップ式診断フォーム
- Claude Haiku APIがリアルタイムでストリーミング診断
- SBI証券・楽天証券・松井証券の比較表
- 完全無料

---

## 技術スタック

```
Backend:  Python + FastAPI
AI:       Anthropic Claude API (claude-haiku-4-5)
Frontend: HTML + Tailwind CSS（バニラJS）
Hosting:  Render（無料プラン）
```

シンプルにしました。フレームワーク地獄にはまらず、**動くものを最速で出す**を優先。

---

## なぜClaudeを選んだか

新NISA診断のような**構造化された文章生成**は、Haiku（最安モデル）で十分な品質が出ます。

### コスト試算

| モデル | 1診断あたり | 月200件 |
|--------|------------|---------|
| Haiku 4.5 | 約0.9円 | **約174円** |
| Sonnet 4.6 | 約2.6円 | 約520円 |

月200人が使っても174円。アフィリエイト収益と比べると誤差レベルです。

---

## ストリーミングで「生成感」を演出する

診断結果をAPIから一括で返すのではなく、**リアルタイムでストリーミング**しています。

```python
# FastAPI側
async def stream_diagnosis(answers: dict):
    with client.messages.stream(
        model="claude-haiku-4-5-20251001",
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    ) as stream:
        for text in stream.text_stream:
            yield f"data: {json.dumps({'text': text})}\n\n"
    yield "data: [DONE]\n\n"

@app.post("/api/diagnose")
async def diagnose(request: Request):
    answers = await request.json()
    return StreamingResponse(
        stream_diagnosis(answers),
        media_type="text/event-stream"
    )
```

```javascript
// フロントエンド側（SSEで受信）
const reader = response.body.getReader();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // テキストをリアルタイムで表示
    resultEl.textContent += parsedChunk.text;
}
```

これだけで「AIが考えながら答えてくれている」感が出て、UXが大きく変わります。

---

## プロンプト設計

診断結果の品質はプロンプトで9割決まります。

```python
SYSTEM_PROMPT = """あなたは新NISA専門アドバイザーです。

以下のルールを守ってください：
- 親しみやすい日本語で、専門用語は必ず分かりやすく説明する
- 具体的な数字（月額・年額・想定資産額）を必ず含める
- つみたて投資枠と成長投資枠の最適な使い方を説明する
- 5〜10年後の想定資産額シミュレーションを含める
- 最後に証券口座開設を自然に促す"""
```

ポイントは「**具体的な数字を必ず含める**」の指定。これがないとAIが抽象的な回答を出してしまいます。

---

## 工夫したUI/UX

### ステップ式フォーム
5問を1画面で出さず、1問ずつ表示。離脱率が下がります。

```css
/* 選択したらアニメーションで確認 */
.choice.selected { 
    border-color: #2563eb; 
    background: #eff6ff; 
}
.choice.selected .check { opacity: 1; }
```

### ドット式プログレス
バーよりドットの方がアプリっぽく見えて、若い世代に刺さります。

```css
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.active { width: 24px; border-radius: 4px; } /* アクティブは横に伸びる */
```

---

## ハマったポイント

### Jinja2のキャッシュバグ
FastAPIのJinja2テンプレートで `TypeError: unhashable type: 'dict'` が発生。

**解決策**：Jinja2を使わず、HTMLをそのまま返す。

```python
# NG
return templates.TemplateResponse("index.html", {"request": request})

# OK
with open("templates/index.html", "r", encoding="utf-8") as f:
    return HTMLResponse(f.read())
```

---

## 収益化の設計

無料ツール → アフィリエイト誘導の構造です。

```
ユーザーが診断
    ↓
「あなたにはSBI証券がおすすめ」と表示
    ↓
口座開設ボタン（AFリンク）をクリック
    ↓
1件あたり3,000〜10,000円の報酬
```

証券会社のアフィリエイト報酬は日本最高水準。月10件成約で3〜10万円になります。

---

## 今後の展開

- [ ] iDeCo診断ツール
- [ ] ふるさと納税シミュレーター  
- [ ] Xでの自動投稿（認知拡大）

---

## まとめ

**Claude APIを使えば、こういう「専門知識のハードルが高い領域」のツールが簡単に作れます。**

金融・法律・医療など、「詳しい人に聞きたいけど聞きにくい」分野は特に刺さります。

ぜひ試してみてください👇
https://nisa-navi.onrender.com/

コードはGitHubにあります（スターいただけると嬉しいです）：
https://github.com/addinitial/nisa-navi

---

*この記事が参考になったらいいねをお願いします🙏*
