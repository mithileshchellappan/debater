"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Lightbulb } from "lucide-react"

const SAMPLE_RESOLUTIONS = [
  {
    title: "Technology and Privacy",
    resolution: "Resolved: The benefits of artificial intelligence outweigh the risks to personal privacy.",
    insights:
      "This resolution explores the tension between technological advancement and individual privacy rights. Consider arguments about data collection, surveillance, and the societal benefits of AI.",
  },
  {
    title: "Environmental Policy",
    resolution:
      "Resolved: Developed nations have a moral obligation to prioritize climate action over economic growth.",
    insights:
      "This topic examines the balance between environmental responsibility and economic development. Consider arguments about intergenerational justice and global equity.",
  },
  {
    title: "Education Reform",
    resolution: "Resolved: Standardized testing does more harm than good in public education.",
    insights:
      "This resolution questions traditional assessment methods. Consider arguments about educational equity, teaching quality, and student well-being.",
  },
  {
    title: "Social Media Regulation",
    resolution: "Resolved: Social media platforms should be regulated as public utilities.",
    insights:
      "This topic explores the role of social media in society. Consider arguments about free speech, market competition, and public interest.",
  },
]

export default function ResolutionPage() {
  const [selectedResolution, setSelectedResolution] = useState("")
  const [customResolution, setCustomResolution] = useState("")
  const [showInsights, setShowInsights] = useState<number | null>(null)
  const router = useRouter()

  const handleContinue = () => {
    const resolution = selectedResolution || customResolution
    if (resolution) {
      localStorage.setItem("debateResolution", resolution)
      router.push("/side-selection")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Choose Your Resolution</h1>
          <p className="text-neutral-400 max-w-2xl mx-auto">
            Select a debate topic or create your own. Each resolution comes with strategic insights to help you prepare.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Popular Resolutions</h2>
          <div className="grid gap-4">
            {SAMPLE_RESOLUTIONS.map((item, index) => (
              <div key={index} className="bg-neutral-900 border border-neutral-700 p-4 rounded-none">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-white">{item.title}</h3>
                      <p className="text-neutral-300 mt-1">{item.resolution}</p>
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
                        onClick={() => setSelectedResolution(item.resolution)}
                        className={`rounded-none ${
                          selectedResolution === item.resolution
                            ? "bg-white text-black"
                            : "bg-neutral-800 text-white border-neutral-600 hover:bg-white hover:text-black"
                        }`}
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

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Create Custom Resolution</h2>
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
                placeholder="Resolved: [Your debate topic here]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedResolution && !customResolution}
            className="bg-white text-black hover:bg-neutral-200 rounded-none font-medium px-8 disabled:bg-neutral-700 disabled:text-neutral-400"
          >
            CONTINUE TO SIDE SELECTION
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
