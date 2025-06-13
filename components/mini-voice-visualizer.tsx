"use client"

import { useEffect, useRef } from "react"

interface MiniVoiceVisualizerProps {
  isActive?: boolean
  color?: "blue" | "orange" | "purple"
  className?: string
}

export default function MiniVoiceVisualizer({
  isActive = false,
  color = "blue",
  className = "",
}: MiniVoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)

  const colorMap = {
    blue: "0, 191, 255",
    orange: "255, 165, 0",
    purple: "147, 51, 234",
  }

  const animate = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.fillStyle = "rgba(0, 0, 0, 1)"
    ctx.fillRect(0, 0, width, height)

    if (isActive) {
      const time = Date.now() / 200
      const barCount = 8
      const barWidth = width / barCount
      const selectedColor = colorMap[color]

      for (let i = 0; i < barCount; i++) {
        const amplitude = Math.sin(time + i * 0.5) * 0.5 + 0.5
        const barHeight = amplitude * height * 0.8

        const x = i * barWidth
        const y = (height - barHeight) / 2

        ctx.fillStyle = `rgba(${selectedColor}, ${amplitude * 0.8 + 0.2})`
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight)
      }
    } else {
      // Subtle idle animation
      const time = Date.now() / 1000
      const amplitude = Math.sin(time) * 0.1 + 0.1
      const selectedColor = colorMap[color]

      ctx.fillStyle = `rgba(${selectedColor}, ${amplitude})`
      ctx.fillRect(0, height * 0.4, width, height * 0.2)
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = 48
    canvas.height = 24

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, color])

  return (
    <div className={`relative ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
