import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import './KnowledgeGraph.css';

export const masteryColor = (v) =>
  v == null ? '#1e3a5f' : v < 51 ? '#7f1d1d' : v < 71 ? '#78350f' : '#0c4a6e';

export function Legend({ path }) {
  const items = [
    ['#00f2fe', 'Dominado / Seleccionado'],
    ['#d946ef', 'En curso / Prerrequisito'],
    ['#fbbf24', 'En progreso (51–70%)'],
    ['#fb7185', 'Reforzar (< 51%)'],
  ];
  if (path) items.push(['#38bdf8', 'Ruta sugerida']);
  return (
    <div className="flex flex-wrap gap-3 sm:gap-4 text-xs text-cyan-100 mb-3">
      {items.map(([c, l]) => (
        <span
          key={l}
          className="flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full bg-[#05132b]/70 border border-sky-400/25 hover:border-cyan-300/70 hover:scale-105 transition-all duration-200"
        >
          <i
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: c, boxShadow: `0 0 10px ${c}` }}
          />
          {l}
        </span>
      ))}
    </div>
  );
}

export default function KnowledgeGraph({
  topics,
  edges,
  values = {},
  path = [],
  rootId = null,
  selected = null,
  onSelect,
}) {
  const ref = useRef();
  const cyRef = useRef(null);

  useEffect(() => {
    const pairs = new Set(path.slice(1).map((id, i) => `${path[i]}-${id}`));
    const cy = cytoscape({
      container: ref.current,
      elements: [
        ...topics.map((t, idx) => {
          const val = values[t.id];
          const isSel = t.id === selected;
          const isPurple = val == null || idx >= 3;
          const bgColor = isSel
            ? '#0c4a8a'
            : val != null && val < 51
            ? '#4c102e'
            : isPurple
            ? '#2d165c'
            : '#0c3366';
          const borderColor = isSel
            ? '#00f2fe'
            : val != null && val < 51
            ? '#fb7185'
            : isPurple
            ? '#d946ef'
            : '#22d3ee';
          const ico = t.icon || '📘';
          const scoreText = val == null ? '' : ` (${val}%)`;
          return {
            data: {
              id: String(t.id),
              label: `${ico}  ${t.name}${scoreText}`,
              bgColor,
              borderColor,
            },
            position: { x: t.x, y: t.y },
            classes: [t.id === rootId && 'root', isSel && 'sel'].filter(Boolean).join(' '),
          };
        }),
        ...edges.map((e) => ({
          data: {
            id: `${e.source}-${e.target}`,
            source: String(e.source),
            target: String(e.target),
          },
          classes: pairs.has(`${e.source}-${e.target}`) ? 'path' : '',
        })),
      ],
      layout: { name: 'preset', padding: 32 },
      autoungrabify: true,
      wheelSensitivity: 0.3,
      style: [
        {
          selector: 'node',
          style: {
            shape: 'round-rectangle',
            width: 180,
            height: 54,
            'background-color': 'data(bgColor)',
            'background-opacity': 0.95,
            label: 'data(label)',
            color: '#ffffff',
            'font-size': 13,
            'font-weight': 800,
            'text-wrap': 'wrap',
            'text-max-width': 160,
            'text-valign': 'center',
            'text-halign': 'center',
            'border-width': 2.5,
            'border-color': 'data(borderColor)',
            'transition-property': 'width, height, border-width, border-color, background-color',
            'transition-duration': '0.18s',
          },
        },
        {
          selector: 'node.hovered',
          style: {
            width: 196,
            height: 60,
            'border-width': 4,
            'border-color': '#00f2fe',
            'background-color': '#13539e',
          },
        },
        {
          selector: 'node.sel',
          style: {
            'border-color': '#00f2fe',
            'border-width': 4,
            'background-color': '#104e96',
          },
        },
        {
          selector: 'node.root',
          style: {
            'border-color': '#00f2fe',
            'border-width': 4.5,
          },
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            width: 2.8,
            'line-color': '#00f2fe',
            'target-arrow-color': '#00f2fe',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.15,
            opacity: 0.85,
            'transition-property': 'width, line-color, opacity',
            'transition-duration': '0.18s',
          },
        },
        {
          selector: 'edge.edge-hover',
          style: {
            width: 4.5,
            'line-color': '#67e8f9',
            'target-arrow-color': '#67e8f9',
            opacity: 1,
          },
        },
        {
          selector: 'edge.path',
          style: {
            width: 4.5,
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'line-style': 'dashed',
            opacity: 1,
          },
        },
      ],
    });

    cyRef.current = cy;
    cy.on('tap', 'node', (e) => onSelect?.(e.target.id()));

    // Reacción interactiva al pasar el cursor sobre nodos y aristas
    cy.on('mouseover', 'node', (e) => {
      if (ref.current) ref.current.style.cursor = 'pointer';
      const node = e.target;
      node.addClass('hovered');
      node.connectedEdges().addClass('edge-hover');
    });
    cy.on('mouseout', 'node', (e) => {
      if (ref.current) ref.current.style.cursor = 'default';
      const node = e.target;
      node.removeClass('hovered');
      node.connectedEdges().removeClass('edge-hover');
    });

    const onResize = () => {
      cy.resize();
      cy.fit(undefined, 30);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cy.destroy();
    };
  }, [topics, edges, values, path, rootId, selected]);

  const zoom = (factor) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({
      level: cy.zoom() * factor,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  };

  const fit = () => {
    cyRef.current?.fit(undefined, 32);
  };

  return (
    <div className="relative w-full group">
      <div
        ref={ref}
        className="w-full h-[340px] sm:h-[420px] lg:h-[450px] rounded-2xl bg-[#041024]/90 border border-sky-400/35 group-hover:border-cyan-300/70 shadow-[inset_0_0_30px_rgba(0,242,254,0.08)] transition-colors duration-200"
      />
      {/* Controles interactivos del grafo */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-[#061838]/90 border border-sky-400/45 rounded-xl p-1 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <button
          type="button"
          onClick={() => zoom(1.2)}
          className="cursor-pointer w-8 h-8 rounded-lg hover:bg-cyan-400/30 hover:text-white hover:scale-110 text-cyan-200 font-black text-base grid place-items-center active:scale-90 transition-all duration-150"
          title="Acercar"
        >
          ＋
        </button>
        <button
          type="button"
          onClick={() => zoom(0.8)}
          className="cursor-pointer w-8 h-8 rounded-lg hover:bg-cyan-400/30 hover:text-white hover:scale-110 text-cyan-200 font-black text-base grid place-items-center active:scale-90 transition-all duration-150"
          title="Alejar"
        >
          －
        </button>
        <button
          type="button"
          onClick={fit}
          className="cursor-pointer px-2.5 h-8 rounded-lg hover:bg-cyan-400/30 hover:text-white hover:scale-105 text-cyan-200 font-bold text-xs grid place-items-center active:scale-90 transition-all duration-150"
          title="Ajustar grafo a la pantalla"
        >
          Centrar
        </button>
      </div>
    </div>
  );
}
