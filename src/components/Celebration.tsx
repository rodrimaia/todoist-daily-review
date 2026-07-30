import { useEffect, useState } from 'react'
import { cn } from '~/lib/utils'

const COLORS: string[] = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  '#ff6b6b',
  '#ffd93d',
  '#6bcb77',
  '#4d96ff',
  '#ff922b',
  '#cc5de8',
  '#20c997',
]

interface ConfettiPiece {
  left: number
  delay: number
  duration: number
  color: string
  size: number
  height: number
  borderRadius: string
  opacity: number
}

function makePieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => {
    const shape = i % 3
    const w = 5 + (i * 2.71) % 10
    return {
      left: (i * 7.1 + 3.2) % 100,
      delay: (i * 0.173) % 5.5,
      duration: 2.3 + (i * 0.317) % 3.2,
      color: COLORS[i % COLORS.length]!,
      size: w,
      height: shape === 1 ? w * 2.5 : w,
      borderRadius: shape === 0 ? '50%' : shape === 1 ? '1px' : '2px',
      opacity: 0.6 + (i * 0.089) % 0.4,
    }
  })
}

const PIECES = makePieces(60)

const EMOJIS = [
  { emoji: '🎉', left: 8, top: 12, delay: 0.15 },
  { emoji: '✨', left: 22, top: 8, delay: 0.35 },
  { emoji: '⭐', left: 38, top: 18, delay: 0.55 },
  { emoji: '🏆', left: 55, top: 6, delay: 0.2 },
  { emoji: '🎊', left: 72, top: 14, delay: 0.65 },
  { emoji: '🔥', left: 88, top: 10, delay: 0.45 },
  { emoji: '💫', left: 15, top: 28, delay: 0.7 },
  { emoji: '🌟', left: 48, top: 24, delay: 0.85 },
  { emoji: '🎯', left: 68, top: 30, delay: 0.5 },
  { emoji: '💪', left: 82, top: 26, delay: 0.3 },
]

export function Celebration() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={cn(
        'celebration-overlay fixed inset-0 pointer-events-none z-50 overflow-hidden',
        visible ? 'opacity-100' : 'opacity-0 transition-opacity duration-700',
      )}
      aria-hidden
    >
      {/* Pulse glow background */}
      <div className="absolute inset-0 motion-safe:animate-[pulse-glow_3s_ease-in-out_infinite] bg-[radial-gradient(ellipse_at_center,var(--chart-1)_0%,transparent_28%,var(--chart-5)_45%,var(--chart-3)_65%,transparent_100%)]" />

      {/* Screen shake wrapper */}
      <div className="absolute inset-0 motion-safe:animate-[screen-shake_0.5s_ease-out]">
        {/* Confetti */}
        {PIECES.map((p, i) => (
          <div
            key={i}
            className={cn('confetti-piece', i >= 40 && 'hidden sm:block')}
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.height,
              background: p.color,
              borderRadius: p.borderRadius,
              opacity: p.opacity,
              animation: `confetti-fall ${p.duration}s ${p.delay}s linear forwards`,
            }}
          />
        ))}

        {/* Emoji bursts */}
        {EMOJIS.map((e, i) => (
          <span
            key={`emoji-${i}`}
            className="absolute text-2xl sm:text-3xl select-none"
            style={{
              left: `${e.left}%`,
              top: `${e.top}%`,
              animation: `emoji-pop 3s ${e.delay}s ease-out forwards`,
            }}
          >
            {e.emoji}
          </span>
        ))}
      </div>
    </div>
  )
}
