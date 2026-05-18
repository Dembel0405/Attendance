export interface Group {
  id: number;
  name: string;
  student_count: number;
  created_at: string;
}

export interface Student {
  id: number;
  name: string;
  group_id: number | null;
  group_name: string | null;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name: string;
  group_id: number | null;
  group_name: string | null;
  date: string;
  status: 'present' | 'absent';
  created_at: string;
}

export interface MonthlyStats {
  month: string;
  present: number;
  absent: number;
  rate: number;
}

export interface StudentAnalytics {
  id: number;
  name: string;
  group_name: string | null;
  group_id: number | null;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: number;
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
  consecutiveAbsences: number;
  trend: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
  trendDiff: number;
  recommendation: string;
  monthlyStats: MonthlyStats[];
}

export interface AnalyticsSummary {
  total: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  unknownRisk: number;
  avgAttendance: number;
}

export interface AnalyticsResponse {
  students: StudentAnalytics[];
  summary: AnalyticsSummary;
}

export interface ImportResult {
  success: boolean;
  message: string;
  created: { groups: number; students: number; attendance: number };
  skipped: number;
  errors: string[];
}
