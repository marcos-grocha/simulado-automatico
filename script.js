const storageKey = 'simulado_questions_v1';

/* ============================================================
   Helpers
   ============================================================ */

function showMessage(txt, type = '') {
  const el = document.getElementById('messages');
  el.textContent = txt;

  const color =
    type === 'success' ? 'text-green-600' :
    type === 'error'   ? 'text-red-600' :
    'text-gray-500 dark:text-gray-400';

  el.className = `text-sm mb-4 ${color}`;

  if (type === 'success') {
    setTimeout(() => {
      if (el.textContent === txt) {
        el.textContent = '';
        el.className = 'text-sm text-gray-500 dark:text-gray-400';
      }
    }, 4000);
  }
}

function escapeHtml(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/[&<>"'\/]/g, c =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
      "/": "&#x2F;"
    }[c] || c)
  );
}

function createEl(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  for (const k in props) {
    if (k === 'class') el.className = props[k];
    else if (k === 'text') el.textContent = props[k];
    else el[k] = props[k];
  }
  children.forEach(c => {
    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else if (c) el.appendChild(c);
  });
  return el;
}

/* ============================================================
   Storage API
   ============================================================ */

const Simulado = {
  _load() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  },
  list() { return this._load(); },
  add(qObj) {
    const arr = this._load();
    const id = btoa(
      (qObj.question || '') +
      '|' + (qObj.options || []).join('|') +
      '|' + (qObj.explanation || '')
    );

    if (arr.some(q => q.id === id)) return { added: false, reason: 'duplicate' };

    arr.push({ id, ...qObj });
    localStorage.setItem(storageKey, JSON.stringify(arr));
    return { added: true };
  },
  remove(id) {
    const arr = this._load().filter(q => q.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(arr));
  },
  update(id, newObj) {
    const arr = this._load();
    const i = arr.findIndex(q => q.id === id);
    if (i === -1) return false;

    const newId = btoa(
      (newObj.question || '') +
      '|' + (newObj.options || []).join('|') +
      '|' + (newObj.explanation || '')
    );

    arr[i] = { id: newId, ...newObj };
    localStorage.setItem(storageKey, JSON.stringify(arr));
    return true;
  },
  clear() { localStorage.removeItem(storageKey); },
  export() { return this._load(); }
};

/* ============================================================
   Parser (com justificativa opcional)
   ============================================================ */

function parseBlock(text) {
  if (!text || !text.trim()) throw new Error('Texto vazio.');

  text = text.replace(/\r\n/g, '\n').trim();

  const gabMatch = text.match(/Gabarito:\s*([a-eA-E\s]+)/i);
  if (!gabMatch) throw new Error('Gabarito inválido ou ausente.');

  const gabarito = gabMatch[1].replace(/\s+/g, '').toLowerCase().split('');

  const noGab = text.replace(/Gabarito:\s*[a-eA-E\s]+/i, '').trim();

  const parts = noGab
    .split(/(?=Pergunta:)/i)
    .map(p => p.trim())
    .filter(Boolean);

  const questions = [];

  for (const p of parts) {
    const rest = p.replace(/^Pergunta:\s*/i, '').trim();

    const aIdx = rest.search(/\n\s*a\)\s/i);
    if (aIdx === -1) throw new Error('Alternativa a) não encontrada.');

    const qText = rest.substring(0, aIdx).trim();

    const re = label =>
      new RegExp(`${label}\\)\\s*([\\s\\S]*?)(?=^\\s*[a-e]\\)|^\\s*Justificativa:|$)`, 'im');

    const options = ['a','b','c','d','e'].map(l => {
      const m = rest.match(re(l));
      if (!m) throw new Error(`Alternativa ${l}) faltando.`);
      return m[1].replace(/\s+/g, ' ').trim();
    });

    const justM = rest.match(/Justificativa:\s*([\s\S]*)$/i);
    const explanation = justM ? justM[1].replace(/\s+/g,' ').trim() : '';

    questions.push({ question: qText, options, answer: null, explanation });
  }

  if (questions.length !== gabarito.length)
    throw new Error('Quantidade de perguntas ≠ quantidade de letras no gabarito.');

  questions.forEach((q, i) => {
    const idx = { a:0,b:1,c:2,d:3,e:4 }[gabarito[i]];
    if (idx === undefined) throw new Error('Letra inválida no gabarito.');
    q.answer = idx;
  });

  return questions;
}

