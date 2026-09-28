import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Kind, Phase, Sky } from '../lib/weather'

type Props = { sky: Sky; kind: Kind; phase: Phase; code: number; wind: number }

// Seeded so stars and clouds don't jump around on every render
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function Precipitation({ kind, code, wind }: { kind: Kind; code: number; wind: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || reduce) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const snow = kind === 'snow'
    const heavy = [55, 65, 67, 75, 82, 86, 95, 96, 99].includes(code)
    const light = [51, 56, 61, 71, 80, 85].includes(code)
    const count = snow ? (heavy ? 260 : light ? 90 : 160) : heavy ? 420 : light ? 120 : 240
    const slant = Math.min(wind, 50) / 50 // 0..1

    let w = 0
    let h = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const drops = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: 0.4 + Math.random() * 0.6, // depth: nearer drops are bigger and faster
      phase: Math.random() * Math.PI * 2,
    }))

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 3)
      last = now
      ctx.clearRect(0, 0, w, h)

      if (snow) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        for (const p of drops) {
          p.phase += 0.02 * dt
          p.y += (0.6 + p.z * 1.4) * dt
          p.x += (Math.sin(p.phase) * 0.6 + slant * 1.5) * dt
          if (p.y > h + 5) { p.y = -5; p.x = Math.random() * w }
          if (p.x > w + 5) p.x = -5
          ctx.globalAlpha = 0.35 + p.z * 0.6
          ctx.beginPath()
          ctx.arc(p.x, p.y, 0.8 + p.z * 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        ctx.strokeStyle = 'rgba(210,225,255,0.55)'
        ctx.lineCap = 'round'
        for (const p of drops) {
          const speed = (10 + p.z * 14) * dt
          const dx = (0.15 + slant * 0.6) * speed
          p.y += speed
          p.x += dx
          if (p.y > h + 20) { p.y = -20; p.x = Math.random() * (w + 200) - 200 }
          ctx.globalAlpha = 0.25 + p.z * 0.5
          ctx.lineWidth = 0.6 + p.z * 1.1
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x - dx * 1.2, p.y - speed * 1.2)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [kind, code, wind, reduce])

  return <canvas ref={ref} className="absolute inset-0 size-full" aria-hidden />
}

export default function SkyScene({ sky, kind, phase, code, wind }: Props) {
  const night = phase === 'night'
  const showSun = !night && (kind === 'clear' || kind === 'partly')
  const showMoon = night && (kind === 'clear' || kind === 'partly')
  const showStars = night && (kind === 'clear' || kind === 'partly')
  const cloudCount = { clear: 1, partly: 5, cloudy: 9, fog: 6, drizzle: 7, rain: 8, snow: 7, storm: 9 }[kind]
  const wet = kind === 'rain' || kind === 'drizzle' || kind === 'storm' || kind === 'snow'

  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: rand(i) * 100,
        top: rand(i + 200) * 65,
        t: 2 + rand(i + 400) * 4,
        delay: rand(i + 600) * 4,
        size: rand(i + 800) > 0.85 ? 3 : 2,
      })),
    [],
  )

  const clouds = useMemo(
    () =>
      Array.from({ length: cloudCount }, (_, i) => ({
        top: 4 + rand(i + 11) * 48,
        w: 260 + rand(i + 21) * 420,
        h: 90 + rand(i + 31) * 120,
        d: 70 + rand(i + 41) * 90,
        delay: -rand(i + 51) * 160,
      })),
    [cloudCount],
  )

  const cloudAlpha = night ? 0.18 : kind === 'cloudy' || kind === 'storm' ? 0.55 : 0.45

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Sky gradient crossfades when conditions or time of day change */}
      <AnimatePresence initial={false}>
        <motion.div
          key={sky.key}
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.bottom} 100%)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
        />
      </AnimatePresence>

      {/* Horizon glow */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[60vh]"
        animate={{ background: `radial-gradient(ellipse 80% 70% at 50% 110%, ${sky.glow}55, transparent 70%)` }}
        transition={{ duration: 1.6 }}
      />

      {showStars && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }} className="absolute inset-0">
          {stars.map((s, i) => (
            <span
              key={i}
              className="star"
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, ['--t' as string]: `${s.t}s`, ['--delay' as string]: `${s.delay}s` }}
            />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showSun && (
          <motion.div
            key="sun"
            initial={{ opacity: 0, y: 80, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[8%] right-[10%]"
          >
            <div className="sun-glow size-[34vmin] rounded-full" style={{ background: `radial-gradient(circle, ${sky.glow} 0%, ${sky.glow}88 18%, transparent 62%)` }} />
          </motion.div>
        )}
        {showMoon && (
          <motion.div
            key="moon"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[10%] right-[12%] grid place-items-center"
          >
            <div className="absolute size-[30vmin] rounded-full" style={{ background: `radial-gradient(circle, ${sky.glow}40, transparent 60%)` }} />
            <div className="relative size-[9vmin] min-h-14 min-w-14 rounded-full bg-[#f4f1e6] shadow-[inset_-10px_-6px_0_0_#d8d2bd]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clouds drift across; storms darken them */}
      <div className="absolute inset-0">
        {clouds.map((c, i) => (
          <span
            key={i}
            className="cloud"
            style={{
              top: `${c.top}%`,
              width: c.w,
              height: c.h,
              ['--d' as string]: `${c.d}s`,
              ['--delay' as string]: `${c.delay}s`,
              ['--a' as string]: kind === 'storm' ? 0.25 : cloudAlpha,
            }}
          />
        ))}
      </div>

      {kind === 'fog' && <div className="absolute inset-0 bg-gradient-to-t from-white/35 via-white/10 to-transparent backdrop-blur-[2px]" />}

      {wet && <Precipitation kind={kind === 'snow' ? 'snow' : 'rain'} code={code} wind={wind} />}

      {kind === 'storm' && <div className="flash absolute inset-0 bg-white" />}

      {/* Soft vignette to anchor the content */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.25)_100%)]" />
    </div>
  )
}
