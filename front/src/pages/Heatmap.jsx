import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { fail } from '../alerts.js';
import Page from '../components/Page.jsx';
import KnowledgeGraph, { Legend } from '../components/KnowledgeGraph.jsx';

export default function Heatmap() {
  const [subjects, setSubjects] = useState([]);
  const [sid, setSid] = useState(null);
  const [d, setD] = useState(null);

  useEffect(() => { api('/subjects').then((s) => { setSubjects(s); if (s[0]) setSid(s[0].id); }).catch((e) => fail(e.message)); }, []);
  useEffect(() => { if (sid) api(`/subjects/${sid}/heatmap`).then(setD).catch((e) => fail(e.message)); }, [sid]);

  const values = useMemo(() => Object.fromEntries((d?.topics || []).map((t) => [t.id, t.avg])), [d]);
  const name = (id) => d?.topics.find((t) => t.id === id)?.name;

  return (
    <Page crumb="Docente › Mapa de calor del grupo" title="Dominio del grupo"
      actions={<select className="input !w-auto" value={sid || ''} onChange={(e) => setSid(Number(e.target.value))}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card">
          <Legend />
          {d && <KnowledgeGraph topics={d.topics} edges={d.edges} values={values} />}
        </div>
        <div className="flex flex-col gap-4">
          <div className="card">
            <b>Temas raíz más frecuentes</b>
            {d?.roots.length ? d.roots.map((r) => (
              <div key={r.id} className="flex justify-between mt-2 text-sm"><span>{name(r.id)}</span><span className="text-cyan-300 font-bold">{r.count} estudiantes</span></div>
            )) : <p className="text-sm text-blue-200 mt-2">Aún no hay diagnósticos.</p>}
          </div>
          <div className="card">
            <b>Estudiantes en nivel crítico</b>
            {d?.topics.filter((t) => t.failing).sort((a, b) => b.failing - a.failing).map((t) => (
              <div key={t.id} className="flex justify-between mt-2 text-sm"><span>{t.name}</span><span>{t.failing} de {t.n}</span></div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}
