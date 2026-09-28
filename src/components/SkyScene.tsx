import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Lightning from './Lightning'
import { hasLightning, type Kind, type Phase, type Sky } from '../lib/weather'

export type SceneProps = {
  sky: Sky
  kind: Kind
  phase: Phase
  code: number
  wind: number
  sunT: number | null // 0 sunrise → 1 sunset
  moonT: number // 0 sunset → 1 sunrise
  lightning: boolean
}
type Props = SceneProps

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

const EASE = [0.22, 1, 0.36, 1] as const

// Where a body sits on its arc across the sky: t=0 rising left, 0.5 overhead, 1 setting right
function arcPosition(t: number) {
  return { left: `${6 + t * 84}%`, top: `${64 - Math.sin(Math.PI * t) * 54}%` }
}

function SunBody({ t, color, dim }: { t: number; color: string; dim: boolean }) {
  const pos = arcPosition(t)
  const low = 1 - Math.sin(Math.PI * t) // 1 near the horizon
  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0, ...pos, y: 60 }}
      animate={{ opacity: dim ? 0.35 : 1, ...pos, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ duration: 1.8, ease: EASE }}
    >
      {/* Wide atmospheric glow, warmer when low */}
      <div
        className="sun-glow absolute top-1/2 left-1/2 size-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: `radial-gradient(circle, ${color}${dim ? '55' : 'aa'} 0%, ${color}33 25%, transparent 60%)` }}
      />
      {!dim && (
        <>
          {/* Slowly turning rays */}
          <div
            className="sun-rays absolute top-1/2 left-1/2 size-[110vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: `repeating-conic-gradient(from 0deg, ${color}${low > 0.6 ? '30' : '22'} 0deg 4deg, transparent 4deg 15deg)`,
              maskImage: 'radial-gradient(circle, black 8%, transparent 62%)',
              WebkitMaskImage: 'radial-gradient(circle, black 8%, transparent 62%)',
            }}
          />
          {/* The disc */}
          <div
            className="relative size-[11vmin] min-h-16 min-w-16 rounded-full"
            style={{ background: `radial-gradient(circle, #fffef6 0%, #fff7d6 45%, ${color} 100%)`, boxShadow: `0 0 60px 20px ${color}88, 0 0 140px 60px ${color}44` }}
          />
        </>
      )}
    </motion.div>
  )
}

function MoonBody({ t, glow }: { t: number; glow: string }) {
  const pos = arcPosition(t)
  return (
    <motion.div
      className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center"
      initial={{ opacity: 0, ...pos, y: 60 }}
      animate={{ opacity: 1, ...pos, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ duration: 1.8, ease: EASE }}
    >
      <div className="absolute size-[42vmin] rounded-full" style={{ background: `radial-gradient(circle, ${glow}38, transparent 60%)` }} />
      <div className="relative size-[9vmin] min-h-14 min-w-14 overflow-hidden rounded-full bg-[#f4f1e6] shadow-[0_0_40px_6px_rgba(220,225,255,0.35)]">
        {/* Craters */}
        <span className="absolute top-[22%] left-[28%] size-[22%] rounded-full bg-[#dcd6c3]" />
        <span className="absolute top-[55%] left-[52%] size-[16%] rounded-full bg-[#dcd6c3]" />
        <span className="absolute top-[38%] left-[62%] size-[10%] rounded-full bg-[#e2dcc9]" />
        {/* Shadow side */}
        <span className="absolute inset-0 rounded-full shadow-[inset_-14px_-8px_0_0_rgba(170,165,150,0.55)]" />
      </div>
    </motion.div>
  )
}

