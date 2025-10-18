"use client"

import { Input } from "./ui/input"

interface MinutesInputProps {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
  stepNumber: string
  optional?: boolean
}

export function MinutesInput({ label, description, value, onChange, stepNumber, optional = false }: MinutesInputProps) {
  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-serif italic text-lg">{stepNumber}.</span>
        </div>
        <div>
          <h2 className="text-3xl mb-1 text-balance">
            {label} {optional && <span className="italic">{"(optional)"}</span>}
          </h2>
          <p className="text-muted-foreground font-sans text-sm">{description}</p>
        </div>
      </div>

      <Input
        type="number"
        placeholder="Enter minutes..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border-border text-black placeholder:text-gray-500"
      />
    </div>
  )
}
