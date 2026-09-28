import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'

// Counts smoothly from the previous value to the new one
export default function AnimatedNumber({ value, className, duration = 1.2 }: { value: number; className?: string; duration?: number }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => String(Math.round(v)))

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [mv, value, duration])

  return <motion.span className={className}>{text}</motion.span>
}