export default function SkyScene({ sky, kind, phase, code, wind, sunT, moonT, lightning }: Props) {
  const night = phase === 'night'
  const up = sunT !== null && !night
  const brightSky = kind === 'clear' || kind === 'partly'
  const showSun = up && (brightSky || kind === 'cloudy' || kind === 'fog' || kind === 'drizzle')
  const showMoon = night && brightSky
  const showStars = night && brightSky
  const heavy = hasLightning(code)
  const cloudCount = { clear: 1, partly: 5, cloudy: 10, fog: 6, drizzle: 9, rain: 12, snow: 8, storm: 14 }[kind]
  const wet = kind === 'rain' || kind === 'drizzle' || kind === 'storm' || kind === 'snow'
  const rainy = kind === 'rain' || kind === 'storm' || kind === 'drizzle'

  const stars = useMemo(
    () =>
      Array.from({ length: 170 }, (_, i) => ({
        left: rand(i) * 100,
        top: rand(i + 200) * 72,
        t: 2 + rand(i + 400) * 4,
        delay: rand(i + 600) * 4,
        size: rand(i + 800) > 0.9 ? 3 : rand(i + 900) > 0.5 ? 2 : 1,
      })),
    [],
  )

  const clouds = useMemo(
    () =>
      Array.from({ length: cloudCount }, (_, i) => ({
        top: (rainy ? -6 : 4) + rand(i + 11) * (rainy ? 40 : 48),
        w: (rainy ? 420 : 260) + rand(i + 21) * 460,
        h: (rainy ? 150 : 90) + rand(i + 31) * 140,
        d: (kind === 'storm' ? 45 : 70) + rand(i + 41) * 80,
        delay: -rand(i + 51) * 160,
      })),
    [cloudCount, rainy, kind],
  )

  // Rain clouds are grey and heavy; fair-weather clouds are white and soft
  const cloudTone =
    kind === 'storm' ? (night ? '22,26,36' : '46,52,66')
    : kind === 'rain' ? (night ? '28,34,48' : '78,88,104')
    : kind === 'drizzle' ? (night ? '40,48,64' : '120,132,150')
    : night ? '150,160,190' : '255,255,255'
  const cloudAlpha = rainy ? (heavy ? 0.9 : 0.75) : night ? 0.16 : kind === 'cloudy' ? 0.55 : 0.45

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

      <AnimatePresence>
        {showStars && (
          <motion.div key="stars" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2 }} className="absolute inset-0">
            {stars.map((s, i) => (
              <span
                key={i}
                className="star"
                style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, ['--t' as string]: `${s.t}s`, ['--delay' as string]: `${s.delay}s` }}
              />
            ))}
            {/* The odd shooting star */}
            <span className="shooting-star" style={{ top: '14%', left: '22%', ['--delay' as string]: '3s' }} />
            <span className="shooting-star" style={{ top: '26%', left: '58%', ['--delay' as string]: '11s' }} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSun && sunT !== null && <SunBody key="sun" t={sunT} color={sky.glow} dim={!brightSky} />}
        {showMoon && <MoonBody key="moon" t={moonT} glow={sky.glow} />}
      </AnimatePresence>

      {/* A low grey ceiling of cloud when it rains */}
      <AnimatePresence>
        {rainy && (
          <motion.div
            key="deck"
            className="absolute inset-x-0 top-0 h-[55vh]"
            style={{ background: `linear-gradient(180deg, rgba(${cloudTone},${heavy ? 0.95 : 0.7}) 0%, rgba(${cloudTone},0.35) 45%, transparent 100%)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6 }}
          />
        )}
      </AnimatePresence>

      {/* Clouds drift across; rain clouds are darker, bigger and faster in storms */}
      <div className="absolute inset-0">
        {clouds.map((c, i) => (
          <span
            key={`${kind}-${i}`}
            className="cloud"
            style={{
              top: `${c.top}%`,
              width: c.w,
              height: c.h,
              ['--d' as string]: `${c.d}s`,
              ['--delay' as string]: `${c.delay}s`,
              ['--a' as string]: cloudAlpha,
              ['--c' as string]: cloudTone,
            }}
          />
        ))}
      </div>

      {kind === 'fog' && <div className="absolute inset-0 bg-gradient-to-t from-white/35 via-white/10 to-transparent backdrop-blur-[2px]" />}

      {wet && <Precipitation kind={kind === 'snow' ? 'snow' : 'rain'} code={code} wind={wind} />}

      {lightning && <Lightning storm={kind === 'storm'} />}

      {/* Night dims everything a touch more */}
      <motion.div className="absolute inset-0 bg-[#01030a]" animate={{ opacity: night ? 0.25 : 0 }} transition={{ duration: 1.6 }} />

      {/* Soft vignette to anchor the content */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.25)_100%)]" />
    </div>
  )
}
