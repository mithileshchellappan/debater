"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Clock, Info, RotateCcw, MicOff, FileText, User, Bot, Hand, CheckCircle, AlertTriangle, X, PhoneCall, PhoneOff, Mic } from "lucide-react"
import MiniVoiceVisualizer from "@/components/mini-voice-visualizer"
import NotesModal from "@/components/notes-modal"
import { usePanelDebateVapi, CALL_STATUS, type RaisedHand } from "@/hooks/usePanelDebateVapi"
import { PANEL_PHASES, type PanelContext } from "@/lib/assistants/panel-debate-assistants"
import { MessageTypeEnum, TranscriptMessageTypeEnum, TranscriptMessage } from "@/lib/types/conversation.type"

export default function PanelDebatePage() {
  const [resolution, setResolution] = useState("")
  const [userStance, setUserStance] = useState("")
  const [moderatorStyle, setModeratorStyle] = useState("")
  const [aiPanelists, setAiPanelists] = useState<any[]>([])
  const [timer, setTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [showEndWarning, setShowEndWarning] = useState(false)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // VAPI Hook Integration
  const {
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
    nextPhase: nextDebatePhase,
    transferToModerator,
    transferToPanelist,
    transferToUser,
    acknowledgeQuestion,
    dismissQuestion,
    sendMessage,
    error
  } = usePanelDebateVapi()

  // Load panel configuration from localStorage
  useEffect(() => {
    const storedResolution = localStorage.getItem("panelResolution")
    const storedUserStance = localStorage.getItem("panelUserStance")
    const storedModeratorStyle = localStorage.getItem("panelModeratorStyle")
    const storedAIPanelists = localStorage.getItem("panelAIPanelists")

    if (storedResolution) setResolution(storedResolution)
    if (storedUserStance) setUserStance(storedUserStance)
    if (storedModeratorStyle) setModeratorStyle(storedModeratorStyle)
    if (storedAIPanelists) {
      setAiPanelists(JSON.parse(storedAIPanelists))
    }
  }, [])

  // Timer management
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning && callStatus === CALL_STATUS.ACTIVE) {
      interval = setInterval(() => {
        setTimer((timer) => timer + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, callStatus])

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [messages, activeTranscript])

  // Debug currentSpeaker changes
  useEffect(() => {
    console.log("🎯 UI currentSpeaker changed to:", currentSpeaker);
    console.log("👥 Squad members:", squadMembers);
  }, [currentSpeaker, squadMembers])

  // Start timer when call becomes active
  useEffect(() => {
    if (callStatus === CALL_STATUS.ACTIVE && !isTimerRunning) {
      setIsTimerRunning(true)
    } else if (callStatus === CALL_STATUS.INACTIVE) {
      setIsTimerRunning(false)
    }
  }, [callStatus, isTimerRunning])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleStartDebate = async () => {
    if (!resolution || !userStance || !moderatorStyle || aiPanelists.length === 0) {
      console.error("Missing panel configuration")
      return
    }

    const context: PanelContext = {
      resolution,
      userStance,
      moderatorStyle: moderatorStyle as "neutral" | "probing" | "strict",
      aiPanelists,
      currentPhase: "INTRO" as keyof typeof PANEL_PHASES
    }

    await startPanelDebate(context)
  }

  const handleStopDebate = () => {
    stopPanelDebate()
    setTimer(0)
    setIsTimerRunning(false)
  }

  const toggleMicrophone = () => {
    if (callStatus !== CALL_STATUS.ACTIVE) return

    if (currentSpeaker === "user" || isUserTurn) {
      // User is currently speaking or it's their turn
      sendMessage("The user would like to yield the floor back to the moderator.", "system")
    } else {
     requestToSpeak()
    }
  }

  const requestToSpeak = () => {
    if (callStatus === CALL_STATUS.ACTIVE) {
      if(currentSpeaker !== "moderator") {
        sendMessage("The user would like to request the floor to speak. Acknowledge the request and then trigger the 'transferCall' tool to Moderator", "system")
      }
      else {
        sendMessage("The user would like to request the floor to speak. Acknowledge the request and then trigger the 'transferToUser' tool", "system")
      }
    }
  }

  const nextPhase = () => {
    nextDebatePhase()
  }

  const resetDebate = () => {
    handleStopDebate()
    setTimer(0)
  }

  const handleEndDebate = () => {
    const debateTranscript = messages
      .filter(msg => msg.type === MessageTypeEnum.TRANSCRIPT && msg.transcriptType === TranscriptMessageTypeEnum.FINAL)
      .map((msg, index) => {
        const transcriptMsg = msg as TranscriptMessage
        const timestamp = transcriptMsg.timestamp ? new Date(transcriptMsg.timestamp).toLocaleTimeString() : formatTime(timer)
        return `[${timestamp}] ${transcriptMsg.role.toUpperCase()}: ${transcriptMsg.transcript}`
      })
      .join('\n')

    const debateData = {
      type: "panel",
      resolution,
      userStance,
      moderatorStyle,
      aiPanelists,
      transcript: debateTranscript,
      duration: timer,
      phases: Object.keys(PANEL_PHASES).indexOf(currentPhase) + 1,
      squadMembers,
      totalMessages: messages.length
    }
    
    localStorage.setItem("lastDebateData", JSON.stringify(debateData))
    handleStopDebate()
    router.push("/panel-analysis")
  }

  const getModeratorStyleName = () => {
    const styles: { [key: string]: string } = {
      neutral: "Neutral & Fair",
      probing: "Inquisitive & Probing",
      strict: "Strict on Time",
    }
    return styles[moderatorStyle] || "Moderator"
  }

  const getCurrentSpeakerDisplay = () => {
    if (!currentSpeaker) return null
    
    const member = squadMembers.find(m => m.assistantId === currentSpeaker)
    if (member) {
      return member.role === "moderator" 
        ? "MODERATOR SPEAKING"
        : member.role === "user"
        ? "YOU SPEAKING"
        : `${member.name.toUpperCase()} SPEAKING`
    }
    
    return "SPEAKING"
  }

  // Enhanced transcript handling with proper timestamps and speaker tracking
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{
    message: TranscriptMessage;
    receivedAt: number; // timestamp when message was received
    speakerAtTime: string | null; // who was the current speaker when this message was received
  }>>([]);
  
  // Track debate start time for accurate timestamp calculation
  const [debateStartTime, setDebateStartTime] = useState<number | null>(null);

  // Function to get specific speaker name for transcript display
  const getSpeakerDisplayName = useCallback((role: string, speakerAtTime?: string | null) => {
    if (role === 'user') {
      return 'YOU';
    }
    
    if (role === 'assistant') {
      // Use the speaker that was active when this message was recorded
      const speakerToCheck = speakerAtTime || currentSpeaker;
      
      if (speakerToCheck === 'moderator') {
        return 'MODERATOR';
      } else if (speakerToCheck?.startsWith('panelist_')) {
        const panelistIndex = parseInt(speakerToCheck.split('_')[1]);
        const panelist = aiPanelists[panelistIndex];
        return panelist?.name?.toUpperCase() || `PANELIST ${panelistIndex + 1}`;
      }
      return 'ASSISTANT'; // fallback
    }
    
    return role.toUpperCase();
  }, [currentSpeaker, aiPanelists]);

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
          return [...prev, { 
            message: msg, 
            receivedAt: messageTime, 
            speakerAtTime: currentSpeaker 
          }];
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

  // Format timestamp from VAPI message or elapsed debate time (matching debate page)
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

  const isCallActive = callStatus === CALL_STATUS.ACTIVE
  const isCallLoading = callStatus === CALL_STATUS.LOADING || callStatus === CALL_STATUS.CONNECTING

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-none">
            <p className="text-sm text-neutral-400 mb-2">Resolution:</p>
            <p className="font-medium text-white">{resolution}</p>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-900 border border-red-500 p-4 rounded-none">
              <p className="text-red-200">Error: {error}</p>
            </div>
          )}
          
          {/* Debug Display - Remove this after testing */}
          {/* {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-900 border border-yellow-500 p-2 rounded-none text-xs">
              <p className="text-yellow-200">Debug: currentSpeaker = {currentSpeaker || "null"}</p>
              <p className="text-yellow-200">Debug: isUserTurn = {isUserTurn ? "true" : "false"}</p>
              <p className="text-yellow-200">Debug: isSpeechActive = {isSpeechActive ? "true" : "false"}</p>
              <p className="text-yellow-200">Speaking Flow: {isSpeechActive ? "AI SPEAKING" : isUserTurn ? "USER CAN SPEAK" : "WAITING FOR NEXT SPEAKER"}</p>
            </div>
          )} */}
        </div>

        {/* Controls Bar */}
        <div className="flex justify-between items-center bg-neutral-900 border border-neutral-700 p-4 rounded-none">
          <div className="flex items-center space-x-6">
            {/* Timer */}
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <div className="text-center">
                <div className="text-2xl font-mono">{formatTime(timer)}</div>
                <div className="text-xs font-mono text-neutral-400">DEBATE TIME</div>
              </div>
            </div>

            {/* Current Phase */}
            <div className="flex items-center space-x-2 group relative">
              <span className="font-semibold text-lg font-mono">
                {PANEL_PHASES[currentPhase]?.name || currentPhase}
              </span>
              <Info className="w-4 h-4 cursor-help" />
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-black border border-neutral-600 p-3 rounded-none min-w-64 z-10">
                <p className="font-semibold text-white">{PANEL_PHASES[currentPhase]?.name}</p>
                <p className="text-sm text-neutral-400">{PANEL_PHASES[currentPhase]?.description}</p>
              </div>
            </div>

            {/* Call Status */}
            <div className="flex items-center space-x-2">
              {isCallLoading && (
                <div className="flex items-center space-x-2 bg-yellow-600 text-white px-3 py-1 rounded-none">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium font-mono">CONNECTING...</span>
                </div>
              )}
              
              {isCallActive && currentSpeaker && (
                <div className="flex items-center space-x-2 bg-white text-black px-3 py-1 rounded-none">
                  <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium font-mono">{getCurrentSpeakerDisplay()}</span>
                </div>
              )}

              {/* {isCallActive && (currentSpeaker === "user" || isUserTurn) && (
                <div className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-none animate-pulse">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium font-mono">YOUR TURN TO SPEAK</span>
                </div>
              )} */}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isCallActive ? (
              <Button
                onClick={handleStartDebate}
                disabled={isCallLoading || !resolution || !userStance || !moderatorStyle || aiPanelists.length === 0}
                className="bg-green-600 text-white hover:bg-green-700 rounded-none border border-green-500 font-mono"
              >
                <PhoneCall className="w-4 h-4 mr-2" />
                {isCallLoading ? "CONNECTING..." : "START DEBATE"}
              </Button>
            ) : (
              <>
                <Button
                  onClick={nextPhase}
                  className="bg-neutral-800 text-white hover:bg-neutral-700 rounded-none border border-neutral-600 font-mono"
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
                  onClick={() => setShowEndWarning(true)}
                  className="bg-red-600 text-white hover:bg-red-700 rounded-none border border-red-500 font-mono"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  END DEBATE
                </Button>
              </>
            )}
          </div>
        </div>

        {/* End Debate Warning Modal */}
        {showEndWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-red-500 rounded-none w-full max-w-md">
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <h3 className="text-lg font-semibold text-white">End Panel Debate?</h3>
                </div>
                <p className="text-neutral-300">
                  Are you sure you want to end this panel debate? You'll be taken to the analysis screen to review your
                  performance and the discussion.
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

        {/* Moderator Display */}
        <div
          className={`bg-neutral-900 border-2 p-4 rounded-none transition-all ${
            currentSpeaker === "moderator" ? "border-purple-500 shadow-lg shadow-purple-500/20" : "border-neutral-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bot className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="text-lg font-bold font-mono">MODERATOR</h3>
                <p className="text-xs text-neutral-400">{getModeratorStyleName()}</p>
              </div>
              {currentSpeaker === "moderator" && (
                <div className="flex items-center space-x-1 ml-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                  <span className="text-xs text-purple-400 font-mono">SPEAKING</span>
                </div>
              )}
            </div>
            <div className="flex-1 mx-6">
              <div
                className={`border p-3 rounded-none transition-all ${
                  currentSpeaker === "moderator" ? "bg-purple-900 border-purple-500" : "bg-black border-neutral-600"
                }`}
              >
                <p className="text-sm text-neutral-300 font-mono">
                  {isCallActive 
                    ? `Managing ${PANEL_PHASES[currentPhase]?.name || currentPhase} phase...`
                    : "Ready to moderate panel debate"
                  }
                </p>
              </div>
            </div>
            <div className="w-16 h-8">
              <MiniVoiceVisualizer 
                isActive={currentSpeaker === "moderator" && isSpeechActive} 
                color="purple" 
                className="w-full h-full" 
              />
            </div>
          </div>
        </div>

        {/* Raised Hands Display */}
        {raisedHands.length > 0 && (
          <div className="bg-yellow-900 border border-yellow-500 p-4 rounded-none">
            <h3 className="text-yellow-200 font-bold mb-2 font-mono">🙋‍♂️ RAISED HANDS</h3>
            <div className="space-y-2">
              {raisedHands.map((hand, index) => (
                <div key={index} className="flex items-center justify-between bg-yellow-800 p-3 rounded-none">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-yellow-100">{hand.panelistName}</span>
                      <span className="text-xs bg-yellow-700 px-2 py-1 rounded text-yellow-200">
                        {hand.questionType}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        hand.urgency === "high" ? "bg-red-600 text-white" :
                        hand.urgency === "medium" ? "bg-orange-600 text-white" :
                        "bg-green-600 text-white"
                      }`}>
                        {hand.urgency}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-200 mt-1">{hand.preview}</p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button
                      onClick={() => acknowledgeQuestion(index)}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-none text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      ACKNOWLEDGE
                    </Button>
                    <Button
                      onClick={() => dismissQuestion(index)}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-none text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      DISMISS
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panelists Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* User Panelist */}
          <div
            className={`bg-black border-2 p-4 rounded-none transition-all ${
              currentSpeaker === "user"
                ? "border-blue-500 shadow-lg shadow-blue-500/20"
                : isUserTurn
                  ? "border-green-500 shadow-lg shadow-green-500/20"
                  : "border-neutral-700"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold font-mono">YOU</h3>
                    <p className="text-xs text-neutral-400">PANELIST</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {currentSpeaker === "user" ? (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      <span className="text-xs text-blue-400 font-mono">SPEAKING</span>
                    </div>
                  ) : (currentSpeaker === "user" || isUserTurn) && (
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="w-4 h-4 text-green-400 animate-pulse" />
                      <span className="text-xs text-green-400 font-mono">YOUR TURN</span>
                    </div>
                  )}
                  <div className="w-12 h-6">
                    <MiniVoiceVisualizer 
                      isActive={currentSpeaker === "user"} 
                      color="blue" 
                      className="w-full h-full" 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 p-2 border border-neutral-600 rounded-none">
                <p className="text-xs text-neutral-300">{userStance}</p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={toggleMicrophone}
                  disabled={!isCallActive}
                  className={`w-full rounded-none border-2 transition-all text-xs font-mono ${
                    currentSpeaker === "user"
                      ? "bg-red-600 text-white border-red-500 animate-pulse"
                      : (currentSpeaker === "user" || isUserTurn)
                        ? "bg-green-600 text-white border-green-500 hover:bg-green-700 hover:border-green-600 animate-pulse"
                        : isCallActive
                          ? "bg-neutral-800 text-white border-neutral-600 hover:bg-blue-600 hover:border-blue-500"
                          : "bg-neutral-700 text-neutral-500 border-neutral-600 cursor-not-allowed"
                  }`}
                >
                  {currentSpeaker === "user" ? (
                    <>
                      <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                      SPEAKING
                    </>
                  ) : (currentSpeaker === "user" || isUserTurn) ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-2" />
                      SPEAK NOW
                    </>
                  ) : (
                    <>
                      <MicOff className="w-3 h-3 mr-2" />
                      {isCallActive ? "REQUEST SPEAK" : "SPEAK"}
                    </>
                  )}
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setIsNotesOpen(true)}
                    className="bg-neutral-800 text-white hover:bg-neutral-700 rounded-none border border-neutral-600 text-xs font-mono"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    NOTES
                  </Button>
                  <Button
                    onClick={requestToSpeak}
                    disabled={!isCallActive || currentSpeaker === "user" || isUserTurn}
                    className={`rounded-none border border-neutral-600 text-xs font-mono transition-all ${
                      !isCallActive || currentSpeaker === "user" || (currentSpeaker === "user" || isUserTurn)
                        ? "bg-neutral-700 text-neutral-500 border-neutral-600 cursor-not-allowed"
                        : "bg-neutral-800 text-white hover:bg-neutral-700"
                    }`}
                  >
                    <Hand className="w-3 h-3 mr-1" />
                    {(currentSpeaker === "user" || isUserTurn) ? "READY" : "REQUEST"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {/* AI Panelists */}
          {aiPanelists.map((panelist, index) => {
            const panelistId = `panelist_${index}`
            const isCurrentSpeaker = currentSpeaker === panelistId && currentSpeaker !== "user"
            const squadMember = squadMembers.find(m => m.assistantId === panelistId)
            
            return (
              <div
                key={index}
                className={`bg-black border-2 p-4 rounded-none transition-all ${
                  isCurrentSpeaker
                    ? "border-orange-500"
                    : "border-neutral-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-5 h-5 text-orange-400" />
                      <div>
                        <h3 className="text-sm font-bold font-mono">{panelist.name.toUpperCase()}</h3>
                        <p className="text-xs text-neutral-400">AI PANELIST</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isCurrentSpeaker && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                          <span className="text-xs text-orange-400 font-mono">SPEAKING</span>
                        </div>
                      )}
                      <div className="w-12 h-6">
                        <MiniVoiceVisualizer
                          isActive={isCurrentSpeaker && isSpeechActive}
                          color="orange"
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-900 p-2 border border-neutral-600 rounded-none">
                    <p className="text-xs text-neutral-300">
                      {panelist.archetype !== "custom"
                        ? panelist.archetype.charAt(0).toUpperCase() +
                          panelist.archetype.slice(1).replace(/([A-Z])/g, " $1")
                        : panelist.customStance}
                    </p>
                  </div>

                  <div
                    className={`px-3 py-2 rounded-none border text-xs font-medium transition-all font-mono ${
                      isCurrentSpeaker
                        ? "bg-orange-600 text-white border-orange-500"
                        : squadMember?.isActive
                          ? "bg-green-600 text-white border-green-500"
                          : "bg-neutral-800 text-neutral-300 border-neutral-600"
                    }`}
                  >
                    {isCurrentSpeaker
                      ? "Speaking"
                      : squadMember?.isActive
                        ? "Active"
                        : "Listening"}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Transcript */}
        <div className="bg-black p-4 rounded-none">
          <div ref={transcriptRef} className="h-48 overflow-y-auto font-mono text-sm transcript-area">
            {/* Show final transcript messages */}
            {transcriptHistory.map((item, index) => {
              const isUser = item.message.role === 'user'
              const isAI = item.message.role === 'assistant'
              const speakerName = getSpeakerDisplayName(item.message.role, item.speakerAtTime)
              const isModerator = speakerName === 'MODERATOR'
              const isPanelist = speakerName.includes('PANELIST') || (speakerName !== 'MODERATOR' && speakerName !== 'YOU' && speakerName !== 'ASSISTANT')
              
              return (
                <div
                  key={index}
                  className={`mb-2 ${
                    isUser 
                      ? "text-blue-300 text-right" 
                      : isModerator 
                        ? "text-purple-300 text-left"
                        : isPanelist
                          ? "text-orange-300 text-left"
                          : "text-neutral-300 text-left"
                  }`}
                >
                  <span className="text-green-400">[{formatTimestamp(item.message.timestamp)}]</span>{' '}
                  <span className="text-white">
                    {speakerName}: {item.message.transcript}
                  </span>
                </div>
              )
            })}
            
            {/* Show active (partial) transcript with debouncing */}
            {activeTranscript && activeTranscript.transcript.length > 3 && (
              <div className="opacity-75 mb-2 transition-opacity duration-200">
                <span className="text-green-400">[LIVE]</span>{' '}
                <span className={`${
                  activeTranscript.role === 'user' 
                    ? 'text-blue-200' 
                    : getSpeakerDisplayName(activeTranscript.role) === 'MODERATOR'
                      ? 'text-purple-200'
                      : 'text-orange-200'
                }`}>
                  {getSpeakerDisplayName(activeTranscript.role)}: {activeTranscript.transcript}
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
            {Object.entries(PANEL_PHASES).map(([phaseKey, phase], index) => (
              <div
                key={phaseKey}
                className={`flex-shrink-0 px-4 py-2 border rounded-none text-sm font-medium transition-all group relative font-mono ${
                  phaseKey === currentPhase
                    ? "bg-white text-black border-white"
                    : Object.keys(PANEL_PHASES).indexOf(currentPhase) > index
                      ? "bg-neutral-700 text-neutral-300 border-neutral-600"
                      : "bg-neutral-800 text-neutral-400 border-neutral-600"
                }`}
              >
                {phaseKey}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-black border border-neutral-600 p-2 rounded-none min-w-48 z-10">
                  <p className="font-semibold text-white text-xs">{phase.name}</p>
                  <p className="text-xs text-neutral-400">{phase.description}</p>
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
