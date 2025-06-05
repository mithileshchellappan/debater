"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, Plus, Minus, Users, Bot, User, Lightbulb, X } from "lucide-react"

const SAMPLE_RESOLUTIONS = [
  {
    title: "Technology and Privacy",
    resolution: "The benefits of artificial intelligence outweigh the risks to personal privacy.",
    insights:
      "This resolution explores the tension between technological advancement and individual privacy rights. Consider arguments about data collection, surveillance, and the societal benefits of AI.",
  },
  {
    title: "Environmental Policy",
    resolution:
      "Developed nations have a moral obligation to prioritize climate action over economic growth.",
    insights:
      "This topic examines the balance between environmental responsibility and economic development. Consider arguments about intergenerational justice and global equity.",
  },
  {
    title: "Education Reform",
    resolution: "Standardized testing does more harm than good in public education.",
    insights:
      "This resolution questions traditional assessment methods. Consider arguments about educational equity, teaching quality, and student well-being.",
  },
  {
    title: "Social Media Regulation",
    resolution: "Social media platforms should be regulated as public utilities.",
    insights:
      "This topic explores the role of social media in society. Consider arguments about free speech, market competition, and public interest.",
  },
  {
    title: "Economic Policy",
    resolution: "Universal Basic Income is necessary for economic stability in the 21st century.",
    insights:
      "This resolution examines modern economic challenges. Consider arguments about automation, wealth inequality, and social safety nets.",
  },
  {
    title: "Healthcare Policy",
    resolution: "Healthcare is a human right that should be guaranteed by government.",
    insights:
      "This topic explores healthcare access and responsibility. Consider arguments about government role, individual responsibility, and resource allocation.",
  },
]

const MODERATOR_STYLES = [
  { value: "neutral", label: "Neutral & Fair", description: "Balanced moderation with equal time for all" },
  { value: "probing", label: "Inquisitive & Probing", description: "Asks follow-up questions and challenges points" },
  { value: "strict", label: "Strict on Time", description: "Enforces time limits and keeps discussion focused" },
]

const PANELIST_ARCHETYPES = [
  {
    value: "pragmatist",
    label: "The Pragmatist",
    description: "Focuses on practical solutions and real-world applications",
  },
  { value: "idealist", label: "The Idealist", description: "Emphasizes principles and moral considerations" },
  { value: "skeptic", label: "The Skeptic", description: "Questions assumptions and demands strong evidence" },
  {
    value: "analyst",
    label: "The Data-Driven Analyst",
    description: "Relies heavily on statistics and empirical evidence",
  },
  { value: "advocate", label: "The Passionate Advocate", description: "Argues with emotion and personal conviction" },
  { value: "custom", label: "Custom...", description: "Define your own stance and personality" },
]

