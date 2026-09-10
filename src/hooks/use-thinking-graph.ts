import { useCallback, useMemo, useState } from 'react';
import type {
  ThinkingBranch,
  ThinkingNode,
  ThinkingPathItem,
} from '@/data/thinking-mode-types';
import { requestThinkingNode } from '@/services/thinking-mode-api';

interface DetourState {
  node: ThinkingNode;
  returnToNodeId: string;
  returnLabel: string;
}

export function useThinkingGraph(rootQuestion: string) {
  const [nodes, setNodes] = useState<Map<string, ThinkingNode>>(new Map());
  const [pathIds, setPathIds] = useState<string[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [detour, setDetour] = useState<DetourState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeFeedback, setChallengeFeedback] = useState<string | null>(null);

  const depth = pathIds.length;

  const sessionPath: ThinkingPathItem[] = useMemo(
    () =>
      pathIds.map((id) => {
        const n = nodes.get(id);
        return { nodeId: id, label: n?.question ?? id };
      }),
    [pathIds, nodes]
  );

  const currentNodeId = detour?.node.id ?? activeNodeId;
  const activeNode = currentNodeId ? nodes.get(currentNodeId) : undefined;

  const storeNode = useCallback((node: ThinkingNode) => {
    setNodes((prev) => new Map(prev).set(node.id, node));
  }, []);

  const startRoot = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDetour(null);
    setChallengeFeedback(null);
    try {
      const { node } = await requestThinkingNode({
        action: 'root',
        rootQuestion,
        depth: 0,
      });
      storeNode(node);
      setPathIds([node.id]);
      setActiveNodeId(node.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setLoading(false);
    }
  }, [rootQuestion, storeNode]);

  const expandBranch = useCallback(
    async (branch: ThinkingBranch) => {
      const fromId = detour?.node.id ?? activeNodeId;
      if (!fromId || loading) return;
      const parent = nodes.get(fromId);
      if (!parent) return;

      setLoading(true);
      setError(null);
      setChallengeFeedback(null);
      setDetour(null);

      try {
        const { node } = await requestThinkingNode({
          action: 'expand_branch',
          rootQuestion,
          currentNodeId: fromId,
          branchType: branch.type,
          branchLabel: branch.label,
          parentContext: `${parent.question}: ${parent.explanation.slice(0, 200)}`,
          sessionPath,
          depth: depth + 1,
        });
        storeNode(node);
        setPathIds((prev) => [...prev, node.id]);
        setActiveNodeId(node.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to expand');
      } finally {
        setLoading(false);
      }
    },
    [activeNodeId, depth, detour, loading, nodes, rootQuestion, sessionPath, storeNode]
  );

  const exploreConcept = useCallback(
    async (term: string) => {
      const fromId = detour?.node.id ?? activeNodeId;
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
          depth: depth + 1,
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
    [activeNodeId, depth, detour, loading, nodes, rootQuestion, sessionPath, storeNode]
  );

  const exitDetour = useCallback(() => {
    setDetour(null);
    setChallengeFeedback(null);
  }, []);

  const submitChallenge = useCallback(
    async (answer: string) => {
      if (!activeNodeId || loading) return;
      const parent = nodes.get(activeNodeId);
      if (!parent) return;

      setLoading(true);
      setError(null);

      try {
        const { node, challengeFeedback: fb } = await requestThinkingNode({
          action: 'evaluate_challenge',
          rootQuestion,
          currentNodeId: activeNodeId,
          parentContext: `${parent.question} | Challenge: ${parent.challengePrompt}`,
          challengeAnswer: answer,
          sessionPath,
          depth: depth + 1,
        });
        setChallengeFeedback(fb ?? 'Good effort — keep exploring.');
        storeNode(node);
        setPathIds((prev) => [...prev, node.id]);
        setActiveNodeId(node.id);
        setDetour(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to evaluate');
      } finally {
        setLoading(false);
      }
    },
    [activeNodeId, depth, loading, nodes, rootQuestion, sessionPath, storeNode]
  );

  const jumpToNode = useCallback(
    (nodeId: string) => {
      const idx = pathIds.indexOf(nodeId);
      if (idx >= 0) {
        setPathIds((prev) => prev.slice(0, idx + 1));
        setActiveNodeId(nodeId);
        setDetour(null);
        setChallengeFeedback(null);
      }
    },
    [pathIds]
  );

  const trail = useMemo(
    () =>
      pathIds.map((id) => {
        const n = nodes.get(id);
        return { id, label: n?.question ?? '…' };
      }),
    [pathIds, nodes]
  );

  return {
    rootQuestion,
    nodes,
    pathIds,
    activeNode,
    activeNodeId,
    detour,
    trail,
    loading,
    error,
    challengeFeedback,
    startRoot,
    expandBranch,
    exploreConcept,
    exitDetour,
    submitChallenge,
    jumpToNode,
  };
}
