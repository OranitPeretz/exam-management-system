import {
  lazy,
  Suspense,
} from 'react';
import {
  Box,
  CircularProgress,
} from '@mui/material';
import {
  Navigate,
  Route,
  Routes,
} from 'react-router';

import { LoginPage } from './features/auth/login-page';
import { DashboardPage } from './pages/dashboard-page';
import {
  GuestRoute,
  ProtectedRoute,
  RoleRoute,
} from './routes/auth-routes';

const LecturerExamsPage = lazy(
  () => import('./features/exams/lecturer-exams-page'),
);

const LecturerExamDetailsPage = lazy(
  () =>
    import(
      './features/exams/lecturer-exam-details-page'
    ),
);

const StudentExamsPage = lazy(
  () =>
    import(
      './features/student-exams/student-exams-page'
    ),
);

const StudentExamTakingPage = lazy(
  () =>
    import(
      './features/student-exams/student-exam-taking-page'
    ),
);

function RouteLoader() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <CircularProgress aria-label="Loading page" />
    </Box>
  );
}

function App() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route
            element={
              <RoleRoute
                allowedRoles={['LECTURER', 'ADMIN']}
              />
            }
          >
            <Route
              path="/lecturer/exams"
              element={<LecturerExamsPage />}
            />

            <Route
              path="/lecturer/exams/:examId"
              element={<LecturerExamDetailsPage />}
            />
          </Route>

          <Route
            element={
              <RoleRoute
                allowedRoles={['STUDENT']}
              />
            }
          >
            <Route
              path="/student/exams"
              element={<StudentExamsPage />}
            />
            <Route
              path="/student/exams/:examId/take"
              element={<StudentExamTakingPage />}
            />
          </Route>
        </Route>

        <Route
          path="/"
          element={
            <Navigate to="/dashboard" replace />
          }
        />

        <Route
          path="*"
          element={
            <Navigate to="/dashboard" replace />
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;