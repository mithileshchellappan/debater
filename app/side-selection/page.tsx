"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function SideSelectionPage() {
  const [selectedSide, setSelectedSide] = useState<"affirmative" | "negative" | null>(null)
  const [resolution, setResolution] = useState("")
  const router = useRouter()

  useEffect(() => {
    const storedResolution = localStorage.getItem("debateResolution")
    if (storedResolution) {
      setResolution(storedResolution)
    }
  }, [])

  const handleContinue = () => {
    if (selectedSide) {
      localStorage.setItem("debateSide", selectedSide)
      router.push("/debate")
    }
  }

  const lincolnAscii = `
    ████████████████████████████████
    ██                            ██
    ██    ████████████████████    ██
    ██    ██              ██    ██
    ██    ██    ████████  ██    ██
    ██    ██    ██    ██  ██    ██
    ██    ██    ██    ██  ██    ██
    ██    ██    ████████  ██    ██
    ██    ██              ██    ██
    ██    ████████████████████    ██
    ██                            ██
    ████████████████████████████████
  `

  const douglasAscii = `
    ████████████████████████████████
    ██                            ██
    ██    ████████████████████    ██
    ██    ██              ██    ██
    ██    ██  ████████    ██    ██
    ██    ██  ██    ██    ██    ██
    ██    ██  ██    ██    ██    ██
    ██    ██  ████████    ██    ██
    ██    ██              ██    ██
    ██    ████████████████████    ██
    ██                            ██
    ████████████████████████████████
  `

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Choose Your Side</h1>
          <div className="max-w-4xl mx-auto">
            <p className="text-neutral-400 mb-4">Resolution:</p>
            <p className="text-lg font-medium border border-neutral-700 p-4 bg-neutral-900 text-white rounded-none">
              {resolution}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div
            className={`cursor-pointer transition-all duration-300 p-8 rounded-none border-2 ${
              selectedSide === "affirmative"
                ? "bg-white text-black border-white"
                : "bg-neutral-900 text-white border-neutral-700 hover:border-white"
            }`}
            onClick={() => setSelectedSide("affirmative")}
          >
            <div className="text-center space-y-6">
              <div className="text-xs font-mono leading-none whitespace-pre">{lincolnAscii}</div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">ABRAHAM LINCOLN</h2>
                <p className="text-lg font-semibold">AFFIRMATIVE</p>
                <p className="text-sm opacity-80">
                  Argue in favor of the resolution. Present compelling evidence and reasoning to support the
                  proposition.
                </p>
              </div>
              {selectedSide === "affirmative" && <div className="text-sm font-medium">✓ SELECTED</div>}
            </div>
          </div>

          <div
            className={`cursor-pointer transition-all duration-300 p-8 rounded-none border-2 ${
              selectedSide === "negative"
                ? "bg-white text-black border-white"
                : "bg-neutral-900 text-white border-neutral-700 hover:border-white"
            }`}
            onClick={() => setSelectedSide("negative")}
          >
            <div className="text-center space-y-6">
              <div className="text-xs font-mono leading-none whitespace-pre">{douglasAscii}</div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">STEPHEN DOUGLAS</h2>
                <p className="text-lg font-semibold">NEGATIVE</p>
                <p className="text-sm opacity-80">
                  Argue against the resolution. Challenge the proposition with strong counterarguments and evidence.
                </p>
              </div>
              {selectedSide === "negative" && <div className="text-sm font-medium">✓ SELECTED</div>}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedSide}
            className="bg-white text-black hover:bg-neutral-200 rounded-none font-medium px-8 disabled:bg-neutral-700 disabled:text-neutral-400"
          >
            START DEBATE TRAINING
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
