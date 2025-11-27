// script.js - Marcão Simulados (com suporte a Justificativa)
// Versão atualizada

const storageKey = 'simulado_questions_v1';

/* ---------- Helpers de UI ---------- */

function showMessage(txt, type = '') {
  const el = document.getElementById('messages');
  el.textContent = txt;
  el.className = 'small ' + (type ? 'msg-' + type : '');
  if (type === 'success') {
    setTimeout(() => {
      if (el.textContent === txt) {
        el.textContent = '';
        el.className = 'small';
      }
    }, 4000);
  }
}

function escapeHtml(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/[&<>"'\/]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;", "/": "&#x2F;" }[c] || c)
  );
}

function createEl(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  for (const k in props) {
    if (k === 'class') el.className = props[k];
    else if (k === 'text') el.textContent = props[k];
    else if (k.startsWith('data-')) el.setAttribute(k, props[k]);
    else el[k] = props[k];
  }
  children.forEach(c => {
    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else if (c) el.appendChild(c);
  });
  return el;
}

/* ---------- Mini-API Simulado ---------- */

const Simulado = {
  _load() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch (e) {
      console.error('Erro ao ler storage', e);
      return [];
    }
  },
  list() {
    return this._load();
  },
  add(questionObj) {
    const existing = this._load();
    // id by hash including justification to avoid equal questions with different explanation
    const id = btoa((questionObj.question || '') + '|' + (questionObj.options || []).join('|') + '|' + (questionObj.explanation || ''));
    if (existing.some(q => q.id === id)) {
      return { added: false, reason: 'duplicate' };
    }
    const item = Object.assign({ id }, questionObj);
    existing.push(item);
    localStorage.setItem(storageKey, JSON.stringify(existing));
    return { added: true, item, total: existing.length };
  },
  remove(id) {
    const existing = this._load();
    const filtered = existing.filter(q => q.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(filtered));
    return filtered.length;
  },
  update(id, newObj) {
    const existing = this._load();
    const idx = existing.findIndex(q => q.id === id);
    if (idx === -1) return false;
    // recompute id (include explanation)
    const newId = btoa((newObj.question || '') + '|' + (newObj.options || []).join('|') + '|' + (newObj.explanation || ''));
    existing[idx] = Object.assign({}, newObj, { id: newId });
    localStorage.setItem(storageKey, JSON.stringify(existing));
    return true;
  },
  clear() {
    localStorage.removeItem(storageKey);
  },
  export() {
    return this._load();
  }
};

/* ---------- Parser (com justificativa opcional) ---------- */

