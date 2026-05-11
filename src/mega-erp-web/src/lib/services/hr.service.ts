import api from '../api'
import type { Department, Employee, LeaveRequest } from '@/types/api.types'

export const hrService = {
  getDepartments: () => api.get<Department[]>('/api/hr/departments').then((r) => r.data),
  createDepartment: (data: { name: string; description?: string }) =>
    api.post<Department>('/api/hr/departments', data).then((r) => r.data),
  deleteDepartment: (id: string) => api.delete(`/api/hr/departments/${id}`),

  getEmployees: () => api.get<Employee[]>('/api/hr/employees').then((r) => r.data),
  createEmployee: (data: Omit<Employee, 'id' | 'departmentName'>) =>
    api.post<Employee>('/api/hr/employees', data).then((r) => r.data),
  updateEmployee: (id: string, data: Partial<Employee>) =>
    api.put(`/api/hr/employees/${id}`, data),
  deleteEmployee: (id: string) => api.delete(`/api/hr/employees/${id}`),

  getLeaveRequests: () => api.get<LeaveRequest[]>('/api/hr/leave-requests').then((r) => r.data),
  createLeaveRequest: (data: { employeeId: string; startDate: string; endDate: string; reason: string }) =>
    api.post<LeaveRequest>('/api/hr/leave-requests', data).then((r) => r.data),
  updateLeaveStatus: (id: string, status: string) =>
    api.put(`/api/hr/leave-requests/${id}/status`, { status }),
}
