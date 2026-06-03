const answers = {};
let currentStep = 1;
const totalSteps = 5;
const keys = ['age', 'monthly', 'goal', 'risk', 'experience'];

// 選択肢クリック
document.querySelectorAll('.choice').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key;
    document.querySelectorAll(`[data-key="${key}"]`).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    answers[key] = btn.dataset.val;
    document.getElementById('btn-next').disabled = false;
  });
});

function updateDots() {
  for (let i = 1; i <= totalSteps; i++) {
    const dot = document.getElementById(`dot-${i}`);
    dot.className = 'dot';
    if (i < currentStep) dot.classList.add('done');
    else if (i === currentStep) dot.classList.add('active');
  }
  document.getElementById('step-counter').textContent = `${currentStep} / ${totalSteps}`;
  const back = document.getElementById('btn-back');
  back.style.display = currentStep === 1 ? 'none' : 'block';
  const next = document.getElementById('btn-next');
  next.textContent = currentStep === totalSteps ? '診断する ✨' : '次へ';
}

function nextStep() {
  if (!answers[keys[currentStep - 1]]) return;
  if (currentStep === totalSteps) { submitQuiz(); return; }
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  currentStep++;
  document.getElementById(`step-${currentStep}`).classList.add('active');
  document.getElementById('btn-next').disabled = !answers[keys[currentStep - 1]];
  updateDots();
}

function prevStep() {
  if (currentStep <= 1) return;
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  currentStep--;
  document.getElementById(`step-${currentStep}`).classList.add('active');
  document.getElementById('btn-next').disabled = false;
  updateDots();
}

async function submitQuiz() {
  document.getElementById('quiz-section').style.display = 'none';
  document.getElementById('loading-section').style.display = 'block';

  try {
    const response = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answers)
    });

    document.getElementById('loading-section').style.display = 'none';
    document.getElementById('result-section').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';
    const resultEl = document.getElementById('ai-result');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) { result += parsed.text; resultEl.textContent = result; }
          } catch {}
        }
      }
    }
  } catch (err) {
    document.getElementById('loading-section').style.display = 'none';
    document.getElementById('result-section').style.display = 'block';
    document.getElementById('ai-result').textContent = 'エラーが発生しました: ' + err.message;
  }
}

function shareResult() {
  const text = encodeURIComponent('新NISAの最適な設定をAIで無料診断してもらいました📊 #新NISA #投資 #資産運用');
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(location.href)}`, '_blank');
}

function resetQuiz() {
  Object.keys(answers).forEach(k => delete answers[k]);
  currentStep = 1;
  document.querySelectorAll('.choice').forEach(b => b.classList.remove('selected'));
  document.getElementById('result-section').style.display = 'none';
  document.getElementById('quiz-section').style.display = 'block';
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-1').classList.add('active');
  document.getElementById('btn-next').disabled = true;
  document.getElementById('ai-result').textContent = '';
  updateDots();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