function parseBlock(text) {
  if (!text || !text.trim()) throw new Error('Texto vazio.');

  // Normalize
  text = text.replace(/\r\n/g, '\n').trim();

  // Extract gabarito (may contain spaces/newlines between letters)
  const gabMatch = text.match(/Gabarito:\s*([a-eA-E\s]+)/i);
  if (!gabMatch) throw new Error('Gabarito inválido ou ausente.');
  const gabaritoRaw = gabMatch[1].replace(/\s+/g, '').toLowerCase();
  const gabaritoLetters = gabaritoRaw.split('');

  // Remove the Gabarito block to simplify question parsing
  const withoutGabarito = text.replace(/Gabarito:\s*[a-eA-E\s]+/i, '').trim();

  // Split by "Pergunta:" occurrences (keep each block starting with Pergunta:)
  const parts = withoutGabarito.split(/(?=Pergunta:)/i).map(p => p.trim()).filter(Boolean);

  const questions = [];

  for (const p of parts) {
    if (!/^Pergunta:/i.test(p)) continue;
    const rest = p.replace(/^Pergunta:\s*/i, '').trim();

    // Question text is everything up to the first 'a)' occurrence
    let qText = '';
    const aIdx = rest.search(/\n\s*a\)\s/i);
    if (aIdx !== -1) {
      qText = rest.substring(0, aIdx).trim();
    } else {
      // fallback: try inline ' a)'
      const m = rest.match(/a\)\s*/i);
      if (m && m.index > 0) qText = rest.substring(0, m.index).trim();
      else throw new Error('Formato inválido: alternativa "a)" não encontrada.');
    }

    // Now capture options a) ... e) (each may be multiline)
    // We'll use lookaheads anchored at line starts with case-insensitive flags
    const aRe = /a\)\s*([\s\S]*?)(?=^\s*b\)\s)/im;
    const bRe = /b\)\s*([\s\S]*?)(?=^\s*c\)\s)/im;
    const cRe = /c\)\s*([\s\S]*?)(?=^\s*d\)\s)/im;
    const dRe = /d\)\s*([\s\S]*?)(?=^\s*e\)\s)/im;
    const eRe = /e\)\s*([\s\S]*?)(?=(^\s*Justificativa:|\nPergunta:|$))/im;

    const aM = rest.match(aRe);
    const bM = rest.match(bRe);
    const cM = rest.match(cRe);
    const dM = rest.match(dRe);
    const eM = rest.match(eRe);

    if (!aM || !bM || !cM || !dM || !eM) {
      throw new Error('Cada pergunta deve ter 5 alternativas (a) a e)). Problema na pergunta: ' + qText.slice(0, 40));
    }

    const opts = [aM[1], bM[1], cM[1], dM[1], eM[1]].map(s =>
      s.replace(/^\s*[-–—]?\s*/, '') // remove leading dash
       .replace(/\s+$/,'')
       .replace(/\s+/g, ' ')
       .trim()
    );

    // Try to find Justificativa inside this block (after e) ), optional and may be multiline
    let explanation = '';
    const justRe = /Justificativa:\s*([\s\S]*?)$/im;
    const justM = rest.match(justRe);
    if (justM) {
      explanation = justM[1].trim().replace(/\s+/g, ' ');
    } else {
      explanation = '';
    }

    questions.push({
      question: qText.replace(/\s+/g, ' ').trim(),
      options: opts,
      answer: null, // will set after mapping gabarito
      explanation
    });
  }

  if (gabaritoLetters.length !== questions.length) {
    throw new Error('Quantidade de letras no gabarito não corresponde ao número de perguntas. Achadas ' + questions.length + ' perguntas e ' + gabaritoLetters.length + ' letras.');
  }

  for (let i = 0; i < questions.length; i++) {
    const ch = gabaritoLetters[i];
    const idx = { a: 0, b: 1, c: 2, d: 3, e: 4 }[ch];
    if (idx === undefined) throw new Error('Letra inválida no gabarito: ' + ch);
    questions[i].answer = idx;
  }

  return questions;
}

/* ---------- Render list view (sem innerHTML) ---------- */

