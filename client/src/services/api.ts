import axios from 'axios'

const baseURL = import.meta.env.VITE_SERVER_SIDE_BASE_URL as string | undefined

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 8000,
})
