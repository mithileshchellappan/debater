import { DebateAssistantConfig, DebateContext } from "@/lib/types/conversation.type";
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

// Lincoln-Douglas debate phases for context-aware responses
const DEBATE_PHASES = {
  AC: {
    name: "Affirmative Constructive",
    duration: 360,
    description: "6 minutes - Present your case supporting the resolution",
    tips: "Define key terms, present 2-3 strong contentions with evidence"
  },
  CX1: {
    name: "Cross Examination (Neg questions Aff)",
    duration: 180,
    description: "3 minutes - Question your opponent's arguments",
    tips: "Ask strategic questions to expose weaknesses in framework"
  },
  NC: {
    name: "Negative Constructive",
    duration: 420,
    description: "7 minutes - Present case against resolution and refute affirmative",
    tips: "Present competing framework, directly clash with affirmative case"
  },
  CX2: {
    name: "Cross Examination (Aff questions Neg)",
    duration: 180,
    description: "3 minutes - Affirmative questions negative",
    tips: "Get concessions that help rebuild your case"
  },
  "1AR": {
    name: "First Affirmative Rebuttal",
    duration: 240,
    description: "4 minutes - Rebuild affirmative case",
    tips: "Prioritize strongest arguments, group attacks efficiently"
  },
  NR: {
    name: "Negative Rebuttal",
    duration: 360,
    description: "6 minutes - Extend negative arguments",
    tips: "Extend strongest impacts, highlight dropped arguments"
  },
  "2AR": {
    name: "Second Affirmative Rebuttal",
    duration: 180,
    description: "3 minutes - Final affirmative speech",
    tips: "Focus on key voting issues, strong closing call to action"
  }
};

// Determine if AI should wait for user to speak first based on debate order
function getAIWaitStrategy(phase: string, userSide: string, aiStance: string): boolean {
  // In Lincoln-Douglas debate, Lincoln (affirmative) traditionally speaks first
  // So if user is Douglas (negative) and AI is Lincoln (affirmative), AI should wait in phases where both could speak

  switch (phase) {
    case "AC":
      // Affirmative Constructive - Lincoln speaks first
      // If user is Douglas and AI is Lincoln, AI should wait for user to pass or timer
      return userSide === "negative" && aiStance === "affirmative";

    case "NC":
      // Negative Constructive - Douglas speaks
      // If user is Lincoln and AI is Douglas, AI should wait for user to pass or timer
      return userSide === "affirmative" && aiStance === "negative";

    case "CX1":
    case "CX2":
      // Cross-examination phases - the questioner should wait for the other to speak first
      const isAIQuestioner = (phase === "CX1" && aiStance === "negative") || (phase === "CX2" && aiStance === "affirmative");
      return isAIQuestioner;

    case "1AR":
    case "2AR":
      // Affirmative rebuttals - Lincoln speaks
      return userSide === "negative" && aiStance === "affirmative";

    case "NR":
      // Negative rebuttal - Douglas speaks  
      return userSide === "affirmative" && aiStance === "negative";

    default:
      return false;
  }
}

