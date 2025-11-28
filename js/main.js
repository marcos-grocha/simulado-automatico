// js/main.js
// Entry point: conecta parser, core e quiz com o DOM e registra handlers.

import { Simulado, showMessage, openConfirm, renderListView, initTheme } from './core.js';
import { parseBlock } from './parser.js';
import { startQuiz } from './quiz.js';

/* Modais / botões que existem no HTML */
const modal = document.getElementById('modal');
const modalScript = document.getElementById('modalScript');
const modalConfirm = document.getElementById('modalConfirm');

if (document.getElementById('showInstructionsBtn') && modal) {
  document.getElementById('showInstructionsBtn').onclick = () => modal.classList.remove("hidden");
  document.getElementById('closeModalBtn').onclick = () => modal.classList.add("hidden");
  document.getElementById('modalOkBtn').onclick = () => modal.classList.add("hidden");
  modal.onclick = e => { if (e.target === modal) modal.classList.add("hidden") };
}

if (document.getElementById('showScriptBtn') && modalScript) {
  document.getElementById('showScriptBtn').onclick = () => modalScript.classList.remove("hidden");
  document.getElementById('closeScriptModalBtn').onclick = () => modalScript.classList.add("hidden");
  document.getElementById('modalScriptOkBtn').onclick = () => modalScript.classList.add("hidden");
  modalScript.onclick = e => { if (e.target === modalScript) modalScript.classList.add("hidden") };
}

if (modalConfirm) {
  document.getElementById('closeConfirmModalBtn').onclick = () => modalConfirm.classList.add("hidden");
  modalConfirm.onclick = e => { if (e.target === modalConfirm) modalConfirm.classList.add("hidden") };
}

/* Inicializa tema */
initTheme();

/* Import / Export / Clear handlers */
const importBtn = document.getElementById('importBtn');
if (importBtn) {
  importBtn.addEventListener('click', () => {
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
}

const exportBtn = document.getElementById('exportBtn');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    showMessage("Exportar JSON está desativado.", "error");
  });
}

const clearBtn = document.getElementById('clearBtn');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    openConfirm("Apagar todas as questões?", () => {
      Simulado.clear();
      document.getElementById('list').innerHTML = '';
      showMessage("Todas as questões foram apagadas.", "success");
    });
  });
}

/* List / Start */
const listBtn = document.getElementById('listBtn');
if (listBtn) {
  listBtn.addEventListener('click', () => {
    renderListView();
    document.getElementById("mainMenu")?.classList.add("hidden");
    document.getElementById("backToMenuContainer")?.classList.remove("hidden");
  });
}

const startBtn = document.getElementById('startBtn');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    openConfirm("Iniciar simulado agora?", () => {
      const arr = Simulado.list();
      if (arr.length === 0) return showMessage("Não há perguntas salvas.", "error");
      startQuiz(arr);
    });
  });
}

/* Back to menu button */
const backBtn = document.getElementById('backToMenuBtn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    document.getElementById('quiz')?.classList.add('hidden');
    document.getElementById('list')?.classList.add('hidden');
    document.getElementById('backToMenuContainer')?.classList.add('hidden');
    document.getElementById('mainMenu')?.classList.remove('hidden');
    document.getElementById('messages').textContent = '';
  });
}

/* Cleanup mensagens ao carregar */
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('messages');
  if (el) el.textContent = "";
});
