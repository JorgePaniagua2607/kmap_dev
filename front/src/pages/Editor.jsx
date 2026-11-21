import { useCallback, useEffect, useState } from 'react';
import { addEdge, Background, Controls, Handle, MarkerType, Position, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../api.js';
import { ask, askText, fail, ok } from '../alerts.js';
import Page from '../components/Page.jsx';

function TopicNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-2xl bg-sky-600 text-white font-semibold border-2 ${selected ? 'border-white' : 'border-cyan-300/50'} shadow-lg`}>
      <Handle type="target" position={Position.Left} />
      {data.label}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { topic: TopicNode };
const arrow = { type: MarkerType.ArrowClosed, color: '#22d3ee' };
const edgeStyle = { stroke: '#22d3ee', strokeWidth: 2 };

// Editor de grafo: la flecha va del prerrequisito (origen) al tema que depende de él (destino)
export default function Editor() {
  const [subjects, setSubjects] = useState([]);
  const [sid, setSid] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const loadSubjects = (select) => api('/subjects').then((s) => { setSubjects(s); setSid(select ?? s[0]?.id ?? null); }).catch((e) => fail(e.message));
  useEffect(() => { loadSubjects(); }, []);
  useEffect(() => {
    if (!sid) return;
    api(`/subjects/${sid}/graph`).then((g) => {
      setNodes(g.topics.map((t) => ({ id: String(t.id), type: 'topic', position: { x: t.x, y: t.y }, data: { label: t.name } })));
      setEdges(g.edges.map((e) => ({ id: `${e.source}-${e.target}`, source: String(e.source), target: String(e.target), markerEnd: arrow, style: edgeStyle })));
    }).catch((e) => fail(e.message));
  }, [sid]);

  const onConnect = useCallback((c) => setEdges((es) => addEdge({ ...c, markerEnd: arrow, style: edgeStyle }, es)), []);

  const addTopic = async () => {
    const label = await askText('Nombre del nuevo tema');
    if (label) setNodes((ns) => [...ns, { id: `new-${Date.now()}`, type: 'topic', position: { x: 80 + Math.random() * 200, y: 60 + Math.random() * 200 }, data: { label } }]);
  };
  const rename = async (_, node) => {
    const label = await askText('Renombrar tema', node.data.label);
    if (label) setNodes((ns) => ns.map((n) => (n.id === node.id ? { ...n, data: { label } } : n)));
  };
  const addSubject = async () => {
    const name = await askText('Nombre de la materia');
    if (!name) return;
    try { const s = await api('/subjects', { method: 'POST', body: { name } }); await loadSubjects(s.id); ok('Materia creada'); } catch (e) { fail(e.message); }
  };
  const save = async () => {
    if (!(await ask('Guardar grafo', 'Se actualizarán los temas y prerrequisitos de la materia.', 'Guardar'))) return;
    try {
      await api(`/subjects/${sid}/graph`, { method: 'PUT', body: {
        nodes: nodes.map((n) => ({ id: n.id, name: n.data.label, x: n.position.x, y: n.position.y })),
        edges: edges.map((e) => ({ source: e.source, target: e.target })),
      } });
      await ok('Grafo guardado');
      setSid(null); setTimeout(() => setSid(sid), 0); // recarga con ids reales
    } catch (e) { fail(e.message); }
  };

  return (
    <Page crumb="Docente › Editor de grafo" title="Editor de temas y prerrequisitos"
      actions={
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto" value={sid || ''} onChange={(e) => setSid(Number(e.target.value))}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <button className="btn-ghost" onClick={addSubject}>+ Materia</button>
          <button className="btn-ghost" onClick={addTopic} disabled={!sid}>+ Tema</button>
          <button className="btn" onClick={save} disabled={!sid}>Guardar</button>
        </div>
      }>
      <div className="card !p-0 overflow-hidden h-[600px]">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeDoubleClick={rename} colorMode="dark" fitView deleteKeyCode={['Delete', 'Backspace']}>
          <Background color="#1e6fd0" gap={24} /><Controls />
        </ReactFlow>
      </div>
      <p className="text-sm text-blue-200">Arrastra del punto derecho de un tema al izquierdo de otro para crear un prerrequisito. Doble clic renombra; Supr elimina lo seleccionado.</p>
    </Page>
  );
}
