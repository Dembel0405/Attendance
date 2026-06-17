import axios from 'axios';
import type { Group, Student, AttendanceRecord, AnalyticsResponse, ImportResult } from '../types';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export interface UserProfile {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export const authAPI = {
  login:    (username: string, password: string) =>
    api.post<{ token: string; username: string }>('/auth/login', { username, password }),
  register: (username: string, password: string) =>
    api.post<{ token: string; username: string }>('/auth/register', { username, password }),
  me: () =>
    api.get<UserProfile>('/auth/me'),
  updateProfile: (username: string) =>
    api.put<{ token: string; username: string }>('/auth/profile', { username }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<{ success: boolean }>('/auth/password', { currentPassword, newPassword }),
};

export const groupsAPI = {
  getAll:  ()           => api.get<Group[]>('/groups'),
  getById: (id: number) => api.get<Group>(`/groups/${id}`),
  create:  (name: string) => api.post<Group>('/groups', { name }),
  remove:  (id: number)   => api.delete(`/groups/${id}`),
};

export const studentsAPI = {
  getAll:  (group_id?: number) =>
    api.get<Student[]>('/students', { params: group_id ? { group_id } : {} }),
  create:  (name: string, group_id?: number | null) =>
    api.post<Student>('/students', { name, group_id }),
  remove:  (id: number) => api.delete(`/students/${id}`),
};

export const attendanceAPI = {
  getAll: (params?: {
    group_id?: number; student_id?: number; date_from?: string; date_to?: string;
  }) => api.get<AttendanceRecord[]>('/attendance', { params }),
  create: (student_id: number, date: string, status: 'present' | 'absent') =>
    api.post<AttendanceRecord>('/attendance', { student_id, date, status }),
};

export const analyticsAPI = {
  getAll: (group_id?: number) =>
    api.get<AnalyticsResponse>('/analytics', { params: group_id ? { group_id } : {} }),
};

export const importAPI = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<ImportResult>('/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