export default function PanelSetupPage() {
  const [selectedResolution, setSelectedResolution] = useState("")
  const [customResolution, setCustomResolution] = useState("")
  const [showInsights, setShowInsights] = useState<number | null>(null)
  const [userStance, setUserStance] = useState("")
  const [moderatorStyle, setModeratorStyle] = useState("")
  const [numAIPanelists, setNumAIPanelists] = useState(2)
  const [aiPanelists, setAiPanelists] = useState([
    { name: "Panelist Alpha", archetype: "", customStance: "" },
    { name: "Panelist Beta", archetype: "", customStance: "" },
  ])
  const router = useRouter()

  useEffect(() => {
    // Check if coming from Lincoln-Douglas flow
    const storedResolution = localStorage.getItem("debateResolution")
    if (storedResolution) {
      setSelectedResolution(storedResolution)
      // Clear the Lincoln-Douglas resolution since we're in panel mode
      localStorage.removeItem("debateResolution")
    }
  }, [])

  useEffect(() => {
    // Adjust AI panelists array when number changes
    const newPanelists = [...aiPanelists]
    if (numAIPanelists > aiPanelists.length) {
      // Add new panelists
      for (let i = aiPanelists.length; i < numAIPanelists; i++) {
        const names = ["Alpha", "Beta", "Gamma", "Delta"]
        newPanelists.push({
          name: `Panelist ${names[i] || `${i + 1}`}`,
          archetype: "",
          customStance: "",
        })
      }
    } else if (numAIPanelists < aiPanelists.length) {
      // Remove excess panelists
      newPanelists.splice(numAIPanelists)
    }
    setAiPanelists(newPanelists)
  }, [numAIPanelists])

  const updatePanelistArchetype = (index: number, archetype: string) => {
    const updated = [...aiPanelists]
    updated[index].archetype = archetype
    if (archetype !== "custom") {
      updated[index].customStance = ""
    }
    setAiPanelists(updated)
  }

  const updatePanelistCustomStance = (index: number, stance: string) => {
    const updated = [...aiPanelists]
    updated[index].customStance = stance
    setAiPanelists(updated)
  }

  const updatePanelistName = (index: number, name: string) => {
    const updated = [...aiPanelists]
    updated[index].name = name
    setAiPanelists(updated)
  }

  const getArchetypeDescription = (archetype: string) => {
    const found = PANELIST_ARCHETYPES.find((a) => a.value === archetype)
    return found?.description || ""
  }

  const deselectResolution = () => {
    setSelectedResolution("")
    setCustomResolution("")
  }

  const canStartDebate = () => {
    const resolution = selectedResolution || customResolution
    return (
      resolution.trim() &&
      userStance.trim() &&
      moderatorStyle &&
      aiPanelists.every((p) => p.archetype && (p.archetype !== "custom" || p.customStance.trim()))
    )
  }

  const handleStartDebate = () => {
    if (canStartDebate()) {
      const resolution = selectedResolution || customResolution
      // Store panel configuration
      localStorage.setItem("panelResolution", resolution)
      localStorage.setItem("panelUserStance", userStance)
      localStorage.setItem("panelModeratorStyle", moderatorStyle)
      localStorage.setItem("panelAIPanelists", JSON.stringify(aiPanelists))
      router.push("/panel-debate")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Panel Debate Setup</h1>
          <p className="text-neutral-400 max-w-2xl mx-auto">
            Configure your panel debate by selecting a resolution and defining the participants.
          </p>
        </div>

        {/* Resolution Selection */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Choose Your Resolution</h2>

          {/* Selected Resolution Display */}
          {(selectedResolution || customResolution) && (
            <div className="bg-black border-2 border-white p-4 rounded-none">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-neutral-400 mb-2">Selected Resolution:</p>
                  <p className="font-medium text-white">{selectedResolution || customResolution}</p>
                </div>
                <Button
                  onClick={deselectResolution}
                  className="bg-neutral-800 text-white hover:bg-neutral-700 rounded-none border border-neutral-600 p-2 ml-4"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {!selectedResolution && !customResolution && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-neutral-300">Popular Resolutions</h3>
              <div className="grid gap-3">
                {SAMPLE_RESOLUTIONS.map((item, index) => (
                  <div key={index} className="bg-neutral-900 border border-neutral-700 p-4 rounded-none">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-white">{item.title}</h4>
                          <p className="text-neutral-300 mt-1">oombu {item.resolution}</p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowInsights(showInsights === index ? null : index)}
                            className="border-neutral-600 text-white hover:bg-white hover:text-black rounded-none"
                          >
                            <Lightbulb className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedResolution(item.resolution)
                              setCustomResolution("")
                            }}
                            className="bg-neutral-800 text-white border-neutral-600 hover:bg-white hover:text-black rounded-none"
                          >
                            SELECT
                          </Button>
                        </div>
                      </div>

                      {showInsights === index && (
                        <div className="bg-black p-3 border-l-2 border-neutral-600">
                          <p className="text-neutral-300 text-sm">{item.insights}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Resolution - Only show if no resolution is selected */}
          {!selectedResolution && !customResolution && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-neutral-300">Create Custom Resolution</h3>
              <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-none">
                <div className="space-y-3">
                  <label htmlFor="custom" className="block text-sm font-medium text-white">
                    Enter your own resolution
                  </label>
                  <Input
                    id="custom"
                    value={customResolution}
                    onChange={(e) => {
                      setCustomResolution(e.target.value)
                      setSelectedResolution("")
                    }}
                    className="bg-black border-neutral-600 text-white rounded-none focus:border-white"
                    placeholder="[Your debate topic here]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Configuration */}
        <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Your Role: Panelist</h2>
          </div>
          <div className="space-y-3">
            <label htmlFor="userStance" className="block text-sm font-medium text-white">
              Your Stance / Key Perspective
            </label>
            <Input
              id="userStance"
              value={userStance}
              onChange={(e) => setUserStance(e.target.value)}
              className="bg-black border-neutral-600 text-white rounded-none focus:border-white"
              placeholder="e.g., Focus on economic impacts, Ethical considerations first, Environmental perspective..."
            />
            <p className="text-xs text-neutral-400">
              Define your unique perspective or the angle you'll argue from during the debate.
            </p>
          </div>
        </div>

        {/* AI Moderator Configuration */}
        <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
          <div className="flex items-center space-x-2 mb-4">
            <Bot className="w-5 h-5" />
            <h2 className="text-xl font-semibold">AI Moderator</h2>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-white">Moderator Style</label>
            <Select value={moderatorStyle} onValueChange={setModeratorStyle}>
              <SelectTrigger className="bg-black border-neutral-600 text-white rounded-none focus:border-white">
                <SelectValue placeholder="Select moderator style..." />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-600 rounded-none">
                {MODERATOR_STYLES.map((style) => (
                  <SelectItem
                    key={style.value}
                    value={style.value}
                    className="text-white hover:bg-neutral-700 focus:bg-neutral-700 hover:text-white focus:text-white"
                  >
                    <div>
                      <div className="font-medium">{style.label}</div>
                      <div className="text-xs text-neutral-400">{style.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* AI Panelists Configuration */}
        <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <h2 className="text-xl font-semibold">AI Panelists</h2>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setNumAIPanelists(Math.max(1, numAIPanelists - 1))}
                disabled={numAIPanelists <= 1}
                className="bg-neutral-800 text-white hover:bg-neutral-700 rounded-none border border-neutral-600 disabled:bg-neutral-800 disabled:text-neutral-500 p-2"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-lg font-mono w-8 text-center">{numAIPanelists}</span>
              <Button
                onClick={() => setNumAIPanelists(Math.min(3, numAIPanelists + 1))}
                disabled={numAIPanelists >= 3}
                className="bg-neutral-800 text-white hover:bg-neutral-700 rounded-none border border-neutral-600 disabled:bg-neutral-800 disabled:text-neutral-500 p-2"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {aiPanelists.map((panelist, index) => (
              <div key={index} className="bg-black border border-neutral-600 p-4 rounded-none">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">AI Panelist {index + 1}</h3>
                    <Input
                      value={panelist.name}
                      onChange={(e) => updatePanelistName(index, e.target.value)}
                      className="bg-neutral-900 border-neutral-600 text-white rounded-none focus:border-white w-48"
                      placeholder="Panelist name..."
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-white">Stance / Personality</label>
                    <Select value={panelist.archetype} onValueChange={(value) => updatePanelistArchetype(index, value)}>
                      <SelectTrigger className="bg-neutral-900 border-neutral-600 text-white rounded-none focus:border-white">
                        <SelectValue placeholder="Select archetype..." />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-600 rounded-none">
                        {PANELIST_ARCHETYPES.map((archetype) => (
                          <SelectItem
                            key={archetype.value}
                            value={archetype.value}
                            className="text-white hover:bg-neutral-700 focus:bg-neutral-700 hover:text-white focus:text-white"
                          >
                            <div>
                              <div className="font-medium">{archetype.label}</div>
                              <div className="text-xs text-neutral-400">{archetype.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {panelist.archetype === "custom" && (
                      <Input
                        value={panelist.customStance}
                        onChange={(e) => updatePanelistCustomStance(index, e.target.value)}
                        className="bg-neutral-900 border-neutral-600 text-white rounded-none focus:border-white"
                        placeholder="Define custom stance and personality..."
                      />
                    )}

                    {panelist.archetype && panelist.archetype !== "custom" && (
                      <div className="bg-neutral-800 p-3 border-l-2 border-neutral-600">
                        <p className="text-sm text-neutral-300">{getArchetypeDescription(panelist.archetype)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleStartDebate}
            disabled={!canStartDebate()}
            className="bg-white text-black hover:bg-neutral-200 rounded-none font-medium px-8 disabled:bg-neutral-700 disabled:text-neutral-400"
          >
            START PANEL DEBATE
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {!canStartDebate() && (
          <div className="text-center">
            <p className="text-neutral-400 text-sm">
              Please select a resolution and complete all configuration fields to start the debate
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
