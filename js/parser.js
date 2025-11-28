// js/parser.js
// Responsável somente por parsear o bloco de texto no formato esperado.
// Exporta: parseBlock, escapeHtml

export function escapeHtml(s) {
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

/**
 * parseBlock(text) -> [{ question, options:[], answer: 0..4, explanation }]
 * Lança Error com mensagens legíveis em casos de formato inválido.
 */
export function parseBlock(text) {
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
