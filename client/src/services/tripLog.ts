export type TripLogPayload = {
  currentLocation: string
  pickupLocation: string
  dropoffLocation: string
  currentCycleUsedHours: number
  submittedAt: string
}

export type TripLogResponse = {
  ok: true
  id: string
  payload: TripLogPayload
}

export async function submitTripLog(payload: TripLogPayload): Promise<TripLogResponse> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, 750)
  })

  return {
    ok: true,
    id: `mock-trip-log-${Date.now()}`,
    payload,
  }
}
