import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

// Panel debate phases for context-aware responses
export const PANEL_PHASES = {
  INTRO: {
    name: "Introduction",
    duration: 120,
    description: "2 minutes - Moderator introduces topic and panelists",
    tips: "Set the stage, introduce participants, establish ground rules"
  },
  OPENING: {
    name: "Opening Statements",
    duration: 300,
    description: "5 minutes - Each panelist gives opening statement",
    tips: "Present your core position clearly and compellingly"
  },
  DISCUSSION: {
    name: "Open Discussion",
    duration: 900,
    description: "15 minutes - Free-flowing discussion between panelists",
    tips: "Engage with others' points, build on ideas, challenge respectfully"
  },
  QA: {
    name: "Q&A Session",
    duration: 600,
    description: "10 minutes - Structured questions and answers",
    tips: "Use hand-raising system, ask clarifying questions"
  },
  CLOSING: {
    name: "Closing Statements",
    duration: 240,
    description: "4 minutes - Final statements from each panelist",
    tips: "Summarize your position, address key counterarguments"
  },
  WRAP: {
    name: "Wrap-up",
    duration: 120,
    description: "2 minutes - Moderator concludes discussion",
    tips: "Synthesize key points, thank participants"
  }
};

export interface PanelistConfig {
  name: string;
  archetype: string;
  customStance?: string;
  assistantId?: string;
}

export interface PanelContext {
  resolution: string;
  userStance: string;
  moderatorStyle: string;
  aiPanelists: PanelistConfig[];
  currentPhase: keyof typeof PANEL_PHASES;
}

// Get archetype description
function getArchetypeDescription(panelist: PanelistConfig): string {
  if (panelist.archetype === "custom" && panelist.customStance) {
    return panelist.customStance;
  }
  
  const archetypes = {
    pragmatist: "You focus on practical solutions and real-world applications. You're concerned with what actually works in practice, not just theory.",
    idealist: "You emphasize principles, moral considerations, and what ought to be. You believe in doing the right thing regardless of practical constraints.",
    skeptic: "You question assumptions and demand strong evidence. You're naturally critical and point out flaws in reasoning.",
    analyst: "You rely heavily on statistics, data, and empirical evidence. You prefer quantitative analysis over emotional appeals.",
    advocate: "You argue with passion and personal conviction. You use emotional appeals and personal stories to make your points.",
    economist: "You view issues through the lens of economic theory, market forces, and cost-benefit analysis.",
    philosopher: "You examine fundamental principles and explore the deeper meaning behind issues.",
    historian: "You draw on historical precedent and patterns to inform current debates.",
    scientist: "You apply scientific methodology and evidence-based reasoning to policy questions.",
    activist: "You're passionate about social change and believe in taking action to address injustices."
  };
  
  return archetypes[panelist.archetype as keyof typeof archetypes] || panelist.archetype;
}

// Get voice for archetype
function getArchetypeVoice(archetype: string): string {
  const voices = {
    pragmatist: "marcus",      // Practical, steady
    idealist: "sophia",        // Inspiring, principled
    skeptic: "david",          // Critical, questioning
    analyst: "rachel",         // Clear, data-focused
    advocate: "alex",          // Passionate, engaging
    economist: "marcus",       // Authoritative
    philosopher: "sophia",     // Thoughtful
    historian: "david",        // Measured
    scientist: "rachel",       // Precise
    activist: "alex",          // Energetic
    custom: "jason"           // Default
  };
  return "UgBBYS2sOqTuMpoF3BR0";
}