function renderListView() {
  const arr = Simulado.list();
  const list = document.getElementById('list');
  list.innerHTML = '';
  if (arr.length === 0) {
    showMessage('Nenhuma questão salva.', 'info');
    list.classList.add('hidden');
    return;
  }

  arr.forEach((q, i) => {
    const card = createEl('div', { class: 'question-card' });
    const header = createEl('div', { class: 'card-header' }, [
      createEl('strong', { text: '#' + (i + 1) + ' ' }),
      createEl('span', { text: q.question })
    ]);
    card.appendChild(header);

    const optsDiv = createEl('div', { class: 'options-list' });
    q.options.forEach((o, idx) => {
      const row = createEl('div', { class: 'small opt-row' });
      const letter = createEl('span', { class: 'opt-letter', text: String.fromCharCode(97 + idx) + ') ' });
      const txt = createEl('span', { text: o });
      if (idx === q.answer) letter.classList.add('correct-letter');
      row.appendChild(letter);
      row.appendChild(txt);
      optsDiv.appendChild(row);
    });
    card.appendChild(optsDiv);

    // Justificativa (if exists)
    const justDiv = createEl('div', { class: 'small justify' });
    justDiv.textContent = q.explanation ? ('Justificativa: ' + q.explanation) : 'Justificativa: (vazia)';
    card.appendChild(justDiv);

    const actions = createEl('div', { class: 'card-actions' });
    const editBtn = createEl('button', { text: '✏️ Editar' });
    const delBtn = createEl('button', { text: '❌ Excluir' });

    editBtn.addEventListener('click', () => openEditDialog(q));
    delBtn.addEventListener('click', () => {
      openConfirm('Excluir esta questão?', () => {
        Simulado.remove(q.id);
        renderListView();
        showMessage('Questão excluída.', 'success');
      });
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);

    list.appendChild(card);
  });

  list.classList.remove('hidden');
  document.getElementById('quiz').classList.add('hidden');
}

/* ---------- Edit dialog (inclui justificativa) ---------- */

function openEditDialog(question) {
  const modal = document.getElementById('modalConfirm');
  const title = modal.querySelector('#confirmTitle');
  const message = modal.querySelector('#confirmMessage');
  const okBtn = modal.querySelector('#confirmOk');
  const cancelBtn = modal.querySelector('#confirmCancel');

  title.textContent = 'Editar questão';
  message.innerHTML = '';

  const form = createEl('div', { class: 'edit-form' });
  form.appendChild(createEl('label', { text: 'Pergunta' }));
  const qInput = createEl('textarea', { rows: 3 });
  qInput.value = question.question;
  form.appendChild(qInput);

  question.options.forEach((opt, i) => {
    form.appendChild(createEl('label', { text: String.fromCharCode(97 + i) + ')' }));
    const t = createEl('input', { type: 'text' });
    t.value = opt;
    form.appendChild(t);
  });

  form.appendChild(createEl('label', { text: 'Índice da resposta correta (0-4)' }));
  const ansInput = createEl('input', { type: 'number', min: 0, max: 4, value: question.answer });
  form.appendChild(ansInput);

  form.appendChild(createEl('label', { text: 'Justificativa (opcional)' }));
  const justInput = createEl('textarea', { rows: 3 });
  justInput.value = question.explanation || '';
  form.appendChild(justInput);

  message.appendChild(form);
  okBtn.textContent = 'Salvar';
  cancelBtn.textContent = 'Cancelar';
  modal.classList.remove('hidden');

  const onOk = () => {
    const newQ = qInput.value.trim();
    const newOptions = Array.from(form.querySelectorAll('input[type="text"]')).map(i => i.value.trim());
    const newAnswer = parseInt(ansInput.value, 10);
    const newExplanation = justInput.value.trim();

    if (!newQ || newOptions.some(o => !o)) {
      showMessage('Pergunta e alternativas não podem ficar vazias.', 'error');
      return;
    }
    Simulado.update(question.id, { question: newQ, options: newOptions, answer: newAnswer, explanation: newExplanation });
    modal.classList.add('hidden');
    showMessage('Questão atualizada.', 'success');
    renderListView();
    okBtn.removeEventListener('click', onOk);
  };

  okBtn.addEventListener('click', onOk, { once: true });
  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  }, { once: true });
}

/* ---------- Confirm modal utility ---------- */

function openConfirm(message, onOk) {
  const modal = document.getElementById('modalConfirm');
  modal.querySelector('#confirmTitle').textContent = 'Confirmação';
  modal.querySelector('#confirmMessage').textContent = message;
  const okBtn = modal.querySelector('#confirmOk');
  const cancelBtn = modal.querySelector('#confirmCancel');

  modal.classList.remove('hidden');

  const cleanup = () => {
    okBtn.removeEventListener('click', okHandler);
    cancelBtn.removeEventListener('click', cancelHandler);
    modal.classList.add('hidden');
  };

  const okHandler = () => {
    cleanup();
    onOk && onOk();
  };
  const cancelHandler = () => {
    cleanup();
  };

  okBtn.addEventListener('click', okHandler);
  cancelBtn.addEventListener('click', cancelHandler);
}

/* ---------- Eventos de Import / Export / Clear ---------- */

