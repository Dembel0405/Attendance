import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GroupsPage from './pages/GroupsPage';
import StudentsPage from './pages/StudentsPage';
import AttendancePage from './pages/AttendancePage';
import AnalyticsPage from './pages/AnalyticsPage';
import ImportPage from './pages/ImportPage';
import StudentPage from './pages/StudentPage';
import ProfilePage from './pages/ProfilePage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  return localStorage.getItem('username')
    ? <>{children}</>
    : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index           element={<DashboardPage />} />
          <Route path="groups"   element={<GroupsPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="analytics"  element={<AnalyticsPage />} />
          <Route path="import"     element={<ImportPage />} />
          <Route path="students/:id" element={<StudentPage />} />
          <Route path="profile"     element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
