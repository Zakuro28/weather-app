import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

type Bolt = { id: number; main: string; branches: string[]; x: number; w: number; h: number }

// A jagged path from (x, y) heading down until it reaches `endY`
function jag(x: number, y: number, endY: number, spread: number) {
  let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`
  const points: [number, number][] = [[x, y]]
  while (y < endY) {
    y += 14 + Math.random() * 26
    x += (Math.random() - 0.5) * spread
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`
    points.push([x, y])
  }
  return { d, points }
}

function makeBolt(id: number): Bolt {
  const w = window.innerWidth
  const h = window.innerHeight
  const x = w * (0.12 + Math.random() * 0.76)
  const main = jag(x, -10, h * (0.45 + Math.random() * 0.35), 48)
  // Two to four forks splitting off the main channel
  const branches = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => {
    const [bx, by] = main.points[2 + Math.floor(Math.random() * (main.points.length - 3))] ?? main.points[0]
    return jag(bx, by, by + h * (0.08 + Math.random() * 0.14), 60).d
  })
  return { id, main: main.d, branches, x, w, h }
}

/** Random lightning strikes. `storm` strikes more often than heavy rain. */
export default function Lightning({ storm }: { storm: boolean }) {
  const reduce = useReducedMotion()
  const [bolt, setBolt] = useState<Bolt | null>(null)

  useEffect(() => {
    if (reduce) return
    let id = 0
    let timer: ReturnType<typeof setTimeout>
    const schedule = (first = false) => {
      const [min, max] = storm ? [2500, 7000] : [5000, 12000]
      const wait = first ? 1200 : min + Math.random() * (max - min)
      timer = setTimeout(() => {
        setBolt(makeBolt(++id))
        schedule()
      }, wait)
    }
    schedule(true)
    return () => clearTimeout(timer)
  }, [storm, reduce])

  if (!bolt) return null

  // Two pulses per strike, well apart, keeping flashes under 3 per second
  const times = [0, 0.06, 0.22, 0.34, 1]
  return (
    <div key={bolt.id} className="pointer-events-none absolute inset-0">
      {/* Whole sky lights up */}
      <motion.div
        className="absolute inset-0 bg-[#dfe7ff]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0.04, 0.28, 0] }}
        transition={{ duration: 0.9, times }}
      />
      {/* Clouds glow above the strike */}
      <motion.div
        className="absolute top-0 size-[70vmin] -translate-x-1/2 -translate-y-1/3 rounded-full"
        style={{ left: bolt.x, background: 'radial-gradient(circle, rgba(220,230,255,0.9), transparent 65%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.1, 0.8, 0] }}
        transition={{ duration: 1, times }}
      />
      <motion.svg
        width={bolt.w}
        height={bolt.h}
        className="absolute inset-0"
        style={{ filter: 'drop-shadow(0 0 6px #cdd9ff) drop-shadow(0 0 18px #8fa8ff)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.15, 1, 0] }}
        transition={{ duration: 0.8, times }}
      >
        {bolt.branches.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#e8eeff" strokeWidth={1.2} strokeLinejoin="round" opacity={0.75} />
        ))}
        <path d={bolt.main} fill="none" stroke="#ffffff" strokeWidth={2.6} strokeLinejoin="round" />
      </motion.svg>
    </div>
  )
}