/* ============================================================
   LISTA DE QUESTÕES
   ============================================================ */

function renderListView() {
  const arr = Simulado.list();
  const list = document.getElementById('list');
  list.innerHTML = '';

  if (arr.length === 0) {
    showMessage('Nenhuma questão salva.', 'info');
    list.classList.add('hidden');
    return;
  }

  arr.forEach((q, idx) => {
    const card = createEl("div", {
      class:
        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 " +
        "rounded-lg p-4 shadow mb-4"
    });

    card.appendChild(createEl("div", {
      class: "font-semibold mb-2",
      text: `#${idx + 1} — ${q.question}`
    }));

    q.options.forEach((opt, i) => {
      const row = createEl("div", {
        class: "flex items-start gap-2 text-sm my-1"
      });

      const letter = createEl("span", {
        class: "font-bold text-gray-500 w-5",
        text: `${String.fromCharCode(97 + i)})`
      });

      if (i === q.answer) letter.classList.add("text-green-600");

      row.appendChild(letter);
      row.appendChild(createEl("span", { text: opt }));
      card.appendChild(row);
    });

    const just = createEl("div", {
      class: "text-xs text-gray-500 dark:text-gray-400 mt-2",
      text: `Justificativa: ${q.explanation || "(vazia)"}`
    });
    card.appendChild(just);

    const btns = createEl("div", { class: "flex gap-2 mt-3" });

    const editBtn = createEl("button", {
      text: "Editar",
      class:
        "px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 transition text-sm"
    });

    const delBtn = createEl("button", {
      text: "Excluir",
      class:
        "px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition text-sm"
    });

    editBtn.addEventListener("click", () => openEditDialog(q));
    delBtn.addEventListener("click", () => {
      openConfirm("Excluir esta questão?", () => {
        Simulado.remove(q.id);
        renderListView();
        showMessage("Questão excluída.", "success");
      });
    });

    btns.appendChild(editBtn);
    btns.appendChild(delBtn);
    card.appendChild(btns);

    list.appendChild(card);
  });

  list.classList.remove("hidden");
  document.getElementById("quiz").classList.add("hidden");
}

/* ============================================================
   MODAL DE EDIÇÃO
   ============================================================ */

function openEditDialog(q) {
  const modal = document.getElementById('modalConfirm');
  const title = modal.querySelector('#confirmTitle');
  const message = modal.querySelector('#confirmMessage');

  title.textContent = 'Editar questão';
  message.innerHTML = '';

  const form = createEl("div", { class: "flex flex-col gap-2 text-sm" });

  // Pergunta
  form.appendChild(createEl("label", { text: "Pergunta" }));
  const qInput = createEl("textarea", {
    class:
      "border border-gray-300 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-800",
    rows: 3
  });
  qInput.value = q.question;
  form.appendChild(qInput);

  q.options.forEach((opt, i) => {
    form.appendChild(createEl("label", { text: `${String.fromCharCode(97 + i)})` }));
    const t = createEl("input", {
      class:
        "border border-gray-300 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-800",
      type: "text",
      value: opt
    });
    form.appendChild(t);
  });

  // Resposta correta
  form.appendChild(createEl("label", {
    text: "Índice da resposta correta (0-4)"
  }));
  const ansInput = createEl("input", {
    type: "number",
    min: 0,
    max: 4,
    value: q.answer,
    class:
      "border border-gray-300 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-800"
  });
  form.appendChild(ansInput);

  // Justificativa
  form.appendChild(createEl("label", {
    text: "Justificativa (opcional)"
  }));
  const justInput = createEl("textarea", {
    class:
      "border border-gray-300 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-800",
    rows: 3
  });
  justInput.value = q.explanation || "";
  form.appendChild(justInput);

  message.appendChild(form);

  const okBtn = modal.querySelector('#confirmOk');
  const cancelBtn = modal.querySelector('#confirmCancel');

  okBtn.textContent = "Salvar";
  cancelBtn.textContent = "Cancelar";

  modal.classList.remove("hidden");

  const onOk = () => {
    const newQ = qInput.value.trim();
    const newOpts = Array.from(form.querySelectorAll('input[type="text"]'))
      .map(e => e.value.trim());
    const newAns = parseInt(ansInput.value, 10);
    const newExp = justInput.value.trim();

    if (!newQ || newOpts.some(o => !o)) {
      showMessage("Pergunta e alternativas não podem ficar vazias.", "error");
      return;
    }

    Simulado.update(q.id, {
      question: newQ,
      options: newOpts,
      answer: newAns,
      explanation: newExp
    });

    modal.classList.add("hidden");
    showMessage("Questão atualizada.", "success");
    renderListView();
  };

  okBtn.addEventListener("click", onOk, { once: true });
  cancelBtn.addEventListener("click", () => modal.classList.add("hidden"), { once: true });
}

