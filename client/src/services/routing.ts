import { api } from './api'
import type { TripRouteRequest, TripRouteResponse } from '../types/route'

export async function fetchTripRoute(payload: TripRouteRequest): Promise<TripRouteResponse> {
  const response = await api.post<TripRouteResponse>('routing/trip/', payload)
  return response.data
}
