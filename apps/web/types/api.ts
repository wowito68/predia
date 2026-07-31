export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
  errors?: Array<{ field: string; message: string }>
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
