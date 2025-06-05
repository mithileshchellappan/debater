"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  Target,
  AlertTriangle,
  Lightbulb,
  Users,
  Bot,
  User,
  BarChart3,
  FileText,
  Home,
  Star,
  CheckCircle,
  Zap,
  Eye,
  Gavel,
} from "lucide-react"

// Mock data for panel debate analysis
const MOCK_PANEL_ANALYSIS_DATA = {
  debateType: "panel",
  resolution: "The benefits of artificial intelligence outweigh the risks to personal privacy.",
  participants: {
    user: { name: "YOU", stance: "Focus on economic impacts and job creation" },
    moderator: { name: "MODERATOR", style: "Inquisitive & Probing" },
    panelists: [
      { name: "Panelist Alpha", stance: "The Pragmatist - Practical solutions focus" },
      { name: "Panelist Beta", stance: "The Skeptic - Questions assumptions and demands evidence" },
    ],
  },
  assessment: {
    focus: "Productive and Insightful",
    description: "The discussion maintained focus while exploring multiple perspectives effectively",
    icon: "productive", // productive, contentious, balanced, insightful, well-moderated
  },
  keyThemes: [
    "The differing views on economic impact between you and Panelist Alpha sparked significant debate",
    "The Moderator's question regarding data ownership effectively refocused the discussion",
    "Your point on job displacement introduced a novel economic perspective",
    "Panelist Beta's evidence-based challenges elevated the quality of arguments",
  ],
  metrics: {
    speakingTime: {
      user: { time: "6m 15s", percentage: 28 },
      moderator: { time: "4m 30s", percentage: 20 },
      "panelist-0": { time: "5m 45s", percentage: 26 },
      "panelist-1": { time: "5m 30s", percentage: 26 },
    },
    turnCount: {
      user: 8,
      moderator: 12,
      "panelist-0": 7,
      "panelist-1": 9,
    },
    requestsToSpeak: {
      total: 3,
      acknowledged: 3,
      successful: 2,
    },
    interactionFlow: [
      { from: "user", to: "panelist-0", count: 4 },
      { from: "panelist-0", to: "user", count: 3 },
      { from: "user", to: "panelist-1", count: 2 },
      { from: "moderator", to: "user", count: 5 },
    ],
  },
  stanceRepresentation: {
    user: {
      effectiveness: "Effective",
      score: 4,
      keyArguments: [
        "AI automation will create new job categories in tech and data analysis",
        "Economic benefits of AI efficiency outweigh short-term displacement costs",
      ],
    },
    panelists: [
      {
        effectiveness: "Adequate",
        score: 3,
        keyArguments: ["Focused on practical implementation challenges", "Emphasized gradual adoption strategies"],
      },
      {
        effectiveness: "Effective",
        score: 4,
        keyArguments: ["Demanded concrete evidence for AI safety claims", "Challenged assumptions about regulation"],
      },
    ],
  },
  impactfulContributions: [
    {
      speaker: "user",
      text: "Your economic analysis of AI job creation vs. displacement provided crucial data",
      impact: "high",
    },
    {
      speaker: "panelist-1",
      text: "Panelist Beta's challenge to privacy regulation assumptions shifted the debate",
      impact: "high",
    },
    {
      speaker: "panelist-0",
      text: "Panelist Alpha's practical implementation timeline grounded the discussion",
      impact: "medium",
    },
  ],
  moderatorEffectiveness: {
    overall: "Effective",
    timeManagement: 4,
    questionQuality: 5,
    fairness: 4,
    feedback:
      "The AI Moderator's inquisitive style effectively drew out different perspectives. Time management was good, and questions were highly relevant and thought-provoking.",
  },
  fallacies: [{ type: "False Dichotomy", context: "Presenting only two options for AI regulation implementation" }],
  suggestions: [
    "Consider directly engaging with Panelist Beta's evidence-based challenges more thoroughly",
    "Your economic stance was clear. Try to weave economic impacts more explicitly into responses about privacy",
    "When making a point after requesting to speak, ensure it directly builds on the current discussion thread",
    "Practice responding to multiple viewpoints simultaneously in complex discussions",
  ],
  transcript: `[00:30] MODERATOR: Let's begin with opening statements. You have the floor first.
[01:15] YOU: Thank you. My focus today is on the economic transformation AI brings...
[02:45] PANELIST ALPHA: I appreciate the economic perspective, but we need practical implementation...
[04:20] PANELIST BETA: I'd like to challenge the assumption that economic benefits are guaranteed...
[05:55] MODERATOR: Interesting points. Let me ask about data ownership specifically...`,
}

