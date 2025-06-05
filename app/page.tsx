"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Scale } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
          <p className="text-neutral-400">Master the art of Lincoln-Douglas debate</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-none">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-white">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black border-neutral-600 text-white rounded-none focus:border-white"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-white">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black border-neutral-600 text-white rounded-none focus:border-white"
                placeholder="Enter your password"
              />
            </div>
            <Button
              onClick={handleLogin}
              className="w-full bg-white text-black hover:bg-neutral-200 rounded-none font-medium"
            >
              LOGIN
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-neutral-400">
            Don't have an account? <button className="text-white underline hover:no-underline">Sign up</button>
          </p>
        </div>
      </div>
    </div>
  )
}
