import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, fmtDate } from '../api.js';
import { ask, fail } from '../alerts.js';
import Page from '../components/Page.jsx';
import KnowledgeGraph, { Legend } from '../components/KnowledgeGraph.jsx';

export default function Student() {
  const nav = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [sid, setSid] = useState(null);
  const [g, setG] = useState(null);
  const [dx, setDx] = useState(null);
  const [sel, setSel] = useState(null);

  useEffect(() => { api('/subjects').then((s) => { setSubjects(s); if (s[0]) setSid(s[0].id); }).catch((e) => fail(e.message)); }, []);
  useEffect(() => {
    if (!sid) return;
    setSel(null);
    Promise.all([api(`/subjects/${sid}/graph`), api(`/subjects/${sid}/diagnosis`)]).then(([a, b]) => { setG(a); setDx(b); }).catch((e) => fail(e.message));
  }, [sid]);

  const values = useMemo(() => Object.fromEntries((g?.topics || []).map((t) => [t.id, t.mastery])), [g]);
  const name = (id) => g?.topics.find((t) => t.id === id)?.name;
  const known = Object.values(values).filter((v) => v != null);
  const avg = known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : null;
  const path = dx?.path || [];

  const start = async () => {
    if (await ask('Iniciar quiz adaptativo', `Evaluaremos "${name(sel)}" y, si hace falta, sus prerrequisitos.`, 'Comenzar')) nav(`/quiz?subject=${sid}&topic=${sel}`);
  };

  return (
    <Page crumb="Mi mapa › Diagnóstico" title="Mapa de Conocimiento"
      actions={<select className="input !w-auto" value={sid || ''} onChange={(e) => setSid(Number(e.target.value))}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card">
          <Legend path />
          {g && <KnowledgeGraph topics={g.topics} edges={g.edges} values={values} path={path} rootId={dx?.rootTopicId ?? null} selected={sel} onSelect={setSel} />}
        </div>
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="flex justify-between"><b>Dominio global</b><span>{avg ?? '—'} %</span></div>
            <div className="h-2.5 rounded-full bg-black/30 mt-2 overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-sky-500 to-cyan-300" initial={{ width: 0 }} animate={{ width: `${avg || 0}%` }} />
            </div>
          </div>
          <div className="card">
            <b>Diagnóstico</b>
            {dx?.rootTopicId ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-sm">
                <p>Tu dificultad en <b>{name(dx.targetTopicId)}</b> viene de <b className="text-cyan-300">{name(dx.rootTopicId)}</b>.</p>
                <p className="text-blue-300 mt-1">Evaluado el {fmtDate(dx.createdAt)}</p>
                <ol className="mt-3 flex flex-col gap-2">
                  {path.map((id, i) => <li key={id} className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-cyan-300 text-[#042] grid place-items-center font-bold text-xs">{i + 1}</span>{name(id)}</li>)}
                </ol>
              </motion.div>
            ) : (
              <p className="mt-2 text-sm text-blue-200">{dx ? 'No se detectó un tema raíz: dominas ese tema.' : 'Aún no hay diagnóstico. Elige un tema del mapa y comienza el quiz.'}</p>
            )}
          </div>
          <div className="card">
            <b>{sel ? name(sel) : 'Selecciona un tema'}</b>
            <p className="text-sm text-blue-200 mt-1">{sel ? `Dominio: ${values[sel] ?? 'sin datos'}${values[sel] != null ? ' %' : ''}` : 'Toca un hexágono para evaluarlo.'}</p>
            <button className="btn w-full mt-3" disabled={!sel} onClick={start}>▶ Iniciar quiz adaptativo</button>
          </div>
        </div>
      </div>
    </Page>
  );
}
