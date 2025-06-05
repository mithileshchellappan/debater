"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X, FileText } from "lucide-react"

interface NotesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotesModal({ isOpen, onClose }: NotesModalProps) {
  const [notes, setNotes] = useState("")

  useEffect(() => {
    const savedNotes = localStorage.getItem("debateNotes")
    if (savedNotes) {
      setNotes(savedNotes)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("debateNotes", notes)
  }, [notes])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-none w-full max-w-2xl max-h-[80vh] flex flex-col font-sans">
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <h2 className="text-lg font-semibold text-white font-mono">Debate Notes</h2>
          </div>
          <Button
            onClick={onClose}
            className="bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-none p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 p-4 overflow-hidden">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Take notes during the debate..."
            className="w-full h-96 bg-black border-neutral-600 text-white rounded-none resize-none focus:border-white font-mono"
          />
        </div>
        <div className="p-4 border-t border-neutral-700">
          <p className="text-xs text-neutral-400 font-mono">Notes are automatically saved</p>
        </div>
      </div>
    </div>
  )
}
