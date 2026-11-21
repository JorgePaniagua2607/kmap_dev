import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

export const masteryColor = (v) => (v == null ? '#475569' : v < 40 ? '#f43f5e' : v < 70 ? '#fbbf24' : '#2dd4a7');

export function Legend({ path }) {
  const items = [['#2dd4a7', 'Dominado ≥ 70 %'], ['#fbbf24', 'En progreso'], ['#f43f5e', 'Crítico < 40 %'], ['#475569', 'Sin datos']];
  if (path) items.push(['#22d3ee', 'Ruta de recuperación']);
  return (
    <div className="flex flex-wrap gap-4 text-sm text-blue-200 mb-2">
      {items.map(([c, l]) => <span key={l}><i className="inline-block w-3 h-3 rounded mr-1.5" style={{ background: c }} />{l}</span>)}
    </div>
  );
}

// Visualización con Cytoscape: nodos hexagonales coloreados por dominio, ruta resaltada y tema raíz pulsando
export default function KnowledgeGraph({ topics, edges, values, path = [], rootId = null, selected = null, onSelect }) {
  const ref = useRef();

  useEffect(() => {
    const pairs = new Set(path.slice(1).map((id, i) => `${path[i]}-${id}`));
    const cy = cytoscape({
      container: ref.current,
      elements: [
        ...topics.map((t) => ({
          data: { id: String(t.id), label: `${t.name}\n${values[t.id] == null ? '—' : values[t.id] + ' %'}`, color: masteryColor(values[t.id]) },
          position: { x: t.x, y: t.y },
          classes: [t.id === rootId && 'root', t.id === selected && 'sel'].filter(Boolean).join(' '),
        })),
        ...edges.map((e) => ({
          data: { id: `${e.source}-${e.target}`, source: String(e.source), target: String(e.target) },
          classes: pairs.has(`${e.source}-${e.target}`) ? 'path' : '',
        })),
      ],
      layout: { name: 'preset', padding: 30 },
      autoungrabify: true,
      wheelSensitivity: 0.3,
      style: [
        { selector: 'node', style: { shape: 'hexagon', width: 120, height: 104, 'background-color': 'data(color)', label: 'data(label)', color: '#fff', 'font-size': 12, 'font-weight': 600, 'text-wrap': 'wrap', 'text-max-width': 96, 'text-valign': 'center', 'text-halign': 'center', 'border-width': 2, 'border-color': 'rgba(255,255,255,.45)' } },
        { selector: 'edge', style: { 'curve-style': 'bezier', width: 2, 'line-color': '#1e6fd0', 'target-arrow-color': '#1e6fd0', 'target-arrow-shape': 'triangle', opacity: 0.7 } },
        { selector: 'edge.path', style: { width: 6, 'line-color': '#22d3ee', 'target-arrow-color': '#22d3ee', 'line-style': 'dashed', opacity: 1 } },
        { selector: 'node.root', style: { 'border-color': '#22d3ee', 'border-width': 6 } },
        { selector: 'node.sel', style: { 'border-color': '#ffffff', 'border-width': 5 } },
      ],
    });
    cy.on('tap', 'node', (e) => onSelect?.(Number(e.target.id())));
    const pulse = () => cy.$('.root').animate({ style: { 'border-width': 11 } }, { duration: 700 }).animate({ style: { 'border-width': 4 } }, { duration: 700 });
    let timer;
    if (rootId !== null) { pulse(); timer = setInterval(pulse, 1400); }
    return () => { clearInterval(timer); cy.destroy(); };
  }, [topics, edges, values, path, rootId, selected]);

  return <div ref={ref} className="w-full h-[480px] rounded-xl" />;
}
