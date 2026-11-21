import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ask, fail, ok } from '../alerts.js';
import Page from '../components/Page.jsx';

const empty = { text: '', options: ['', '', '', ''], correctIdx: 0, difficulty: 2 };

export default function Questions() {
  const [subjects, setSubjects] = useState([]);
  const [sid, setSid] = useState(null);
  const [topics, setTopics] = useState([]);
  const [tid, setTid] = useState(null);
  const [list, setList] = useState([]);
  const [f, setF] = useState(empty);

  useEffect(() => { api('/subjects').then((s) => { setSubjects(s); if (s[0]) setSid(s[0].id); }).catch((e) => fail(e.message)); }, []);
  useEffect(() => {
    if (sid) api(`/subjects/${sid}/graph`).then((g) => { setTopics(g.topics); setTid(g.topics[0]?.id ?? null); }).catch((e) => fail(e.message));
  }, [sid]);
  const load = () => tid && api(`/topics/${tid}/questions`).then(setList).catch((e) => fail(e.message));
  useEffect(() => { load(); }, [tid]);

  const setOpt = (i, v) => setF({ ...f, options: f.options.map((o, j) => (j === i ? v : o)) });
  const add = async (e) => {
    e.preventDefault();
    try { await api(`/topics/${tid}/questions`, { method: 'POST', body: f }); setF(empty); load(); ok('Pregunta guardada'); } catch (err) { fail(err.message); }
  };
  const del = async (id) => {
    if (!(await ask('Eliminar pregunta', 'Esta acción no se puede deshacer.', 'Eliminar'))) return;
    try { await api(`/questions/${id}`, { method: 'DELETE' }); load(); ok('Pregunta eliminada'); } catch (err) { fail(err.message); }
  };

  return (
    <Page crumb="Docente › Banco de preguntas" title="Preguntas por tema"
      actions={
        <div className="flex gap-2">
          <select className="input !w-auto" value={sid || ''} onChange={(e) => setSid(Number(e.target.value))}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select className="input !w-auto" value={tid || ''} onChange={(e) => setTid(Number(e.target.value))}>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </div>
      }>
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={add} className="card flex flex-col gap-3">
          <b>Nueva pregunta</b>
          <input className="input" placeholder="Enunciado" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
          {f.options.map((o, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="radio" name="ok" checked={f.correctIdx === i} onChange={() => setF({ ...f, correctIdx: i })} />
              <input className="input" placeholder={`Opción ${'ABCD'[i]}`} value={o} onChange={(e) => setOpt(i, e.target.value)} />
            </label>
          ))}
          <select className="input" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: Number(e.target.value) })}>
            <option value={1}>Dificultad 1 · básica</option><option value={2}>Dificultad 2 · media</option><option value={3}>Dificultad 3 · avanzada</option>
          </select>
          <button className="btn" disabled={!tid}>Guardar pregunta</button>
        </form>
        <div className="card flex flex-col gap-2">
          <b>{list.length} preguntas en este tema</b>
          {list.map((q) => (
            <div key={q.id} className="rounded-xl border border-[#1e6fd0] p-3 text-sm">
              <div className="flex justify-between gap-2"><span className="font-semibold">{q.text}</span><button className="text-rose-300" onClick={() => del(q.id)}>Eliminar</button></div>
              <div className="text-blue-200 mt-1">Dificultad {q.difficulty} · Correcta: {q.options[q.correctIdx]}</div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
