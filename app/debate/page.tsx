"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Clock,
  Info,
  RotateCcw,
  MicOff,
  FileText,
  User,
  Bot,
  CheckCircle,
  Lightbulb,
  AlertTriangle,
  Mic,
  ArrowRight,
  X,
} from "lucide-react"
import AsciiVoiceVisualizer from "@/components/ascii-voice-visualizer"
import NotesModal from "@/components/notes-modal"
import { useDebateVapi, CALL_STATUS } from "@/hooks/useDebateVapi"
import { DebateContext } from "@/lib/types/conversation.type"
import { MessageTypeEnum, TranscriptMessageTypeEnum, TranscriptMessage } from "@/lib/types/conversation.type"

const DEBATE_PHASES = [
  {
    code: "AC",
    name: "Affirmative Constructive",
    description: "6 minutes - Present your case supporting the resolution",
    duration: 360,
    speaker: "affirmative"
  },
  {
    code: "CX1",
    name: "Cross Examination",
    description: "3 minutes - Negative questions Affirmative",
    duration: 180,
    speaker: "negative"
  },
  {
    code: "NC",
    name: "Negative Constructive",
    description: "7 minutes - Present case against resolution and refute affirmative",
    duration: 420,
    speaker: "negative"
  },
  {
    code: "CX2",
    name: "Cross Examination",
    description: "3 minutes - Affirmative questions Negative",
    duration: 180,
    speaker: "affirmative"
  },
  {
    code: "1AR",
    name: "First Affirmative Rebuttal",
    description: "4 minutes - Rebuild affirmative case",
    duration: 240,
    speaker: "affirmative"
  },
  {
    code: "NR",
    name: "Negative Rebuttal",
    description: "6 minutes - Extend negative arguments",
    duration: 360,
    speaker: "negative"
  },
  {
    code: "2AR",
    name: "Second Affirmative Rebuttal",
    description: "3 minutes - Final affirmative speech",
    duration: 180,
    speaker: "affirmative"
  },
]

const DEBATE_HINTS = {
  AC: [
    "Define key terms clearly to establish the framework of your argument.",
    "Present 2-3 strong contentions with evidence and reasoning.",
    "Anticipate counterarguments and address them preemptively.",
  ],
  CX1: [
    "Ask questions that expose flaws in your opponent's value framework.",
    "Focus on getting concessions that will help your case.",
    "Don't waste time on minor points - target their core arguments.",
  ],
  CX2: [
    "Ask strategic questions about their framework and evidence.",
    "Get concessions that will help you rebuild your case.",
    "Focus on key weaknesses in their arguments.",
  ],
  NC: [
    "Directly clash with the affirmative's value framework.",
    "Offer a competing value framework if appropriate.",
    "Present evidence that contradicts the affirmative's claims.",
  ],
  "1AR": [
    "Prioritize rebuilding your strongest arguments first.",
    "Group similar attacks and address them efficiently.",
    "Don't introduce new arguments - focus on defense.",
  ],
  NR: [
    "Extend your strongest arguments and impacts.",
    "Explain why your framework should be preferred.",
    "Highlight dropped arguments from your NC.",
  ],
  "2AR": [
    "Focus on key voting issues - don't try to cover everything.",
    "Explain why you win even if you've lost some arguments.",
    "End with a strong call to action.",
  ],
}