/* ============================================================
   MODAL CONFIRMAÇÃO
   ============================================================ */

function openConfirm(message, onOk) {
  const modal = document.getElementById('modalConfirm');
  modal.querySelector('#confirmTitle').textContent = "Confirmação";
  modal.querySelector('#confirmMessage').textContent = message;

  const okBtn = modal.querySelector('#confirmOk');
  const cancelBtn = modal.querySelector('#confirmCancel');

  modal.classList.remove("hidden");

  const cleanup = () => {
    okBtn.removeEventListener("click", okH);
    cancelBtn.removeEventListener("click", cancelH);
    modal.classList.add("hidden");
  };

  const okH = () => {
    cleanup();
    onOk && onOk();
  };

  const cancelH = () => cleanup();

  okBtn.addEventListener("click", okH);
  cancelBtn.addEventListener("click", cancelH);
}

/* ============================================================
   Importação / Exportação
   ============================================================ */

document.getElementById('importBtn').addEventListener('click', () => {
  const txt = document.getElementById('input').value;
  try {
    const qs = parseBlock(txt);
    let added = 0, dup = 0;

    qs.forEach(q => {
      const res = Simulado.add(q);
      if (res.added) added++;
      else dup++;
    });

    showMessage(`Importadas ${added}. Duplicadas: ${dup}.`, "success");
    document.getElementById('input').value = "";

  } catch (e) {
    showMessage('Erro: ' + e.message, 'error');
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  showMessage("Exportar JSON está desativado.", "error");
});

document.getElementById('clearBtn').addEventListener('click', () => {
  openConfirm("Apagar todas as questões?", () => {
    Simulado.clear();
    document.getElementById('list').innerHTML = '';
    showMessage("Todas as questões foram apagadas.", "success");
  });
});

/* ============================================================
   Botões principais
   ============================================================ */

document.getElementById('listBtn').addEventListener('click', () => {
  renderListView();
  // Quando mostrar a lista, vamos esconder o menu também para foco no conteúdo
  document.getElementById("mainMenu")?.classList.add("hidden");
  document.getElementById("backToMenuContainer")?.classList.remove("hidden");
});

document.getElementById('startBtn').addEventListener('click', () => {
  openConfirm("Iniciar simulado agora?", () => {
    const arr = Simulado.list();
    if (arr.length === 0)
      return showMessage("Não há perguntas salvas.", "error");
    startQuiz(arr);
  });
});

/* ============================================================
   QUIZ — com layout Tailwind + esconder menu
   ============================================================ */

function startQuiz(qs) {

  // 🔥 Esconder menu imediatamente ao iniciar
  document.getElementById("mainMenu")?.classList.add("hidden");
  document.getElementById("backToMenuContainer")?.classList.remove("hidden");

  const questions = shuffle(qs.slice());
  let index = 0;
  let correct = 0;
  const answers = [];

  const quizEl = document.getElementById('quiz');
  quizEl.innerHTML = '';
  quizEl.classList.remove('hidden');
  document.getElementById('list').classList.add('hidden');

  /* Barra de progresso */
  const pWrap = createEl('div', { class: 'progress-wrap' });
  const pBar = createEl('div', { class: 'progress-bar' });
  pWrap.appendChild(pBar);

  const pText = createEl('div', {
    class: 'text-sm text-gray-500 dark:text-gray-400 mb-2',
    text: `0 / ${questions.length}`
  });

  quizEl.appendChild(pWrap);
  quizEl.appendChild(pText);

  function updateProgress() {
    const pct = Math.round((index / questions.length) * 100);
    pBar.style.width = pct + '%';
    pText.textContent = `${index} / ${questions.length}`;
  }

  function renderQuestion() {
    const q = questions[index];

    quizEl.querySelectorAll('.dynamic').forEach(el => el.remove());

    const card = createEl('div', {
      class:
        "dynamic bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 " +
        "rounded-lg p-4 shadow-lg mt-4"
    });

    card.appendChild(createEl('div', {
      class: "font-semibold mb-2",
      text: `Pergunta ${index + 1} de ${questions.length}`
    }));

    card.appendChild(createEl('p', {
      class: "mb-4",
      text: q.question
    }));

    /* Alternativas */
    const opts = createEl('div', { class: 'grid gap-2' });

    q.options.forEach((opt, i) => {
      const btn = createEl('button', {
        class:
          "text-left px-3 py-2 rounded border border-gray-300 dark:border-gray-600 " +
          "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 " +
          "transition",
        type: "button"
      });

      const letter = createEl('span', {
        class: "font-bold uppercase mr-2 text-primary",
        text: `${String.fromCharCode(97 + i)})`
      });

      const txt = createEl('span', { text: opt });

      btn.appendChild(letter);
      btn.appendChild(txt);

      btn.addEventListener("click", () => {
        opts.querySelectorAll('button').forEach(b => (b.disabled = true));

        answers[index] = i;

        if (i === q.answer) {
          btn.classList.add('correct');
          correct++;
        } else {
          btn.classList.add('wrong');
          const cb = opts.querySelectorAll('button')[q.answer];
          if (cb) cb.classList.add('correct');
        }

        if (q.explanation) {
          card.appendChild(createEl('p', {
            class: "mt-3 text-sm text-gray-600 dark:text-gray-300",
            text: "Justificativa: " + q.explanation
          }));
        }

        const next = createEl('div', { class: 'mt-4' });

        const nBtn = createEl('button', {
          class:
            "px-4 py-2 rounded bg-primary text-white hover:bg-blue-700 transition",
          text: index < questions.length - 1 ? "Próxima" : "Finalizar"
        });

        nBtn.addEventListener("click", () => {
          index++;
          if (index < questions.length) {
            updateProgress();
            renderQuestion();
          } else {
            finish();
          }
        });

        next.appendChild(nBtn);
        card.appendChild(next);
      });

      opts.appendChild(btn);
    });

    card.appendChild(opts);
    quizEl.appendChild(card);

    updateProgress();
  }

  function finish() {
    quizEl.innerHTML = '';

    const res = createEl('div', {
      class:
        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 " +
        "rounded-lg p-4 shadow"
    });

    const pct = Math.round((correct / questions.length) * 100);

    res.appendChild(createEl('h3', {
      class: "text-xl font-bold mb-2",
      text: "Resultado"
    }));

    res.appendChild(createEl('p', {
      class: "mb-4",
      text: `Acertos: ${correct} / ${questions.length} (${pct}%)`
    }));

    const btns = createEl('div', { class: "flex gap-2" });

    const reviewBtn = createEl('button', {
      class:
        "px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600 transition",
      text: "Revisar perguntas"
    });

    const closeBtn = createEl('button', {
      class:
        "px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 hover:opacity-80 transition",
      text: "Fechar"
    });

    reviewBtn.addEventListener('click', () => renderReview());
    closeBtn.addEventListener('click', () => {
      quizEl.classList.add("hidden");
      showMessage(`Simulado finalizado. Resultado: ${pct}%`, "success");

      // ✔ Voltar menu quando fechar simulado
      document.getElementById("mainMenu")?.classList.remove("hidden");
      document.getElementById("backToMenuContainer")?.classList.add("hidden");
    });

    btns.appendChild(reviewBtn);
    btns.appendChild(closeBtn);
    res.appendChild(btns);

    quizEl.appendChild(res);
  }

  function renderReview() {
    quizEl.innerHTML = '';

    questions.forEach((q, idx) => {
      const card = createEl('div', {
        class:
          "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 " +
          "rounded-lg p-4 shadow mb-4"
      });

      card.appendChild(createEl('p', {
        class: "font-semibold mb-1",
        text: `Pergunta ${idx + 1}: ${q.question}`
      }));

      q.options.forEach((opt, i) => {
        const row = createEl('div', {
          class: "flex items-start gap-2 text-sm my-1"
        });

        const letter = createEl('span', {
          class: "font-bold w-5",
          text: `${String.fromCharCode(97 + i)})`
        });

        if (i === q.answer) letter.classList.add("text-green-600");
        if (answers[idx] === i) row.classList.add("user-selected");

        row.appendChild(letter);
        row.appendChild(createEl('span', { text: opt }));

        card.appendChild(row);
      });

      card.appendChild(createEl('p', {
        class: "text-xs text-gray-500 dark:text-gray-400 mt-2",
        text: "Justificativa: " + (q.explanation || "(vazia)")
      }));

      quizEl.appendChild(card);
    });

    const back = createEl('div', { class: "mt-4" });
    const exit = createEl('button', {
      class:
        "px-4 py-2 rounded bg-primary text-white hover:bg-blue-700 transition",
      text: "Fechar revisão"
    });

    exit.addEventListener("click", () => {
      quizEl.classList.add("hidden");
      showMessage("Revisão finalizada.", "info");

      // Voltar ao menu
      document.getElementById("mainMenu")?.classList.remove("hidden");
      document.getElementById("backToMenuContainer")?.classList.add("hidden");
    });

    back.appendChild(exit);
    quizEl.appendChild(back);
  }

  renderQuestion();
}

/* ============================================================
   Shuffle
   ============================================================ */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ============================================================
   Modais e Tema
   ============================================================ */

const modal = document.getElementById('modal');
document.getElementById('showInstructionsBtn').onclick = () => modal.classList.remove("hidden");
document.getElementById('closeModalBtn').onclick = () => modal.classList.add("hidden");
document.getElementById('modalOkBtn').onclick = () => modal.classList.add("hidden");
modal.onclick = e => { if (e.target === modal) modal.classList.add("hidden") };

const modalScript = document.getElementById('modalScript');
document.getElementById('showScriptBtn').onclick = () => modalScript.classList.remove("hidden");
document.getElementById('closeScriptModalBtn').onclick = () => modalScript.classList.add("hidden");
document.getElementById('modalScriptOkBtn').onclick = () => modalScript.classList.add("hidden");
modalScript.onclick = e => { if (e.target === modalScript) modalScript.classList.add("hidden") };

const modalConfirm = document.getElementById('modalConfirm');
document.getElementById('closeConfirmModalBtn').onclick = () => modalConfirm.classList.add("hidden");
modalConfirm.onclick = e => { if (e.target === modalConfirm) modalConfirm.classList.add("hidden") };

/* Tema */
const themeToggle = document.getElementById('themeToggle');
const root = document.documentElement;

themeToggle.addEventListener("click", () => {
  if (root.classList.contains('dark')) {
    root.classList.remove('dark');
    localStorage.setItem('simulado_theme', 'light');
  } else {
    root.classList.add('dark');
    localStorage.setItem('simulado_theme', 'dark');
  }
});

(() => {
  const t = localStorage.getItem('simulado_theme') || 'light';
  if (t === 'dark') root.classList.add('dark');
})();

/* Limpa mensagens ao carregar */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('messages').textContent = "";
});

/* ============================================================
   Back to Menu button handler (fix)
   ============================================================ */

// Segurança: liga o handler se o botão existir
const backBtn = document.getElementById('backToMenuBtn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    // esconder áreas dinâmicas
    document.getElementById('quiz')?.classList.add('hidden');
    document.getElementById('list')?.classList.add('hidden');

    // esconder botão voltar
    document.getElementById('backToMenuContainer')?.classList.add('hidden');

    // mostrar menu principal
    document.getElementById('mainMenu')?.classList.remove('hidden');

    // limpar mensagens temporárias
    document.getElementById('messages').textContent = '';
  });
}
