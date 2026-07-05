import type { SceneCell, SceneEdge, SceneNode } from "../render/SceneView";
import { pairKey } from "./localView";

export interface SceneTopologyIndex {
  nodeById: Map<string, SceneNode>;
  edgeById: Map<string, SceneEdge>;
  cellById: Map<string, SceneCell>;
  edgesByNode: Map<string, SceneEdge[]>;
  edgesByGenerator: Map<number, SceneEdge[]>;
  edgeByEndpointGenerator: Map<string, SceneEdge>;
  cellsByPair: Map<string, SceneCell[]>;
  cellsByNode: Map<string, SceneCell[]>;
  cellsByEdgeKey: Map<string, SceneCell[]>;
  boundaryEdgeKeysByCell: Map<string, string[]>;
  nodeIdByWord: Map<string, string>;
  wordPrefixNodeIds: Map<string, string[]>;
}

/**
 * Builds the graph lookups used by local topology tools. The index is derived
 * data: it must never change ids, boundary order, generator pairs, or cell
 * incidence. Cache it by a topology revision, not by appearance settings.
 */
export function buildSceneTopologyIndex(input: {
  nodes: readonly SceneNode[];
  edges: readonly SceneEdge[];
  cells: readonly SceneCell[];
}): SceneTopologyIndex {
  const nodeById = new Map(input.nodes.map((node) => [node.id, node]));
  const edgeById = new Map(input.edges.map((edge) => [edge.id, edge]));
  const cellById = new Map(input.cells.map((cell) => [cell.id, cell]));
  const edgesByNode = new Map<string, SceneEdge[]>();
  const edgesByGenerator = new Map<number, SceneEdge[]>();
  const edgeByEndpointGenerator = new Map<string, SceneEdge>();
  const cellsByPair = new Map<string, SceneCell[]>();
  const cellsByNode = new Map<string, SceneCell[]>();
  const cellsByEdgeKey = new Map<string, SceneCell[]>();
  const boundaryEdgeKeysByCell = new Map<string, string[]>();
  const nodeIdByWord = new Map<string, string>();
  const wordPrefixNodeIds = new Map<string, string[]>();

  for (const node of input.nodes) {
    const wordKey = wordKeyFromNodeId(node.id);
    if (wordKey) {
      nodeIdByWord.set(wordKey, node.id);
      for (const prefix of wordPrefixes(wordKey)) {
        const ids = wordPrefixNodeIds.get(prefix) ?? [];
        ids.push(node.id);
        wordPrefixNodeIds.set(prefix, ids);
      }
    }
  }

  for (const edge of input.edges) {
    pushMapValue(edgesByNode, edge.source, edge);
    pushMapValue(edgesByNode, edge.target, edge);
    pushMapValue(edgesByGenerator, edge.generator, edge);
    edgeByEndpointGenerator.set(
      endpointGeneratorKey(edge.source, edge.target, edge.generator),
      edge,
    );
    edgeByEndpointGenerator.set(
      endpointGeneratorKey(edge.target, edge.source, edge.generator),
      edge,
    );
  }

  for (const cell of input.cells) {
    pushMapValue(cellsByPair, pairKey(cell.generatorPair), cell);
    for (const nodeId of cell.boundaryNodeIds) {
      pushMapValue(cellsByNode, nodeId, cell);
    }
    const edgeKeys = boundaryEdgeKeys(cell.boundaryNodeIds);
    boundaryEdgeKeysByCell.set(cell.id, edgeKeys);
    for (const edgeKey of edgeKeys) {
      pushMapValue(cellsByEdgeKey, edgeKey, cell);
    }
  }

  return {
    nodeById,
    edgeById,
    cellById,
    edgesByNode,
    edgesByGenerator,
    edgeByEndpointGenerator,
    cellsByPair,
    cellsByNode,
    cellsByEdgeKey,
    boundaryEdgeKeysByCell,
    nodeIdByWord,
    wordPrefixNodeIds,
  };
}

export function endpointGeneratorKey(
  source: string,
  target: string,
  generator: number,
): string {
  return `${source}->${target}@${generator}`;
}

export function undirectedBoundaryEdgeKey(left: string, right: string): string {
  return left < right ? `${left}--${right}` : `${right}--${left}`;
}

function boundaryEdgeKeys(boundaryNodeIds: readonly string[]): string[] {
  const keys: string[] = [];
  for (let index = 0; index < boundaryNodeIds.length; index += 1) {
    const source = boundaryNodeIds[index];
    const target = boundaryNodeIds[(index + 1) % boundaryNodeIds.length];
    if (source !== undefined && target !== undefined) {
      keys.push(undirectedBoundaryEdgeKey(source, target));
    }
  }
  return keys;
}

function pushMapValue<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const values = map.get(key);
  if (values) {
    values.push(value);
    return;
  }
  map.set(key, [value]);
}

function wordKeyFromNodeId(nodeId: string): string | undefined {
  if (nodeId === "e") {
    return "";
  }
  if (/^s\d+(?:s\d+)*$/.test(nodeId)) {
    return nodeId;
  }
  if (nodeId.startsWith("w:")) {
    return nodeId.slice(2);
  }
  return undefined;
}

function wordPrefixes(wordKey: string): string[] {
  if (wordKey === "") {
    return [""];
  }
  const matches = wordKey.match(/s\d+/g) ?? [wordKey];
  const prefixes = [""];
  for (let count = 1; count <= matches.length; count += 1) {
    prefixes.push(matches.slice(0, count).join(""));
  }
  return prefixes;
}
