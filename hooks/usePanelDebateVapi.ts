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
  // raiseUserHand: (questionType?: "clarification" | "challenge" | "follow-up" | "counterpoint", preview?: string) => void;
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
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>([]);
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
  const [currentPhase, setCurrentPhase] = useState<keyof typeof PANEL_PHASES>("INTRO");
  const [isUserTurn, setIsUserTurn] = useState(false);
  
  // Refs for managing context
  const panelContextRef = useRef<PanelContext | null>(null);
  const partialTranscriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable event handlers using useCallback
  const onSpeechStart = useCallback(() => {
    console.log("🎤 Panel Speech started - assistant is speaking");
    setIsSpeechActive(true);
    setError(null);
    setIsUserTurn(false);
  }, []);

  const onSpeechEnd = useCallback(() => {
    console.log("🔇 Panel Speech ended - turn goes to user");
    setIsSpeechActive(false);
    setIsUserTurn(true);
  }, []);

  const onCallStart = useCallback(() => {
    console.log("Panel debate call has started");
    setCallStatus(CALL_STATUS.ACTIVE);
    setError(null);
  }, []);

  const onCallEnd = useCallback(() => {
    console.log("Panel debate call has stopped");
    setCallStatus(CALL_STATUS.INACTIVE);
    setCurrentSpeaker(null);
    setSquadMembers([]);
    setRaisedHands([]);
  }, []);

  const onVolumeLevel = useCallback((volume: number) => {
    setAudioLevel(volume);
  }, []);

  const onMessageUpdate = useCallback((message: ExtendedMessage) => {
    console.log("Panel message received:", message.type);

    if((message.type === 'transfer-update') || (message.type === MessageTypeEnum.CONVERSATION_UPDATE)) {
      console.log("Panel message received:", message.type, message);
    }
    
    // Handle transfer updates to switch current speaker
    if (message.type === MessageTypeEnum.TRANSFER_UPDATE) {
      const transferMessage = message as any; 
      const destinationAssistantName = transferMessage.destination?.assistantName;
      
      if (destinationAssistantName) {
        console.log("🔄 Transfer detected to:", destinationAssistantName);
        console.log("📋 Available panelists:", panelContextRef.current?.aiPanelists?.map(p => p.name));
        
        // Map assistant names to UI speaker IDs
        let newSpeaker: string | null = null;
        
        if (destinationAssistantName === "Moderator") {
          newSpeaker = "moderator";
        } else if (destinationAssistantName.startsWith("Panelist")) {
          // Find the panelist by name in the context
          const panelists = panelContextRef.current?.aiPanelists || [];
          console.log("🔍 Looking for panelist:", destinationAssistantName, "in:", panelists.map(p => p.name));
          const panelistIndex = panelists.findIndex(p => p.name === destinationAssistantName);
          if (panelistIndex !== -1) {
            newSpeaker = `panelist_${panelistIndex}`;
            console.log("✅ Found panelist at index:", panelistIndex, "-> UI ID:", newSpeaker);
          } else {
            console.log("❌ Panelist not found, available names:", panelists.map(p => p.name));
          }
        }
        
        if (newSpeaker) {
          console.log("🎯 Setting current speaker to:", newSpeaker);
          setCurrentSpeaker(newSpeaker);
          setIsUserTurn(false); // AI is now speaking
          
          // Update squad member active states
          setSquadMembers(prev => prev.map(member => ({
            ...member,
            isActive: member.assistantId === newSpeaker
          })));
        }
      }
      return; // Don't process transfer messages further
    }
    
    // Handle tool calls for hand-raising and moderation - simplified to avoid dependency issues
    if (message.type === MessageTypeEnum.FUNCTION_CALL) {
      const functionCallMessage = message as FunctionCallMessageExtended;
      if (functionCallMessage.toolCalls) {
        functionCallMessage.toolCalls.forEach((toolCall: any) => {
          const { name, arguments: args } = toolCall.function;

          switch (name) {
            case "raise_hand":
              const handRaise: RaisedHand = {
                panelistId: functionCallMessage.role || "unknown",
                panelistName: functionCallMessage.role || "unknown", // Simplified to avoid squadMembers dependency
                questionType: args.questionType,
                targetSpeaker: args.targetSpeaker,
                urgency: args.urgency,
                preview: args.preview,
                timestamp: Date.now()
              };
              setRaisedHands(prev => [...prev, handRaise]);
              console.log("🙋‍♂️ Hand raised:", handRaise);
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
              break;
          }
        });
      }
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
  }, []); // Empty dependency array since we're using refs and don't depend on changing values

  const onError = useCallback((e: any) => {
    console.error("Panel VAPI Error:", e);
    setCallStatus(CALL_STATUS.INACTIVE);
    setError(e.message || "An error occurred during the panel debate");
  }, []);

  // VAPI Event Handlers
  useEffect(() => {
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
  }, [onSpeechStart, onSpeechEnd, onCallStart, onCallEnd, onVolumeLevel, onMessageUpdate, onError]);

  // Helper function to get assistant name - simplified to avoid dependency loops
  const getAssistantName = useCallback((assistantId: string) => {
    // Use the panelContextRef to get names instead of squadMembers to avoid dependency issues
    if (assistantId === "moderator") return "Moderator";
    if (assistantId === "user") return "You";
    
    const panelists = panelContextRef.current?.aiPanelists || [];
    const panelistIndex = assistantId.replace("panelist_", "");
    const panelist = panelists[parseInt(panelistIndex)];
    return panelist?.name || assistantId;
  }, []);

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
          isActive: false
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
      await vapi.start(undefined, undefined, squadConfig);
      
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
    }
  }, [currentPhase]);

  const transferToModerator = useCallback(() => {
    if (callStatus === CALL_STATUS.ACTIVE) {
      setCurrentSpeaker("moderator");
      setIsUserTurn(false);
    }
  }, [callStatus]);

  const transferToPanelist = useCallback((panelistId: string) => {
    if (callStatus === CALL_STATUS.ACTIVE) {
      setCurrentSpeaker(panelistId);
      setIsUserTurn(false);
    }
  }, [callStatus]);

  const transferToUser = useCallback(() => {
    if (callStatus === CALL_STATUS.ACTIVE) {
      setCurrentSpeaker("user");
      setIsUserTurn(true);
    }
  }, [callStatus]);


  const acknowledgeQuestion = useCallback((handIndex: number) => {
    const hand = raisedHands[handIndex];
    if (hand) {
      // Check if this is a user hand-raise
      if (hand.panelistId === "user" || hand.panelistName === "You") {
        // For user hand-raise: simple state transition without confusing system messages
        setCurrentSpeaker("user");
        setIsUserTurn(true);
        
      } else {
        // For AI panelist hand-raise: transfer to that panelist
        transferToPanelist(hand.panelistId);
      }
      
      // Remove the acknowledged hand
      setRaisedHands(prev => prev.filter((_, i) => i !== handIndex));
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
    // raiseUserHand,
    acknowledgeQuestion,
    dismissQuestion,
    sendMessage,
    error,
  };
} 