"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Scale } from "lucide-react"
import icon from "@/assets/icon.png"

export default function LoginPage() {
  const router = useRouter()

  const handleLogin = () => {
    router.push("/mode-selection")
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Scale className="w-8 h-8" />
            <h1 className="text-3xl font-bold">DEBATER</h1>
          </div>
          <p className="text-neutral-400">Master the art of debate</p>
        </div>

          <img src={icon.src} alt="Debater" className="w-full h-full mx-auto" />

        <div className="text-center">
        <Button
              onClick={handleLogin}
              className="w-full bg-white text-black border hover:bg-black hover:text-white hover:border-white rounded-none font-medium"
            >
              START DEBATING
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
        </div>
      </div>
    </div>
  )
}
