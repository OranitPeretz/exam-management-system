import {
  render,
  screen,
} from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { AuthContextValue } from '../features/auth/auth-context';
import type {
  AuthUser,
  UserRole,
} from '../features/auth/auth.types';
import { useAuth } from '../features/auth/use-auth';
import {
  GuestRoute,
  ProtectedRoute,
  RoleRoute,
} from './auth-routes';

vi.mock('../features/auth/use-auth', () => ({
  useAuth: vi.fn(),
}));

function createUser(role: UserRole): AuthUser {
  return {
    id: `${role.toLowerCase()}-user`,
    email: `${role.toLowerCase()}@examflow.local`,
    firstName: 'Test',
    lastName: 'User',
    role,
  };
}

function mockAuth(
  overrides: Partial<AuthContextValue> = {},
) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    isAuthenticated: false,
    isInitializing: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    ...overrides,
  });
}

function mockAuthenticatedUser(role: UserRole) {
  mockAuth({
    user: createUser(role),
    isAuthenticated: true,
  });
}

function renderApplicationRoutes(
  initialPath: string,
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route
            path="/login"
            element={<h1>Login page</h1>}
          />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={<h1>Dashboard page</h1>}
          />

          <Route
            element={
              <RoleRoute
                allowedRoles={['ADMIN']}
              />
            }
          >
            <Route
              path="/admin/users"
              element={<h1>Admin users page</h1>}
            />
          </Route>

          <Route
            element={
              <RoleRoute
                allowedRoles={[
                  'LECTURER',
                  'ADMIN',
                ]}
              />
            }
          >
            <Route
              path="/lecturer/exams"
              element={<h1>Lecturer exams page</h1>}
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
              element={<h1>Student exams page</h1>}
            />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('authentication route guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it('shows a loader while the session is initializing', () => {
    mockAuth({
      isInitializing: true,
    });

    renderApplicationRoutes('/student/exams');

    expect(
      screen.getByLabelText('Loading session'),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('heading', {
        name: 'Student exams page',
      }),
    ).not.toBeInTheDocument();
  });

  it('redirects an unauthenticated user to login', () => {
    renderApplicationRoutes('/student/exams');

    expect(
      screen.getByRole('heading', {
        name: 'Login page',
      }),
    ).toBeInTheDocument();
  });

  it('redirects an authenticated user away from login', () => {
    mockAuthenticatedUser('STUDENT');

    renderApplicationRoutes('/login');

    expect(
      screen.getByRole('heading', {
        name: 'Dashboard page',
      }),
    ).toBeInTheDocument();
  });

  it('allows a student to access student routes', () => {
    mockAuthenticatedUser('STUDENT');

    renderApplicationRoutes('/student/exams');

    expect(
      screen.getByRole('heading', {
        name: 'Student exams page',
      }),
    ).toBeInTheDocument();
  });

  it('blocks a student from lecturer routes', () => {
    mockAuthenticatedUser('STUDENT');

    renderApplicationRoutes('/lecturer/exams');

    expect(
      screen.getByRole('heading', {
        name: 'Dashboard page',
      }),
    ).toBeInTheDocument();
  });

  it('allows a lecturer to access lecturer routes', () => {
    mockAuthenticatedUser('LECTURER');

    renderApplicationRoutes('/lecturer/exams');

    expect(
      screen.getByRole('heading', {
        name: 'Lecturer exams page',
      }),
    ).toBeInTheDocument();
  });

  it('blocks a lecturer from admin routes', () => {
    mockAuthenticatedUser('LECTURER');

    renderApplicationRoutes('/admin/users');

    expect(
      screen.getByRole('heading', {
        name: 'Dashboard page',
      }),
    ).toBeInTheDocument();
  });

  it('allows an admin to access admin routes', () => {
    mockAuthenticatedUser('ADMIN');

    renderApplicationRoutes('/admin/users');

    expect(
      screen.getByRole('heading', {
        name: 'Admin users page',
      }),
    ).toBeInTheDocument();
  });

  it('allows an admin to access lecturer routes', () => {
    mockAuthenticatedUser('ADMIN');

    renderApplicationRoutes('/lecturer/exams');

    expect(
      screen.getByRole('heading', {
        name: 'Lecturer exams page',
      }),
    ).toBeInTheDocument();
  });
});