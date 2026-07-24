import type { CSSProperties } from 'react'

interface SliderInputProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

export default function SliderInput({ label, value, min, max, step = 1, unit = '', onChange }: SliderInputProps) {
  const fillPercent = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-0.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="wm-range flex-1"
          style={{ ['--wm-fill' as string]: `${fillPercent}%` } as CSSProperties}
        />
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const val = Number(e.target.value)
              if (val >= min && val <= max) {
                onChange(val)
              }
            }}
            className="w-14 px-1.5 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {unit && <span className="text-xs text-gray-400">{unit}</span>}
        </div>
      </div>
    </div>
  )
}
