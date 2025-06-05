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
import { createLincolnDouglasAssistant, updateAssistantContext } from "@/lib/assistants/dynamic-assistant";

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
  startDebate: (context: DebateContext) => Promise<void>;
  stopDebate: () => void;
  switchPhase: (newPhase: string, context: DebateContext) => Promise<void>;
  toggleCall: () => void;
  sendMessage: (message: string, role?: "user" | "system") => void;
  passMicrophone: () => void;
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
  
  // Keep track of current debate context
  const debateContextRef = useRef<DebateContext | null>(null);
  const assistantCacheRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    const onSpeechStart = () => {
      setIsSpeechActive(true);
      setError(null);
    };

    const onSpeechEnd = () => {
      console.log("Speech has ended");
      setIsSpeechActive(false);
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
        setActiveTranscript(message);
      } else {
        setMessages((prev) => [...prev, message]);
        setActiveTranscript(null);
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
    };
  }, []);

  const createOrGetAssistant = useCallback(async (context: DebateContext) => {
    const cacheKey = `${context.userSide}-${context.currentPhase}-${context.resolution.slice(0, 50)}`;
    
    // Check if we have a cached assistant for this context
    if (assistantCacheRef.current.has(cacheKey)) {
      const cachedAssistant = assistantCacheRef.current.get(cacheKey);
      console.log("Using cached assistant for phase:", context.currentPhase);
      return updateAssistantContext(cachedAssistant, context);
    }

    // Create new assistant for this specific context
    console.log("Creating new assistant for phase:", context.currentPhase);
    const assistant = createLincolnDouglasAssistant(context);
    
    if (assistantCacheRef.current.size > 5) {
      const firstKey = assistantCacheRef.current.keys().next().value as string;
      assistantCacheRef.current.delete(firstKey);
    }
    assistantCacheRef.current.set(cacheKey, assistant);
    
    return assistant;
  }, []);

  const startDebate = useCallback(async (context: DebateContext) => {
    try {
      setCallStatus(CALL_STATUS.LOADING);
      setError(null);
      
      // Store current context
      debateContextRef.current = context;
      
      // Create or get appropriate assistant for this context
      const assistant = await createOrGetAssistant(context);
      setCurrentAssistant(assistant);
      
      console.log("Starting debate with assistant:", assistant.name);
      console.log("Phase:", context.currentPhase, "| User side:", context.userSide);
      
    console.log(assistant)
      const response = await vapi.start(assistant);
      
      console.log("Debate call started:", response);
      
    } catch (err: any) {
      console.error("Failed to start debate:", err);
      setError(typeof err?.message === 'string' ? err.message : "Failed to start debate call");
      setCallStatus(CALL_STATUS.INACTIVE);
      setCurrentAssistant(null);
    }
  }, [createOrGetAssistant]);

  const stopDebate = useCallback(() => {
    setCallStatus(CALL_STATUS.ENDING);
    vapi.stop();
    // Clear context and assistant
    debateContextRef.current = null;
    setCurrentAssistant(null);
    setMessages([]);
    setActiveTranscript(null);
  }, []);

  const switchPhase = useCallback(async (newPhase: string, context: DebateContext) => {
    if (callStatus !== CALL_STATUS.ACTIVE) {
      console.warn("Cannot switch phase when call is not active");
      return;
    }

    try {
      console.log("Switching to phase:", newPhase);
      
      // Update context
      const updatedContext = { ...context, currentPhase: newPhase };
      debateContextRef.current = updatedContext;
      
      // Stop current call
      vapi.stop();
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Start new call with updated context
      await startDebate(updatedContext);
      
    } catch (err: any) {
      console.error("Failed to switch phase:", err);
      setError(err.message || "Failed to switch debate phase");
    }
  }, [callStatus, startDebate]);

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

  return {
    isSpeechActive,
    callStatus,
    audioLevel,
    activeTranscript,
    messages,
    currentAssistant,
    isAIWaiting: currentAssistant?.metadata?.shouldWaitForUser || false,
    startDebate,
    stopDebate,
    switchPhase,
    toggleCall,
    sendMessage,
    passMicrophone,
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