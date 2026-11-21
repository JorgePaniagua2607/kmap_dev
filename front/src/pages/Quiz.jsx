import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api.js';
import { Swal, base, fail } from '../alerts.js';
import Page from '../components/Page.jsx';

export default function Quiz() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [session, setSession] = useState(null);
  const [q, setQ] = useState(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api('/quiz/start', { method: 'POST', body: { subjectId: Number(sp.get('subject')), targetTopicId: Number(sp.get('topic')) } })
      .then((r) => { setSession(r.sessionId); setQ(r.question); })
      .catch(async (e) => { await fail(e.message); nav('/'); });
  }, []);

  const answer = async (idx) => {
    setBusy(true);
    try {
      const prevTopic = q.topic.id;
      const r = await api(`/quiz/${session}/answer`, { method: 'POST', body: { questionId: q.id, optionIdx: idx } });
      await Swal.fire({ ...base, icon: r.correct ? 'success' : 'error', title: r.correct ? '¡Correcto!' : 'Incorrecto', text: r.correct ? 'Subimos la dificultad.' : 'Ajustamos la dificultad o retrocedemos al prerrequisito.', timer: 1100, showConfirmButton: false });
      if (r.finished) {
        const { rootName, path, evaluated } = r.result;
        await Swal.fire({
          ...base, icon: rootName ? 'warning' : 'success',
          title: rootName ? 'Encontramos tu tema raíz' : '¡Dominas este tema!',
          html: rootName
            ? `<b>${rootName}</b> es donde se rompió el aprendizaje.<br><br>Ruta: ${path.map((p) => p.name).join(' → ')}`
            : `Temas evaluados: ${evaluated.map((e) => e.name).join(', ')}`,
          confirmButtonText: 'Ver mi mapa',
        });
        nav('/');
      } else {
        setQ(r.question);
        if (r.question.topic.id !== prevTopic) {
          Swal.fire({ ...base, toast: true, position: 'top-end', icon: 'info', title: `Retrocedemos a: ${r.question.topic.name}`, showConfirmButton: false, timer: 2200 });
        }
      }
    } catch (e) { fail(e.message); }
    setBusy(false);
  };

  return (
    <Page crumb="Quiz adaptativo" title={q ? `Evaluando: ${q.topic.name}` : 'Preparando quiz…'}>
      <AnimatePresence mode="wait">
        {q && (
          <motion.div key={q.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="card max-w-2xl">
            <p className="text-lg font-semibold mb-4">{q.text}</p>
            <div className="grid gap-3">
              {q.options.map((o, i) => (
                <button key={i} disabled={busy} onClick={() => answer(i)} className="btn-ghost text-left hover:border-cyan-300 disabled:opacity-60">
                  <b className="text-cyan-300 mr-2">{'ABCD'[i]}</b>{o}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
