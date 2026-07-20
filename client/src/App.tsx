import { Navigate, Route, Routes } from 'react-router';
import { LoginPage } from './features/auth/login-page';
import { DashboardPage } from './pages/dashboard-page';
import { GuestRoute, ProtectedRoute } from './routes/auth-routes';

function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;