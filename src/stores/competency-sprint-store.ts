import { create } from 'zustand';
import {
  getActiveSprint,
  saveSprint,
  completeSprint,
  invokeSprintApi,
  type CompetencySprint,
} from '@/services/competency-sprint-service';

interface CompetencySprintState {
  sprint: CompetencySprint | null;
  loading: boolean;
  error: string | null;
  currentDrillIndex: number;
  submittingDrill: boolean;
  submittingSimTurn: boolean;
  generatingReport: boolean;

  // Actions
  loadOrCreateSprint: (userId: string, skillId: string) => Promise<void>;
  startNewSprintWithContext: (
    userId: string,
    skillId: string,
    context: { industry: string; role: string; function: string; situation: string }
  ) => Promise<void>;
  moveToStage: (stage: CompetencySprint['currentStage']) => Promise<void>;
  checkOffMicroSkill: (skillId: string) => Promise<void>;
  setCurrentDrillIndex: (index: number) => void;
  submitDrillAnswer: (microSkillId: string, answer: string) => Promise<void>;
  startSimulation: () => Promise<void>;
  submitSimulationTurn: (text: string, selectedOptionId?: string) => Promise<void>;
  completeActiveSimulation: () => Promise<void>;
  generateReport: () => Promise<void>;
  resetSprint: () => Promise<void>;
}

