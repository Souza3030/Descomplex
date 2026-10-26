export type Category = 'Urgente' | 'Importante' | 'Circunstancial';
export const categories: Category[] = ['Urgente', 'Importante', 'Circunstancial'];

export function percentages(answers: number[]): number[] {
  if (answers.length !== 9 || answers.some(value => !Number.isInteger(value) || value < 1 || value > 5)) return [0, 0, 0];
  const sums = [0, 1, 2].map(i => answers.slice(i * 3, i * 3 + 3).reduce((a, b) => a + b, 0));
  const total = sums.reduce((a, b) => a + b, 0);
  const raw = sums.map(value => value * 100 / total);
  const result = raw.map(Math.floor);
  const remainder = 100 - result.reduce((a, b) => a + b, 0);
  [...raw.keys()].sort((a, b) => (raw[b] - result[b]) - (raw[a] - result[a]) || a - b)
    .slice(0, remainder).forEach(i => result[i]++);
  return result;
}

const advice = [
  { behavior: 'esperar o prazo apertar', action: 'Divida a entrega em duas etapas e comece a primeira hoje, antes de a urgência aparecer.' },
  { behavior: 'depender da pressão para começar', action: 'Reserve 10 minutos no calendário para iniciar sem esperar motivação ou cobrança.' },
  { behavior: 'subestimar o tempo da tarefa', action: 'Estime a duração, acrescente uma margem e defina um prazo intermediário.' },
  { behavior: 'não ter um primeiro passo claro', action: 'Escreva a menor ação física possível, como abrir o arquivo e criar o título.' },
  { behavior: 'trocar o importante pelo mais fácil', action: 'Faça 15 minutos do projeto importante antes de abrir tarefas menores.' },
  { behavior: 'esperar vontade para agir', action: 'Use a regra dos cinco minutos: comece agora e decida depois se vai continuar.' },
  { behavior: 'ceder às interrupções', action: 'Combine um bloco curto sem interrupções e avise quando poderá responder.' },
  { behavior: 'perder o foco com notificações', action: 'Silencie avisos e deixe o celular fora do alcance durante uma sessão de foco.' },
  { behavior: 'aceitar demandas além da capacidade', action: 'Antes de aceitar um pedido, confira seus prazos e negocie a prioridade.' },
];

export function recommendation(answers: number[]) {
  const scores = percentages(answers);
  if (!scores.some(Boolean)) return null;
  const topIndex = answers.reduce((best, value, index) => value > answers[best] ? index : best, 0);
  const category = categories[Math.floor(topIndex / 3)];
  return { category, score: scores[Math.floor(topIndex / 3)], behavior: advice[topIndex].behavior, action: advice[topIndex].action };
}
