// js/quiz.js
// Responsável por startQuiz(qs) — toda a experiência do simulado.
// Exporta: startQuiz

import { createEl, showMessage } from './core.js';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function startQuiz(qs) {
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

      btn.addEventListener('click', () => {
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

        nBtn.addEventListener('click', () => {
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
      class: "px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600 transition",
      text: "Revisar perguntas"
    });

    const closeBtn = createEl('button', {
      class: "px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 hover:opacity-80 transition",
      text: "Fechar"
    });

    reviewBtn.addEventListener('click', () => renderReview());
    closeBtn.addEventListener('click', () => {
      quizEl.classList.add("hidden");
      showMessage(`Simulado finalizado. Resultado: ${pct}%`, "success");
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
        const row = createEl('div', { class: "flex items-start gap-2 text-sm my-1" });
        const letter = createEl('span', { class: "font-bold w-5", text: `${String.fromCharCode(97 + i)})` });

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
      class: "px-4 py-2 rounded bg-primary text-white hover:bg-blue-700 transition",
      text: "Fechar revisão"
    });

    exit.addEventListener('click', () => {
      quizEl.classList.add("hidden");
      showMessage("Revisão finalizada.", "info");
      document.getElementById("mainMenu")?.classList.remove("hidden");
      document.getElementById("backToMenuContainer")?.classList.add("hidden");
    });

    back.appendChild(exit);
    quizEl.appendChild(back);
  }

  renderQuestion();
}
