import { useEffect, useRef, useState } from 'react'
import type { AddressSuggestion } from '../types/address'
import { fetchAddressSuggestions } from '../services/geoapify'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
}

export default function AddressAutocompleteInput({ label, value, onChange }: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasFocus, setHasFocus] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const blurRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)
  const skipNextFetchRef = useRef(false)

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }

    const query = value.trim()

    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false
      return
    }

    if (!hasFocus || query.length < 3) {
      requestIdRef.current += 1
      setSuggestions([])
      setIsLoading(false)
      setIsOpen(false)
      return
    }

    debounceRef.current = window.setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current
      setIsLoading(true)

      try {
        const results = await fetchAddressSuggestions(query)

        if (currentRequestId !== requestIdRef.current) {
          return
        }

        setSuggestions(results)
        setIsOpen(hasFocus && results.length > 0)
      } catch (error) {
        if (currentRequestId !== requestIdRef.current) {
          return
        }

        setSuggestions([])
        setIsOpen(false)
        console.error('Address autocomplete failed', error)
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    }, 1500)

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [hasFocus, value])

  useEffect(() => {
    return () => {
      if (blurRef.current) {
        window.clearTimeout(blurRef.current)
      }
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className="relative space-y-2">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          setHasFocus(true)
          if (suggestions.length > 0) {
            setIsOpen(true)
          }
        }}
        onBlur={() => {
          blurRef.current = window.setTimeout(() => {
            setHasFocus(false)
            setIsOpen(false)
          }, 150)
        }}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
      />

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-1300 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Loading suggestions...</div>
          ) : suggestions.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto py-1">
              {suggestions.map((suggestion) => (
                <li key={suggestion.placeId}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left transition hover:bg-slate-50"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      skipNextFetchRef.current = true
                      requestIdRef.current += 1
                      onChange(suggestion.formatted)
                      setIsOpen(false)
                      setHasFocus(false)
                    }}
                  >
                    <div className="text-sm font-medium text-slate-900">{suggestion.name}</div>
                    <div className="text-xs text-slate-500">{suggestion.formatted}</div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500">No suggestions found</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
