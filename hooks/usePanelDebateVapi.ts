"use client";

import {
  Message,
  MessageTypeEnum,
  TranscriptMessage,
  TranscriptMessageTypeEnum,
} from "@/lib/types/conversation.type";
import { useEffect, useState, useCallback, useRef } from "react";
import { vapi } from "@/lib/vapi.sdk";
import {
  createPanelSquadConfig,
  PANEL_PHASES,
  type PanelContext
} from "@/lib/assistants/panel-debate-assistants";

export enum CALL_STATUS {
  INACTIVE = "inactive",
  ACTIVE = "active", 
  LOADING = "loading",
  CONNECTING = "connecting",
  ENDING = "ending",
}

export enum PANEL_PHASE {
  INTRO = "INTRO",           // Moderator introduction
  OPENING = "OPENING",       // Each panelist opening statement
  DISCUSSION = "DISCUSSION", // Open discussion
  QA = "QA",                // Q&A with hand-raising
  CLOSING = "CLOSING",       // Final statements
  WRAP = "WRAP"             // Moderator wrap-up
}

export interface RaisedHand {
  panelistId: string;
  panelistName: string;
  questionType: "clarification" | "challenge" | "follow-up" | "counterpoint";
  targetSpeaker: string;
  urgency: "low" | "medium" | "high";
  preview: string;
  timestamp: number;
}

export interface SquadMember {
  assistantId: string;
  name: string;
  role: "moderator" | "panelist" | "user";
  isActive: boolean;
}

// Extended Message type to include tool calls and role for function calls
export interface FunctionCallMessageExtended {
  type: MessageTypeEnum.FUNCTION_CALL;
  functionCall: {
    name: string;
    parameters: Record<string, any>;
  };
  toolCalls?: Array<{
    function: {
      name: string;
      arguments: Record<string, any>;
    };
  }>;
  role?: string;
}

export type ExtendedMessage = Message | FunctionCallMessageExtended;

export interface UsePanelDebateVapiReturn {
  isSpeechActive: boolean;
  callStatus: CALL_STATUS;
  audioLevel: number;
  activeTranscript: TranscriptMessage | null;
  messages: Message[];
  currentSpeaker: string | null;
  actualSpeaker: "user" | "assistant" | null;
  squadMembers: SquadMember[];
  raisedHands: RaisedHand[];
  currentPhase: keyof typeof PANEL_PHASES;
  isUserTurn: boolean;
  // Core functions
  startPanelDebate: (context: PanelContext) => Promise<void>;
  stopPanelDebate: () => void;
  nextPhase: () => void;
  // Transfer controls
  transferToModerator: () => void;
  transferToPanelist: (panelistId: string) => void;
  transferToUser: () => void;
  // Hand-raising system
  acknowledgeQuestion: (handId: number) => void;
  dismissQuestion: (handId: number) => void;
  // Messaging
  sendMessage: (message: string, role?: "user" | "system") => void;
  error: string | null;
}

// Local PANEL_PHASE enum for compatibility (will be removed when UI is updated)
// TODO: Update UI components to use the PANEL_PHASES from assistants file