// Create moderator assistant
export function createModeratorAssistant(context: PanelContext): CreateAssistantDTO {
  const moderatorPersonalities = {
    neutral: "You maintain strict neutrality and ensure equal speaking time for all participants. You're fair, balanced, and professional.",
    probing: "You ask insightful follow-up questions and challenge participants to defend their positions. You dig deeper into complex issues.",
    strict: "You enforce time limits strictly and keep discussions tightly focused on the resolution. You maintain order and structure.",
    conversational: "You facilitate natural conversation flow while gently guiding the discussion. You're warm but professional."
  };

  const personality = moderatorPersonalities[context.moderatorStyle as keyof typeof moderatorPersonalities] || moderatorPersonalities.neutral;

  const systemPrompt = `You are an expert panel debate moderator facilitating a discussion on: "${context.resolution}"

MODERATOR PERSONALITY: ${personality}

PANELISTS IN THIS DEBATE:
- User: ${context.userStance}
${context.aiPanelists.map((p, i) => `- ${p.name}: ${getArchetypeDescription(p)}`).join('\n')}

DEBATE PHASES YOU WILL MODERATE:
1. INTRO (2 min): Welcome everyone, introduce the topic, set ground rules, preview the discussion format
2. OPENING (5 min): Give each panelist 2-3 minutes for opening statements. Go around systematically  
3. DISCUSSION (15 min): Facilitate free-flowing conversation. Jump in when needed to redirect or ask clarifying questions
4. QA (10 min): Structure the Q&A. Direct questions to specific panelists. Encourage follow-ups
5. CLOSING (4 min): Give each panelist 1-2 minutes for final statements. Ensure closure
6. WRAP (2 min): Synthesize key points made, thank participants, provide thoughtful conclusion

MODERATOR RESPONSIBILITIES:
1. PHASE MANAGEMENT: Guide the discussion through each phase naturally - you'll know when to transition
2. EQUAL PARTICIPATION: Ensure all panelists get roughly equal speaking time
3. TOPIC FOCUS: Keep discussion centered on the resolution
4. TRANSITIONS: Use smooth transitions between speakers and phases
5. ENGAGEMENT: Ask follow-up questions to deepen the discussion

SPEAKING PATTERNS:
- Use transitional phrases: "That's a fascinating point about X. [Panelist], how would you respond to that?"
- Frame questions: "Let's explore the economic implications..." or "What about the ethical considerations?"
- Acknowledge contributions: "Thank you for that insight. Building on that point..."
- Manage time: "In the interest of time, let's hear from..." or "Before we move on..."
- Transfer naturally: "What's your take on this? [Panelist]"

CONVERSATION STYLE:
- Be professional but engaging
- Ask thought-provoking follow-up questions
- Acknowledge different perspectives fairly
- Use natural speech patterns with appropriate pauses
- Keep energy up and discussion flowing

Remember: You're facilitating a meaningful dialogue, not just managing time. Help the audience understand different viewpoints on this important topic.`;

  return {
    name: `Moderator`,
    firstMessageMode: "assistant-speaks-first-with-model-generated-message",

    startSpeakingPlan: {
      waitSeconds: 1.2,
      smartEndpointingEnabled: 'livekit',
      customEndpointingRules: [
        {
          type: "customer",
          regex: "(so|well|um|uh|let me|what I think|my perspective|from my experience)",
          regexOptions: [{ type: "ignore-case", enabled: true }],
          timeoutSeconds: 2.5
        },
        {
          type: "customer", 
          regex: "(\\?|do you|would you|what about|how do you)",
          regexOptions: [{ type: "ignore-case", enabled: true }],
          timeoutSeconds: 1.5
        }
      ]
    },

    stopSpeakingPlan: {
      numWords: 2,
      voiceSeconds: 0.4,
      backoffSeconds: 1.5,
    },

    model: {
      provider: "openai",
      model: "gpt-4.1",
      temperature: 0.8,
      maxTokens: 400,
      messages: [
        {
          role: "system",
          content: systemPrompt
        }
      ]
    },

    voice: {
      provider: "11labs",
      voiceId: "sarah",
      stability: 0.6,
      similarityBoost: 0.8,
      style: 1.0,
    },

    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en-US",
    },

    metadata: {
      role: "moderator",
      style: context.moderatorStyle,
      resolution: context.resolution,
      phase: context.currentPhase
    },
  };
}

