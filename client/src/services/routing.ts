import { api } from './api'
import type { TripRouteRequest, TripRouteResponse, TripTimelineRequest, TripTimelineResponse } from '../types/route'

export async function fetchTripRoute(payload: TripRouteRequest): Promise<TripRouteResponse> {
  const response = await api.post<TripRouteResponse>('routing/trip/', payload)
  return response.data
}

export async function fetchTripTimeline(payload: TripTimelineRequest): Promise<TripTimelineResponse> {
  const response = await api.post<TripTimelineResponse>('routing/timeline/', payload)
  return response.data
}
