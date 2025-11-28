// js/core.js
// Helpers, Storage (Simulado), modais, tema, e lista/edição de questões.
// Exporta: showMessage, createEl, Simulado, openConfirm, renderListView, openEditDialog, initTheme

export function showMessage(txt, type = '') {
  const el = document.getElementById('messages');
  if (!el) return;
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

export function createEl(tag, props = {}, children = []) {
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

/* =========================
   Storage: Simulado
   ========================= */
export const storageKey = 'simulado_questions_v1';

export const Simulado = {
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

/* =========================
   Modal de confirmação reutilizável
   ========================= */
export function openConfirm(message, onOk) {
  const modal = document.getElementById('modalConfirm');
  if (!modal) { onOk && onOk(); return; }

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

  const okH = () => { cleanup(); onOk && onOk(); };
  const cancelH = () => cleanup();

  okBtn.addEventListener("click", okH);
  cancelBtn.addEventListener("click", cancelH);
}

/* =========================
   Lista de questões e edição (UI)
   ========================= */
export function renderListView() {
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
      const row = createEl("div", { class: "flex items-start gap-2 text-sm my-1" });
      const letter = createEl("span", { class: "font-bold text-gray-500 w-5", text: `${String.fromCharCode(97 + i)})` });
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
      class: "px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 transition text-sm"
    });

    const delBtn = createEl("button", {
      text: "Excluir",
      class: "px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition text-sm"
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

/* Abre modal de edição (reaproveita modalConfirm no HTML) */
export function openEditDialog(q) {
  const modal = document.getElementById('modalConfirm');
  const title = modal.querySelector('#confirmTitle');
  const message = modal.querySelector('#confirmMessage');

  title.textContent = 'Editar questão';
  message.innerHTML = '';

  const form = createEl("div", { class: "flex flex-col gap-2 text-sm" });

  // Pergunta
  form.appendChild(createEl("label", { text: "Pergunta" }));
  const qInput = createEl("textarea", {
    class: "border border-gray-300 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-800",
    rows: 3
  });
  qInput.value = q.question;
  form.appendChild(qInput);

  q.options.forEach((opt, i) => {
    form.appendChild(createEl("label", { text: `${String.fromCharCode(97 + i)})` }));
    const t = createEl("input", {
      class: "border border-gray-300 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-800",
      type: "text",
      value: opt
    });
    form.appendChild(t);
  });

  // Resposta correta
  form.appendChild(createEl("label", { text: "Índice da resposta correta (0-4)" }));
  const ansInput = createEl("input", {
    type: "number",
    min: 0,
    max: 4,
    value: q.answer,
    class: "border border-gray-300 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-800"
  });
  form.appendChild(ansInput);

  // Justificativa
  form.appendChild(createEl("label", { text: "Justificativa (opcional)" }));
  const justInput = createEl("textarea", {
    class: "border border-gray-300 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-800",
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
    const newOpts = Array.from(form.querySelectorAll('input[type="text"]')).map(e => e.value.trim());
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

/* =========================
   Tema (inicialização)
   ========================= */
export function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const root = document.documentElement;

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      if (root.classList.contains('dark')) {
        root.classList.remove('dark');
        localStorage.setItem('simulado_theme', 'light');
      } else {
        root.classList.add('dark');
        localStorage.setItem('simulado_theme', 'dark');
      }
    });
  }

  (function load() {
    const t = localStorage.getItem('simulado_theme') || 'light';
    if (t === 'dark') root.classList.add('dark');
  })();
}