export default function DebatePage() {
  const [resolution, setResolution] = useState("")
  const [side, setSide] = useState("")
  const [currentPhase, setCurrentPhase] = useState(0)
  const [timer, setTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [currentHint, setCurrentHint] = useState<string>("")
  const [showEndWarning, setShowEndWarning] = useState(false)

  const transcriptRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // VAPI Integration
  const {
    startDebate,
    stopDebate,
    switchPhase,
    callStatus,
    activeTranscript,
    messages,
    currentAssistant,
    isSpeechActive,
    isAIWaiting,
    actualSpeaker,
    audioLevel,
    passMicrophone,
    interruptAssistant,
    error,
    sendMessage
  } = useDebateVapi()

  // Derived state
  const userName = side === "affirmative" ? "LINCOLN" : "DOUGLAS"
  const aiName = side === "affirmative" ? "DOUGLAS" : "LINCOLN"
  const userStance = side === "affirmative" ? "AFFIRMATIVE" : "NEGATIVE"
  const aiStance = side === "affirmative" ? "NEGATIVE" : "AFFIRMATIVE"

  // Current phase info
  const currentPhaseData = DEBATE_PHASES[currentPhase]
  const isUserPhase = currentPhaseData?.speaker === side
  const isAIPhase = currentPhaseData?.speaker !== side
  const isUserTurn = actualSpeaker === "user" && callStatus === CALL_STATUS.ACTIVE
  const isAITurn = actualSpeaker === "assistant" && callStatus === CALL_STATUS.ACTIVE

  // Enhanced transcript handling with proper timestamps
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{
    message: TranscriptMessage;
    receivedAt: number; // timestamp when message was received
  }>>([]);
  
  // Track debate start time for accurate timestamp calculation
  const [debateStartTime, setDebateStartTime] = useState<number | null>(null);

  // Track when messages are received for proper timing
  useEffect(() => {
    const newFinalMessages = messages.filter(msg => 
      msg.type === MessageTypeEnum.TRANSCRIPT && 
      msg.transcriptType === TranscriptMessageTypeEnum.FINAL
    ) as TranscriptMessage[];

    // Add any new final messages to history with received timestamp
    newFinalMessages.forEach(msg => {
      setTranscriptHistory(prev => {
        // Check if this message is already in history
        const exists = prev.some(item => 
          item.message.transcript === msg.transcript && 
          item.message.role === msg.role
        );
        
        if (!exists) {
          // Use message timestamp if available, otherwise use current time when received
          const messageTime = msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now();
          return [...prev, { message: msg, receivedAt: messageTime }];
        }
        return prev;
      });
    });
  }, [messages]);

  // Track debate start and clear transcript history when debate resets
  useEffect(() => {
    if (callStatus === CALL_STATUS.ACTIVE && debateStartTime === null) {
      setDebateStartTime(Date.now());
    } else if (callStatus === CALL_STATUS.INACTIVE) {
      setTranscriptHistory([]);
      setDebateStartTime(null);
    }
  }, [callStatus, debateStartTime]);

  useEffect(() => {
    const storedResolution = localStorage.getItem("debateResolution")
    const storedSide = localStorage.getItem("debateSide")
    if (storedResolution) setResolution(storedResolution)
    if (storedSide) setSide(storedSide)
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning && timer < DEBATE_PHASES[currentPhase].duration) {
      interval = setInterval(() => {
        setTimer((prevTimer) => {
          const newTimer = prevTimer + 1
          // Only send critical time warnings
          const timeLeft = DEBATE_PHASES[currentPhase].duration - newTimer
          if (timeLeft === 30) {
            setTimeout(() => sendTimeWarning(), 100)
          }
          return newTimer
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, timer, currentPhase])

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [messages, activeTranscript])


  // Send initial context only when debate starts.
  useEffect(() => {
    if (callStatus === CALL_STATUS.ACTIVE && resolution && side) {
      sendDebateContext("debate_started", `Resolution: "${resolution}" | Your stance: ${side === "affirmative" ? "NEGATIVE" : "AFFIRMATIVE"}`)
    }
  }, [callStatus, resolution, side])

  // Auto-start timer for both user and AI phases.
  useEffect(() => {
    if (callStatus === CALL_STATUS.ACTIVE && currentPhaseData && !isTimerRunning) {
      // Start timer automatically for any phase when debate is active
      setIsTimerRunning(true)
      console.log(`Auto-starting timer for phase: ${currentPhaseData.code}`)
    }
  }, [callStatus, currentPhaseData, currentPhase, isTimerRunning])

  // Timer-based microphone passing when AI is waiting.
  useEffect(() => {
    let timeout: NodeJS.Timeout
    
    if (isAIWaiting && callStatus === CALL_STATUS.ACTIVE && timer === 0) {
      // After 45 seconds, automatically pass the microphone.
      timeout = setTimeout(() => {
        console.log("Auto-passing microphone after 45 seconds of waiting")
        passMicrophone()
      }, 45000)
    }
    
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [isAIWaiting, callStatus, timer, passMicrophone])

  useEffect(() => {
    // Reset hint when phase changes.
    setShowHint(false)
    const phaseCode = DEBATE_PHASES[currentPhase].code
    const hintsForPhase = DEBATE_HINTS[phaseCode as keyof typeof DEBATE_HINTS] || []
    if (hintsForPhase.length > 0) {
      const randomIndex = Math.floor(Math.random() * hintsForPhase.length)
      setCurrentHint(hintsForPhase[randomIndex])
    }
  }, [currentPhase])

  const createDebateContext = (): DebateContext => ({
    resolution,
    userSide: side as "affirmative" | "negative",
    currentPhase: DEBATE_PHASES[currentPhase].code,
    timeRemaining: getTimeRemaining(),
    transcript: getFullTranscript()
  })

  const getFullTranscript = () => {
    return messages
      .filter(msg => msg.type === MessageTypeEnum.TRANSCRIPT && msg.transcriptType === TranscriptMessageTypeEnum.FINAL)
      .map(msg => {
        const transcriptMsg = msg as TranscriptMessage
        return `[${formatTime(timer)}] ${transcriptMsg.role.toUpperCase()}: ${transcriptMsg.transcript}`
      })
      .join('\n')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Format timestamp from VAPI message or elapsed debate time.
  const formatTimestamp = (timestamp?: string | number) => {
    if (typeof timestamp === 'string' && debateStartTime) {
      // Parse ISO timestamp and calculate elapsed time since debate start.
      const messageTime = new Date(timestamp).getTime();
      const elapsedSeconds = Math.floor((messageTime - debateStartTime) / 1000);
      return formatTime(Math.max(0, elapsedSeconds));
    } else if (typeof timestamp === 'number') {
      // Already in seconds format.
      return formatTime(timestamp);
    }
    // Fallback to current timer.
    return formatTime(timer);
  }

  const getTimeRemaining = () => {
    const remaining = DEBATE_PHASES[currentPhase].duration - timer
    return Math.max(0, remaining)
  }

  // Send context updates to VAPI assistant.
  const sendDebateContext = (action: string, additionalInfo?: string) => {
    if (callStatus !== CALL_STATUS.ACTIVE) return

    const currentPhaseData = DEBATE_PHASES[currentPhase]
    const contextMessage = {
      type: 'add-message',
      message: {
        role: 'system',
        content: `DEBATE CONTEXT UPDATE:

ACTION: ${action}
RESOLUTION: "${resolution}"
YOUR STANCE: ${side === "affirmative" ? "NEGATIVE" : "AFFIRMATIVE"}
USER STANCE: ${side === "affirmative" ? "AFFIRMATIVE" : "NEGATIVE"}
CURRENT PHASE: ${currentPhaseData.code} - ${currentPhaseData.name}
PHASE SPEAKER: ${currentPhaseData.speaker}
TIME ELAPSED: ${formatTime(timer)}
TIME REMAINING: ${formatTime(getTimeRemaining())}
YOUR TURN TO SPEAK: ${isAIPhase ? "YES" : "NO"}
USER TURN TO SPEAK: ${isUserPhase ? "YES" : "NO"}

${additionalInfo ? `ADDITIONAL INFO: ${additionalInfo}` : ''}

Remember your role and respond appropriately to this context.`
      }
    }

    sendMessage(contextMessage.message.content, "system")
    console.log(`Sent context update: ${action}`, contextMessage)
  }

  // Send only critical time warning.
  const sendTimeWarning = () => {
    if (callStatus !== CALL_STATUS.ACTIVE) return
    const timeLeft = getTimeRemaining()
    if (timeLeft === 30) {
      sendDebateContext("time_warning", "30 seconds remaining")
    }
  }

  const toggleMicrophone = () => {
    if (callStatus !== CALL_STATUS.ACTIVE) {
      // Start the debate if not active.
      const context = createDebateContext()
      startDebate(context)
      return
    }

    if (isUserPhase) {
      setIsTimerRunning(true)
      // VAPI will handle the actual voice input.
    }
  }

  const toggleHint = () => {
    setShowHint(!showHint)
  }

  const nextPhase = async () => {
    if (currentPhase < DEBATE_PHASES.length - 1) {
      const newPhaseIndex = currentPhase + 1
      const nextPhaseData = DEBATE_PHASES[newPhaseIndex]
      
      setCurrentPhase(newPhaseIndex)
      setTimer(0)
      setShowHint(false)

      // Switch VAPI assistant to new phase
      if (callStatus === CALL_STATUS.ACTIVE) {
        const newContext = createDebateContext()
        newContext.currentPhase = nextPhaseData.code
        await switchPhase(newContext.currentPhase, newContext)
      }
    }
  }

  const resetDebate = () => {
    stopDebate()
    setCurrentPhase(0)
    setTimer(0)
    setIsTimerRunning(false)
    setShowHint(false)
  }

  const handleEndDebate = () => {
    const debateData = {
      type: "lincoln-douglas",
      resolution,
      side,
      transcript: getFullTranscript(),
      duration: timer,
      phases: currentPhase + 1,
      messages: messages
    }
    localStorage.setItem("lastDebateData", JSON.stringify(debateData))
    stopDebate()
    router.push("/debate-analysis")
  }

  const timeRemaining = getTimeRemaining()
  const isTimeWarning = timeRemaining <= 60 && timeRemaining > 30
  const isTimeCritical = timeRemaining <= 30

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <p className="text-sm text-neutral-400 mb-2">Resolution:</p>
          <p className="font-medium text-white">{resolution}</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-600 text-white p-3 rounded border border-red-500 mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">VAPI Error:</span>
            </div>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Controls Bar */}
        <div className="flex justify-between items-center bg-neutral-900 border border-neutral-700 p-4 rounded-none">
          <div className="flex items-center space-x-6">
            {/* Timer */}
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <div className="text-center">
                <div className="text-2xl font-mono">{formatTime(timer)}</div>
                <div
                  className={`text-xs font-mono ${
                    isTimeCritical ? "text-red-400" : isTimeWarning ? "text-yellow-400" : "text-neutral-400"
                  }`}
                >
                  -{formatTime(timeRemaining)}
                </div>
              </div>
            </div>

            {/* Current Phase */}
            <div className="flex items-center space-x-2 group relative">
              <span className="font-semibold text-lg font-mono">{DEBATE_PHASES[currentPhase].code}</span>
              <Info className="w-4 h-4 cursor-help" />
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-black border border-neutral-600 p-3 rounded-none min-w-64 z-10">
                <p className="font-semibold text-white">{DEBATE_PHASES[currentPhase].name}</p>
                <p className="text-sm text-neutral-400">{DEBATE_PHASES[currentPhase].description}</p>
              </div>
            </div>

            {/* Active Speaker Indicator */}
            {isSpeechActive && (
              <div className="flex items-center space-x-2 bg-white text-black px-3 py-1 rounded-none">
                <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                <span className="text-sm font-medium font-mono">
                  {actualSpeaker === "user" ? `${userName} SPEAKING` : `${aiName} SPEAKING`}
                </span>
              </div>
            )}

            {/* User Turn Indicator */}
            {isUserPhase && !isSpeechActive && callStatus === CALL_STATUS.ACTIVE && (
              <div className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-none animate-pulse">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium font-mono">YOUR TURN TO SPEAK</span>
              </div>
            )}

            {/* AI Turn Indicator */}
            {isAIPhase && !isSpeechActive && callStatus === CALL_STATUS.ACTIVE && (
              <div className="flex items-center space-x-2 bg-yellow-600 text-white px-3 py-1 rounded-none">
                <Bot className="w-4 h-4" />
                <span className="text-sm font-medium font-mono">{aiName} PREPARING</span>
              </div>
            )}

            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                callStatus === CALL_STATUS.ACTIVE ? 'bg-green-500' : 
                callStatus === CALL_STATUS.LOADING ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`} />
              <span className="text-sm font-mono">
                {callStatus === CALL_STATUS.ACTIVE ? 'CONNECTED' : 
                 callStatus === CALL_STATUS.LOADING ? 'CONNECTING' : 
                 'DISCONNECTED'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={() => {
                sendDebateContext("phase_skipped", `User manually advanced from ${DEBATE_PHASES[currentPhase].name}`)
                nextPhase()
              }}
              disabled={currentPhase >= DEBATE_PHASES.length - 1}
              className="bg-neutral-800 text-white hover:bg-neutral-700 rounded-none border border-neutral-600 disabled:bg-neutral-800 disabled:text-neutral-500 font-mono"
            >
              NEXT PHASE
            </Button>
            <Button
              onClick={resetDebate}
              className="bg-neutral-800 text-white hover:bg-neutral-700 rounded-none border border-neutral-600 font-mono"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              RESET
            </Button>
            <Button
              onClick={() => {
                if (callStatus === CALL_STATUS.ACTIVE) {
                  setShowEndWarning(true)
                } else {
                  resetDebate()
                }
              }}
              hidden={callStatus === CALL_STATUS.INACTIVE}
              disabled={callStatus === CALL_STATUS.LOADING || callStatus === CALL_STATUS.ENDING}
              className="bg-red-600 text-white hover:bg-red-700 rounded-none border border-red-500 font-mono disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              END DEBATE
            </Button>
                    </div>
        </div>

        {/* End Debate Warning Modal */}
        {showEndWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-red-500 rounded-none w-full max-w-md">
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <h3 className="text-lg font-semibold text-white">End Debate?</h3>
                </div>
                <p className="text-neutral-300">
                  Are you sure you want to end this debate? You'll be taken to the analysis screen to review your
                  performance.
                </p>
                <div className="flex space-x-3">
                  <Button
                    onClick={handleEndDebate}
                    className="flex-1 bg-red-600 text-white hover:bg-red-700 rounded-none"
                  >
                    Yes, End Debate
                  </Button>
                  <Button
                    onClick={() => setShowEndWarning(false)}
                    className="flex-1 bg-neutral-800 text-white hover:bg-neutral-700 rounded-none border border-neutral-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - User */}
          <div
            className={`bg-black border-2 p-4 rounded-none transition-all h-fit ${
              actualSpeaker === "user"
                ? "border-blue-500"
                : isUserPhase && !isSpeechActive && callStatus === CALL_STATUS.ACTIVE
                  ? "border-green-500 shadow-lg shadow-green-500/20"
                  : "border-neutral-700"
            }`}
          >
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <User className="w-5 h-5" />
                <h3 className="text-lg font-bold font-mono">{userName}</h3>
                {isUserPhase && !isSpeechActive && callStatus === CALL_STATUS.ACTIVE && (
                  <div className="flex items-center space-x-1 ml-2">
                    <CheckCircle className="w-4 h-4 text-green-400 animate-pulse" />
                    <span className="text-xs text-green-400 font-mono">YOUR TURN</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-neutral-400 font-mono">{userStance}</p>
              <Button
                onClick={() => {
                  if (isUserPhase && actualSpeaker === "assistant") {
                    interruptAssistant();
                  } else {
                    toggleMicrophone();
                  }
                }}
                disabled={callStatus === CALL_STATUS.LOADING}
                className={`w-full rounded-none border-2 transition-all text-sm font-mono ${
                  actualSpeaker === "user"
                    ? "bg-red-600 text-white border-red-500 animate-pulse"
                    : isUserPhase && !isSpeechActive && callStatus === CALL_STATUS.ACTIVE
                      ? "bg-green-600 text-white border-green-500 hover:bg-green-700 hover:border-green-600 animate-pulse"
                      : isUserPhase && actualSpeaker === "assistant"
                        ? "bg-orange-600 text-white border-orange-500 hover:bg-orange-700"
                        : callStatus === CALL_STATUS.ACTIVE
                          ? "bg-neutral-800 text-neutral-400 border-neutral-600 cursor-not-allowed"
                          : "bg-blue-600 text-white border-blue-500 hover:bg-blue-700 hover:border-blue-600"
                }`}
              >
                {callStatus === CALL_STATUS.LOADING ? (
                  <>
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                    CONNECTING
                  </>
                ) : actualSpeaker === "user" ? (
                  <>
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                    SPEAKING
                  </>
                ) : isUserPhase && !isSpeechActive && callStatus === CALL_STATUS.ACTIVE ? (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    SPEAK NOW
                  </>
                ) : isUserPhase && actualSpeaker === "assistant" ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    INTERRUPT
                  </>
                ) : callStatus === CALL_STATUS.ACTIVE ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    AI TURN
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    START DEBATE
                  </>
                )}
              </Button>
              
              {isAIWaiting && callStatus === CALL_STATUS.ACTIVE && (
                <Button
                  onClick={passMicrophone}
                  className="w-full bg-yellow-600 text-white hover:bg-yellow-700 rounded-none border border-yellow-500 text-sm font-mono animate-pulse"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  PASS TO {aiName.toUpperCase()}
                </Button>
              )}
              <Button
                onClick={() => setIsNotesOpen(true)}
                className="w-full bg-neutral-800 text-white hover:bg-neutral-700 rounded-none border border-neutral-600 text-sm font-mono"
              >
                <FileText className="w-4 h-4 mr-2" />
                NOTES
              </Button>
            </div>
          </div>

          {/* Center Panel - ASCII Visualizer */}
          <div className="lg:col-span-3 flex flex-col items-center">
            <div className="w-full h-[500px] flex items-center justify-center">
              <div className="w-[500px] h-[500px] bg-black">
                <AsciiVoiceVisualizer
                  isActive={callStatus === CALL_STATUS.ACTIVE}
                  currentSpeaker={actualSpeaker === "user" ? "user" : actualSpeaker === "assistant" ? "ai" : null}
                  aiStatus={
                    callStatus === CALL_STATUS.LOADING ? "THINKING..." :
                    actualSpeaker === "assistant" ? "SPEAKING" :
                    currentAssistant ? "READY" : "INACTIVE"
                  }
                  audioLevel={audioLevel}
                  className="w-full h-full"
                />
              </div>
            </div>
            <div className="text-center mt-1">
              <div className="text-sm font-mono text-neutral-400">
                {callStatus === CALL_STATUS.LOADING && "CONNECTING TO AI"}
                {callStatus === CALL_STATUS.ACTIVE && actualSpeaker === "user" && "USER SPEAKING"}
                {callStatus === CALL_STATUS.ACTIVE && actualSpeaker === "assistant" && "AI SPEAKING"}
                {callStatus === CALL_STATUS.ACTIVE && !actualSpeaker && isUserPhase && "YOUR TURN"}
                {callStatus === CALL_STATUS.ACTIVE && !actualSpeaker && isAIPhase && !isAIWaiting && "AI TURN"}
                {callStatus === CALL_STATUS.ACTIVE && !actualSpeaker && isAIWaiting && `${aiName.toUpperCase()} WAITING - SPEAK FIRST OR PASS MIC`}
                {callStatus === CALL_STATUS.INACTIVE && "STANDBY"}
              </div>
            </div>
          </div>

          {/* Right Panel - AI */}
          <div
            className={`bg-black border-2 p-4 rounded-none transition-all ${
              actualSpeaker === "assistant"
                ? "border-orange-500"
                : isAIPhase && !isSpeechActive && callStatus === CALL_STATUS.ACTIVE
                  ? "border-yellow-500 shadow-lg shadow-yellow-500/20"
                  : "border-neutral-700"
            } ${showHint ? "" : "h-fit"}`}
          >
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <Bot className="w-5 h-5" />
                <h3 className="text-lg font-bold font-mono">{aiName}</h3>
                {isAIPhase && !isSpeechActive && callStatus === CALL_STATUS.ACTIVE && (
                  <div className="flex items-center space-x-1 ml-2">
                    <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
                    <span className="text-xs text-yellow-400 font-mono">NEXT</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-neutral-400 font-mono">{aiStance}</p>
              <div
                className={`px-3 py-2 rounded-none border text-sm font-medium transition-all font-mono ${
                  callStatus === CALL_STATUS.LOADING
                    ? "bg-yellow-600 text-white border-yellow-500"
                    : !isUserPhase && isSpeechActive
                      ? "bg-orange-600 text-white border-orange-500"
                      : isAIWaiting
                        ? "bg-blue-600 text-white border-blue-500 animate-pulse"
                        : isAITurn
                          ? "bg-yellow-600 text-white border-yellow-500"
                          : callStatus === CALL_STATUS.ACTIVE
                            ? "bg-neutral-800 text-neutral-300 border-neutral-600"
                            : "bg-neutral-700 text-neutral-400 border-neutral-600"
                }`}
              >
                {callStatus === CALL_STATUS.LOADING ? "CONNECTING" :
                 actualSpeaker === "assistant" ? "SPEAKING" :
                 isAIWaiting ? "WAITING" :
                 isAIPhase && callStatus === CALL_STATUS.ACTIVE ? "PREPARING" :
                 callStatus === CALL_STATUS.ACTIVE ? "LISTENING" : "STANDBY"}
              </div>
              <Button
                onClick={toggleHint}
                className={`w-full rounded-none border border-neutral-600 text-sm font-mono transition-all ${
                  showHint
                    ? "bg-white text-black hover:bg-neutral-200"
                    : "bg-neutral-800 text-white hover:bg-neutral-700"
                }`}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                HINT
              </Button>

              {showHint && (
                <div className="mt-3 p-3 bg-neutral-900 border border-neutral-600 text-left text-xs rounded-none">
                  <p className="text-neutral-300 leading-relaxed">{currentHint}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="bg-black p-4 rounded-none">
          <div ref={transcriptRef} className="h-48 overflow-y-auto font-mono text-sm transcript-area">
            {/* Show final transcript messages */}
            {transcriptHistory.map((item, index) => {
              const isUser = item.message.role === 'user'
              const isAI = item.message.role === 'assistant'
              return (
                <div
                  key={index}
                  className={`mb-2 ${
                    isUser ? "text-blue-300 text-right" : isAI ? "text-orange-300 text-left" : "text-neutral-300"
                  }`}
                >
                                     <span className="text-green-400">[{formatTimestamp(item.message.timestamp)}]</span>{' '}
                   <span className="text-white">
                     {item.message.role.toUpperCase()}: {item.message.transcript}
                   </span>
                </div>
              )
            })}
            
            {/* Show active (partial) transcript with debouncing */}
            {activeTranscript && activeTranscript.transcript.length > 3 && (
              <div className="opacity-75 mb-2 transition-opacity duration-200">
                <span className="text-green-400">[LIVE]</span>{' '}
                <span className={`${activeTranscript.role === 'user' ? 'text-blue-200' : 'text-orange-200'}`}>
                  {activeTranscript.role.toUpperCase()}: {activeTranscript.transcript}
                </span>
              </div>
            )}

            {messages.length === 0 && !activeTranscript && (
              <div className="text-neutral-500">Real-time transcript will appear here...</div>
            )}
          </div>
        </div>

        {/* Phase Progress */}
        <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-none">
          <h3 className="font-semibold mb-3">Debate Progress</h3>
          <div className="flex space-x-2 overflow-x-auto">
            {DEBATE_PHASES.map((phase, index) => (
              <div
                key={index}
                className={`flex-shrink-0 px-4 py-2 border rounded-none text-sm font-medium transition-all group relative font-mono ${
                  index === currentPhase
                    ? "bg-white text-black border-white"
                    : index < currentPhase
                      ? "bg-neutral-700 text-neutral-300 border-neutral-600"
                      : "bg-neutral-800 text-neutral-400 border-neutral-600"
                }`}
              >
                {phase.code}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-black border border-neutral-600 p-2 rounded-none min-w-48 z-10">
                  <p className="font-semibold text-white text-xs">{phase.name}</p>
                  <p className="text-xs text-neutral-400">{formatTime(phase.duration)} limit</p>
                  <p className="text-xs text-blue-400">Speaker: {phase.speaker}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NotesModal isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} />
    </div>
  )
}