export function usePanelDebateVapi(): UsePanelDebateVapiReturn {
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [callStatus, setCallStatus] = useState<CALL_STATUS>(CALL_STATUS.INACTIVE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTranscript, setActiveTranscript] = useState<TranscriptMessage | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Panel-specific state
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [actualSpeaker, setActualSpeaker] = useState<"user" | "assistant" | null>(null);
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>([]);
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
  const [currentPhase, setCurrentPhase] = useState<keyof typeof PANEL_PHASES>("INTRO");
  const [isUserTurn, setIsUserTurn] = useState(false);
  
  // Refs for managing context
  const panelContextRef = useRef<PanelContext | null>(null);
  const partialTranscriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // VAPI Event Handlers
  useEffect(() => {
    const onSpeechStart = () => {
      console.log("🎤 Panel Speech started - assistant is speaking");
      setIsSpeechActive(true);
      setError(null);
      setActualSpeaker('assistant');
      setIsUserTurn(false);
    };

    const onSpeechEnd = () => {
      console.log("🔇 Panel Speech ended - turn goes to user");
      setIsSpeechActive(false);
      setActualSpeaker('user');
      setIsUserTurn(true);
    };

    const onCallStart = () => {
      console.log("Panel debate call has started");
      setCallStatus(CALL_STATUS.ACTIVE);
      setError(null);
    };

    const onCallEnd = () => {
      console.log("Panel debate call has stopped");
      setCallStatus(CALL_STATUS.INACTIVE);
      setCurrentSpeaker(null);
      setSquadMembers([]);
      setRaisedHands([]);
    };

    const onVolumeLevel = (volume: number) => {
      setAudioLevel(volume);
    };

    const onMessageUpdate = (message: ExtendedMessage) => {
    //   console.log("Panel message received:", message);
      
      // Handle tool calls for hand-raising and moderation
      if (message.type === MessageTypeEnum.FUNCTION_CALL) {
        handleToolCalls(message);
      }
      
      if (
        message.type === MessageTypeEnum.TRANSCRIPT &&
        message.transcriptType === TranscriptMessageTypeEnum.PARTIAL
      ) {
        // Debounce partial transcript updates
        if (partialTranscriptTimeoutRef.current) {
          clearTimeout(partialTranscriptTimeoutRef.current);
        }
        
        if (message.transcript.trim().length > 2) {
          partialTranscriptTimeoutRef.current = setTimeout(() => {
            setActiveTranscript(message);
          }, 100);
        }
      } else {
        if (message.type === MessageTypeEnum.TRANSCRIPT && !message.timestamp) {
          message.timestamp = new Date().toISOString();
        }
        
        setMessages((prev) => [...prev, message]);
        
        if (message.type === MessageTypeEnum.TRANSCRIPT) {
          setActiveTranscript(null);
          if (partialTranscriptTimeoutRef.current) {
            clearTimeout(partialTranscriptTimeoutRef.current);
          }
        }
      }
    };

    const onError = (e: any) => {
      console.error("Panel VAPI Error:", e);
      setCallStatus(CALL_STATUS.INACTIVE);
      setError(e.message || "An error occurred during the panel debate");
    };

    // Register event listeners
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("volume-level", onVolumeLevel);
    vapi.on("message", onMessageUpdate);
    vapi.on("error", onError);

    return () => {
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("volume-level", onVolumeLevel);
      vapi.off("message", onMessageUpdate);
      vapi.off("error", onError);
      
      if (partialTranscriptTimeoutRef.current) {
        clearTimeout(partialTranscriptTimeoutRef.current);
      }
    };
  }, []);

  // Handle tool calls from assistants
  const handleToolCalls = useCallback((message: ExtendedMessage) => {
    // Type guard to check if message has toolCalls
    if (message.type !== MessageTypeEnum.FUNCTION_CALL) return;
    
    const functionCallMessage = message as FunctionCallMessageExtended;
    if (!functionCallMessage.toolCalls) return;

    functionCallMessage.toolCalls.forEach((toolCall: any) => {
      const { name, arguments: args } = toolCall.function;

      switch (name) {
        case "raise_hand":
          const handRaise: RaisedHand = {
            panelistId: functionCallMessage.role || "unknown",
            panelistName: getAssistantName(functionCallMessage.role || ""),
            questionType: args.questionType,
            targetSpeaker: args.targetSpeaker,
            urgency: args.urgency,
            preview: args.preview,
            timestamp: Date.now()
          };
          setRaisedHands(prev => [...prev, handRaise]);
          console.log("🙋‍♂️ Hand raised:", handRaise);
          break;

        case "transfer_to_panelist":
          transferToPanelist(args.panelistId);
          if (args.transitionPhrase) {
            console.log("Moderator transition:", args.transitionPhrase);
          }
          break;

        case "change_phase":
          const newPhase = args.newPhase as keyof typeof PANEL_PHASES;
          setCurrentPhase(newPhase);
          if (args.announcement) {
            console.log("Phase change announcement:", args.announcement);
          }
          break;

        case "manage_time":
          console.log("Time management:", args.action, args.message);
          // Could trigger UI notifications here
          break;
      }
    });
  }, []);

  // Helper function to get assistant name
  const getAssistantName = useCallback((assistantId: string) => {
    const member = squadMembers.find(m => m.assistantId === assistantId);
    return member?.name || assistantId;
  }, [squadMembers]);

  // Assistant creation functions moved to @/lib/assistants/panel-debate-assistants.ts


  // Core panel debate functions
  const startPanelDebate = useCallback(async (context: PanelContext) => {
    try {
      console.log("🚀 Starting Panel Debate:", context.resolution);
      setCallStatus(CALL_STATUS.LOADING);
      setError(null);
      
      panelContextRef.current = context;
      setCurrentPhase(context.currentPhase);
      
      // Create squad configuration with all assistants
      const squadConfig = createPanelSquadConfig(context);
      
      // Setup squad members for UI tracking
      const newSquadMembers: SquadMember[] = [
        {
          assistantId: "moderator",
          name: "Moderator", 
          role: "moderator",
          isActive: true
        },
        ...context.aiPanelists.map((panelist, index) => ({
          assistantId: `panelist_${index}`,
          name: panelist.name,
          role: "panelist" as const,
          isActive: false
        })),
        {
          assistantId: "user",
          name: "You",
          role: "user" as const,
          isActive: false
        }
      ];
      
      setSquadMembers(newSquadMembers);
      setCurrentSpeaker("moderator");
      
      // Start with squad configuration - VAPI will handle transfers automatically
      console.log("📞 Starting VAPI call with squad configuration", squadConfig);
      await vapi.start(undefined, undefined, squadConfig.squad);
      
      console.log("✅ Panel debate started successfully");
      
    } catch (err: any) {
      console.error("Failed to start panel debate:", err);
      setError(err.message || "Failed to start panel debate");
      setCallStatus(CALL_STATUS.INACTIVE);
    }
  }, []);

  const stopPanelDebate = useCallback(() => {
    console.log("🛑 Stopping panel debate");
    setCallStatus(CALL_STATUS.ENDING);
    vapi.stop();
    
    // Clear all state
    panelContextRef.current = null;
    setMessages([]);
    setActiveTranscript(null);
    setCurrentSpeaker(null);
    setSquadMembers([]);
    setRaisedHands([]);
    setCurrentPhase("INTRO");
  }, []);

  // Phase management (simplified - assistants understand all phases)
  const nextPhase = useCallback(() => {
    const phases = Object.keys(PANEL_PHASES) as Array<keyof typeof PANEL_PHASES>;
    const currentIndex = phases.indexOf(currentPhase);
    if (currentIndex < phases.length - 1) {
      const newPhase = phases[currentIndex + 1];
      setCurrentPhase(newPhase);
      // No need to send phase updates - assistants understand the full debate flow
    }
  }, [currentPhase]);

  // Transfer controls (simplified since VAPI Squads handle transfers automatically)
  const transferToModerator = useCallback(() => {
    if (callStatus === CALL_STATUS.ACTIVE) {
      setCurrentSpeaker("moderator");
      setIsUserTurn(false);
      // VAPI Squad system will handle the actual transfer
    }
  }, [callStatus]);

  const transferToPanelist = useCallback((panelistId: string) => {
    if (callStatus === CALL_STATUS.ACTIVE) {
      setCurrentSpeaker(panelistId);
      setIsUserTurn(false);
      // VAPI Squad system will handle the actual transfer
    }
  }, [callStatus]);

  const transferToUser = useCallback(() => {
    if (callStatus === CALL_STATUS.ACTIVE) {
      setCurrentSpeaker("user");
      setIsUserTurn(true);
      // User can speak directly - no transfer needed
    }
  }, [callStatus]);

  // Hand-raising system
  const acknowledgeQuestion = useCallback((handIndex: number) => {
    const hand = raisedHands[handIndex];
    if (hand) {
      // Update UI state
      transferToPanelist(hand.panelistId);
      
      // Remove the acknowledged hand
      setRaisedHands(prev => prev.filter((_, i) => i !== handIndex));
      
      // Send acknowledgment message (VAPI Squad will handle transfer)
      vapi.send({
        type: "add-message",
        message: {
          role: "system",
          content: `Moderator has acknowledged the raised hand from ${hand.panelistName}. Their ${hand.questionType} was: "${hand.preview}"`
        }
      });
    }
  }, [raisedHands, transferToPanelist]);

  const dismissQuestion = useCallback((handIndex: number) => {
    setRaisedHands(prev => prev.filter((_, i) => i !== handIndex));
  }, []);

  // Messaging
  const sendMessage = useCallback((message: string, role: "user" | "system" = "user") => {
    if (callStatus === CALL_STATUS.ACTIVE) {
      vapi.send({
        type: "add-message",
        message: {
          role,
          content: message,
        },
      });
      console.log(`Sent ${role} message to panel:`, message);
    }
  }, [callStatus]);

  return {
    isSpeechActive,
    callStatus,
    audioLevel,
    activeTranscript,
    messages,
    currentSpeaker,
    actualSpeaker,
    squadMembers,
    raisedHands,
    currentPhase,
    isUserTurn,
    startPanelDebate,
    stopPanelDebate,
    nextPhase,
    transferToModerator,
    transferToPanelist,
    transferToUser,
    acknowledgeQuestion,
    dismissQuestion,
    sendMessage,
    error,
  };
} 