export const useCompetencySprintStore = create<CompetencySprintState>((set, get) => ({
  sprint: null,
  loading: false,
  error: null,
  currentDrillIndex: 0,
  submittingDrill: false,
  submittingSimTurn: false,
  generatingReport: false,

  loadOrCreateSprint: async (userId: string, skillId: string) => {
    set({ loading: true, error: null });
    try {
      const active = await getActiveSprint(userId, skillId);
      set({ sprint: active, loading: false });
    } catch (err: any) {
      console.error('[SprintStore] Failed to load sprint:', err);
      set({ error: err.message || 'Failed to initialize sprint', loading: false });
    }
  },

  startNewSprintWithContext: async (
    userId: string,
    skillId: string,
    context: { industry: string; role: string; function: string; situation: string }
  ) => {
    set({ loading: true, error: null });
    try {
      const microSkillsData = await invokeSprintApi('generate_micro_skills', { skillId, context });
      const initialSprint: CompetencySprint = {
        userId,
        skillId,
        status: 'active',
        currentStage: 'primer',
        microSkills: (microSkillsData.microSkills || []).map((s: any) => ({ ...s, understood: false })),
        microDrillsProgress: (microSkillsData.drills || []).map((d: any) => ({
          ...d,
          userAnswer: '',
          score: null,
          feedback: null,
          strengths: [],
          growthAreas: [],
          perfectResponse: null,
          completed: false,
        })),
        guidedSimChat: [],
        independentSimChat: [],
        escalatedSimChat: [],
        finalReport: {
          customContext: {
            industry: context.industry,
            role: context.role,
            function: context.function,
            situation: context.situation,
            simCharacter: microSkillsData.simCharacter,
          },
        },
      };

      const saved = await saveSprint(initialSprint);
      set({ sprint: saved, currentDrillIndex: 0, loading: false });
    } catch (err: any) {
      console.error('[SprintStore] Failed to start sprint with context:', err);
      set({ error: err.message || 'Failed to start sprint', loading: false });
    }
  },

  moveToStage: async (stage: CompetencySprint['currentStage']) => {
    const { sprint } = get();
    if (!sprint) return;

    set({ loading: true });
    try {
      const updated = { ...sprint, currentStage: stage };
      const saved = await saveSprint(updated);
      if (saved) {
        set({ sprint: saved });
      }
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to update stage', loading: false });
    }
  },

  checkOffMicroSkill: async (skillId: string) => {
    const { sprint } = get();
    if (!sprint) return;

    const updatedSkills = sprint.microSkills.map((s) =>
      s.id === skillId ? { ...s, understood: true } : s
    );

    const updated = { ...sprint, microSkills: updatedSkills };
    set({ sprint: updated });
    void saveSprint(updated); // Background save
  },

  setCurrentDrillIndex: (index: number) => {
    set({ currentDrillIndex: index });
  },

  submitDrillAnswer: async (microSkillId: string, answer: string) => {
    const { sprint } = get();
    if (!sprint) return;

    set({ submittingDrill: true, error: null });
    try {
      const currentSkill = sprint.microSkills.find((s) => s.id === microSkillId);
      const drillScenario = sprint.microDrillsProgress.find((d) => d.microSkillId === microSkillId);

      const scenarioText = drillScenario?.scenario || 'Scenario placeholder';
      const questionText = drillScenario?.question || 'Question placeholder';

      const evaluation = await invokeSprintApi('evaluate_drill', {
        scenario: scenarioText,
        question: questionText,
        userAnswer: answer,
        microSkillName: currentSkill?.name || microSkillId,
      });

      const updatedProgress = sprint.microDrillsProgress.map((d) =>
        d.microSkillId === microSkillId
          ? {
              ...d,
              userAnswer: answer,
              score: evaluation.score,
              feedback: evaluation.feedback,
              strengths: evaluation.strengths,
              growthAreas: evaluation.growthAreas,
              perfectResponse: evaluation.perfectResponse,
              completed: true,
            }
          : d
      );

      const updated = { ...sprint, microDrillsProgress: updatedProgress };
      const saved = await saveSprint(updated);
      if (saved) {
        set({ sprint: saved });
      }
      set({ submittingDrill: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to submit drill answer', submittingDrill: false });
    }
  },

  startSimulation: async () => {
    const { sprint } = get();
    if (!sprint) return;

    const currentStage = sprint.currentStage;
    const chatField =
      currentStage === 'guided'
        ? 'guidedSimChat'
        : currentStage === 'independent'
          ? 'independentSimChat'
          : 'escalatedSimChat';

    if (sprint[chatField] && sprint[chatField].length > 0) {
      // Chat is already initialized
      return;
    }

    set({ submittingSimTurn: true });
    try {
      const response = await invokeSprintApi('simulation_turn', {
        mode: currentStage,
        chatHistory: [],
        customContext: sprint.finalReport?.customContext,
      });

      const updated = {
        ...sprint,
        [chatField]: [
          {
            id: 'init',
            role: 'assistant',
            content: response.characterReply,
            tip: response.tip,
            options: response.options || [],
            telemetry: response.telemetry || { empathy: 50, clarity: 50, assertiveness: 50, deEscalation: 50 },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const saved = await saveSprint(updated);
      if (saved) {
        set({ sprint: saved });
      }
      set({ submittingSimTurn: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to initialize simulation', submittingSimTurn: false });
    }
  },

  submitSimulationTurn: async (text: string, selectedOptionId?: string) => {
    const { sprint } = get();
    if (!sprint) return;

    const currentStage = sprint.currentStage;
    const chatField =
      currentStage === 'guided'
        ? 'guidedSimChat'
        : currentStage === 'independent'
          ? 'independentSimChat'
          : 'escalatedSimChat';

    const currentHistory = sprint[chatField] || [];

    // 1. Add user turn locally
    const userTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const tempHistory = [...currentHistory, userTurn];
    set({
      sprint: {
        ...sprint,
        [chatField]: tempHistory,
      },
      submittingSimTurn: true,
      error: null,
    });

    try {
      // 2. Fetch AI / branching response
      const response = await invokeSprintApi('simulation_turn', {
        mode: currentStage,
        chatHistory: currentHistory.map((h: any) => ({ role: h.role, content: h.content })),
        selectedOptionId,
        userAnswer: text,
        customContext: sprint.finalReport?.customContext,
      });

      const assistantTurn = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response.characterReply,
        tip: response.tip,
        options: response.options || [],
        telemetry: response.telemetry || { empathy: 50, clarity: 50, assertiveness: 50, deEscalation: 50 },
        timestamp: new Date().toISOString(),
      };

      const updated = {
        ...sprint,
        [chatField]: [...tempHistory, assistantTurn],
      };

      const saved = await saveSprint(updated);
      if (saved) {
        set({ sprint: saved });
      }
      set({ submittingSimTurn: false });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to send reply',
        submittingSimTurn: false,
        // Revert user message on error so they can re-try
        sprint: {
          ...sprint,
          [chatField]: currentHistory,
        },
      });
    }
  },

  completeActiveSimulation: async () => {
    const { sprint, moveToStage } = get();
    if (!sprint) return;

    if (sprint.currentStage === 'guided') {
      await moveToStage('independent');
    } else if (sprint.currentStage === 'independent') {
      await moveToStage('escalated');
    } else if (sprint.currentStage === 'escalated') {
      await moveToStage('report');
    }
  },

  generateReport: async () => {
    const { sprint } = get();
    if (!sprint) return;

    set({ generatingReport: true, error: null });
    try {
      const result = await invokeSprintApi('generate_final_report', {
        drills: sprint.microDrillsProgress,
        guidedTrans: sprint.guidedSimChat.map((c) => ({ role: c.role, content: c.content, telemetry: c.telemetry })),
        independentTrans: sprint.independentSimChat.map((c) => ({ role: c.role, content: c.content, telemetry: c.telemetry })),
        escalatedTrans: sprint.escalatedSimChat.map((c) => ({ role: c.role, content: c.content, telemetry: c.telemetry })),
        customContext: sprint.finalReport?.customContext,
      });

      const updated = {
        ...sprint,
        finalReport: {
          ...sprint.finalReport,
          ...result,
        },
      };

      const saved = await saveSprint(updated);
      if (saved) {
        set({ sprint: saved });
      }
      set({ generatingReport: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to compile AI report', generatingReport: false });
    }
  },

  resetSprint: async () => {
    const { sprint } = get();
    if (!sprint) return;

    set({ loading: true, error: null });
    try {
      if (sprint.id) {
        await completeSprint(sprint.id);
      }
      set({ sprint: null, currentDrillIndex: 0, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to repeat sprint', loading: false });
    }
  },
}));

