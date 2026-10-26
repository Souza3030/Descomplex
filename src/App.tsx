import { useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseReady } from './firebase';

type Category = 'Urgente' | 'Importante' | 'Circunstancial';
type Task = { id: string; title: string; nextStep: string; category: Category; done: boolean; createdAt: number };
type Diagnosis = { id: string; answers: number[]; createdAt: number };
type Page = 'Visão geral' | 'Minhas tarefas' | 'Diagnóstico' | 'Foco';
const categories: Category[] = ['Urgente', 'Importante', 'Circunstancial'];
const questions = [
  { category: 'Urgente', text: 'Adio uma tarefa até o prazo ficar apertado.' },
  { category: 'Urgente', text: 'Só começo quando a pressão se torna inevitável.' },
  { category: 'Urgente', text: 'Subestimo o tempo necessário para concluir entregas.' },
  { category: 'Importante', text: 'Deixo metas importantes sem um primeiro passo definido.' },
  { category: 'Importante', text: 'Troco projetos de longo prazo por tarefas mais fáceis.' },
  { category: 'Importante', text: 'Espero estar motivado para iniciar o que importa.' },
  { category: 'Circunstancial', text: 'Interrupções de outras pessoas mudam meu plano.' },
  { category: 'Circunstancial', text: 'Notificações e redes sociais quebram minha concentração.' },
  { category: 'Circunstancial', text: 'Aceito demandas extras mesmo sem tempo disponível.' },
] as const;

function errorText(error: unknown) {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha inválidos.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'Use uma senha com pelo menos 6 caracteres.',
    'auth/popup-closed-by-user': 'O login com Google foi cancelado.',
    'permission-denied': 'O Firestore negou o acesso. Confira as regras do projeto.',
    'unavailable': 'Sem conexão com o Firestore. Tente novamente quando a rede voltar.',
  };
  return messages[code || ''] || `Não foi possível concluir a operação${code ? ` (${code})` : ''}.`;
}

