"use client"

import { useEffect, useRef } from "react"

interface AsciiVoiceVisualizerProps {
  isActive?: boolean
  currentSpeaker: "user" | "ai" | null
  className?: string
  aiStatus?: string // Add aiStatus prop to track AI thinking state
  audioLevel?: number // Add audioLevel prop from VAPI volume-level event (0-1)
}

export default function AsciiVoiceVisualizer({
  isActive = false,
  currentSpeaker,
  className = "",
  aiStatus = "READY", // Default to READY
  audioLevel = 0, // Default to 0
}: AsciiVoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const asciiRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | undefined>(undefined)

  // ASCII characters from darkest to lightest
  const asciiChars = " .:-=+*#%@"

  // Lowered threshold to be more responsive to lower volumes
  const SPEECH_THRESHOLD = 0.05 // Lowered from 0.25 to 0.05 for better sensitivity

  // Ball properties
  const ballRef = useRef({
    x: 0,
    y: 0,
    baseRadius: 150,
    currentRadius: 150,
    targetRadius: 150,
    hue: currentSpeaker === "user" ? 200 : currentSpeaker === "ai" ? 30 : 0,
    targetHue: currentSpeaker === "user" ? 200 : currentSpeaker === "ai" ? 30 : 0,
    particles: [] as Array<{
      x: number
      y: number
      vx: number
      vy: number
      life: number
      maxLife: number
      size: number
      angle?: number // Add angle for wave motion
      waveOffset?: number // Add offset for wave motion
    }>,
    thinkingTime: 0, // Track time for thinking animation
  })

  const addParticles = (intensity: number, canvas: HTMLCanvasElement) => {
    const ball = ballRef.current
    const particleCount = Math.floor(intensity * 5) // Reduced from 5 to 3

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 6 // Reduced from 5-10 to 3-6
      ball.particles.push({
        x: ball.x + Math.cos(angle) * ball.currentRadius,
        y: ball.y + Math.sin(angle) * ball.currentRadius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 80, // Reduced from 120 to 80
        maxLife: 80,
        size: 1.5 + Math.random() * 2, // Reduced from 2-3 to 1.5-2
        angle: angle, // Store the angle for wave motion
        waveOffset: Math.random() * Math.PI * 2, // Random offset for wave motion
      })
    }

    if (ball.particles.length > 200) {
      // Reduced from 300 to 200
      ball.particles.splice(0, ball.particles.length - 200)
    }
  }

  // Add thinking particles in a circular pattern
  const addThinkingParticles = (canvas: HTMLCanvasElement) => {
    const ball = ballRef.current
    const particleCount = 3 // Add a few particles per frame

    for (let i = 0; i < particleCount; i++) {
      // Create particles in a circular pattern around the ball
      const angle = ball.thinkingTime / 100 + i * ((Math.PI * 2) / particleCount)
      const radius = ball.currentRadius + 20 // Position just outside the ball

      ball.particles.push({
        x: ball.x + Math.cos(angle) * radius,
        y: ball.y + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.5, // Very slow movement
        vy: Math.sin(angle) * 0.5,
        life: 120, // Longer life for thinking particles
        maxLife: 120,
        size: 2 + Math.random() * 1.5,
        angle: angle, // Store the angle for wave motion
        waveOffset: ball.thinkingTime / 200, // Use thinking time for wave offset
      })
    }

    if (ball.particles.length > 300) {
      // Allow more particles for thinking state
      ball.particles.splice(0, ball.particles.length - 300)
    }
  }

  const convertToAscii = () => {
    const canvas = canvasRef.current
    const asciiDiv = asciiRef.current
    if (!canvas || !asciiDiv) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Check if canvas has valid dimensions
    if (canvas.width <= 0 || canvas.height <= 0) return

    // ASCII grid dimensions - adjusted for better aspect ratio
    const charWidth = 3
    const charHeight = 6
    const cols = Math.floor(canvas.width / charWidth)
    const rows = Math.floor(canvas.height / charHeight)

    // Ensure we have valid grid dimensions
    if (cols <= 0 || rows <= 0) return

    // Get image data with error handling
    let imageData
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    } catch (error) {
      console.warn("Failed to get image data:", error)
      return
    }

    const pixels = imageData.data

    let asciiString = ""

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Sample pixel from the center of each character cell
        const pixelX = Math.floor(x * charWidth + charWidth / 2)
        const pixelY = Math.floor(y * charHeight + charHeight / 2)

        // Ensure pixel coordinates are within bounds
        if (pixelX >= canvas.width || pixelY >= canvas.height) {
          asciiString += " "
          continue
        }

        const pixelIndex = (pixelY * canvas.width + pixelX) * 4

        // Ensure pixel index is within bounds
        if (pixelIndex >= pixels.length) {
          asciiString += " "
          continue
        }

        // Calculate brightness (0-255)
        const r = pixels[pixelIndex] || 0
        const g = pixels[pixelIndex + 1] || 0
        const b = pixels[pixelIndex + 2] || 0
        const brightness = (r + g + b) / 3

        // Map brightness to ASCII character
        const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1))
        asciiString += asciiChars[charIndex]
      }
      asciiString += "\n"
    }

    // Update ASCII display
    asciiDiv.textContent = asciiString
  }

  const animate = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Check if canvas has valid dimensions before proceeding
    if (canvas.width <= 0 || canvas.height <= 0) {
      animationRef.current = requestAnimationFrame(animate)
      return
    }

    const ball = ballRef.current

    // Update target hue based on current speaker
    ball.targetHue = currentSpeaker === "user" ? 200 : currentSpeaker === "ai" ? 30 : 0

    // Clear canvas
    ctx.fillStyle = "rgba(0, 0, 0, 1)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Analyze audio if available
    let volume = 0
    let dominantFreq = 0

    // Check if AI is in thinking state
    const isAiThinking = aiStatus === "THINKING..."

    if (isAiThinking) {
      // Increment thinking time for wave animation
      ball.thinkingTime += 1

      // Add thinking particles with wave motion
      if (ball.thinkingTime % 5 === 0) {
        // Add particles every 5 frames
        addThinkingParticles(canvas)
      }

      // Subtle pulsing for thinking state
      const pulseFactor = 0.05 * Math.sin(ball.thinkingTime / 20) + 0.95
      ball.targetRadius = ball.baseRadius * pulseFactor
    } else if (isActive && (currentSpeaker === "user" || currentSpeaker === "ai")) {
      // Use VAPI audioLevel for both user and AI speech
      volume = audioLevel || 0;

      // Always respond to audio level, even if below threshold
      if (volume > 0.03) { // Moderate threshold
        // Scale the radius based on volume level - balanced scaling
        ball.targetRadius = ball.baseRadius + Math.pow(volume, 0.7) * 80 // Balanced scaling

        // Create particles when speaking
        addParticles(volume * 0.5, canvas) // Moderate particles
      } else {
        // Return to base radius when not speaking
        ball.targetRadius = ball.baseRadius
      }
    } else if (currentSpeaker === "ai" && aiStatus === "SPEAKING") {
      // Simulate AI speaking with animated pulsing
      const time = Date.now() / 500
      const pulseFactor = Math.sin(time) * 0.2 + 0.8 // Reduced from 0.3 to 0.2
      ball.targetRadius = ball.baseRadius * pulseFactor + 30 // Reduced from 40 to 30

      // Add particles for AI speaking (less frequently)
      if (Math.random() > 0.8) {
        // Reduced from 0.7 to 0.8
        addParticles(0.2, canvas) // Reduced from 0.3 to 0.2
      }
    } else {
      // Reset thinking time when not thinking
      if (!isAiThinking) {
        ball.thinkingTime = 0
      }

      // Always show some audio response if we have audioLevel data
      if (audioLevel > 0.05) {
        // Use audio level even when not in active speaking mode - moderate
        ball.targetRadius = ball.baseRadius + Math.pow(audioLevel, 0.8) * 60
        if (audioLevel > 0.1) {
          addParticles(audioLevel * 0.3, canvas)
        }
      } else {
        // Add subtle animation when no audio is available
        const time = Date.now() / 1000
        const pulseFactor = Math.sin(time) * 0.05 + 0.95 // Gentle baseline animation
        ball.targetRadius = ball.baseRadius * pulseFactor
      }
    }

    // Balanced transitions for smooth but responsive movement
    ball.currentRadius += (ball.targetRadius - ball.currentRadius) * 0.12 // Moderate responsiveness
    ball.hue += (ball.targetHue - ball.hue) * 0.1

    // Update ball position
    ball.x = canvas.width / 2
    ball.y = canvas.height / 2

    // Determine color based on speaker
    let ballColor = "255, 255, 255" // Default white
    if (currentSpeaker === "user") {
      ballColor = "0, 191, 255" // Blue for user
    } else if (currentSpeaker === "ai") {
      if (isAiThinking) {
        ballColor = "255, 215, 0" // Gold for thinking
      } else {
        ballColor = "255, 165, 0" // Orange for AI speaking
      }
    }

    // Draw ball with gradient
    const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.currentRadius)

    gradient.addColorStop(0, `rgba(${ballColor}, 1)`)
    gradient.addColorStop(0.7, `rgba(${ballColor}, 0.8)`)
    gradient.addColorStop(1, `rgba(${ballColor}, 0.2)`)

    // Enhanced glow for better ASCII visibility
    ctx.shadowColor = `rgba(${ballColor}, 0.8)`
    ctx.shadowBlur = 30
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.currentRadius, 0, Math.PI * 2)
    ctx.fill()

    // Brighter inner core
    ctx.shadowBlur = 0
    const coreGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.currentRadius * 0.3)
    coreGradient.addColorStop(0, `rgba(255, 255, 255, 1)`)
    coreGradient.addColorStop(1, `rgba(${ballColor}, 0.5)`)

    ctx.fillStyle = coreGradient
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.currentRadius * 0.3, 0, Math.PI * 2)
    ctx.fill()

    // Draw particles with color matching the speaker
    ball.particles.forEach((particle, index) => {
      // Apply wave motion for thinking particles
      if (isAiThinking && particle.angle !== undefined && particle.waveOffset !== undefined) {
        // Calculate wave motion
        const waveAmplitude = 5 // Size of the wave
        const waveFrequency = 0.1 // Speed of the wave
        const wavePhase = ball.thinkingTime * waveFrequency + particle.waveOffset

        // Apply wave motion perpendicular to the radial direction
        const perpAngle = particle.angle + Math.PI / 2
        const waveOffset = Math.sin(wavePhase) * waveAmplitude

        particle.x += Math.cos(perpAngle) * waveOffset * 0.1
        particle.y += Math.sin(perpAngle) * waveOffset * 0.1
      }

      particle.x += particle.vx
      particle.y += particle.vy
      particle.life--

      const alpha = particle.life / particle.maxLife

      // Special color for thinking particles
      let particleColor = ballColor
      if (isAiThinking) {
        // Cycle through colors for thinking particles
        const hue = (ball.thinkingTime + index * 10) % 360
        particleColor = `${hue}, 80%, 60%`
        ctx.fillStyle = `hsla(${particleColor}, ${alpha})`
        ctx.shadowColor = `hsla(${particleColor}, ${alpha})`
      } else {
        ctx.fillStyle = `rgba(${ballColor}, ${alpha})`
        ctx.shadowColor = `rgba(${ballColor}, ${alpha})`
      }

      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2)
      ctx.fill()

      if (particle.life <= 0) {
        ball.particles.splice(index, 1)
      }
    })

    // Draw enhanced frequency bars based on VAPI volume
    if (isActive && (currentSpeaker === "user" || currentSpeaker === "ai") && !isAiThinking) {
      const barCount = 32
      const angleStep = (Math.PI * 2) / barCount

      for (let i = 0; i < barCount; i++) {
        const angle = i * angleStep

        // Get amplitude based on VAPI volume level
        let amplitude
        if (audioLevel > 0.03) {
          // Use volume level with some variation per bar for visual effect - balanced
          amplitude = Math.pow(audioLevel, 0.6) * (0.4 + 0.3 * Math.sin(Date.now() / 450 + i * 0.35))
          amplitude = Math.max(0.03, Math.min(0.8, amplitude)) // Moderate bounds
        } else {
          amplitude = 0.03 // Small baseline
        }

        const barLength = amplitude * 45 // Moderate bar length

        const startX = ball.x + Math.cos(angle) * (ball.currentRadius + 10)
        const startY = ball.y + Math.sin(angle) * (ball.currentRadius + 10)
        const endX = ball.x + Math.cos(angle) * (ball.currentRadius + 10 + barLength)
        const endY = ball.y + Math.sin(angle) * (ball.currentRadius + 10 + barLength)

        ctx.strokeStyle = `rgba(${ballColor}, ${amplitude * 1.2})`
        ctx.lineWidth = 2
        ctx.shadowColor = `rgba(${ballColor}, ${amplitude * 0.8})`
        ctx.shadowBlur = 3
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()
      }
    } else if (isAiThinking) {
      // Draw thinking pattern - orbital rings with wave effect
      const ringCount = 3

      for (let r = 0; r < ringCount; r++) {
        const segmentCount = 64
        const radius = ball.currentRadius + 20 + r * 15
        const waveAmplitude = 5 + r * 2
        const waveFrequency = 8 + r * 2

        ctx.beginPath()

        for (let i = 0; i <= segmentCount; i++) {
          const angle = (i / segmentCount) * Math.PI * 2
          const waveOffset = Math.sin(angle * waveFrequency + ball.thinkingTime / 10) * waveAmplitude
          const x = ball.x + Math.cos(angle) * (radius + waveOffset)
          const y = ball.y + Math.sin(angle) * (radius + waveOffset)

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        ctx.closePath()
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 - r * 0.1})`
        ctx.lineWidth = 2 - r * 0.5
        ctx.stroke()
      }
    }

    ctx.shadowBlur = 0

    // Convert to ASCII
    convertToAscii()

    animationRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = 500
      canvas.height = 500
    }

    resizeCanvas()

    // No longer need microphone access - using VAPI audioLevel instead
    console.log("🎭 Visualizer initialized with VAPI audio levels")

    // Add a small delay to ensure canvas is properly sized before starting animation
    setTimeout(() => {
      animate()
    }, 100)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, currentSpeaker])

  return (
    <div className={`relative ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full opacity-0" />
      <div
        ref={asciiRef}
        className="absolute inset-0 font-mono text-white whitespace-pre overflow-hidden pointer-events-none flex items-center justify-center"
        style={{
          fontSize: "5px",
          lineHeight: "5px",
          letterSpacing: "-0.5px",
        }}
      />
    </div>
  )
}
