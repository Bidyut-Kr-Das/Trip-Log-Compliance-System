import type { AddressSuggestion } from '../types/address'
import { api } from './api'

interface BackendAutocompleteResponse {
  results?: Array<{
    place_id?: string
    formatted?: string
    lat?: number | null
    lon?: number | null
    city?: string
    state?: string
    country?: string
    postcode?: string
  }>
}

export async function fetchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) {
    return []
  }

  try {
    const response = await api.post<BackendAutocompleteResponse>('autocomplete/address/', {
      text: trimmed,
      limit: 5,
      filter: 'countrycode:us',
    })
    const data = response.data

    return (
      data.results?.flatMap((item) => {
        if (!item.place_id || item.lat === undefined || item.lon === undefined || item.lat === null || item.lon === null) {
          return []
        }

        return [
          {
            formatted: item.formatted ?? '',
            placeId: item.place_id,
            name: item.formatted ?? item.place_id,
            addressLine1: item.formatted ?? item.place_id,
            city: item.city ?? '',
            state: item.state ?? '',
            postcode: item.postcode ?? '',
            country: item.country ?? '',
            countryCode: '',
            lat: item.lat,
            lon: item.lon,
          },
        ]
      }) ?? []
    )
  } catch {
    return []
  }
}