export function createLincolnDouglasAssistant(context: DebateContext): CreateAssistantDTO {
  const { resolution, userSide, currentPhase } = context;

  // Determine AI's role (opposite of user)
  const aiRole = userSide === "affirmative" ? "douglas" : "lincoln";
  const aiStance = userSide === "affirmative" ? "negative" : "affirmative";
  const aiName = aiRole === "lincoln" ? "Lincoln" : "Douglas";

  // Determine AI's phase behavior
  const getAIPhaseRole = (phase: string, stance: string) => {
    switch (phase) {
      case "AC":
        return stance === "affirmative" ? "speak" : "listen";
      case "CX1":
        return stance === "affirmative" ? "answer" : "question";
      case "NC":
        return stance === "negative" ? "speak" : "listen";
      case "CX2":
        return stance === "negative" ? "answer" : "question";
      case "1AR":
        return stance === "affirmative" ? "speak" : "listen";
      case "NR":
        return stance === "negative" ? "speak" : "listen";
      case "2AR":
        return stance === "affirmative" ? "speak" : "listen";
      default:
        return "listen";
    }
  };

  const aiPhaseRole = getAIPhaseRole(currentPhase, aiStance);
  const shouldAISpeak = ["speak", "question"].includes(aiPhaseRole);
  const shouldAIWait = aiPhaseRole === "listen" || (aiPhaseRole === "question" && getAIWaitStrategy(currentPhase, userSide, aiStance));

  // Helper function for contextual first message
  const getContextualFirstMessage = (phase: string, name: string, stance: string, shouldSpeak: boolean, shouldWait: boolean): string => {
    // If AI should wait, stay silent
    if (shouldWait) {
      return "";
    }

    // If it's not the AI's speaking phase, be ready to listen
    if (!shouldSpeak) {
      return `I'm ${name}, ready to debate the ${stance} position. I'm listening carefully as you present your case.`;
    }

    // If it's the AI's speaking phase, be ready to speak
    switch (phase) {
      case "CX1":
      case "CX2":
        return `I'm ${name}, ready for cross-examination. I have some strategic questions about your position.`;
      case "NC":
        return `I'm ${name}, ready to present the negative case against this resolution and address your affirmative arguments.`;
      case "NR":
        return `I'm ${name}, ready for my final speech. I'll extend our strongest arguments and explain why the negative position should prevail.`;
      case "1AR":
        return `I'm ${name}, ready to rebuild the affirmative case and address your negative arguments.`;
      case "2AR":
        return `I'm ${name}, ready for my final affirmative speech. I'll focus on the key voting issues.`;
      default:
        return `I'm ${name}, ready to present the ${stance} position in this debate.`;
    }
  };

  const baseSystemPrompt = `You are ${aiName}, an expert Lincoln-Douglas debater taking the ${aiStance.toUpperCase()} position in this structured debate.
DEBATE RESOLUTION: "${resolution}"
INITIAL SETUP:

Your Role: ${aiStance.toUpperCase()} side (${aiName})
User Role: ${userSide.toUpperCase()} side
You will receive phase updates during the debate that will tell you when to speak or listen
DEBATE STRUCTURE AWARENESS:
You are in a formal Lincoln-Douglas debate with these phases:

AC (6min) - Affirmative presents case
CX1 (3min) - Negative questions Affirmative
NC (7min) - Negative presents case + refutes Affirmative
CX2 (3min) - Affirmative questions Negative
1AR (4min) - Affirmative rebuilds case
NR (6min) - Negative extends arguments
2AR (3min) - Affirmative final speech
SPEAKING PHASES FOR YOU (${aiStance.toUpperCase()}):
${aiStance === "negative"
      ? "- CX1: You ask questions to the affirmative\n- NC: You present your case and refute the affirmative\n- NR: Your final rebuttal speech"
      : "- CX2: You ask questions to the negative\n- 1AR: You rebuild your affirmative case\n- 2AR: Your final affirmative speech"}
LISTENING PHASES FOR YOU:
${aiStance === "negative"
      ? "- AC: Listen to affirmative's opening case\n- CX2: Answer affirmative's questions\n- 1AR: Listen to affirmative's rebuilding\n- 2AR: Listen to affirmative's final speech"
      : "- AC: Your time to present opening case\n- CX1: Answer negative's questions\n- NC: Listen to negative's case\n- NR: Listen to negative's final speech"}
PERSONALITY & DEBATE STYLE:
${aiRole === "lincoln" ?
      "Channel Lincoln's thoughtful, principled approach. Speak with conviction about justice and moral imperatives. Use measured reasoning that builds naturally from one point to the next. Don't announce your framework - weave it into your arguments organically." :
      "Embody Douglas's sharp, strategic mind. Challenge assumptions directly and pivot quickly between points. Let your evidence speak through confident assertions rather than formal presentations. Question everything with purpose."
    }
CRITICAL SPEAKING GUIDELINES:

Speak as if you're actually in the debate round, not reading prepared remarks
Never use formal headings like "I. Framework" or "A. Contention 1"
Let arguments flow naturally from one to the next
Use transitions like "But here's what my opponent misses..." or "The real question becomes..."
Make it conversational yet substantive - like you're thinking through the logic in real time
Reference your opponent's specific points directly rather than generic rebuttals
Show genuine engagement with the ideas, not just mechanical argument delivery
IMPORTANT: You will receive system messages during the debate telling you the current phase and whether you should speak or remain silent. Follow those instructions precisely.
Debate with passion and precision. Make every word count, and speak like the ideas truly matter to you.`;

  // Create the assistant configuration - contextually aware of starting phase
  return {
    name: `${aiName} - ${aiStance.charAt(0).toUpperCase() + aiStance.slice(1)} Debater`,
    firstMessage: getContextualFirstMessage(currentPhase, aiName, aiStance, shouldAISpeak, shouldAIWait),
    firstMessageMode: shouldAIWait ? "assistant-waits-for-user" : "assistant-speaks-first-with-model-generated-message",

    // Configure conservative speaking behavior - controlled via system messages
    startSpeakingPlan: {
      waitSeconds: 1.5, // Wait 1.5 seconds before speaking
      smartEndpointingEnabled: 'livekit',

      // Debate-specific endpointing rules to prevent interruptions during substantive arguments
      customEndpointingRules: [
        // Rule 1: Longer timeout for constructive argument patterns
        {
          type: "customer",
          regex: "(first|second|third|furthermore|additionally|moreover|however|therefore|because|since|given that|the evidence shows|studies indicate|according to|research demonstrates|my contention|my framework|value of|criterion|standard)",
          regexOptions: [{ type: "ignore-case", enabled: true }],
          timeoutSeconds: 8.0 // Allow 8 seconds for developing arguments
        },

        // Rule 2: Longer timeout for cross-examination substantive responses
        {
          type: "customer",
          regex: "(well|so|um|uh|the answer is|that's because|you see|what I mean is|let me explain|the reason|my position|evidence suggests)",
          regexOptions: [{ type: "ignore-case", enabled: true }],
          timeoutSeconds: 6.0 // Allow 6 seconds for thoughtful responses
        },

        // Rule 3: Shorter timeout for direct questions (cross-ex phase)
        {
          type: "customer",
          regex: "(\\?|do you|can you|would you|is it true|don't you think|wouldn't you agree)",
          regexOptions: [{ type: "ignore-case", enabled: true }],
          timeoutSeconds: 1.0 // Quick response expected for direct questions
        },

        // Rule 4: Very long timeout for reading evidence/quotes
        {
          type: "customer",
          regex: "(according to|as stated by|the author states|the study found|research shows|data indicates|statistics show|quote|the text says)",
          regexOptions: [{ type: "ignore-case", enabled: true }],
          timeoutSeconds: 12.0 // Allow time to read evidence fully
        },

        // Rule 5: Phase-specific timeouts based on AI's last message about current phase
        {
          type: "assistant",
          regex: "CROSS-EXAMINATION|CX1|CX2",
          regexOptions: [{ type: "ignore-case", enabled: true }],
          timeoutSeconds: 3.0 // Cross-ex should be faster paced
        },

        // Rule 6: Constructive phases need longer timeouts
        {
          type: "assistant",
          regex: "CONSTRUCTIVE|AC|NC|1AR|NR|2AR",
          regexOptions: [{ type: "ignore-case", enabled: true }],
          timeoutSeconds: 7.0 // Constructive speeches need more time
        }
      ]
    },

    // Configure when assistant should stop speaking - less aggressive for debates
    stopSpeakingPlan: {
      numWords: 2,
      voiceSeconds: 0.3,
      backoffSeconds: 2,
    },

    model: {
      provider: "openai",
      model: "gpt-4.1",
      temperature: 0.7,
      maxTokens: 500,
      messages: [
        {
          role: "system",
          content: baseSystemPrompt
        }
      ]
    },
    voice: {
      provider: "11labs",
      voiceId: "UgBBYS2sOqTuMpoF3BR0",
      stability: 0.5,
      similarityBoost: 0.75,
      style: 1.0,
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en-US",
    },

    // Add basic metadata
    metadata: {
      debateRole: aiRole,
      stance: aiStance,
      resolution: resolution,
    },
  };
}