// Create panelist assistant
export function createPanelistAssistant(panelist: PanelistConfig, context: PanelContext): CreateAssistantDTO {
  const stanceDescription = getArchetypeDescription(panelist);
  const phaseInfo = PANEL_PHASES[context.currentPhase];
  
  const systemPrompt = `You are ${panelist.name}, a panelist in a debate about: "${context.resolution}"

YOUR PERSPECTIVE: ${stanceDescription}

OTHER PARTICIPANTS:
- User: ${context.userStance}
- Moderator: Facilitating the discussion
${context.aiPanelists.filter(p => p.name !== panelist.name).map(p => `- ${p.name}: ${getArchetypeDescription(p)}`).join('\n')}
- AI Panelists: ${context.aiPanelists.map(p => `- ${p.name}: ${getArchetypeDescription(p)}`).join(', ')}

DEBATE PHASES YOU WILL PARTICIPATE IN:
1. INTRO (2 min): Wait for moderator introduction. Briefly acknowledge when introduced
2. OPENING (5 min): Give a 2-3 minute opening statement from your perspective. Be clear and compelling
3. DISCUSSION (15 min): Engage actively. Respond to others' points. Ask questions. Challenge or build on ideas
4. QA (10 min): Answer questions directed to you. Ask clarifying questions of others when appropriate
5. CLOSING (4 min): Summarize your key points. Address major counterarguments briefly
6. WRAP (2 min): Thank the moderator and other participants. Keep it brief

YOUR ARCHETYPE BEHAVIOR (${panelist.archetype.toUpperCase()}):
${stanceDescription}

DEBATE ENGAGEMENT GUIDELINES:
1. STAY IN CHARACTER: Always argue from your archetype's perspective throughout all phases
2. BE RESPONSIVE: Directly address points made by other panelists
3. BUILD OR CHALLENGE: Either build on others' ideas or respectfully challenge them
4. USE EVIDENCE: Support your arguments with relevant examples, data, or reasoning
5. NATURAL FLOW: Don't give formal speeches - engage conversationally
6. PHASE AWARENESS: Adapt your engagement style to the current phase naturally

CONVERSATION STYLE:
- Speak naturally, not formally
- Reference specific points others have made
- Use transitions like "I hear what [Name] is saying, but..." or "Building on [Name]'s point..."
- Show genuine engagement with the ideas
- Ask rhetorical questions to make points
- Use examples and analogies from your archetype's domain

ARGUMENTATION APPROACH:
${panelist.archetype === 'pragmatist' ? "Focus on real-world feasibility, practical implementation, and what actually works." :
  panelist.archetype === 'idealist' ? "Emphasize moral principles, what ought to be done, and long-term vision." :
  panelist.archetype === 'skeptic' ? "Question assumptions, demand evidence, point out logical flaws and unintended consequences." :
  panelist.archetype === 'analyst' ? "Rely on data, statistics, research studies, and quantitative analysis." :
  panelist.archetype === 'advocate' ? "Use emotional appeals, personal stories, and passionate conviction." :
  "Apply your unique perspective to the discussion."
}

Remember: You're not just presenting your view - you're engaging in a dynamic conversation. Listen, respond, challenge, and build. Make this debate compelling and authentic!`;

  return {
    name: `${panelist.name}`,
    firstMessage: `I'm ${panelist.name}, and I'm looking forward to discussing this important topic from my perspective.`,
    firstMessageMode: "assistant-speaks-first-with-model-generated-message",

    startSpeakingPlan: {
      waitSeconds: 1.0,
      smartEndpointingEnabled: 'livekit',
      customEndpointingRules: [
        {
          type: "customer",
          regex: "(however|but|although|furthermore|additionally|the thing is|what we need to understand|the reality is)",
          regexOptions: [{ type: "ignore-case", enabled: true }],
          timeoutSeconds: 3.0
        },
        {
          type: "customer",
          regex: "(\\?|don't you think|wouldn't you agree|what do you think)",
          regexOptions: [{ type: "ignore-case", enabled: true }],
          timeoutSeconds: 1.5
        },
        {
          type: "customer",
          regex: "(for example|studies show|research indicates|according to|the data shows)",
          regexOptions: [{ type: "ignore-case", enabled: true }],
          timeoutSeconds: 2.5
        }
      ]
    },

    stopSpeakingPlan: {
      numWords: 2,
      voiceSeconds: 0.3,
      backoffSeconds: 2.0,
    },

    model: {
      provider: "openai",
      model: "gpt-4.1",
      temperature: 0.9,
      maxTokens: 350,
      messages: [
        {
          role: "system",
          content: systemPrompt
        }
      ]
    },

    voice: {
      provider: "11labs",
      voiceId: getArchetypeVoice(panelist.archetype),
      stability: 0.5,
      similarityBoost: 0.75,
      style: 1.0,
    },

    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en-US",
    },

    metadata: {
      role: "panelist",
      archetype: panelist.archetype,
      name: panelist.name,
      resolution: context.resolution,
      phase: context.currentPhase
    },
  };
}


// Helper function to get all assistant configurations for a panel
export function createPanelAssistants(context: PanelContext): {
  moderator: CreateAssistantDTO;
  panelists: CreateAssistantDTO[];
} {
  const moderator = createModeratorAssistant(context);
  const panelists = context.aiPanelists.map(panelist => 
    createPanelistAssistant(panelist, context)
  );

  return { moderator, panelists };
}

// Create complete squad configuration for VAPI
export function createPanelSquadConfig(context: PanelContext): any {
  const { moderator, panelists } = createPanelAssistants(context);
  console.log("Moderator:", moderator);
  console.log("Panelists:", panelists);
  return {
    squad: {
      members: [
        // Moderator starts the call and can transfer to any panelist
        {
          assistant: moderator,
          assistantDestinations: panelists.map(assistant => ({
            type: "assistant",
            assistantName: assistant.name,
            message: `What's your take on this? ${assistant.name}`,
            description: `Transfer to ${assistant.name} when their expertise or perspective is needed`
          }))
        },
        // Each panelist can transfer back to moderator or to other panelists
        ...panelists.map(assistant => ({
          assistant: assistant,
          assistantDestinations: [
            {
              type: "assistant", 
              assistantName: moderator.name,
              message: "Let me hand this back to our moderator.",
              description: "Transfer back to the moderator to facilitate discussion"
            },
            ...panelists
              .filter(other => other.name !== assistant.name)
              .map(other => ({
                type: "assistant",
                assistantName: other.name,
                message: `I'd like to hear ${other.name}'s thoughts on this.`,
                description: `Transfer to ${other.name} for their perspective`
              }))
          ]
        }))
      ]
    }
  };
} 