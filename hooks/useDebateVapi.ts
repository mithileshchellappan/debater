"use client";

import {
  Message,
  MessageTypeEnum,
  TranscriptMessage,
  TranscriptMessageTypeEnum,
  DebateContext,
} from "@/lib/types/conversation.type";
import { useEffect, useState, useCallback, useRef } from "react";
import { vapi } from "@/lib/vapi.sdk";
import { createLincolnDouglasAssistant, createPhaseUpdateMessage } from "@/lib/assistants/dynamic-assistant";

export enum CALL_STATUS {
  INACTIVE = "inactive",
  ACTIVE = "active", 
  LOADING = "loading",
  CONNECTING = "connecting",
  ENDING = "ending",
}

export interface UseDebateVapiReturn {
  isSpeechActive: boolean;
  callStatus: CALL_STATUS;
  audioLevel: number;
  activeTranscript: TranscriptMessage | null;
  messages: Message[];
  currentAssistant: any | null;
  isAIWaiting: boolean;
  actualSpeaker: "user" | "assistant" | null;
  startDebate: (context: DebateContext) => Promise<void>;
  stopDebate: () => void;
  switchPhase: (newPhase: string, context: DebateContext) => Promise<void>;
  toggleCall: () => void;
  sendMessage: (message: string, role?: "user" | "system") => void;
  passMicrophone: () => void;
  interruptAssistant: () => void;
  error: string | null;
}