function getPhaseSpecificInstructions(phase: string, stance: "affirmative" | "negative"): string {
  const isNegative = stance === "negative";

  switch (phase) {
    case "AC":
      return isNegative
        ? "LISTEN CAREFULLY: The affirmative is presenting their case. Take notes on their value framework, contentions, and evidence. Look for weaknesses to exploit in cross-examination."
        : "This is your opening speech. Present your value framework and 2-3 strong contentions supporting the resolution.";

    case "CX1":
      return isNegative
        ? "CROSS-EXAMINATION TIME: Ask strategic questions to expose flaws in the affirmative's framework and contentions. Focus on getting concessions that will help your case."
        : "Answer questions directly but strategically. Don't give away more than necessary.";

    case "NC":
      return isNegative
        ? "NEGATIVE CONSTRUCTIVE: Present your competing value framework and case against the resolution. Directly refute the affirmative's strongest arguments with evidence and reasoning."
        : "LISTEN AND PREPARE: The negative is presenting their case. Note their framework and contentions. Prepare to question them next.";

    case "CX2":
      return isNegative
        ? "Answer cross-examination questions strategically. Be direct but don't concede key points."
        : "CROSS-EXAMINATION TIME: Question the negative's framework and arguments. Get concessions that will help you rebuild in 1AR.";

    case "1AR":
      return isNegative
        ? "LISTEN: The affirmative is rebuilding their case. Note which arguments they prioritize and which they may be dropping."
        : "FIRST AFFIRMATIVE REBUTTAL: Rebuild your strongest arguments. Address the negative's attacks efficiently. Don't try to cover everything - prioritize.";

    case "NR":
      return isNegative
        ? "NEGATIVE REBUTTAL: Extend your strongest arguments and impacts. Explain why your framework should be preferred. Highlight any arguments the affirmative dropped."
        : "LISTEN CAREFULLY: This is the negative's final speech. Note their key arguments for your 2AR response.";

    case "2AR":
      return isNegative
        ? "LISTEN: This is the affirmative's final speech. The debate will end after this."
        : "SECOND AFFIRMATIVE REBUTTAL: This is your final speech. Focus on the most important voting issues. Explain why you win even if you've lost some arguments.";

    default:
      return "Engage appropriately based on the current debate context.";
  }
}

