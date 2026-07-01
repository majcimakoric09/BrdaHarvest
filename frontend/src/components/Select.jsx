import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

// Accessible custom dropdown (Radix UI primitives) replacing native <select>
// elements, which render with inconsistent, oversized browser-default
// styling that clashes with the rest of the design system. Radix handles
// keyboard navigation (arrows, type-ahead, Home/End, Esc) and focus
// management for free -- only the visual layer is custom here.
function Select({ label, name, value, onChange, options }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-brda-forest/80">
      {label}
      <RadixSelect.Root value={value} onValueChange={(v) => onChange({ target: { name, value: v } })}>
        <RadixSelect.Trigger
          aria-label={label}
          className="mt-1.5 flex w-full items-center justify-between rounded-lg border border-brda-beige bg-white px-3 py-2 text-[16px] text-brda-forest outline-none transition-colors hover:border-brda-vine/50 focus:border-brda-vine focus:ring-2 focus:ring-brda-vine/30 data-[state=open]:border-brda-vine data-[state=open]:ring-2 data-[state=open]:ring-brda-vine/30"
        >
          <RadixSelect.Value />
          <RadixSelect.Icon>
            <ChevronDown size={16} className="text-brda-forest/60" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-brda-beige bg-white shadow-lg"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option}
                  value={option}
                  className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-[16px] text-brda-forest outline-none transition-colors data-[highlighted]:bg-brda-beige-light data-[state=checked]:font-medium"
                >
                  <RadixSelect.ItemText>{option}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check size={15} className="text-brda-vine" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </label>
  )
}

export default Select
