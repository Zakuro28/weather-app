import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { Droplets, Eye, Gauge, Sun, Sunrise, Thermometer, Umbrella, Wind, type LucideIcon } from 'lucide-react'
import AnimatedNumber from './AnimatedNumber'
import { compass, minutesOfDay, round, timeLabel, uvLabel, type Clock, type Forecast } from '../lib/weather'

const EASE = [0.22, 1, 0.36, 1] as const

function Card({ icon: Icon, title, children, className = '', index }: { icon: LucideIcon; title: string; children: ReactNode; className?: string; index: number }) {
  return (
    <motion.section
      aria-label={title}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.25 + index * 0.06, duration: 0.6, ease: EASE }}
      whileHover={{ y: -4 }}
      className={`panel flex flex-col p-5 ${className}`}
    >
      <h3 className="flex items-center gap-2 text-sm text-white/65">
        <Icon className="size-4" aria-hidden /> {title}
      </h3>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </motion.section>
  )
}

function WindDial({ dir }: { dir: number }) {
  // Wind is reported as where it comes FROM; the arrow shows where it blows TO
  return (
    <svg viewBox="0 0 120 120" className="mx-auto size-40 sm:size-44" aria-hidden>
      <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      {Array.from({ length: 36 }, (_, i) => (
        <line
          key={i}
          x1="60" y1="10" x2="60" y2={i % 9 === 0 ? 18 : 14}
          stroke="white" strokeOpacity={i % 9 === 0 ? 0.8 : 0.3} strokeWidth={i % 9 === 0 ? 2 : 1}
          transform={`rotate(${i * 10} 60 60)`}
        />
      ))}
      {([['N', 60, 31], ['E', 90, 64], ['S', 60, 97], ['W', 30, 64]] as const).map(([l, x, y]) => (
        <text key={l} x={x} y={y} textAnchor="middle" className="fill-white/70 text-[10px] font-semibold">
          {l}
        </text>
      ))}
      <motion.g
        initial={{ rotate: dir }}
        animate={{ rotate: dir + 180 }}
        transition={{ type: 'spring', stiffness: 40, damping: 9, delay: 0.5 }}
        style={{ transformBox: 'view-box', transformOrigin: '60px 60px' }}
      >
        <path d="M60 22 L67 40 L60 36 L53 40 Z" fill="white" />
        <line x1="60" y1="36" x2="60" y2="96" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="60" cy="96" r="4" fill="none" stroke="white" strokeWidth="2" />
      </motion.g>
      <circle cx="60" cy="60" r="7" fill="white" />
      <circle cx="60" cy="60" r="3" fill="rgba(8,14,30,0.7)" />
    </svg>
  )
}

function UvGauge({ uv }: { uv: number }) {
  const pct = Math.min(uv / 11, 1)
  const r = 44
  const arc = Math.PI * r
  return (
    <svg viewBox="0 0 110 62" className="w-full max-w-44" aria-hidden>
      <defs>
        <linearGradient id="uv" x1="0" x2="1">
          <stop offset="0" stopColor="#6fdc8c" />
          <stop offset="0.35" stopColor="#ffe066" />
          <stop offset="0.6" stopColor="#ffa94d" />
          <stop offset="0.8" stopColor="#ff6b6b" />
          <stop offset="1" stopColor="#c77dff" />
        </linearGradient>
      </defs>
      <path d="M11 55 A44 44 0 0 1 99 55" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" strokeLinecap="round" />
      <motion.path
        d="M11 55 A44 44 0 0 1 99 55"
        fill="none" stroke="url(#uv)" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={arc}
        initial={{ strokeDashoffset: arc }}
        animate={{ strokeDashoffset: arc * (1 - pct) }}
        transition={{ duration: 1.4, delay: 0.5, ease: EASE }}
      />
      <motion.circle
        r="6" fill="white" stroke="rgba(8,14,30,0.5)" strokeWidth="2"
        initial={{ cx: 11, cy: 55 }}
        animate={{ cx: 55 - r * Math.cos(Math.PI * pct), cy: 55 - r * Math.sin(Math.PI * pct) }}
        transition={{ duration: 1.4, delay: 0.5, ease: EASE }}
      />
    </svg>
  )
}

