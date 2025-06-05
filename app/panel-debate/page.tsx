"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Clock, Info, RotateCcw, MicOff, FileText, User, Bot, Hand, CheckCircle, AlertTriangle, X } from "lucide-react"
import MiniVoiceVisualizer from "@/components/mini-voice-visualizer"
import NotesModal from "@/components/notes-modal"

const PANEL_PHASES = [
  { code: "INTRO", name: "Introductions", description: "Moderator introduces the topic and panelists" },
  { code: "OPEN", name: "Opening Statements", description: "Each panelist presents their initial position" },
  { code: "DISC1", name: "Moderated Discussion 1", description: "First round of moderated discussion" },
  { code: "QA", name: "Cross-Examination", description: "Panelists question each other's positions" },
  { code: "DISC2", name: "Moderated Discussion 2", description: "Second round of discussion" },
  { code: "CLOSE", name: "Closing Statements", description: "Final statements from each panelist" },
  { code: "WRAP", name: "Wrap-up", description: "Moderator summarizes and concludes" },
]

export default function PanelDebatePage() {
  const [resolution, setResolution] = useState("")
  const [userStance, setUserStance] = useState("")
  const [moderatorStyle, setModeratorStyle] = useState("")
  const [aiPanelists, setAiPanelists] = useState<any[]>([])
  const [currentPhase, setCurrentPhase] = useState(0)
  const [timer, setTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null)
  const [transcript, setTranscript] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [moderatorAction, setModeratorAction] = useState("Introducing the debate topic and panelists...")
  const [speakRequested, setSpeakRequested] = useState(false)
  const [panelistStatuses, setPanelistStatuses] = useState<{ [key: string]: string }>({})
  const [isUserTurn, setIsUserTurn] = useState(false)
  const [nextSpeaker, setNextSpeaker] = useState<string | null>(null)
  const [showEndWarning, setShowEndWarning] = useState(false)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const storedResolution = localStorage.getItem("panelResolution")
    const storedUserStance = localStorage.getItem("panelUserStance")
    const storedModeratorStyle = localStorage.getItem("panelModeratorStyle")
    const storedAIPanelists = localStorage.getItem("panelAIPanelists")

    if (storedResolution) setResolution(storedResolution)
    if (storedUserStance) setUserStance(storedUserStance)
    if (storedModeratorStyle) setModeratorStyle(storedModeratorStyle)
    if (storedAIPanelists) {
      const panelists = JSON.parse(storedAIPanelists)
      setAiPanelists(panelists)

      // Initialize panelist statuses
      const statuses: { [key: string]: string } = {}
      panelists.forEach((p: any, index: number) => {
        statuses[`ai-${index}`] = "Listening"
      })
      setPanelistStatuses(statuses)
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((timer) => timer + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcript])

  // Simulate turn management with moderator speaking phases
  useEffect(() => {
    // Simulate moderator deciding turns
    const turnInterval = setInterval(() => {
      if (!currentSpeaker && !isListening) {
        const shouldModeratorSpeak = Math.random() > 0.7 // 30% chance moderator speaks

        if (shouldModeratorSpeak) {
          setCurrentSpeaker("moderator")
          setNextSpeaker(null)
          setIsUserTurn(false)
          setModeratorAction("Providing guidance and managing the discussion...")
          const timestamp = formatTime(timer)
          setTranscript((prev) => prev + `\n[${timestamp}] MODERATOR: Managing the discussion flow...`)

          // Moderator finishes speaking
          setTimeout(() => {
            setCurrentSpeaker(null)
            setModeratorAction("Deciding who speaks next...")
          }, 3000)

          return // Exit early when moderator is speaking
        }

        const shouldBeUserTurn = Math.random() > 0.6 // 40% chance it's user's turn
        setIsUserTurn(shouldBeUserTurn)

        if (shouldBeUserTurn) {
          setNextSpeaker("user")
          setModeratorAction("You have the floor. Please share your thoughts...")
        } else {
          // Pick a random AI panelist
          const randomPanelist = Math.floor(Math.random() * aiPanelists.length)
          setNextSpeaker(`ai-${randomPanelist}`)
          setModeratorAction(`${aiPanelists[randomPanelist]?.name}, please share your perspective...`)

          // Simulate AI starting to speak after a delay
          setTimeout(() => {
            if (nextSpeaker === `ai-${randomPanelist}`) {
              setCurrentSpeaker(`ai-${randomPanelist}`)
              setNextSpeaker(null)
              setIsUserTurn(false)
              setPanelistStatuses((prev) => ({
                ...prev,
                [`ai-${randomPanelist}`]: "Speaking",
              }))
              const timestamp = formatTime(timer)
              setTranscript(
                (prev) =>
                  prev + `\n[${timestamp}] ${aiPanelists[randomPanelist]?.name.toUpperCase()}: Making a point...`,
              )
              setModeratorAction(`${aiPanelists[randomPanelist]?.name} is speaking...`)

              // AI finishes speaking
              setTimeout(() => {
                setCurrentSpeaker(null)
                setPanelistStatuses((prev) => ({
                  ...prev,
                  [`ai-${randomPanelist}`]: "Listening",
                }))
                setModeratorAction("Moderating the discussion...")
              }, 4000)
            }
          }, 2000)
        }
      }
    }, 8000) // Check every 8 seconds

    return () => clearInterval(turnInterval)
  }, [currentSpeaker, isListening, aiPanelists, nextSpeaker, timer])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const toggleMicrophone = () => {
    setIsListening(!isListening)
    setCurrentSpeaker(isListening ? null : "user")

    if (!isListening) {
      const timestamp = formatTime(timer)
      setTranscript((prev) => prev + `\n[${timestamp}] YOU: Speaking...`)
      setIsTimerRunning(true)
      setModeratorAction("Listening to your statement...")
      setIsUserTurn(false) // Clear user turn when they start speaking
      setNextSpeaker(null)
    } else {
      setIsTimerRunning(false)
      setModeratorAction("Considering responses...")
      setTimeout(() => {
        // Simulate AI panelist response
        const randomPanelist = Math.floor(Math.random() * aiPanelists.length)
        setCurrentSpeaker(`ai-${randomPanelist}`)
        setPanelistStatuses((prev) => ({
          ...prev,
          [`ai-${randomPanelist}`]: "Speaking",
        }))
        const timestamp = formatTime(timer)
        setTranscript(
          (prev) =>
            prev + `\n[${timestamp}] ${aiPanelists[randomPanelist]?.name.toUpperCase()}: Responding to your point...`,
        )
        setModeratorAction(`${aiPanelists[randomPanelist]?.name} is responding...`)

        setTimeout(() => {
          setCurrentSpeaker(null)
          setPanelistStatuses((prev) => ({
            ...prev,
            [`ai-${randomPanelist}`]: "Listening",
          }))
          setModeratorAction("Moderating the discussion...")
        }, 3000)
      }, 1000)
    }
  }

  const requestToSpeak = () => {
    setSpeakRequested(true)
    setModeratorAction("Request received. You'll be called on shortly...")
    setTimeout(() => {
      setSpeakRequested(false)
      setIsUserTurn(true)
      setNextSpeaker("user")
      setModeratorAction("You have the floor. Please proceed...")
    }, 2000)
  }

  const nextPhase = () => {
    if (currentPhase < PANEL_PHASES.length - 1) {
      setCurrentPhase(currentPhase + 1)
      setTimer(0)
      setIsTimerRunning(false)
      setCurrentSpeaker(null)
      setIsListening(false)
      setSpeakRequested(false)
      setIsUserTurn(false)
      setNextSpeaker(null)
      setModeratorAction(`Beginning ${PANEL_PHASES[currentPhase + 1].name}...`)
    }
  }

  const resetDebate = () => {
    setCurrentPhase(0)
    setTimer(0)
    setIsTimerRunning(false)
    setCurrentSpeaker(null)
    setIsListening(false)
    setTranscript("")
    setSpeakRequested(false)
    setIsUserTurn(false)
    setNextSpeaker(null)
    setModeratorAction("Introducing the debate topic and panelists...")
    setPanelistStatuses((prev) => {
      const reset: { [key: string]: string } = {}
      Object.keys(prev).forEach((key) => {
        reset[key] = "Listening"
      })
      return reset
    })
  }

  const handleEndDebate = () => {
    // Store debate data for analysis
    const debateData = {
      type: "panel",
      resolution,
      userStance,
      moderatorStyle,
      aiPanelists,
      transcript,
      duration: timer,
      phases: currentPhase + 1,
    }
    localStorage.setItem("lastDebateData", JSON.stringify(debateData))
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

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Panel Debate</h1>
          <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-none">
            <p className="text-sm text-neutral-400 mb-2">Resolution:</p>
            <p className="font-medium text-white">{resolution}</p>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex justify-between items-center bg-neutral-900 border border-neutral-700 p-4 rounded-none">
          <div className="flex items-center space-x-6">
            {/* Timer */}
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <div className="text-center">
                <div className="text-2xl font-mono">{formatTime(timer)}</div>
                <div className="text-xs font-mono text-neutral-400">SEGMENT TIME</div>
              </div>
            </div>

            {/* Current Phase */}
            <div className="flex items-center space-x-2 group relative">
              <span className="font-semibold text-lg font-mono">{PANEL_PHASES[currentPhase].code}</span>
              <Info className="w-4 h-4 cursor-help" />
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-black border border-neutral-600 p-3 rounded-none min-w-64 z-10">
                <p className="font-semibold text-white">{PANEL_PHASES[currentPhase].name}</p>
                <p className="text-sm text-neutral-400">{PANEL_PHASES[currentPhase].description}</p>
              </div>
            </div>

            {/* Active Speaker Indicator */}
            {currentSpeaker && (
              <div className="flex items-center space-x-2 bg-white text-black px-3 py-1 rounded-none">
                <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                <span className="text-sm font-medium font-mono">
                  {currentSpeaker === "user"
                    ? "YOU SPEAKING"
                    : currentSpeaker === "moderator"
                      ? "MODERATOR SPEAKING"
                      : `${aiPanelists[Number.parseInt(currentSpeaker.split("-")[1])]?.name.toUpperCase()} SPEAKING`}
                </span>
              </div>
            )}

            {/* User Turn Indicator */}
            {isUserTurn && !currentSpeaker && (
              <div className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-none animate-pulse">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium font-mono">YOUR TURN TO SPEAK</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="bg-neutral-800 text-white hover:bg-neutral-700 rounded-none border border-neutral-600 font-mono"
            >
              {isTimerRunning ? "PAUSE" : "START"}
            </Button>
            <Button
              onClick={nextPhase}
              disabled={currentPhase >= PANEL_PHASES.length - 1}
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
              onClick={() => setShowEndWarning(true)}
              className="bg-red-600 text-white hover:bg-red-700 rounded-none border border-red-500 font-mono"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              END
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
                <p className="text-sm text-neutral-300 font-mono">{moderatorAction}</p>
              </div>
            </div>
            <div className="w-16 h-8">
              <MiniVoiceVisualizer isActive={currentSpeaker === "moderator"} color="purple" className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Panelists Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* User Panelist */}
          <div
            className={`bg-black border-2 p-4 rounded-none transition-all ${
              currentSpeaker === "user"
                ? "border-blue-500"
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
                  {isUserTurn && !currentSpeaker && (
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="w-4 h-4 text-green-400 animate-pulse" />
                      <span className="text-xs text-green-400 font-mono">YOUR TURN</span>
                    </div>
                  )}
                  <div className="w-12 h-6">
                    <MiniVoiceVisualizer isActive={currentSpeaker === "user"} color="blue" className="w-full h-full" />
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 p-2 border border-neutral-600 rounded-none">
                <p className="text-xs text-neutral-300">{userStance}</p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={toggleMicrophone}
                  className={`w-full rounded-none border-2 transition-all text-xs font-mono ${
                    isListening
                      ? "bg-red-600 text-white border-red-500 animate-pulse"
                      : isUserTurn
                        ? "bg-green-600 text-white border-green-500 hover:bg-green-700 hover:border-green-600 animate-pulse"
                        : "bg-neutral-800 text-white border-neutral-600 hover:bg-blue-600 hover:border-blue-500"
                  }`}
                >
                  {isListening ? (
                    <>
                      <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                      SPEAKING
                    </>
                  ) : isUserTurn ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-2" />
                      SPEAK NOW
                    </>
                  ) : (
                    <>
                      <MicOff className="w-3 h-3 mr-2" />
                      SPEAK
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
                    disabled={speakRequested || isListening || isUserTurn}
                    className={`rounded-none border border-neutral-600 text-xs font-mono transition-all ${
                      speakRequested
                        ? "bg-yellow-600 text-white border-yellow-500"
                        : isListening || isUserTurn
                          ? "bg-neutral-700 text-neutral-500 border-neutral-600 cursor-not-allowed"
                          : "bg-neutral-800 text-white hover:bg-neutral-700"
                    }`}
                  >
                    <Hand className="w-3 h-3 mr-1" />
                    {speakRequested ? "SENT" : isUserTurn ? "READY" : "REQUEST"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Panelists */}
          {aiPanelists.map((panelist, index) => (
            <div
              key={index}
              className={`bg-black border-2 p-4 rounded-none transition-all ${
                currentSpeaker === `ai-${index}`
                  ? "border-orange-500"
                  : nextSpeaker === `ai-${index}`
                    ? "border-yellow-500 shadow-lg shadow-yellow-500/20"
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
                    {nextSpeaker === `ai-${index}` && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
                        <span className="text-xs text-yellow-400 font-mono">NEXT</span>
                      </div>
                    )}
                    <div className="w-12 h-6">
                      <MiniVoiceVisualizer
                        isActive={currentSpeaker === `ai-${index}`}
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
                    currentSpeaker === `ai-${index}`
                      ? "bg-orange-600 text-white border-orange-500"
                      : nextSpeaker === `ai-${index}`
                        ? "bg-yellow-600 text-white border-yellow-500"
                        : "bg-neutral-800 text-neutral-300 border-neutral-600"
                  }`}
                >
                  {currentSpeaker === `ai-${index}`
                    ? "Speaking"
                    : nextSpeaker === `ai-${index}`
                      ? "Preparing"
                      : panelistStatuses[`ai-${index}`] || "Listening"}
                </div>

                {/* Add after the status div and before the closing space-y-3 div */}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  <div className="bg-neutral-900 p-2 border border-neutral-600 rounded-none text-center">
                    <div className="text-orange-400 font-bold">{Math.floor(Math.random() * 8) + 3}</div>
                    <div className="text-neutral-400">TURNS</div>
                  </div>
                  <div className="bg-neutral-900 p-2 border border-neutral-600 rounded-none text-center">
                    <div className="text-orange-400 font-bold">{Math.floor(Math.random() * 5) + 2}m</div>
                    <div className="text-neutral-400">TIME</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Transcript */}
        <div className="bg-black p-4 rounded-none">
          <div ref={transcriptRef} className="h-48 overflow-y-auto font-mono text-sm transcript-area">
            {transcript.split("\n").map((line, index) => {
              if (!line.trim()) return null
              const isUser = line.includes("YOU:")
              const isModerator = line.includes("MODERATOR:")
              const isAI = !isUser && !isModerator && line.includes(":")
              return (
                <div
                  key={index}
                  className={`mb-1 ${
                    isUser
                      ? "text-blue-300 text-right"
                      : isModerator
                        ? "text-purple-300 text-center"
                        : isAI
                          ? "text-orange-300 text-left"
                          : "text-neutral-300"
                  }`}
                >
                  {line}
                </div>
              )
            })}
            {!transcript && <div className="text-neutral-500">Transcript will appear here...</div>}
          </div>
        </div>

        {/* Phase Progress */}
        <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-none">
          <h3 className="font-semibold mb-3">Debate Progress</h3>
          <div className="flex space-x-2 overflow-x-auto">
            {PANEL_PHASES.map((phase, index) => (
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
