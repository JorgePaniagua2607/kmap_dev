const { AppError } = require('./AppError');

/**
 * Valida que un grafo dirigido (nodes, edges) sea un Grafo Acíclico Dirigido (DAG).
 * Detecta auto-bucles (source === target) y ciclos dirigidos mediante DFS de 3 colores
 * y ordenamiento topológico de Kahn.
 *
 * @param {Array<{id: string|number}>} nodes
 * @param {Array<{source: string|number, target: string|number}>} edges
 */
function validateDAG(nodes = [], edges = []) {
  const nodeIds = new Set(nodes.map((n) => String(n.id)));
  const adj = new Map();
  const inDegree = new Map();

  for (const id of nodeIds) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }

  for (const edge of edges) {
    const source = String(edge.source);
    const target = String(edge.target);

    if (!nodeIds.has(source)) {
      throw new AppError(
        `Arista inválida: el nodo origen "${source}" no existe en la lista de nodos`,
        400
      );
    }

    if (!nodeIds.has(target)) {
      throw new AppError(
        `Arista inválida: el nodo destino "${target}" no existe en la lista de nodos`,
        400
      );
    }

    if (source === target) {
      throw new AppError(
        `Violación DAG: Se detectó un auto-bucle en el nodo "${source}" (${source} -> ${target})`,
        400,
        { cyclePath: [source, target] }
      );
    }

    adj.get(source).push(target);
    inDegree.set(target, (inDegree.get(target) || 0) + 1);
  }

  // 1. Detección de ciclo exacto mediante DFS (0 = no visitado, 1 = en pila actual, 2 = completado)
  const state = new Map();
  const parent = new Map();
  for (const id of nodeIds) {
    state.set(id, 0);
  }

  let cyclePath = null;

  function dfs(u) {
    state.set(u, 1);
    for (const v of adj.get(u) || []) {
      if (state.get(v) === 1) {
        // Reconstruir el ciclo exacto
        const path = [v];
        let curr = u;
        while (curr && curr !== v) {
          path.push(curr);
          curr = parent.get(curr);
        }
        path.push(v);
        path.reverse();
        cyclePath = path;
        return true;
      }
      if (state.get(v) === 0) {
        parent.set(v, u);
        if (dfs(v)) return true;
      }
    }
    state.set(u, 2);
    return false;
  }

  for (const id of nodeIds) {
    if (state.get(id) === 0) {
      if (dfs(id)) {
        throw new AppError(
          `Violación DAG: Se detectó un ciclo entre los temas (${cyclePath.join(' -> ')})`,
          400,
          { isValidDAG: false, cyclePath }
        );
      }
    }
  }

  // 2. Ordenamiento topológico (Algoritmo de Kahn)
  const queue = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const topologicalOrder = [];
  while (queue.length > 0) {
    const u = queue.shift();
    topologicalOrder.push(u);
    for (const v of adj.get(u) || []) {
      inDegree.set(v, inDegree.get(v) - 1);
      if (inDegree.get(v) === 0) {
        queue.push(v);
      }
    }
  }

  if (topologicalOrder.length !== nodeIds.size) {
    throw new AppError(
      'Violación DAG: El grafo contiene dependencias circulares y no puede ordenarse topológicamente',
      400,
      { isValidDAG: false }
    );
  }

  return {
    isValidDAG: true,
    topologicalOrder
  };
}

module.exports = {
  validateDAG
};