export function useDebateVapi(): UseDebateVapiReturn {
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [callStatus, setCallStatus] = useState<CALL_STATUS>(CALL_STATUS.INACTIVE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTranscript, setActiveTranscript] = useState<TranscriptMessage | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentAssistant, setCurrentAssistant] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Track actual speaker based on speech events
  const [actualSpeaker, setActualSpeaker] = useState<"user" | "assistant" | null>(null);
  
  // Keep track of current debate context
  const debateContextRef = useRef<DebateContext | null>(null);
  const assistantCacheRef = useRef<Map<string, any>>(new Map());
  
  // Add debouncing for partial transcripts to reduce glitching
  const partialTranscriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedActiveTranscript, setDebouncedActiveTranscript] = useState<TranscriptMessage | null>(null);

  useEffect(() => {
    const onSpeechStart = () => {
      console.log("Speech started");
      setIsSpeechActive(true);
      setError(null);
      
      // Determine who is speaking based on the last transcript message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.type === MessageTypeEnum.TRANSCRIPT) {
        setActualSpeaker(lastMessage.role === 'user' ? 'user' : 'assistant');
      } else {
        // Default assumption - if no recent transcript, likely assistant speaking
        setActualSpeaker('assistant');
      }
    };

    const onSpeechEnd = () => {
      console.log("Speech has ended");
      setIsSpeechActive(false);
      setActualSpeaker(null);
    };

    const onCallStartHandler = () => {
      console.log("Debate call has started");
      setCallStatus(CALL_STATUS.ACTIVE);
      setError(null);
    };

    const onCallEnd = () => {
      console.log("Debate call has stopped");
      setCallStatus(CALL_STATUS.INACTIVE);
      setCurrentAssistant(null);
      // Clear assistant cache when call ends
      assistantCacheRef.current.clear();
    };

    const onVolumeLevel = (volume: number) => {
      setAudioLevel(volume);
    };

    const onMessageUpdate = (message: Message) => {
      console.log("Debate message received:", message);
      
      if (
        message.type === MessageTypeEnum.TRANSCRIPT &&
        message.transcriptType === TranscriptMessageTypeEnum.PARTIAL
      ) {
        // Update speaker tracking for partial transcripts
        if (isSpeechActive) {
          setActualSpeaker(message.role === 'user' ? 'user' : 'assistant');
        }
        
        // Debounce partial transcript updates to reduce glitching
        if (partialTranscriptTimeoutRef.current) {
          clearTimeout(partialTranscriptTimeoutRef.current);
        }
        
        // Only update if transcript has meaningful content
        if (message.transcript.trim().length > 2) {
          partialTranscriptTimeoutRef.current = setTimeout(() => {
            setActiveTranscript(message);
            setDebouncedActiveTranscript(message);
          }, 100); // 100ms debounce
        }
      } else {
        // Add timestamp if not provided by VAPI
        if (message.type === MessageTypeEnum.TRANSCRIPT && !message.timestamp) {
          message.timestamp = new Date().toISOString();
        }
        
        setMessages((prev) => [...prev, message]);
        
        // Clear active transcript when final message arrives
        if (message.type === MessageTypeEnum.TRANSCRIPT) {
          setActiveTranscript(null);
          setDebouncedActiveTranscript(null);
          if (partialTranscriptTimeoutRef.current) {
            clearTimeout(partialTranscriptTimeoutRef.current);
          }
        }
      }
    };

    const onError = (e: any) => {
      console.error("VAPI Error:", e);
      setCallStatus(CALL_STATUS.INACTIVE);
      setError(e.message || "An error occurred during the debate call");
      setCurrentAssistant(null);
    };

    // Register event listeners
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("call-start", onCallStartHandler);
    vapi.on("call-end", onCallEnd);
    vapi.on("volume-level", onVolumeLevel);
    vapi.on("message", onMessageUpdate);
    vapi.on("error", onError);

    return () => {
      // Cleanup event listeners
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("call-start", onCallStartHandler);
      vapi.off("call-end", onCallEnd);
      vapi.off("volume-level", onVolumeLevel);
      vapi.off("message", onMessageUpdate);
      vapi.off("error", onError);
      
      // Cleanup timeout
      if (partialTranscriptTimeoutRef.current) {
        clearTimeout(partialTranscriptTimeoutRef.current);
      }
    };
  }, []);

  const createDebateAssistant = useCallback(async (context: DebateContext) => {
    console.log("Creating single debate assistant for:", context.userSide);
    return createLincolnDouglasAssistant(context);
  }, []);

  const startDebate = useCallback(async (context: DebateContext) => {
    try {
      console.log("🚀 NEW DEBATE CALL STARTING:", {
        phase: context.currentPhase,
        userSide: context.userSide,
        resolution: context.resolution.substring(0, 50) + "..."
      });
      
      setCallStatus(CALL_STATUS.LOADING);
      setError(null);
      
      // Store current context
      debateContextRef.current = context;
      
      // Create single assistant for the entire debate
      const assistant = await createDebateAssistant(context);
      setCurrentAssistant(assistant);
      
      console.log("📞 Starting VAPI call with assistant:", assistant.name);
      console.log("Initial phase:", context.currentPhase, "| User side:", context.userSide);
      
      const response = await vapi.start(assistant);
      console.log("✅ NEW VAPI CALL SUCCESSFULLY STARTED:", response);
      
      // Send initial phase update
      setTimeout(() => {
        const phaseMessage = createPhaseUpdateMessage(context);
        sendMessage(phaseMessage, "system");
      }, 1000);
      
    } catch (err: any) {
      console.error("Failed to start debate:", err);
      setError(typeof err?.message === 'string' ? err.message : "Failed to start debate call");
      setCallStatus(CALL_STATUS.INACTIVE);
      setCurrentAssistant(null);
    }
  }, [createDebateAssistant]);

  const stopDebate = useCallback(() => {
    console.log("🛑 STOPPING DEBATE CALL - This is a complete call termination");
    
    setCallStatus(CALL_STATUS.ENDING);
    vapi.stop();
    
    console.log("📞 VAPI call stopped, cleaning up state...");
    
    // Clear context and assistant
    debateContextRef.current = null;
    setCurrentAssistant(null);
    setMessages([]);
    setActiveTranscript(null);
    setDebouncedActiveTranscript(null);
    setActualSpeaker(null);
    
    // Clear any pending partial transcript timeouts
    if (partialTranscriptTimeoutRef.current) {
      clearTimeout(partialTranscriptTimeoutRef.current);
      partialTranscriptTimeoutRef.current = null;
    }
    
    console.log("✅ DEBATE CALL FULLY STOPPED");
  }, []);

  const toggleCall = useCallback(() => {
    if (callStatus === CALL_STATUS.ACTIVE) {
      stopDebate();
    } else if (debateContextRef.current) {
      startDebate(debateContextRef.current);
    } else {
      console.warn("No debate context available to start call");
    }
  }, [callStatus, startDebate, stopDebate]);

  const sendMessage = useCallback((message: string, role: "user" | "system" = "user") => {
    if (callStatus === CALL_STATUS.ACTIVE) {
      vapi.send({
        type: "add-message",
        message: {
          role: role,
          content: message,
        },
      });
      console.log(`Sent ${role} message to VAPI:`, message);
    } else {
      console.warn("Cannot send message: VAPI not active");
    }
  }, [callStatus]);

  const passMicrophone = useCallback(() => {
    if (callStatus === CALL_STATUS.ACTIVE) {
      // Send a signal to the assistant that the user is passing the microphone
      sendMessage("I pass the microphone to you. Please proceed with your speech.", "system");
      console.log("Microphone passed to AI assistant");
    } else {
      console.warn("Cannot pass microphone: VAPI not active");
    }
  }, [callStatus, sendMessage]);

  const interruptAssistant = useCallback(() => {
    if (callStatus === CALL_STATUS.ACTIVE && actualSpeaker === 'assistant') {
      // Send interrupt signal to make assistant stop speaking immediately
      vapi.send({
        type: "add-message",
        message: {
          role: "system",
          content: "STOP speaking immediately. The user wants to speak now. Do not respond or say anything else.",
        },
      });
      console.log("Interrupted assistant - sending stop signal");
      
      // Reset speaker state
      setActualSpeaker(null);
      setIsSpeechActive(false);
    } else {
      console.warn("Cannot interrupt: Assistant not currently speaking or VAPI not active");
    }
  }, [callStatus, actualSpeaker]);

  const switchPhase = useCallback(async (newPhase: string, context: DebateContext) => {
    if (callStatus !== CALL_STATUS.ACTIVE) {
      console.warn("Cannot switch phase when call is not active");
      return;
    }

    try {
      console.log("🔄 PHASE SWITCH START:", {
        from: debateContextRef.current?.currentPhase,
        to: newPhase,
        callStatus,
        assistantName: currentAssistant?.name
      });
      
      // Update context
      const updatedContext = { ...context, currentPhase: newPhase };
      debateContextRef.current = updatedContext;
      
      // Send phase update to existing assistant via vapi.send
      const phaseMessage = createPhaseUpdateMessage(updatedContext);
      console.log("📨 Sending phase update message:", phaseMessage.substring(0, 200) + "...");
      sendMessage(phaseMessage, "system");
      
      console.log("✅ PHASE SWITCH COMPLETE:", {
        newPhase,
        callStillActive: callStatus === CALL_STATUS.ACTIVE,
        assistantStillSame: currentAssistant?.name
      });
      
    } catch (err: any) {
      console.error("❌ PHASE SWITCH ERROR:", err);
      setError(err.message || "Failed to switch debate phase");
    }
  }, [callStatus, sendMessage, currentAssistant]);

  return {
    isSpeechActive,
    callStatus,
    audioLevel,
    activeTranscript,
    messages,
    currentAssistant,
    isAIWaiting: currentAssistant?.metadata?.shouldWaitForUser || false,
    actualSpeaker,
    startDebate,
    stopDebate,
    switchPhase,
    toggleCall,
    sendMessage,
    passMicrophone,
    interruptAssistant,
    error,
  };
}

// Utility hook for managing debate phases
export function useDebatePhaseManager() {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  
  const PHASES = ["AC", "CX1", "NC", "CX2", "1AR", "NR", "2AR"];
  
  const nextPhase = useCallback(() => {
    setCurrentPhaseIndex(prev => Math.min(prev + 1, PHASES.length - 1));
  }, []);
  
  const previousPhase = useCallback(() => {
    setCurrentPhaseIndex(prev => Math.max(prev - 1, 0));
  }, []);
  
  const resetToStart = useCallback(() => {
    setCurrentPhaseIndex(0);
  }, []);
  
  return {
    currentPhase: PHASES[currentPhaseIndex],
    currentPhaseIndex,
    totalPhases: PHASES.length,
    nextPhase,
    previousPhase,
    resetToStart,
    setPhase: setCurrentPhaseIndex,
    isFirstPhase: currentPhaseIndex === 0,
    isLastPhase: currentPhaseIndex === PHASES.length - 1,
  };
} 