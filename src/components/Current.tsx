import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import AnimatedNumber from './AnimatedNumber'
import { iconOf, labelOf, round, type Forecast } from '../lib/weather'

export default function Current({ data, unit }: { data: Forecast; unit: string }) {
  const { now, days } = data
  const today = days[0]
  const Icon = iconOf(now.code, now.isDay)
  const label = labelOf(now.code)

  return (
    <section aria-label="Current conditions" className="text-soft">
      <div className="flex items-start">
        <p className="numeral text-[clamp(8rem,26vw,15rem)] leading-[0.8]">
          <AnimatedNumber value={round(now.temp)} />
        </p>
        <span className="numeral mt-3 text-[clamp(2.4rem,6vw,4rem)] leading-none text-white/80">°{unit}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
          transition={{ duration: 0.5 }}
          className="mt-4 flex items-center gap-3"
        >
          <Icon className="size-8" strokeWidth={1.6} aria-hidden />
          <p className="font-display text-3xl font-light tracking-tight sm:text-4xl">{label}</p>
        </motion.div>
      </AnimatePresence>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-lg text-white/80">
        <span className="flex items-center gap-1">
          <ArrowUp className="size-4" aria-hidden />
          <span className="sr-only">High</span>
          {round(today.max)}°
        </span>
        <span className="flex items-center gap-1">
          <ArrowDown className="size-4" aria-hidden />
          <span className="sr-only">Low</span>
          {round(today.min)}°
        </span>
        <span>Feels like {round(now.feelsLike)}°</span>
      </p>
    </section>
  )
}
