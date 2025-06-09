export enum MessageTypeEnum {
  TRANSCRIPT = "transcript",
  FUNCTION_CALL = "function-call",
  FUNCTION_RESULT = "function-result",
  HANG = "hang",
  CONVERSATION_UPDATE = "conversation-update",
  TRANSFER_UPDATE = "transfer-update",
  TOOL_CALLS = "tool-calls",
  END_OF_CALL_REPORT = "end-of-call-report",
}

export enum TranscriptMessageTypeEnum {
  PARTIAL = "partial",
  FINAL = "final",
}

export interface EndOfCallReportMessage<T> {
  type: MessageTypeEnum.END_OF_CALL_REPORT;
  summary: T;
}

export interface TranscriptMessage {
  type: MessageTypeEnum.TRANSCRIPT;
  transcriptType: TranscriptMessageTypeEnum;
  transcript: string;
  timestamp: string;
  role: "user" | "assistant";
}

export interface ToolCallMessage {
  type: MessageTypeEnum.TOOL_CALLS;
  toolCalls: Array<{
    function: {
      name: string;
      arguments: Record<string, any>;
    };
  }>;
}

export interface ConversationUpdateMessage {
  type: MessageTypeEnum.CONVERSATION_UPDATE;
  conversation: {
    id: string;
    messages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
      timestamp: string;
    }>;
  };
}

export interface FunctionCallMessage {
  type: MessageTypeEnum.FUNCTION_CALL;
  functionCall: {
    name: string;
    parameters: Record<string, any>;
  };
}

export interface FunctionResultMessage {
  type: MessageTypeEnum.FUNCTION_RESULT;
  functionCallId: string;
  result: any;
}

export interface HangMessage {
  type: MessageTypeEnum.HANG;
}

export interface TransferUpdateMessage {
  type: MessageTypeEnum.TRANSFER_UPDATE;
  transfer: {
    type: "assistant" | "user";
    assistantName: string;
    message: string;
  };
}

export type Message = 
  | TranscriptMessage 
  | ConversationUpdateMessage 
  | FunctionCallMessage 
  | FunctionResultMessage 
  | HangMessage
  | TransferUpdateMessage
  | ToolCallMessage
  | EndOfCallReportMessage<any>;

// Debate-specific types
export interface DebateAssistantConfig {
  name: string;
  role: "lincoln" | "douglas";
  stance: "affirmative" | "negative";
  resolution: string;
  currentPhase: string;
  personality: {
    style: string;
    traits: string[];
  };
}

export interface DebateContext {
  resolution: string;
  userSide: "affirmative" | "negative";
  currentPhase: string;
  timeRemaining: number;
  transcript: string;
} 