document.getElementById('importBtn').addEventListener('click', () => {
  const txt = document.getElementById('input').value;
  try {
    const qs = parseBlock(txt);
    let added = 0, duplicates = 0;
    qs.forEach(q => {
      const res = Simulado.add(q);
      if (res.added) added++;
      else duplicates++;
    });
    const total = Simulado.list().length;
    showMessage(`Importado ${added} questões. Duplicadas: ${duplicates}. Total salvo: ${total}.`, 'success');
    document.getElementById('input').value = '';
  } catch (e) {
    showMessage('Erro: ' + e.message, 'error');
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const arr = Simulado.export();
  const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'simulado_questions.json';
  a.click();
  URL.revokeObjectURL(url);
  showMessage('Exportado JSON.', 'success');
});

document.getElementById('clearBtn').addEventListener('click', () => {
  openConfirm('Apagar todas as questões salvas? Esta ação não pode ser desfeita.', () => {
    Simulado.clear();
    document.getElementById('list').innerHTML = '';
    showMessage('Todas as questões foram apagadas.', 'success');
  });
});

/* ---------- List & Start ---------- */

document.getElementById('listBtn').addEventListener('click', () => {
  renderListView();
});

document.getElementById('startBtn').addEventListener('click', () => {
  openConfirm('Iniciar simulado agora?', () => {
    const arr = Simulado.list();
    if (arr.length === 0) {
      showMessage('Não há perguntas salvas.', 'error');
      return;
    }
    startQuiz(arr);
  });
});

/* ---------- Quiz flow with progress, improved UI, review (shows justificativa) ---------- */

function startQuiz(qs) {
  const questions = shuffle(qs.slice());
  let index = 0;
  let correct = 0;
  const userAnswers = [];

  const quizEl = document.getElementById('quiz');
  quizEl.innerHTML = '';
  quizEl.classList.remove('hidden');
  document.getElementById('list').classList.add('hidden');

  const progressWrap = createEl('div', { class: 'progress-wrap' });
  const progressBar = createEl('div', { class: 'progress-bar' });
  progressWrap.appendChild(progressBar);
  const progressText = createEl('div', { class: 'progress-text', text: `0 / ${questions.length}` });

  quizEl.appendChild(progressWrap);
  quizEl.appendChild(progressText);

  function updateProgress() {
    const val = Math.round(((index) / questions.length) * 100);
    progressBar.style.width = val + '%';
    progressText.textContent = `${index} / ${questions.length}`;
  }

  function renderQuestion() {
    const q = questions[index];
    // remove previous dynamic question card
    quizEl.querySelectorAll('.question-card.dynamic').forEach(n => n.remove());
    const card = createEl('div', { class: 'question-card dynamic' });

    card.appendChild(createEl('div', { class: 'card-header' }, [
      createEl('strong', { text: 'Pergunta ' + (index + 1) + ' de ' + questions.length + ' ' })
    ]));

    card.appendChild(createEl('div', { class: 'qtext', text: q.question }));

    const optionsWrap = createEl('div', { class: 'options-grid' });

    q.options.forEach((opt, i) => {
      const btn = createEl('button', { class: 'option', type: 'button' });
      const letter = createEl('span', { class: 'opt-letter', text: String.fromCharCode(97 + i) + ')' });
      const txt = createEl('span', { class: 'opt-text', text: opt });
      btn.appendChild(letter);
      btn.appendChild(txt);

      btn.addEventListener('click', () => {
        optionsWrap.querySelectorAll('button').forEach(b => b.disabled = true);
        userAnswers[index] = i;
        if (i === q.answer) {
          btn.classList.add('correct');
          correct++;
        } else {
          btn.classList.add('wrong');
          const correctBtn = optionsWrap.querySelectorAll('button')[q.answer];
          if (correctBtn) correctBtn.classList.add('correct');
        }

        // show justificativa if exists
        if (q.explanation) {
          const just = createEl('div', { class: 'small justify', text: 'Justificativa: ' + q.explanation });
          card.appendChild(just);
        }

        const next = createEl('div', { class: 'next-wrap' });
        const nxtBtn = createEl('button', { text: (index < questions.length - 1) ? 'Próxima' : 'Finalizar' });
        nxtBtn.addEventListener('click', () => {
          index++;
          if (index < questions.length) {
            updateProgress();
            renderQuestion();
          } else {
            finish();
          }
        });
        next.appendChild(nxtBtn);
        card.appendChild(next);
      });

      optionsWrap.appendChild(btn);
    });

    card.appendChild(optionsWrap);
    quizEl.appendChild(card);
    updateProgress();
  }

  function finish() {
    quizEl.innerHTML = '';
    const res = createEl('div', { class: 'question-card' });
    const pct = Math.round((correct / questions.length) * 100);
    res.appendChild(createEl('h3', { text: 'Resultado' }));
    res.appendChild(createEl('p', { text: `Acertos: ${correct} / ${questions.length} (${pct}%)` }));

    const btns = createEl('div', { class: 'card-actions' });
    const reviewBtn = createEl('button', { text: 'Revisar perguntas' });
    const closeBtn = createEl('button', { text: 'Fechar' });

    reviewBtn.addEventListener('click', () => {
      renderReview();
    });

    closeBtn.addEventListener('click', () => {
      quizEl.classList.add('hidden');
      showMessage('Simulado finalizado. Resultado: ' + pct + '%', 'success');
    });

    btns.appendChild(reviewBtn);
    btns.appendChild(closeBtn);
    res.appendChild(btns);
    quizEl.appendChild(res);
  }

  function renderReview() {
    quizEl.innerHTML = '';
    const wrap = createEl('div');
    questions.forEach((q, i) => {
      const card = createEl('div', { class: 'question-card' });
      card.appendChild(createEl('strong', { text: 'Pergunta ' + (i + 1) + ': ' }));
      card.appendChild(createEl('div', { text: q.question }));

      q.options.forEach((opt, idx) => {
        const row = createEl('div', { class: 'small opt-row' });
        const letter = createEl('span', { class: 'opt-letter', text: String.fromCharCode(97 + idx) + ') ' });
        const txt = createEl('span', { text: opt });
        if (idx === q.answer) letter.classList.add('correct-letter');
        if (userAnswers[i] === idx) row.classList.add('user-selected');
        row.appendChild(letter);
        row.appendChild(txt);
        card.appendChild(row);
      });

      const explain = createEl('div', { class: 'explain small', text: q.explanation ? ('Justificativa: ' + q.explanation) : 'Justificativa: (vazia)' });
      card.appendChild(explain);
      wrap.appendChild(card);
    });

    const back = createEl('div', { class: 'card-actions' });
    const exit = createEl('button', { text: 'Fechar revisão' });
    exit.addEventListener('click', () => {
      quizEl.classList.add('hidden');
      showMessage('Revisão finalizada.', 'info');
    });
    back.appendChild(exit);
    wrap.appendChild(back);
    quizEl.appendChild(wrap);
  }

  renderQuestion();
}

/* ---------- Shuffle utility ---------- */

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Modals and theme ---------- */

const modal = document.getElementById('modal');
const showBtn = document.getElementById('showInstructionsBtn');
const closeBtn = document.getElementById('closeModalBtn');
const modalOk = document.getElementById('modalOkBtn');

showBtn.addEventListener('click', () => modal.classList.remove('hidden'));
closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
modalOk.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

const modalScript = document.getElementById('modalScript');
const showScriptBtn = document.getElementById('showScriptBtn');
const closeScriptModalBtn = document.getElementById('closeScriptModalBtn');
const modalScriptOkBtn = document.getElementById('modalScriptOkBtn');

showScriptBtn.addEventListener('click', () => modalScript.classList.remove('hidden'));
closeScriptModalBtn.addEventListener('click', () => modalScript.classList.add('hidden'));
modalScriptOkBtn.addEventListener('click', () => modalScript.classList.add('hidden'));
modalScript.addEventListener('click', (e) => { if (e.target === modalScript) modalScript.classList.add('hidden'); });

const modalConfirm = document.getElementById('modalConfirm');
modalConfirm.querySelector('#closeConfirmModalBtn').addEventListener('click', () => modalConfirm.classList.add('hidden'));
modalConfirm.addEventListener('click', (e) => { if (e.target === modalConfirm) modalConfirm.classList.add('hidden'); });

/* Theme toggle */
const themeToggle = document.getElementById('themeToggle');
const root = document.documentElement;
themeToggle.addEventListener('click', () => {
  if (root.classList.contains('dark')) {
    root.classList.remove('dark');
    localStorage.setItem('simulado_theme', 'light');
  } else {
    root.classList.add('dark');
    localStorage.setItem('simulado_theme', 'dark');
  }
});
(function () {
  const t = localStorage.getItem('simulado_theme') || 'light';
  if (t === 'dark') root.classList.add('dark');
})();

/* On load clear messages */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('messages').textContent = '';
});
