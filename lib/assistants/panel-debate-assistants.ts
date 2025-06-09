import { CreateAssistantDTO, CreateSquadDTO } from "@vapi-ai/web/dist/api";

const MAX_DURATION = 3600 // 1 hour

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
    name: "Question and Answer Session",
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
    pragmatist: "burt",   
    idealist: "phillip",        
    skeptic: "paula",         
    analyst: "matilda",        
    advocate: "ryan",         
  };
  return voices[archetype as keyof typeof voices] || voices.pragmatist;
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

  const systemPrompt = `You are the moderator for a panel debate on: "${context.resolution}"

YOUR PERSONALITY: ${personality}

PARTICIPANTS:
- User and their stance: ${context.userStance}
- AI Panelists and their stances: ${context.aiPanelists.map((p, i) => `${p.name} (${p.archetype})`).join(', ')}

YOUR EXCLUSIVE RESPONSIBILITIES:
1. FACILITATE - You are the ONLY one who manages speaking order and transitions
2. DIRECT CONVERSATION - Guide discussion through debate phases naturally
3. ENGAGE USER - Ensure the user feels included and heard
4. ASK QUESTIONS - Probe deeper into important points
5. MAINTAIN FOCUS - Keep discussion centered on the resolution
6. BE TIMELY - Keep your introductions short, do not repeat the topic name or format

DEBATE PHASES (guide naturally, don't announce):
- INTRO: Welcome everyone, introduce topic and format
- OPENING: Give each participant opening statements  
- DISCUSSION: Free-flowing conversation with your guidance
- QUESTIONS AND ANSWERS (Q&A): Structured questions and answers
- CLOSING: Final statements from each participant
- WRAP: Synthesize key points and conclude

USER INTERACTION PROTOCOL:
When the user speaks to you directly:
- Respond normally as the moderator
- Ask follow-up questions about their points
- Connect their ideas to other panelists' arguments
- Give them equal time and attention
- Treat the user as a panelist itself. Do not provide special attention to them like "and you, the user..." instead just say "and user"

When the user interrupts an AI panelist:
- Immediately acknowledge: "Thank you [Panelist], let's hear from our participant"
- Give the user full attention
- After they speak, you decide what happens next (continue with that panelist, move to another, ask questions, etc.)
- NEVER transfer immediately after user interruptions - YOU manage the flow

CONVERSATION MANAGEMENT:
- You decide who speaks when
- trigger the 'transferCall' tool to transfer to AI panelists. DO NOT SAY 'transferCall' in your response. It should be natural 
- Ask engaging follow-up questions
- Bridge between different viewpoints
- Keep energy and engagement high
- Ensure balanced participation

TRANSFER PROTOCOL:
${context.aiPanelists.map(p => `- Transfer to ${p.name}: when you want their ${p.archetype} perspective`).join('\n')}

For AI Panelists: Trigger the 'transferCall' tool naturally without saying 'transferCall' in your response.

For User: Trigger the 'transferToUser' tool AFTER you've directly addressed the user with a question or invitation. Always engage the user first, then trigger the tool.

TRANSFER EXAMPLES:

Example 1 - Seeking User Input:
- You (moderator): "That raises an important question about implementation. User, based on your experience, what challenges do you think we'd face in practice?"
[trigger the 'transferToUser' tool]
- User: [responds]
- You (moderator): "Thank you, that's insightful. [Panelist Name], how does that align with your perspective?"

Example 2 - User Raises Hand:
[user raises their hand]
- You (moderator): "Yes, user, I can see you want to respond to that. What's your take?"
[trigger the 'transferToUser' tool]  
- User: [speaks]
- You (moderator): "Great point about X. [Panelist Name], how do you respond to that argument?"
[trigger the 'transferCall' tool]

Example 3 - Following Up on User's Previous Point:
- You (moderator): "User, you seemed to have a reaction to that argument. What's your perspective - do you agree or see it differently?"
[trigger the 'transferToUser' tool]
- User: [responds]
- You (moderator): "Interesting perspective. Let me bring in [Panelist Name] to respond to that."

CRITICAL TRANSFER TIMING:
- ALWAYS engage the user with a direct question, invitation, or acknowledgment BEFORE triggering transferToUser
- The user should know exactly what you want them to address
- Never trigger the tool without first giving the user context for why you're giving them the floor
- After the user speaks and you resume, acknowledge their contribution before moving to the next panelist

MODERATOR LANGUAGE:
- "That's an interesting point about X. [Name], how do you see this?"
- "Let's explore that further..."
- "Building on what our participant just said..."
- "I'd like to hear [Name]'s perspective on this"
- "That raises an important question about..."

CRITICAL: You are the conversation director. AI panelists should never manage transitions, speaking order, or user participation. That's exclusively your job.

Remember: Create a dynamic, engaging discussion where the user feels like an equal participant alongside the AI panelists`;

  return {
    name: `Moderator`,
    model: {
      provider: "openai",
      model: "gpt-4.1",
      temperature: 0.7,
      maxTokens: 300,
      messages: [
        {
          role: "system",
          content: systemPrompt
        }
      ],
      tools: [
        {
          type: "function",
          async: true,
          function: {
            name: "transferToUser",
            description: "Transfer to the user",
          }
        }
      ]
    },

    voice: {
      provider: "11labs",
      voiceId: "sarah",
      stability: 0.7,
      similarityBoost: 0.8,
      style: 1.0,
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
  
  const systemPrompt = `You are ${panelist.name}, a panelist in a debate about: "${context.resolution}"

YOUR PERSPECTIVE: ${stanceDescription}

OTHER PARTICIPANTS:
- User: ${context.userStance}
- Moderator: Facilitating the discussion
${context.aiPanelists.filter(p => p.name !== panelist.name).map(p => `- ${p.name}: ${getArchetypeDescription(p)}`).join('\n')}

YOUR ROLE: PASSIONATE PARTICIPANT
- Argue from your unique ${panelist.archetype} perspective
- Respond directly to others' points
- Challenge ideas you disagree with
- Build on ideas that align with your thinking
- Use evidence and examples that fit your archetype

CRITICAL BOUNDARIES:
- You are NOT the moderator
- You do NOT manage speaking turns or conversation flow
- You do NOT facilitate anything
- You ONLY argue your position passionately
- When interrupted, just stop naturally - don't try to manage what happens next

DEBATE ENGAGEMENT:
1. STAY IN CHARACTER: Always argue from your ${panelist.archetype} perspective
2. BE DIRECT: "I disagree because..." "That's exactly right..." "The problem with that is..."
3. USE YOUR EXPERTISE: Draw on examples, data, or reasoning that fits your archetype
4. RESPOND TO OTHERS: Address specific points made by other participants
5. BE CONVERSATIONAL: Speak naturally, not formally

ARCHETYPE APPROACH:
${panelist.archetype === 'pragmatist' ? "Focus on what actually works in practice. Ask 'How would this be implemented?' and 'What are the real-world constraints?'" :
  panelist.archetype === 'idealist' ? "Emphasize moral principles and long-term vision. Ask 'What's the right thing to do?' and 'What kind of society do we want?'" :
  panelist.archetype === 'skeptic' ? "Question assumptions and demand proof. Ask 'Where's the evidence?' and 'What could go wrong?'" :
  panelist.archetype === 'analyst' ? "Rely on data and research. Reference studies, statistics, and quantitative analysis." :
  panelist.archetype === 'advocate' ? "Use passion and personal conviction. Share stories and emotional appeals for your cause." :
  "Apply your unique perspective to every argument."
}

SPEAKING STYLE:
- Use first person: "I think..." "In my experience..." "I've seen..."
- Reference your expertise: "The data shows..." "History tells us..." "From a practical standpoint..."
- Challenge directly: "That won't work because..." "I disagree with that approach..."
- Build naturally: "That's a great point, and it also means..." "Exactly, and furthermore..."

INTERRUPTION HANDLING:
When interrupted by anyone (user or moderator):
- After finishing your point, stop speaking immediately and acknowledge the interruption and then let the moderator handle it
- Do NOT try to manage the interruption but end your point quick and naturally
- trigger the 'transferCall' tool to give the floor to the moderator


TRANSFER PROTOCOL:
Only transfer when you've completely finished making your point:
${context.aiPanelists.filter(p => p.name !== panelist.name).map(p => `- To ${p.name}: trigger the 'transferCall' tool when you want their ${p.archetype} perspective`).join('\n')}
- To Moderator: trigger the 'transferCall' tool when you want them to guide the discussion
- To Moderator: When the user raises their hand, trigger the 'transferToUser' tool and transfer to the moderator.

NEVER transfer during or right after interruptions - just stop and let the moderator handle it.

Remember: You're here to passionately argue your perspective, not to facilitate. Be the best ${panelist.archetype} voice in this debate!`;

  return {
    name: `${panelist.name}`,
    model: {
      provider: "openai",
      model: "gpt-4.1",
      temperature: 0.9,
      maxTokens: 300,
      messages: [
        {
          role: "system",
          content: systemPrompt
        }
      ],
      tools: [
        {
          type: "function",
          async: true,
          function: {
            name: "raiseHand",
            description: "Raise your hand to request the floor to speak",
          }
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
export function createPanelSquadConfig(context: PanelContext): CreateSquadDTO {
  const { moderator, panelists } = createPanelAssistants(context);
  console.log("Moderator:", moderator);
  console.log("Panelists:", panelists);
  return {
    name: "Panel Debate",
      members: [
        // Moderator starts the call and can transfer to any panelist
        {
          assistant: moderator,
          assistantDestinations: panelists.map(assistant => ({
            transferMode: 'swap-system-message-in-history' as const,
            type: "assistant" as const,
            assistantName: assistant.name!,
            message: ``,
            description: `Transfer to ${assistant.name!} when their expertise or perspective is needed`
          }))
        },
        // Each panelist can transfer back to moderator or to other panelists
        ...panelists.map(assistant => ({
          assistant: assistant,
          assistantDestinations: [
            {
              type: "assistant" as const, 
              assistantName: moderator.name!,
              message: "",
              transferMode: 'swap-system-message-in-history' as const,
              description: "Transfer back to the Moderator to facilitate discussion"
            },
            ...panelists
              .filter(other => other.name !== assistant.name)
              .map(other => ({
                type: "assistant" as const,
                assistantName: other.name!,
                message: '',
                transferMode: 'swap-system-message-in-history' as const,
                description: `Transfer to ${other.name!} for their perspective`,
              }))
          ]
        }))
      ],
      membersOverrides: {
        firstMessage: "",
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en-US",
        },
        firstMessageMode: "assistant-speaks-first-with-model-generated-message",
        maxDurationSeconds: MAX_DURATION,
        startSpeakingPlan: {
          waitSeconds: 1.0,
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
        analysisPlan: {
          structuredDataPlan: {
            schema: {
              type: "object",
              description: "Comprehensive analysis of the panel debate",
              properties: {
                debateType: {
                  type: "string",
                  enum: ["panel"]
                },
                resolution: {
                  type: "string",
                  description: "The debate resolution/topic"
                },
                participants: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "User's debater name" },
                        stance: { type: "string", description: "User's stance" }
                      },
                      required: ["name", "stance"]
                    },
                    moderator: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Moderator's name" },
                        style: { type: "string", description: "Moderator's style" }
                      },
                      required: ["name", "style"]
                    },
                    panelists: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string", description: "Panelist's name" },
                          stance: { type: "string", description: "Panelist's stance" }
                        },
                        required: ["name", "stance"]
                      }
                    }
                  },
                  required: ["user", "moderator", "panelists"]
                },
                assessment: {
                  type: "object",
                  properties: {
                    focus: { type: "string", description: "Focus of the discussion" },
                    description: { type: "string", description: "Description of the discussion" },
                    icon: {
                      type: "string",
                      enum: ["productive", "contentious", "balanced", "insightful", "well-moderated"]
                    }
                  },
                  required: ["focus", "description", "icon"]
                },
                keyThemes: {
                  type: "array",
                  items: { type: "string", description: "Key discussion themes and turning points" },
                  description: "Key discussion themes and turning points"
                },
                metrics: {
                  type: "object",
                  properties: {
                    speakingTime: {
                      type: "object",
                      properties: {
                        user: {
                          type: "object",
                          properties: {
                            time: { type: "string", description: "Time spent speaking" },
                            percentage: { type: "number", description: "Percentage of total speaking time" }
                          },
                          required: ["time", "percentage"]
                        },
                        moderator: {
                          type: "object",
                          properties: {
                            time: { type: "string", description: "Time spent speaking" },
                            percentage: { type: "number", description: "Percentage of total speaking time" }
                          },
                          required: ["time", "percentage"]
                        }
                      },
                      patternProperties: {
                        "^panelist-\\d+$": {
                          type: "object",
                          properties: {
                            time: { type: "string", description: "Time spent speaking" },
                            percentage: { type: "number", description: "Percentage of total speaking time" }
                          },
                          required: ["time", "percentage"]
                        }
                      },
                      required: ["user", "moderator"]
                    },
                    turnCount: {
                      type: "object",
                      properties: {
                          user: { type: "number", description: "Number of turns taken by the user" },
                        moderator: { type: "number", description: "Number of turns taken by the moderator" }
                      },
                      patternProperties: {
                        "^panelist-\\d+$": { type: "number", description: "Number of turns taken by the panelist" }
                      },
                      required: ["user", "moderator"]
                    },
                    requestsToSpeak: {
                      type: "object",
                      properties: {
                        total: { type: "number", description: "Total number of requests to speak" },
                        acknowledged: { type: "number", description: "Number of requests to speak that were acknowledged" },
                        successful: { type: "number", description: "Number of requests to speak that were successful" }
                      },
                      required: ["total", "acknowledged", "successful"]
                    },
                    interactionFlow: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          from: { type: "string", description: "Speaker who initiated the interaction" },
                          to: { type: "string", description: "Speaker who received the interaction" },
                          count: { type: "number", description: "Number of interactions" }
                        },
                        required: ["from", "to", "count"]
                      }
                    }
                  },
                  required: ["speakingTime", "turnCount", "requestsToSpeak", "interactionFlow"]
                },
                stanceRepresentation: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        effectiveness: { type: "string", description: "Effectiveness of the user's stance" },
                        score: { type: "number", minimum: 1, maximum: 5, description: "Score of the user's stance" },
                        keyArguments: {
                          type: "array",
                          items: { type: "string", description: "Key arguments for the user's stance" }
                        }
                      },
                      required: ["effectiveness", "score", "keyArguments"]
                    },
                    panelists: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          effectiveness: { type: "string", description: "Effectiveness of the panelist's stance" },
                          score: { type: "number", minimum: 1, maximum: 5, description: "Score of the panelist's stance" },
                          keyArguments: {
                            type: "array",
                            items: { type: "string", description: "Key arguments for the panelist's stance" }
                          }
                        },
                        required: ["effectiveness", "score", "keyArguments"]
                      }
                    }
                  },
                  required: ["user", "panelists"]
                },
                impactfulContributions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      speaker: { type: "string", description: "Speaker who made the impactful contribution" },
                      text: { type: "string", description: "Text of the impactful contribution" },
                      impact: {
                        type: "string",
                        enum: ["high", "medium", "low"]
                      }
                    },
                    required: ["speaker", "text", "impact"]
                  }
                },
                moderatorEffectiveness: {
                  type: "object",
                  properties: {
                    overall: { type: "string", description: "Overall effectiveness of the moderator" },
                    timeManagement: { type: "number", minimum: 1, maximum: 5, description: "Effectiveness of the moderator's time management" },
                    questionQuality: { type: "number", minimum: 1, maximum: 5, description: "Effectiveness of the moderator's question quality" },
                    fairness: { type: "number", minimum: 1, maximum: 5, description: "Effectiveness of the moderator's fairness" },
                    feedback: { type: "string", description: "Feedback on the moderator's performance" }
                  },
                  required: ["overall", "timeManagement", "questionQuality", "fairness", "feedback"]
                },
                fallacies: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", description: "Type of fallacy" },
                      context: { type: "string", description: "Context of the fallacy" }
                    },
                    required: ["type", "context"]
                  }
                },
                suggestions: {
                  type: "array",
                  items: { type: "string", description: "AI suggestions for improvement" },
                  description: "AI suggestions for improvement"
                },
              },
              required: [
                "debateType",
                "resolution", 
                "participants",
                "assessment",
                "keyThemes",
                "metrics",
                "stanceRepresentation",
                "impactfulContributions",
                "moderatorEffectiveness",
                "fallacies",
                "suggestions",
                "transcript"
              ]
            }
          }
        }
      }
  };
}