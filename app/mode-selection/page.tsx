"use client"

import { useRouter } from "next/navigation"
import { Scale, Users } from "lucide-react"

export default function ModeSelectionPage() {
  const router = useRouter()

  const handleLincolnDouglas = () => {
    router.push("/resolution")
  }

  const handlePanelDebate = () => {
    router.push("/panel-setup")
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Scale className="w-8 h-8" />
            <h1 className="text-4xl font-bold">DEBATER</h1>
          </div>
          <p className="text-neutral-400 max-w-2xl mx-auto">
            Choose your debate format and begin training your argumentation skills
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Lincoln-Douglas Debate */}
          <div
            className="cursor-pointer transition-all duration-300 p-8 rounded-none border-2 bg-neutral-900 text-white border-neutral-700 hover:border-white group"
            onClick={handleLincolnDouglas}
          >
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-neutral-800 border border-neutral-600 flex items-center justify-center rounded-none group-hover:bg-white group-hover:text-black transition-all">
                <Scale className="w-12 h-12" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold font-mono">LINCOLN-DOUGLAS</h2>
                <p className="text-lg font-semibold text-neutral-300">1v1 DEBATE</p>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Classic one-on-one debate format. Face off against an AI opponent in structured rounds with
                  cross-examination, rebuttals, and closing arguments.
                </p>
                <div className="pt-4">
                  <div className="text-xs text-neutral-500 space-y-1">
                    <div>• 7 structured phases</div>
                    <div>• Voice-based interaction</div>
                    <div>• Real-time feedback</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Debate */}
          <div
            className="cursor-pointer transition-all duration-300 p-8 rounded-none border-2 bg-neutral-900 text-white border-neutral-700 hover:border-white group"
            onClick={handlePanelDebate}
          >
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-neutral-800 border border-neutral-600 flex items-center justify-center rounded-none group-hover:bg-white group-hover:text-black transition-all">
                <Users className="w-12 h-12" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold font-mono">PANEL DEBATE</h2>
                <p className="text-lg font-semibold text-neutral-300">MULTI-PARTICIPANT</p>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Join a moderated panel discussion with multiple AI participants. Practice defending your position in a
                  dynamic, multi-perspective environment.
                </p>
                <div className="pt-4">
                  <div className="text-xs text-neutral-500 space-y-1">
                    <div>• AI moderator</div>
                    <div>• Multiple AI panelists</div>
                    <div>• Dynamic discussion flow</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-neutral-400 text-sm">
            Both formats support voice interaction and provide real-time feedback to improve your debate skills
          </p>
        </div>
      </div>
    </div>
  )
}
