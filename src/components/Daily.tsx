import { motion } from 'motion/react'
import { CalendarDays, Droplet } from 'lucide-react'
import { dayLabel, iconOf, round, type Day } from '../lib/weather'

// Colour of a temperature, so bars run from cool blue to hot orange (in °C terms)
function tempColor(c: number) {
  const stops: [number, string][] = [
    [-10, '#8ec5ff'],
    [5, '#7fe0d0'],
    [18, '#c8ec7a'],
    [26, '#ffd36b'],
    [33, '#ff9a5c'],
    [40, '#ff6b5c'],
  ]
  for (const [limit, color] of stops) if (c <= limit) return color
  return stops[stops.length - 1][1]
}

type Props = { days: Day[]; nowTemp: number; imperial: boolean; placeKey: string }

export default function Daily({ days, nowTemp, imperial, placeKey }: Props) {
  const lo = Math.min(...days.map((d) => d.min))
  const hi = Math.max(...days.map((d) => d.max))
  const span = Math.max(hi - lo, 1)
  const toC = (t: number) => (imperial ? ((t - 32) * 5) / 9 : t)

  return (
    <section aria-labelledby="daily-title" className="panel p-5 sm:p-6">
      <h2 id="daily-title" className="flex items-center gap-2 text-sm text-white/65">
        <CalendarDays className="size-4" aria-hidden /> 7-day forecast
      </h2>
      <ol className="mt-2 divide-y divide-white/10">
        {days.map((d, i) => {
          const Icon = iconOf(d.code)
          const left = ((d.min - lo) / span) * 100
          const width = ((d.max - d.min) / span) * 100
          const nowPos = ((nowTemp - lo) / span) * 100
          return (
            <motion.li
              key={`${placeKey}-${d.date}`}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-[3.1rem_1.7rem_2.5rem_1fr_2.2rem] items-center gap-1.5 py-3 sm:grid-cols-[4.2rem_2.4rem_3rem_1fr_3rem] sm:gap-3"
            >
              <span className={i === 0 ? 'font-semibold' : 'text-white/85'}>{dayLabel(d.date, i)}</span>
              <Icon className="size-6" strokeWidth={1.6} aria-hidden />
              <span className="flex items-center gap-0.5 text-xs text-sky-200">
                {d.rainChance >= 20 && (
                  <>
                    <Droplet className="size-3 fill-sky-200/60" aria-hidden />
                    {d.rainChance}%
                  </>
                )}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-7 text-right text-white/60">
                  <span className="sr-only">Low </span>
                  {round(d.min)}°
                </span>
                <span className="relative h-1.5 flex-1 rounded-full bg-black/20" aria-hidden>
                  <motion.span
                    className="absolute inset-y-0 rounded-full"
                    style={{
                      left: `${left}%`,
                      background: `linear-gradient(90deg, ${tempColor(toC(d.min))}, ${tempColor(toC(d.max))})`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ delay: 0.35 + i * 0.06, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                  {i === 0 && (
                    <motion.span
                      className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/40 shadow"
                      style={{ left: `${Math.min(Math.max(nowPos, 0), 100)}%` }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.1, type: 'spring', stiffness: 400, damping: 15 }}
                    />
                  )}
                </span>
              </span>
              <span className="text-right font-medium">
                <span className="sr-only">High </span>
                {round(d.max)}°
              </span>
            </motion.li>
          )
        })}
      </ol>
    </section>
  )
}
