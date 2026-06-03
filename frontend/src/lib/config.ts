export const config = {
  backend: {
    url: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:9090",
    apiPrefix: "/api/v1",
  },
  get apiBase() {
    return `${this.backend.url}${this.backend.apiPrefix}`
  },
}

export function getBackendUrl(): string {
  return config.apiBase
}
