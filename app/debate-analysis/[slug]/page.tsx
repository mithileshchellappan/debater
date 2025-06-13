"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Trophy,
  Clock,
  MessageSquare,
  Target,
  AlertTriangle,
  Lightbulb,
  Scale,
  Shield,
  ShieldCheck,
  ShieldX,
  BarChart3,
  FileText,
  Home,
} from "lucide-react"

export default function DebateAnalysisPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [userNotes, setUserNotes] = useState("")
  const [analysisData, setAnalysisData] = useState<any>()
  const [transcript, setTranscript] = useState("")
  const router = useRouter()
  const params = useParams()
  const slug = params.slug
  useEffect(() => {
    const savedNotes = localStorage.getItem("debateAnalysisNotes")
    if (savedNotes) {
      setUserNotes(savedNotes)
    }
    async function fetchAnalysisData() {
      const callDetails = await fetch(`/api/analysis?callId=${slug}`)
      const data = await callDetails.json()
      if(data?.analysis?.structuredData) {
        setAnalysisData(data.analysis.structuredData)
      }
      if(data?.transcript) {
        setTranscript(data.transcript)
      }
    }
    fetchAnalysisData()
  }, [])

  useEffect(() => {
    localStorage.setItem("debateAnalysisNotes", userNotes)
  }, [userNotes])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "successfully-rebutted":
        return <ShieldX className="w-4 h-4 text-red-400" />
      case "partially-rebutted":
        return <Shield className="w-4 h-4 text-yellow-400" />
      case "unchallenged":
        return <ShieldCheck className="w-4 h-4 text-green-400" />
      default:
        return null
    }
  }

  const getEvidenceIcon = (evidence: string) => {
    switch (evidence) {
      case "strong":
        return <BarChart3 className="w-4 h-4 text-green-400" />
      case "adequate":
        return <BarChart3 className="w-4 h-4 text-yellow-400" />
      case "weak":
        return <BarChart3 className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Trophy className="w-5 h-5 mr-2" />
          Debate Summary
        </h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-neutral-400 mb-2">Resolution:</p>
            <p className="text-white font-medium">{analysisData.resolution}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-neutral-400 mb-2">Participants:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-black p-3 border border-neutral-600 rounded-none">
                  <span className="font-medium text-blue-400">
                    You ({analysisData.participants.user.name} - {analysisData.participants.user.side})
                  </span>
                </div>
                <div className="flex items-center justify-between bg-black p-3 border border-neutral-600 rounded-none">
                  <span className="font-medium text-orange-400">
                    AI ({analysisData.participants.ai.name} - {analysisData.participants.ai.side})
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-neutral-400 mb-2">Outcome:</p>
              <div className="bg-black p-4 border border-neutral-600 rounded-none">
                <div className="flex items-center mb-2">
                  {analysisData.outcome.winner === "NEGATIVE" ? (
                    <Trophy className="w-5 h-5 text-orange-400 mr-2" />
                  ) : (
                    <Trophy className="w-5 h-5 text-blue-400 mr-2" />
                  )}
                  <span className="font-medium">{analysisData.outcome.verdict}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-neutral-400 mb-2">Key Voting Issues:</p>
            <ul className="space-y-2">
              {analysisData.outcome.keyIssues.map((issue, index) => (
                <li key={index} className="flex items-start">
                  <Target className="w-4 h-4 text-neutral-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-300 text-sm">{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-none text-center">
          <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{analysisData.metrics.speakingTime.user.time}</p>
          <p className="text-sm text-neutral-400">Your Speaking Time</p>
          <p className="text-xs text-neutral-500">({analysisData.metrics.speakingTime.user.percentage}% of total)</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-none text-center">
          <MessageSquare className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{analysisData.metrics.turnCount.user}</p>
          <p className="text-sm text-neutral-400">Speaking Turns</p>
          <p className="text-xs text-neutral-500">vs {analysisData.metrics.turnCount.ai} AI turns</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-none text-center">
          <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{analysisData.arguments.user.length}</p>
          <p className="text-sm text-neutral-400">Arguments Made</p>
          <p className="text-xs text-neutral-500">
            {analysisData.arguments.user.filter((arg) => arg.status === "unchallenged").length} unchallenged
          </p>
        </div>
      </div>
    </div>
  )

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Speaking Time Distribution */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Speaking Time Distribution
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 font-medium">You</span>
            <span className="text-white">
              {analysisData.metrics.speakingTime.user.time} ({analysisData.metrics.speakingTime.user.percentage}%)
            </span>
          </div>
          <div className="w-full bg-black rounded-none h-4 border border-neutral-600">
            <div
              className="bg-blue-500 h-full rounded-none"
              style={{ width: `${analysisData.metrics.speakingTime.user.percentage}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-orange-400 font-medium">AI Opponent</span>
            <span className="text-white">
              {analysisData.metrics.speakingTime.ai.time} ({analysisData.metrics.speakingTime.ai.percentage}%)
            </span>
          </div>
          <div className="w-full bg-black rounded-none h-4 border border-neutral-600">
            <div
              className="bg-orange-500 h-full rounded-none"
              style={{ width: `${analysisData.metrics.speakingTime.ai.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Argument Strength Radar */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Argument Analysis
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-400 mb-3">Your Performance</h4>
            <div className="space-y-3">
              {Object.entries(analysisData.metrics.argumentStrength.user).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-neutral-300 capitalize">{key}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-black rounded-none h-2 border border-neutral-600">
                      <div className="bg-blue-500 h-full rounded-none" style={{ width: `${((value as number) / 5) * 100}%` }}></div>
                    </div>
                    <span className="text-white text-sm w-8">{value as number}/5</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-orange-400 mb-3">AI Performance</h4>
            <div className="space-y-3">
              {Object.entries(analysisData.metrics.argumentStrength.ai).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-neutral-300 capitalize">{key}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-black rounded-none h-2 border border-neutral-600">
                      <div
                        className="bg-orange-500 h-full rounded-none"
                        style={{ width: `${((value as number) / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-white text-sm w-8">{value as number}/5</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderArgumentsTab = () => (
    <div className="space-y-6">
      {/* Your Arguments */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-blue-400" />
          Your Arguments
        </h3>

        <div className="space-y-3">
          {analysisData.arguments.user.map((argument, index) => (
            <div key={index} className="bg-black border border-neutral-600 p-4 rounded-none">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(argument.status)}
                    {getEvidenceIcon(argument.evidence)}
                    <span className="text-white font-medium">Argument {index + 1}</span>
                  </div>
                  <p className="text-neutral-300 text-sm">{argument.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Arguments */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-orange-400" />
          AI Arguments
        </h3>

        <div className="space-y-3">
          {analysisData.arguments.ai.map((argument, index) => (
            <div key={index} className="bg-black border border-neutral-600 p-4 rounded-none">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(argument.status)}
                    {getEvidenceIcon(argument.evidence)}
                    <span className="text-white font-medium">Argument {index + 1}</span>
                  </div>
                  <p className="text-neutral-300 text-sm">{argument.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Framework Analysis */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Scale className="w-5 h-5 mr-2" />
          Framework Analysis
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-black border border-neutral-600 p-4 rounded-none">
            <h4 className="font-medium text-blue-400 mb-3">Your Framework</h4>
            <div className="space-y-2">
              <div>
                <span className="text-neutral-400 text-sm">Value:</span>
                <p className="text-white">{analysisData.framework.user.value}</p>
              </div>
              <div>
                <span className="text-neutral-400 text-sm">Criterion:</span>
                <p className="text-white">{analysisData.framework.user.criterion}</p>
              </div>
            </div>
          </div>

          <div className="bg-black border border-neutral-600 p-4 rounded-none">
            <h4 className="font-medium text-orange-400 mb-3">AI Framework</h4>
            <div className="space-y-2">
              <div>
                <span className="text-neutral-400 text-sm">Value:</span>
                <p className="text-white">{analysisData.framework.ai.value}</p>
              </div>
              <div>
                <span className="text-neutral-400 text-sm">Criterion:</span>
                <p className="text-white">{analysisData.framework.ai.criterion}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Scale
            className={`w-8 h-8 mx-auto ${analysisData.framework.winner === "ai" ? "text-orange-400 transform rotate-12" : "text-blue-400 transform -rotate-12"}`}
          />
          <p className="text-sm text-neutral-400 mt-2">
            AI Judge found the {analysisData.framework.winner === "ai" ? "AI" : "Your"} framework more persuasive
          </p>
        </div>
      </div>

      {/* Fallacy Detection */}
      {analysisData.fallacies.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
            Logical Fallacies Detected
          </h3>

          <div className="space-y-3">
            {analysisData.fallacies.map((fallacy, index) => (
              <div key={index} className="bg-black border border-yellow-600 p-4 rounded-none">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-400">{fallacy.type}</h4>
                    <p className="text-neutral-300 text-sm mt-1">{fallacy.context}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderFeedbackTab = () => (
    <div className="space-y-6">
      {/* AI Suggestions */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Lightbulb className="w-5 h-5 mr-2 text-yellow-400" />
          Suggestions for Improvement
        </h3>

        <div className="space-y-4">
          {analysisData.suggestions.map((suggestion, index) => (
            <div key={index} className="flex items-start space-x-3 bg-black border border-neutral-600 p-4 rounded-none">
              <Lightbulb className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-neutral-300 text-sm">{suggestion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transcript */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Debate Transcript
        </h3>

        <div className="bg-black border border-neutral-600 p-4 rounded-none h-64 overflow-y-auto font-mono text-sm">
          <pre className="text-neutral-300 whitespace-pre-wrap">{transcript}</pre>
        </div>
      </div>

      {/* Personal Notes */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Your Notes & Reflections
        </h3>

        <Textarea
          value={userNotes}
          onChange={(e) => setUserNotes(e.target.value)}
          placeholder="Add your thoughts about this debate, what you learned, areas to improve..."
          className="bg-black border-neutral-600 text-white rounded-none min-h-32"
        />
        <p className="text-xs text-neutral-400 mt-2">Notes are automatically saved</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.push("/mode-selection")}
              className="bg-neutral-800 text-white hover:bg-neutral-700 rounded-none border border-neutral-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Debate Analysis</h1>
              <p className="text-neutral-400">Review your performance and get feedback</p>
            </div>
          </div>

          <Button onClick={() => router.push("/")} className="bg-white text-black hover:bg-neutral-200 rounded-none">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>

        {/* Analysis Not Ready State */}
        {!analysisData ? (
          <div className="bg-neutral-900 border border-neutral-700 p-8 rounded-none text-center">
            <div className="space-y-4">
              <FileText className="w-16 h-16 text-neutral-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Analysis Not Created Yet</h2>
              <p className="text-neutral-400">
                Your debate analysis is still being processed. Please refresh to view your results.
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="bg-white text-black hover:bg-neutral-200 rounded-none"
              >
                Refresh
              </Button>
            </div>
          </div>
        ) : (
        <div className="bg-neutral-900 border border-neutral-700 rounded-none">
          <div className="flex space-x-0 border-b border-neutral-700">
            {[
              { id: "overview", label: "Overview", icon: Trophy },
              { id: "performance", label: "Performance", icon: BarChart3 },
              { id: "arguments", label: "Arguments", icon: Shield },
              { id: "feedback", label: "Feedback", icon: Lightbulb },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all border-r border-neutral-700 last:border-r-0 ${
                  activeTab === tab.id
                    ? "bg-white text-black"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "overview" && renderOverviewTab()}
            {activeTab === "performance" && renderPerformanceTab()}
            {activeTab === "arguments" && renderArgumentsTab()}
            {activeTab === "feedback" && renderFeedbackTab()}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