export default function PanelAnalysisPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [userNotes, setUserNotes] = useState("")
  const [analysisData, setAnalysisData] = useState(MOCK_PANEL_ANALYSIS_DATA)
  const router = useRouter()

  useEffect(() => {
    // In a real app, load analysis data from localStorage or API
    const savedNotes = localStorage.getItem("panelAnalysisNotes")
    if (savedNotes) {
      setUserNotes(savedNotes)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("panelAnalysisNotes", userNotes)
  }, [userNotes])

  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case "productive":
        return <Zap className="w-5 h-5 text-green-400" />
      case "insightful":
        return <Eye className="w-5 h-5 text-blue-400" />
      case "balanced":
        return <Users className="w-5 h-5 text-purple-400" />
      case "contentious":
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case "well-moderated":
        return <Gavel className="w-5 h-5 text-orange-400" />
      default:
        return <Users className="w-5 h-5 text-neutral-400" />
    }
  }

  const getEffectivenessColor = (effectiveness: string) => {
    switch (effectiveness.toLowerCase()) {
      case "effective":
        return "text-green-400"
      case "adequate":
        return "text-yellow-400"
      case "needs more focus":
        return "text-red-400"
      default:
        return "text-neutral-400"
    }
  }

  const getEffectivenessIcon = (score: number) => {
    if (score >= 4) return <Target className="w-4 h-4 text-green-400" />
    if (score >= 3) return <Target className="w-4 h-4 text-yellow-400" />
    return <Target className="w-4 h-4 text-red-400" />
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Discussion Summary */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Panel Discussion Summary
        </h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-neutral-400 mb-2">Resolution:</p>
            <p className="text-white font-medium">{analysisData.resolution}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-neutral-400 mb-2">Panel Configuration:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-black p-3 border border-neutral-600 rounded-none">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-blue-400">
                      You (Panelist - {analysisData.participants.user.stance})
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-black p-3 border border-neutral-600 rounded-none">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4 text-purple-400" />
                    <span className="font-medium text-purple-400">
                      AI Moderator: {analysisData.participants.moderator.name} (
                      {analysisData.participants.moderator.style})
                    </span>
                  </div>
                </div>
                {analysisData.participants.panelists.map((panelist, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-black p-3 border border-neutral-600 rounded-none"
                  >
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4 text-orange-400" />
                      <span className="font-medium text-orange-400">
                        {panelist.name}: {panelist.stance}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-neutral-400 mb-2">AI Judge's Assessment:</p>
              <div className="bg-black p-4 border border-neutral-600 rounded-none">
                <div className="flex items-center mb-2">
                  {getAssessmentIcon(analysisData.assessment.icon)}
                  <span className="font-medium ml-2">Discussion Focus: {analysisData.assessment.focus}</span>
                </div>
                <p className="text-sm text-neutral-300">{analysisData.assessment.description}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-neutral-400 mb-2">Key Discussion Themes & Turning Points:</p>
            <ul className="space-y-2">
              {analysisData.keyThemes.map((theme, index) => (
                <li key={index} className="flex items-start">
                  <Target className="w-4 h-4 text-neutral-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-300 text-sm">{theme}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
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
          <p className="text-xs text-neutral-500">
            Total: {Object.values(analysisData.metrics.turnCount).reduce((a, b) => a + b, 0)}
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-none text-center">
          <CheckCircle className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">
            {analysisData.metrics.requestsToSpeak.successful}/{analysisData.metrics.requestsToSpeak.total}
          </p>
          <p className="text-sm text-neutral-400">Successful Requests</p>
          <p className="text-xs text-neutral-500">to speak</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-none text-center">
          <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">
            {analysisData.impactfulContributions.filter((c) => c.speaker === "user").length}
          </p>
          <p className="text-sm text-neutral-400">Impactful Points</p>
          <p className="text-xs text-neutral-500">recognized by AI Judge</p>
        </div>
      </div>
    </div>
  )

  const renderParticipationTab = () => (
    <div className="space-y-6">
      {/* Speaking Time Distribution */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Speaking Time Distribution
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 font-medium">You</span>
            </div>
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
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 font-medium">Moderator</span>
            </div>
            <span className="text-white">
              {analysisData.metrics.speakingTime.moderator.time} (
              {analysisData.metrics.speakingTime.moderator.percentage}%)
            </span>
          </div>
          <div className="w-full bg-black rounded-none h-4 border border-neutral-600">
            <div
              className="bg-purple-500 h-full rounded-none"
              style={{ width: `${analysisData.metrics.speakingTime.moderator.percentage}%` }}
            ></div>
          </div>

          {analysisData.participants.panelists.map((panelist, index) => (
            <div key={index}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-400 font-medium">{panelist.name}</span>
                </div>
                <span className="text-white">
                  {
                    analysisData.metrics.speakingTime[
                      `panelist-${index}` as keyof typeof analysisData.metrics.speakingTime
                    ].time
                  }{" "}
                  (
                  {
                    analysisData.metrics.speakingTime[
                      `panelist-${index}` as keyof typeof analysisData.metrics.speakingTime
                    ].percentage
                  }
                  %)
                </span>
              </div>
              <div className="w-full bg-black rounded-none h-4 border border-neutral-600">
                <div
                  className="bg-orange-500 h-full rounded-none"
                  style={{
                    width: `${analysisData.metrics.speakingTime[`panelist-${index}` as keyof typeof analysisData.metrics.speakingTime].percentage}%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Turn Count & Interaction */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Speaking Turns
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400">You</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-black rounded-none h-2 border border-neutral-600">
                  <div
                    className="bg-blue-500 h-full rounded-none"
                    style={{ width: `${(analysisData.metrics.turnCount.user / 12) * 100}%` }}
                  ></div>
                </div>
                <span className="text-white text-sm w-8">{analysisData.metrics.turnCount.user}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400">Moderator</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-black rounded-none h-2 border border-neutral-600">
                  <div
                    className="bg-purple-500 h-full rounded-none"
                    style={{ width: `${(analysisData.metrics.turnCount.moderator / 12) * 100}%` }}
                  ></div>
                </div>
                <span className="text-white text-sm w-8">{analysisData.metrics.turnCount.moderator}</span>
              </div>
            </div>

            {analysisData.participants.panelists.map((panelist, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-400">{panelist.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-black rounded-none h-2 border border-neutral-600">
                    <div
                      className="bg-orange-500 h-full rounded-none"
                      style={{
                        width: `${(analysisData.metrics.turnCount[`panelist-${index}` as keyof typeof analysisData.metrics.turnCount] / 12) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-white text-sm w-8">
                    {analysisData.metrics.turnCount[`panelist-${index}` as keyof typeof analysisData.metrics.turnCount]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Request to Speak Effectiveness
          </h3>

          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {analysisData.metrics.requestsToSpeak.successful}/{analysisData.metrics.requestsToSpeak.total}
              </div>
              <p className="text-sm text-neutral-400">Successful Requests</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Total Requests</span>
                <span className="text-white">{analysisData.metrics.requestsToSpeak.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Acknowledged</span>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white">{analysisData.metrics.requestsToSpeak.acknowledged}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Gained Floor</span>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-white">{analysisData.metrics.requestsToSpeak.successful}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderArgumentsTab = () => (
    <div className="space-y-6">
      {/* Stance Representation */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Stance Representation
        </h3>

        <div className="space-y-4">
          {/* User Stance */}
          <div className="bg-black border border-neutral-600 p-4 rounded-none">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-400" />
                <h4 className="font-medium text-blue-400">Your Stance Representation</h4>
              </div>
              <div className="flex items-center space-x-2">
                {getEffectivenessIcon(analysisData.stanceRepresentation.user.score)}
                <span
                  className={`font-medium ${getEffectivenessColor(analysisData.stanceRepresentation.user.effectiveness)}`}
                >
                  {analysisData.stanceRepresentation.user.effectiveness}
                </span>
              </div>
            </div>
            <p className="text-sm text-neutral-400 mb-2">
              Your stated stance: "{analysisData.participants.user.stance}"
            </p>
            <p className="text-sm text-neutral-300 mb-3">
              Your stance was represented {analysisData.stanceRepresentation.user.effectiveness.toLowerCase()}. Key
              arguments supporting this included:
            </p>
            <ul className="space-y-1">
              {analysisData.stanceRepresentation.user.keyArguments.map((arg, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span className="text-neutral-300 text-sm">{arg}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Panelists Stance */}
          {analysisData.participants.panelists.map((panelist, index) => (
            <div key={index} className="bg-black border border-neutral-600 p-4 rounded-none">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-orange-400" />
                  <h4 className="font-medium text-orange-400">{panelist.name} Stance</h4>
                </div>
                <div className="flex items-center space-x-2">
                  {getEffectivenessIcon(analysisData.stanceRepresentation.panelists[index].score)}
                  <span
                    className={`font-medium ${getEffectivenessColor(analysisData.stanceRepresentation.panelists[index].effectiveness)}`}
                  >
                    {analysisData.stanceRepresentation.panelists[index].effectiveness}
                  </span>
                </div>
              </div>
              <p className="text-sm text-neutral-400 mb-2">Stance: "{panelist.stance}"</p>
              <ul className="space-y-1">
                {analysisData.stanceRepresentation.panelists[index].keyArguments.map((arg, argIndex) => (
                  <li key={argIndex} className="flex items-start">
                    <span className="text-orange-400 mr-2">•</span>
                    <span className="text-neutral-300 text-sm">{arg}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Impactful Contributions */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Star className="w-5 h-5 mr-2 text-yellow-400" />
          Impactful Contributions
        </h3>

        <div className="space-y-3">
          {analysisData.impactfulContributions.map((contribution, index) => (
            <div key={index} className="bg-black border border-neutral-600 p-4 rounded-none">
              <div className="flex items-start space-x-3">
                <Star className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    {contribution.speaker === "user" ? (
                      <User className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Bot className="w-4 h-4 text-orange-400" />
                    )}
                    <span
                      className={`font-medium text-sm ${contribution.speaker === "user" ? "text-blue-400" : "text-orange-400"}`}
                    >
                      {contribution.speaker === "user" ? "You" : contribution.speaker.replace("panelist-", "Panelist ")}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-none ${contribution.impact === "high" ? "bg-green-600" : "bg-yellow-600"} text-white`}
                    >
                      {contribution.impact.toUpperCase()} IMPACT
                    </span>
                  </div>
                  <p className="text-neutral-300 text-sm">{contribution.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Moderator Effectiveness */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Gavel className="w-5 h-5 mr-2 text-purple-400" />
          Moderator Effectiveness
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-purple-400 mb-3">Overall Assessment</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Overall Style</span>
                <span className="text-white font-medium">{analysisData.moderatorEffectiveness.overall}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Time Management</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-black rounded-none h-2 border border-neutral-600">
                    <div
                      className="bg-purple-500 h-full rounded-none"
                      style={{ width: `${(analysisData.moderatorEffectiveness.timeManagement / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-white text-sm">{analysisData.moderatorEffectiveness.timeManagement}/5</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Question Quality</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-black rounded-none h-2 border border-neutral-600">
                    <div
                      className="bg-purple-500 h-full rounded-none"
                      style={{ width: `${(analysisData.moderatorEffectiveness.questionQuality / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-white text-sm">{analysisData.moderatorEffectiveness.questionQuality}/5</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Fairness</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-black rounded-none h-2 border border-neutral-600">
                    <div
                      className="bg-purple-500 h-full rounded-none"
                      style={{ width: `${(analysisData.moderatorEffectiveness.fairness / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-white text-sm">{analysisData.moderatorEffectiveness.fairness}/5</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-purple-400 mb-3">Detailed Feedback</h4>
            <div className="bg-black border border-neutral-600 p-3 rounded-none">
              <p className="text-neutral-300 text-sm leading-relaxed">{analysisData.moderatorEffectiveness.feedback}</p>
            </div>
          </div>
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
          Panel Discussion Transcript
        </h3>

        <div className="bg-black border border-neutral-600 p-4 rounded-none h-64 overflow-y-auto font-mono text-sm">
          <pre className="text-neutral-300 whitespace-pre-wrap">{analysisData.transcript}</pre>
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
          placeholder="Add your thoughts about this panel discussion, what you learned, areas to improve, insights from other panelists..."
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
              <h1 className="text-3xl font-bold">Panel Debate Analysis</h1>
              <p className="text-neutral-400">Review your participation and panel dynamics</p>
            </div>
          </div>

          <Button onClick={() => router.push("/")} className="bg-white text-black hover:bg-neutral-200 rounded-none">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-neutral-900 border border-neutral-700 rounded-none">
          <div className="flex space-x-0 border-b border-neutral-700">
            {[
              { id: "overview", label: "Overview", icon: Users },
              { id: "participation", label: "Participation", icon: BarChart3 },
              { id: "arguments", label: "Arguments", icon: Target },
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
            {activeTab === "participation" && renderParticipationTab()}
            {activeTab === "arguments" && renderArgumentsTab()}
            {activeTab === "feedback" && renderFeedbackTab()}
          </div>
        </div>
      </div>
    </div>
  )
}