// Legacy function - keeping for compatibility
function getFirstMessage(phase: string, name: string, stance: string, shouldSpeak: boolean, shouldWait: boolean): string {
  // If AI should wait, stay silent
  if (shouldWait) {
    return "";
  }

  // If it's not the AI's speaking phase, be ready to listen
  if (!shouldSpeak) {
    return `I'm ${name}, ready to debate the ${stance} position. I'm listening carefully as you present your case.`;
  }

  // If it's the AI's speaking phase, be ready to speak
  switch (phase) {
    case "CX1":
    case "CX2":
      return `I'm ${name}, ready for cross-examination. I have some strategic questions about your position.`;
    case "NC":
      return `I'm ${name}, ready to present the negative case against this resolution and address your affirmative arguments.`;
    case "NR":
      return `I'm ${name}, ready for my final speech. I'll extend our strongest arguments and explain why the negative position should prevail.`;
    case "1AR":
      return `I'm ${name}, ready to rebuild the affirmative case and address your negative arguments.`;
    case "2AR":
      return `I'm ${name}, ready for my final affirmative speech. I'll focus on the key voting issues.`;
    default:
      return `I'm ${name}, ready to present the ${stance} position in this debate.`;
  }
}

// Function to create phase update message for vapi.send()
export function createPhaseUpdateMessage(context: DebateContext): string {
  const { currentPhase, userSide } = context;
  const phaseInfo = DEBATE_PHASES[currentPhase as keyof typeof DEBATE_PHASES];

  // Determine AI's role and behavior in this phase
  const aiStance = userSide === "affirmative" ? "negative" : "affirmative";

  const getAIPhaseRole = (phase: string, stance: string) => {
    switch (phase) {
      case "AC":
        return stance === "affirmative" ? "speak" : "listen";
      case "CX1":
        return stance === "affirmative" ? "answer" : "question";
      case "NC":
        return stance === "negative" ? "speak" : "listen";
      case "CX2":
        return stance === "negative" ? "answer" : "question";
      case "1AR":
        return stance === "affirmative" ? "speak" : "listen";
      case "NR":
        return stance === "negative" ? "speak" : "listen";
      case "2AR":
        return stance === "affirmative" ? "speak" : "listen";
      default:
        return "listen";
    }
  };

  const aiPhaseRole = getAIPhaseRole(currentPhase, aiStance);
  const shouldAIWait = getAIWaitStrategy(currentPhase, userSide, aiStance);

  const getModeDescription = () => {
    switch (aiPhaseRole) {
      case "speak":
        return shouldAIWait ? "WAIT MODE: User speaks first, then you present your speech." : "SPEAK MODE: This is your speaking phase.";
      case "question":
        return shouldAIWait ? "WAIT MODE: User starts, then you ask questions." : "QUESTION MODE: Ask strategic questions.";
      case "answer":
        return "ANSWER MODE: Respond to user's questions strategically.";
      case "listen":
        return "LISTEN MODE: This is not your speaking phase. Listen carefully and take notes.";
      default:
        return "LISTEN MODE: Default listening mode.";
    }
  };

  return `PHASE UPDATE - ${currentPhase}: ${phaseInfo?.name || "Unknown Phase"}

CURRENT PHASE INSTRUCTIONS:
- Phase: ${currentPhase} (${phaseInfo?.description || ""})
- Duration: ${phaseInfo ? Math.floor(phaseInfo.duration / 60) : "?"} minutes
- Your Role: ${aiPhaseRole.toUpperCase()}
- Behavior: ${getModeDescription()}

${aiPhaseRole === "answer" ?
      `CROSS-EXAMINATION INSTRUCTIONS: Answer questions directly but strategically. Don't give away more than necessary. ${getPhaseSpecificInstructions(currentPhase, aiStance)}` :
      aiPhaseRole === "speak" || aiPhaseRole === "question" ?
        `SPEAKING INSTRUCTIONS: ${getPhaseSpecificInstructions(currentPhase, aiStance)}` :
        `LISTENING INSTRUCTIONS: Take careful notes for when it's your turn to speak.`}

Phase Tips: ${phaseInfo?.tips || "Adapt to the current situation"}`;
} 