function SunArc({ now, rise, set, clock }: { now: string; rise: string; set: string; clock: Clock }) {
  const n = minutesOfDay(now)
  const r0 = minutesOfDay(rise)
  const s0 = minutesOfDay(set)
  const up = n >= r0 && n <= s0
  const t = up ? (n - r0) / (s0 - r0) : n < r0 ? 0 : 1
  // Point on the same cubic curve the dashed path draws: (10,70) → (150,70) via (40,-6), (120,-6)
  const bez = (a: number, b: number, c: number, d: number) =>
    (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d
  const x = bez(10, 40, 120, 150)
  const y = bez(70, -6, -6, 70)
  const hoursOfLight = (s0 - r0) / 60

  return (
    <>
      <svg viewBox="0 0 160 84" className="max-h-40 w-full" aria-hidden>
        <defs>
          <linearGradient id="sunfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd98a" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </linearGradient>
          <clipPath id="sunclip">
            <motion.rect x="0" y="0" height="84" initial={{ width: 0 }} animate={{ width: x }} transition={{ duration: 1.6, delay: 0.5, ease: EASE }} />
          </clipPath>
        </defs>
        <line x1="0" y1="70" x2="160" y2="70" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        <path d="M10 70 C 40 -6, 120 -6, 150 70" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3 4" />
        <path d="M10 70 C 40 -6, 120 -6, 150 70 Z" fill="url(#sunfill)" clipPath="url(#sunclip)" />
        <motion.g initial={{ x: 10, y: 70, opacity: 0 }} animate={{ x, y, opacity: 1 }} transition={{ duration: 1.6, delay: 0.5, ease: EASE }}>
          <circle r="11" fill="#ffd98a" opacity="0.3" />
          <circle r="6" fill={up ? '#ffe7a8' : '#9aa6c4'} />
        </motion.g>
      </svg>
      <div className="mt-auto flex justify-between text-sm">
        <span>
          <span className="block text-white/55">Sunrise</span>
          {timeLabel(rise, clock)}
        </span>
        <span className="text-right">
          <span className="block text-white/55">Sunset</span>
          {timeLabel(set, clock)}
        </span>
      </div>
      <p className="sr-only">{hoursOfLight.toFixed(1)} hours of daylight</p>
    </>
  )
}

export default function Details({ data, imperial, clock }: { data: Forecast; imperial: boolean; clock: Clock }) {
  const { now, days } = data
  const today = days[0]
  const speedUnit = imperial ? 'mph' : 'km/h'
  const visibility = imperial ? now.visibility / 1609 : now.visibility / 1000
  const feelsDiff = round(now.feelsLike - now.temp)
  const feelsNote =
    feelsDiff >= 2 ? 'Humidity makes it feel warmer than it is.' : feelsDiff <= -2 ? 'Wind makes it feel cooler than it is.' : 'Feels about the same as the actual temperature.'

  return (
    <div className="grid grid-flow-dense grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Card icon={Wind} title="Wind" index={0} className="row-span-2">
        <p className="font-display text-4xl font-light">
          <AnimatedNumber value={round(now.wind)} /> <span className="text-2xl">{speedUnit}</span>
        </p>
        <p className="text-white/80">From the {compass(now.windDir)}</p>
        <div className="my-auto py-4">
          <WindDial dir={now.windDir} />
        </div>
        <p className="text-sm text-white/60">
          Gusts up to {round(now.gusts)} {speedUnit}
        </p>
      </Card>

      <Card icon={Sunrise} title="Sun" index={1} className="col-span-2">
        <SunArc now={now.time} rise={today.sunrise} set={today.sunset} clock={clock} />
      </Card>

      <Card icon={Sun} title="UV index" index={2}>
        <p className="font-display text-4xl font-light">
          <AnimatedNumber value={round(now.uv)} />
        </p>
        <p className="font-medium">{uvLabel(now.uv)}</p>
        <div className="mt-2">
          <UvGauge uv={now.uv} />
        </div>
        <p className="mt-auto text-sm text-white/60">Peaks at {round(today.uv)} today</p>
      </Card>

      <Card icon={Droplets} title="Humidity" index={3}>
        <div className="flex items-end justify-between gap-3">
          <p className="font-display text-4xl font-light">
            <AnimatedNumber value={now.humidity} />%
          </p>
          <div className="relative h-14 w-3 overflow-hidden rounded-full bg-black/20" aria-hidden>
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-sky-400 to-sky-200"
              initial={{ height: 0 }}
              animate={{ height: `${now.humidity}%` }}
              transition={{ duration: 1.2, delay: 0.5, ease: EASE }}
            />
          </div>
        </div>
        <p className="mt-auto text-sm text-white/60">Dew point is {round(now.dewPoint)}° right now</p>
      </Card>

      <Card icon={Thermometer} title="Feels like" index={4}>
        <p className="font-display text-4xl font-light">
          <AnimatedNumber value={round(now.feelsLike)} />°
        </p>
        <p className="mt-auto text-sm text-white/60">{feelsNote}</p>
      </Card>

      <Card icon={Umbrella} title="Rain" index={5}>
        <p className="font-display text-4xl font-light">
          <AnimatedNumber value={today.rainChance} />%
        </p>
        <p className="mt-auto text-sm text-white/60">
          Chance today. {now.precipitation > 0 ? `${now.precipitation} ${imperial ? 'in' : 'mm'} falling now.` : 'Dry right now.'}
        </p>
      </Card>

      <Card icon={Eye} title="Visibility" index={6} className="lg:col-span-2">
        <p className="font-display text-4xl font-light">
          <AnimatedNumber value={round(visibility)} /> <span className="text-2xl">{imperial ? 'mi' : 'km'}</span>
        </p>
        <p className="mt-auto text-sm text-white/60">{visibility >= 10 ? 'Clear view.' : visibility >= 4 ? 'Slight haze.' : 'Low visibility. Take care on the road.'}</p>
      </Card>

      <Card icon={Gauge} title="Pressure" index={7} className="lg:col-span-2">
        <p className="font-display text-4xl font-light">
          <AnimatedNumber value={round(now.pressure)} />
        </p>
        <p className="text-white/80">hPa</p>
        <p className="mt-auto text-sm text-white/60">{now.pressure < 1005 ? 'Low: unsettled weather likely.' : now.pressure > 1020 ? 'High: settled weather likely.' : 'Normal.'}</p>
      </Card>
    </div>
  )
}
