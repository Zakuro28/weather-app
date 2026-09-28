import { useId, useMemo } from 'react'
import { motion } from 'motion/react'
import { Clock, Droplet } from 'lucide-react'
import { hourLabel, iconOf, round, type Clock as ClockFormat, type Hour } from '../lib/weather'

const COL = 68
const CHART_H = 92
const PAD = 18

// Catmull-Rom to cubic Bézier: a smooth line through every point
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`
  }
  return d
}

export default function Hourly({ hours, placeKey, clock }: { hours: Hour[]; placeKey: string; clock: ClockFormat }) {
  const gid = useId().replace(/:/g, '')
  const { pts, line, area, width } = useMemo(() => {
    const temps = hours.map((h) => h.temp)
    const min = Math.min(...temps)
    const max = Math.max(...temps)
    const span = Math.max(max - min, 1)
    const pts = hours.map((h, i) => [i * COL + COL / 2, PAD + (1 - (h.temp - min) / span) * (CHART_H - PAD * 2)] as [number, number])
    const line = smooth(pts)
    const width = hours.length * COL
    const area = `${line} L ${pts[pts.length - 1][0]} ${CHART_H} L ${pts[0][0]} ${CHART_H} Z`
    return { pts, line, area, width }
  }, [hours])

  return (
    <section aria-labelledby="hourly-title" className="panel p-5 sm:p-6">
      <h2 id="hourly-title" className="flex items-center gap-2 text-sm text-white/65">
        <Clock className="size-4" aria-hidden /> Next 24 hours
      </h2>

      <div className="no-scrollbar -mx-5 mt-4 overflow-x-auto px-5 sm:-mx-6 sm:px-6" tabIndex={0} aria-label="Hourly forecast, scroll sideways">
        <div className="relative" style={{ width }}>
          {/* Times and icons */}
          <ol className="flex">
            {hours.map((h, i) => {
              const Icon = iconOf(h.code, h.isDay)
              return (
                <motion.li
                  key={`${placeKey}-${h.time}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.025, duration: 0.4 }}
                  className="flex shrink-0 flex-col items-center gap-2.5"
                  style={{ width: COL }}
                >
                  <span className={`text-sm ${i === 0 ? 'font-semibold text-white' : 'text-white/70'}`}>{i === 0 ? 'Now' : hourLabel(h.time, clock)}</span>
                  <Icon className="size-6" strokeWidth={1.6} aria-hidden />
                  <span className="sr-only">
                    {round(h.temp)} degrees{h.rainChance >= 20 ? `, ${h.rainChance}% chance of rain` : ''}
                  </span>
                </motion.li>
              )
            })}
          </ol>

          {/* Temperature curve */}
          <svg width={width} height={CHART_H + 26} className="mt-2 overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="white" stopOpacity="0.28" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`${gid}-stroke`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#ffe29a" />
                <stop offset="0.5" stopColor="#ffffff" />
                <stop offset="1" stopColor="#a8d4ff" />
              </linearGradient>
            </defs>
            <motion.path
              key={`area-${placeKey}`}
              d={area}
              fill={`url(#${gid}-fill)`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            />
            <motion.path
              key={`line-${placeKey}`}
              d={line}
              fill="none"
              stroke={`url(#${gid}-stroke)`}
              strokeWidth={2.5}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
            />
            {pts.map(([x, y], i) => (
              <motion.g
                key={`${placeKey}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.045 }}
              >
                <circle cx={x} cy={y} r={i === 0 ? 5 : 3} fill="white" stroke={i === 0 ? 'rgba(255,255,255,0.35)' : 'none'} strokeWidth={i === 0 ? 6 : 0} />
                <text x={x} y={y - 12} textAnchor="middle" className="fill-white text-[13px] font-medium">
                  {round(hours[i].temp)}°
                </text>
              </motion.g>
            ))}
          </svg>

          {/* Rain chance */}
          <ol className="flex" aria-hidden>
            {hours.map((h, i) => (
              <li key={i} className="flex shrink-0 items-center justify-center gap-1 text-xs text-sky-200" style={{ width: COL }}>
                {h.rainChance >= 20 && (
                  <>
                    <Droplet className="size-3 fill-sky-200/60" /> {h.rainChance}%
                  </>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