function percentages(answers: number[]) {
  const sums = [0, 1, 2].map(i => answers.slice(i * 3, i * 3 + 3).reduce((a, b) => a + b, 0));
  const total = sums.reduce((a, b) => a + b, 0);
  if (!total) return [0, 0, 0];
  const raw = sums.map(v => v * 100 / total);
  const result = raw.map(Math.floor);
  const remainder = 100 - result.reduce((a, b) => a + b, 0);
  [...raw.keys()].sort((a, b) => (raw[b] - result[b]) - (raw[a] - result[a])).slice(0, remainder).forEach(i => result[i]++);
  return result;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(!firebaseReady);
  const [page, setPage] = useState<Page>('Visão geral');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [title, setTitle] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [category, setCategory] = useState<Category>('Importante');
  const [answers, setAnswers] = useState<number[]>(Array(9).fill(0));
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, person => { setUser(person); setAuthLoaded(true); setMessage(''); }, error => { setMessage(errorText(error)); setAuthLoaded(true); });
  }, []);
  useEffect(() => {
    if (!user || !db) { setTasks([]); setDiagnoses([]); return; }
    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const diagnosesRef = collection(db, 'users', user.uid, 'diagnoses');
    const offTasks = onSnapshot(tasksRef, snap => setTasks(snap.docs.map(d => ({ ...d.data(), id: d.id } as Task)).sort((a, b) => b.createdAt - a.createdAt)), e => setMessage(errorText(e)));
    const offDiagnoses = onSnapshot(diagnosesRef, snap => setDiagnoses(snap.docs.map(d => ({ ...d.data(), id: d.id } as Diagnosis)).sort((a, b) => b.createdAt - a.createdAt)), e => setMessage(errorText(e)));
    return () => { offTasks(); offDiagnoses(); };
  }, [user]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds(current => {
      if (current <= 1) { setRunning(false); return 0; }
      return current - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const latest = diagnoses[0];
  const scores = useMemo(() => latest ? percentages(latest.answers) : [0, 0, 0], [latest]);
  const open = tasks.filter(t => !t.done);
  const completed = tasks.length - open.length;

  async function doAuth(event: React.FormEvent) {
    event.preventDefault(); if (!auth) return;
    setMessage('');
    try { await (register ? createUserWithEmailAndPassword(auth, email, password) : signInWithEmailAndPassword(auth, email, password)); }
    catch (e) { setMessage(errorText(e)); }
  }
  async function googleLogin() {
    if (!auth) return;
    setMessage('');
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { setMessage(errorText(e)); }
  }
  async function addTask(event: React.FormEvent) {
    event.preventDefault(); if (!db || !user || !title.trim()) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'tasks'), { title: title.trim(), nextStep: nextStep.trim(), category, done: false, createdAt: Date.now() });
      setTitle(''); setNextStep(''); setMessage('Tarefa adicionada.');
    } catch (e) { setMessage(errorText(e)); }
  }
  async function toggleTask(task: Task) {
    if (!db || !user) return;
    try { await updateDoc(doc(db, 'users', user.uid, 'tasks', task.id), { done: !task.done }); }
    catch (e) { setMessage(errorText(e)); }
  }
  async function removeTask(task: Task) {
    if (!db || !user) return;
    try { await deleteDoc(doc(db, 'users', user.uid, 'tasks', task.id)); }
    catch (e) { setMessage(errorText(e)); }
  }
  async function saveDiagnosis() {
    if (!db || !user || answers.some(a => a < 1 || a > 5)) { setMessage('Responda às nove afirmações para continuar.'); return; }
    try {
      await addDoc(collection(db, 'users', user.uid, 'diagnoses'), { answers, createdAt: Date.now() });
      setMessage('Diagnóstico salvo com sucesso.'); setPage('Visão geral');
    } catch (e) { setMessage(errorText(e)); }
  }

  if (!firebaseReady) return <main className="setup"><img src="/descomplex-wordmark.png" alt="Descomplex" /><h1>Conecte seu projeto Firebase</h1><p>Preencha as variáveis em <code>.env</code> usando <code>.env.example</code> e reinicie o servidor. Depois, habilite autenticação e Firestore no console do Firebase.</p></main>;
  if (!authLoaded) return <main className="setup">Carregando sua conta…</main>;
  if (!user) return <main className="auth-page"><div className="auth-card"><img src="/descomplex-wordmark.png" alt="Descomplex" /><span className="eyebrow">UM PASSO DE CADA VEZ</span><h1>Menos adiamento.<br />Mais clareza.</h1><p>Entenda o que faz você procrastinar e transforme intenção em ação.</p><form onSubmit={doAuth}><label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label><label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={register ? 'new-password' : 'current-password'} /></label><button className="primary" type="submit">{register ? 'Criar conta' : 'Entrar'}</button></form><button className="secondary" onClick={googleLogin}>Continuar com Google</button><button className="text-button" onClick={() => { setRegister(!register); setMessage(''); }}>{register ? 'Já tenho uma conta' : 'Criar uma conta'}</button>{message && <p className="feedback" role="alert">{message}</p>}</div><div className="auth-art"><span>DESCOMPLEX • PROCRASTINAÇÃO</span><h2>Começar pequeno<br />também é começar.</h2><p>Organize o que importa. Descubra seus padrões. Conquiste seu próximo passo.</p><div className="orbit">01 <span>→</span> 02 <span>→</span> 03</div></div></main>;

  return <div className="shell"><aside className="sidebar"><img src="/descomplex-wordmark.png" alt="Descomplex" /><p className="side-caption">SEU ESPAÇO DE AÇÃO</p><nav aria-label="Navegação principal">{(['Visão geral', 'Minhas tarefas', 'Diagnóstico', 'Foco'] as Page[]).map((item, index) => <button key={item} className={page === item ? 'active' : ''} onClick={() => { setPage(item); setMessage(''); }}><span className="nav-icon">{['◫', '☑', '◉', '◷'][index]}</span>{item}</button>)}</nav><div className="side-bottom"><div className="avatar">{(user.email || 'U')[0].toUpperCase()}</div><div className="account"><strong>Minha conta</strong><small>{user.email || 'Conta Google'}</small></div><button className="logout" onClick={() => auth && signOut(auth).catch(e => setMessage(errorText(e)))} title="Sair" aria-label="Sair">↗</button></div></aside><main className="content"><header className="topbar"><div><span className="eyebrow">DESCOMPLEX / {page.toUpperCase()}</span><h1>{page === 'Visão geral' ? 'Bom te ver por aqui.' : page}</h1></div><div className="date-chip">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date())}</div></header>{message && <div className="feedback" role="status">{message}<button onClick={() => setMessage('')} aria-label="Fechar aviso">×</button></div>}
    {page === 'Visão geral' && <><section className="hero"><div><span className="eyebrow">PROGRESSO, NÃO PERFEIÇÃO</span><h2>O próximo passo<br />começa agora.</h2><p>Quando você entende por que adia, fica mais fácil agir com intenção.</p><button className="light-button" onClick={() => setPage('Minhas tarefas')}>Organizar minhas tarefas <span>↗</span></button></div><div className="hero-graphic"><div className="hero-circle">✦</div><span className="hero-line">transforme planos em movimento</span></div></section><section className="stats"><article><span>Tarefas em aberto</span><strong>{open.length.toString().padStart(2, '0')}</strong><small>Um passo de cada vez</small></article><article><span>Concluídas</span><strong>{completed.toString().padStart(2, '0')}</strong><small>Seu progresso conta</small></article><article><span>Último diagnóstico</span><strong>{latest ? `${scores[categories.findIndex((_, i) => scores[i] === Math.max(...scores))]}%` : '—'}</strong><small>{latest ? 'Maior dimensão' : 'Ainda não realizado'}</small></article></section><div className="grid-two"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">EM MOVIMENTO</span><h2>Próximas ações</h2></div><button className="link-button" onClick={() => setPage('Minhas tarefas')}>Ver todas →</button></div>{open.length ? open.slice(0, 3).map(t => <div className="compact-task" key={t.id}><button className="check" onClick={() => toggleTask(t)} aria-label={`Concluir ${t.title}`} /> <div><strong>{t.title}</strong><small>{t.nextStep || 'Defina um primeiro passo'}</small></div><span className={`tag ${t.category.toLowerCase()}`}>{t.category}</span></div>) : <Empty title="Tudo em aberto começa com uma decisão." text="Adicione sua primeira tarefa e defina um passo simples." />}</section><section className="panel insight"><span className="eyebrow">CONHEÇA SEU PADRÃO</span><h2>Por que você adia?</h2><p>Responda nove afirmações rápidas para descobrir quais situações mais favorecem a procrastinação.</p>{latest && <div className="mini-scores">{categories.map((c, i) => <span key={c}>{c} <b>{scores[i]}%</b></span>)}</div>}<button className="primary" onClick={() => setPage('Diagnóstico')}>{latest ? 'Refazer diagnóstico' : 'Fazer diagnóstico'} →</button></section></div></>}
    {page === 'Minhas tarefas' && <><div className="intro"><h2>Troque “depois” por um próximo passo.</h2><p>Escreva o que precisa fazer e reduza a tarefa à primeira ação concreta.</p></div><div className="grid-two tasks-layout"><section className="panel"><span className="eyebrow">NOVA TAREFA</span><h2>O que você vai começar?</h2><form onSubmit={addTask} className="task-form"><label>Tarefa<input maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: preparar apresentação" required /></label><label>Primeiro passo<input maxLength={180} value={nextStep} onChange={e => setNextStep(e.target.value)} placeholder="Ex.: abrir o arquivo e escrever o título" /></label><label>Qual dimensão?<select value={category} onChange={e => setCategory(e.target.value as Category)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><button className="primary" type="submit">Adicionar tarefa →</button></form></section><section className="panel task-list"><div className="panel-heading"><div><span className="eyebrow">SUAS AÇÕES</span><h2>{open.length} em aberto</h2></div></div>{tasks.length ? tasks.map(t => <div className={`task-row ${t.done ? 'done' : ''}`} key={t.id}><button className="check" onClick={() => toggleTask(t)} aria-label={t.done ? `Reabrir ${t.title}` : `Concluir ${t.title}`}>{t.done ? '✓' : ''}</button><div><strong>{t.title}</strong><small>{t.nextStep || 'Sem primeiro passo definido'}</small><span className={`tag ${t.category.toLowerCase()}`}>{t.category}</span></div><button className="remove" onClick={() => removeTask(t)} aria-label={`Excluir ${t.title}`} title="Excluir tarefa">×</button></div>) : <Empty title="Sua lista ainda está vazia." text="Comece com uma tarefa pequena e possível." />}</section></div></>}
    {page === 'Diagnóstico' && <><div className="intro"><h2>Reconheça seus padrões.</h2><p>Com que frequência cada situação acontece com você? Responda de 1 (nunca) a 5 (sempre).</p></div><section className="panel diagnosis"><div className="panel-heading"><div><span className="eyebrow">TRÍADE DO TEMPO</span><h2>Seu diagnóstico</h2></div><span className="progress-label">{answers.filter(Boolean).length} de 9 respostas</span></div>{questions.map((q, i) => <div className="question" key={q.text}><div><small>{String(i + 1).padStart(2, '0')} / {q.category}</small><strong>{q.text}</strong></div><div className="scale" role="group" aria-label={q.text}>{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" className={answers[i] === n ? 'selected' : ''} onClick={() => setAnswers(current => current.map((a, index) => index === i ? n : a))} aria-label={`${n} de 5`} aria-pressed={answers[i] === n}>{n}</button>)}</div></div>)}<div className="form-footer"><span>1 = nunca · 5 = sempre</span><button className="primary" onClick={saveDiagnosis} disabled={answers.some(a => !a)}>Salvar diagnóstico →</button></div></section>{latest && <section className="panel result"><span className="eyebrow">SEU ÚLTIMO RESULTADO</span><h2>Onde a procrastinação aparece</h2><p>Os percentuais mostram a participação relativa de cada dimensão nas suas respostas; não são uma avaliação clínica.</p>{categories.map((c, i) => <div className="score-row" key={c}><div><strong>{c}</strong><b>{scores[i]}%</b></div><div className="track"><div style={{ width: `${scores[i]}%` }} /></div></div>)}<p className="result-tip">Comece pela dimensão com maior participação: escolha uma tarefa e escreva um passo que caiba em cinco minutos.</p></section>}</>}
    {page === 'Foco' && <><div className="intro"><h2>Crie espaço para começar.</h2><p>Escolha uma tarefa, deixe distrações de lado e avance por um intervalo curto.</p></div><section className="focus-card"><span className="eyebrow">SESSÃO DE FOCO</span><div className="timer" role="timer" aria-label="Tempo restante">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</div><p>Você só precisa começar. O restante vem depois.</p><div className="timer-actions"><button className="primary" onClick={() => { if (seconds === 0) setSeconds(25 * 60); setRunning(!running); }}>{running ? 'Pausar' : seconds === 0 ? 'Recomeçar' : 'Iniciar foco'}</button><button className="secondary" onClick={() => { setRunning(false); setSeconds(25 * 60); }}>Reiniciar</button></div><small>25 minutos de atenção para o que importa.</small></section></>}
  </main></div>;
}

function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><span>✳</span><strong>{title}</strong><small>{text}</small></div>; }
