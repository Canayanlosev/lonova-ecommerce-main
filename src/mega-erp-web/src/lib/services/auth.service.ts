import api from '../api'
import type { LoginRequest, RegisterRequest, AuthResponse } from '@/types/api.types'

export const authService = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/api/iam/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    api.post('/api/iam/auth/register', data).then((r) => r.data),
}
