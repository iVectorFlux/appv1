import { useCallback, useMemo, useState } from 'react';
import type {
  ThinkingBranch,
  ThinkingNode,
  ThinkingPathItem,
} from '@/data/thinking-mode-types';
import { requestThinkingNode } from '@/services/thinking-mode-api';
import { branchKey } from '@/components/thinking-mode/thinking-ui-utils';

export interface GraphEdge {
  fromId: string;
  branch: ThinkingBranch;
  toId: string;
}

interface DetourState {
  node: ThinkingNode;
  returnToNodeId: string;
  returnLabel: string;
}

function initialBranchOrder(node: ThinkingNode): string[] {
  return node.branches.map((b) => branchKey(node.id, b));
}

export function useThinkingGraph(rootQuestion: string) {
  const [nodes, setNodes] = useState<Map<string, ThinkingNode>>(new Map());
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  /** Per parent node: display order of branch keys (expanded ones sink to bottom). */
  const [branchOrders, setBranchOrders] = useState<Map<string, string[]>>(new Map());
  /** Which branch keys have loaded child content. */
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [openBranchKey, setOpenBranchKey] = useState<string | null>(null);
  const [loadingBranchKey, setLoadingBranchKey] = useState<string | null>(null);
  const [detour, setDetour] = useState<DetourState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeFeedback, setChallengeFeedback] = useState<string | null>(null);

  const rootNode = rootNodeId ? nodes.get(rootNodeId) : undefined;
  const activeNode = detour?.node ?? rootNode;

  const sessionPath: ThinkingPathItem[] = useMemo(() => {
    const ids = new Set<string>();
    if (rootNodeId) ids.add(rootNodeId);
    edges.forEach((e) => {
      ids.add(e.fromId);
      ids.add(e.toId);
    });
    return Array.from(ids).map((id) => {
      const n = nodes.get(id);
      return { nodeId: id, label: n?.question ?? id };
    });
  }, [rootNodeId, edges, nodes]);

  const storeNode = useCallback((node: ThinkingNode) => {
    setNodes((prev) => new Map(prev).set(node.id, node));
  }, []);

  const sinkBranchToBottom = useCallback((parentNodeId: string, key: string) => {
    setBranchOrders((prev) => {
      const next = new Map(prev);
      const order = [...(next.get(parentNodeId) ?? [])];
      const idx = order.indexOf(key);
      if (idx >= 0) order.splice(idx, 1);
      order.push(key);
      next.set(parentNodeId, order);
      return next;
    });
  }, []);

  const startRoot = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDetour(null);
    setChallengeFeedback(null);
    setEdges([]);
    setExpandedKeys(new Set());
    setOpenBranchKey(null);
    setBranchOrders(new Map());
    try {
      const { node } = await requestThinkingNode({
        action: 'root',
        rootQuestion,
        depth: 0,
      });
      storeNode(node);
      setRootNodeId(node.id);
      setBranchOrders(new Map([[node.id, initialBranchOrder(node)]]));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setLoading(false);
    }
  }, [rootQuestion, storeNode]);

  const expandBranch = useCallback(
    async (parentNodeId: string, branch: ThinkingBranch) => {
      const parent = nodes.get(parentNodeId);
      if (!parent || loadingBranchKey) return;

      const key = branchKey(parentNodeId, branch);
      setOpenBranchKey(key);
      sinkBranchToBottom(parentNodeId, key);

      if (expandedKeys.has(key)) return;

      setLoadingBranchKey(key);
      setError(null);

      try {
        const depth = parentNodeId === rootNodeId ? 1 : 2;
        const { node } = await requestThinkingNode({
          action: 'expand_branch',
          rootQuestion,
          currentNodeId: parentNodeId,
          branchType: branch.type,
          branchLabel: branch.label,
          parentContext: `${parent.question}: ${parent.firstPrinciples ?? parent.explanation}`.slice(0, 400),
          sessionPath,
          depth,
        });
        storeNode(node);
        setEdges((prev) => {
          if (prev.some((e) => e.fromId === parentNodeId && e.toId === node.id)) return prev;
          return [...prev, { fromId: parentNodeId, branch, toId: node.id }];
        });
        setExpandedKeys((prev) => new Set(prev).add(key));
        if (!branchOrders.has(node.id)) {
          setBranchOrders((prev) => new Map(prev).set(node.id, initialBranchOrder(node)));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to expand');
      } finally {
        setLoadingBranchKey(null);
      }
    },
    [branchOrders, expandedKeys, loadingBranchKey, nodes, rootNodeId, rootQuestion, sessionPath, sinkBranchToBottom, storeNode]
  );

  const exploreConcept = useCallback(
    async (term: string, fromNodeId?: string) => {
      const fromId = fromNodeId ?? rootNodeId;
      if (!fromId || loading) return;
      const parent = nodes.get(fromId);
      if (!parent) return;

      setLoading(true);
      setError(null);
      setChallengeFeedback(null);

      try {
        const { node } = await requestThinkingNode({
          action: 'explore_concept',
          rootQuestion,
          conceptTerm: term,
          parentContext: parent.question,
          sessionPath,
          depth: 2,
        });
        storeNode(node);
        setDetour({
          node,
          returnToNodeId: fromId,
          returnLabel: parent.question,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to explore concept');
      } finally {
        setLoading(false);
      }
    },
    [loading, nodes, rootNodeId, rootQuestion, sessionPath, storeNode]
  );

  const exitDetour = useCallback(() => {
    setDetour(null);
    setChallengeFeedback(null);
  }, []);

  const submitChallenge = useCallback(
    async (answer: string, fromNodeId?: string) => {
      const nodeId = fromNodeId ?? rootNodeId;
      if (!nodeId || loading) return;
      const parent = nodes.get(nodeId);
      if (!parent) return;

      setLoading(true);
      setError(null);

      try {
        const { node, challengeFeedback: fb } = await requestThinkingNode({
          action: 'evaluate_challenge',
          rootQuestion,
          currentNodeId: nodeId,
          parentContext: `${parent.question} | Challenge: ${parent.challengePrompt}`,
          challengeAnswer: answer,
          sessionPath,
          depth: 2,
        });
        setChallengeFeedback(fb ?? 'Good effort — keep exploring.');
        storeNode(node);
        setDetour(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to evaluate');
      } finally {
        setLoading(false);
      }
    },
    [loading, nodes, rootNodeId, rootQuestion, sessionPath, storeNode]
  );

  const getChildNodeForBranch = useCallback(
    (parentNodeId: string, branch: ThinkingBranch): ThinkingNode | undefined => {
      const key = branchKey(parentNodeId, branch);
      if (!expandedKeys.has(key)) return undefined;
      const edge = edges.find((e) => e.fromId === parentNodeId && branchKey(parentNodeId, e.branch) === key);
      return edge ? nodes.get(edge.toId) : undefined;
    },
    [edges, expandedKeys, nodes]
  );

  const visitedNodes = useMemo(() => {
    const list: ThinkingNode[] = [];
    if (rootNode) list.push(rootNode);
    edges.forEach((e) => {
      const child = nodes.get(e.toId);
      if (child && !list.some((n) => n.id === child.id)) list.push(child);
    });
    return list;
  }, [rootNode, edges, nodes]);

  return {
    rootQuestion,
    rootNode,
    rootNodeId,
    nodes,
    edges,
    branchOrders,
    expandedKeys,
    openBranchKey,
    loadingBranchKey,
    activeNode,
    detour,
    visitedNodes,
    loading,
    error,
    challengeFeedback,
    startRoot,
    expandBranch,
    exploreConcept,
    exitDetour,
    submitChallenge,
    getChildNodeForBranch,
    setOpenBranchKey,
  };
};
