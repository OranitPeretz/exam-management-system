import { useContext } from 'react';
import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AuthContext } from './auth-context';
import { AuthProvider } from './auth-provider';
import {
  loginRequest,
  logoutRequest,
  refreshSessionRequest,
} from './auth.api';
import { setAccessToken } from './token-store';
import type {
  AuthSessionResponse,
  LoginCredentials,
} from './auth.types';

vi.mock('./auth.api', () => ({
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
  refreshSessionRequest: vi.fn(),
}));

vi.mock('./token-store', () => ({
  setAccessToken: vi.fn(),
}));

const credentials: LoginCredentials = {
  email: 'student@examflow.local',
  password: 'Student123!',
};

const sessionResponse: AuthSessionResponse = {
  data: {
    user: {
      id: 'student-user',
      email: 'student@examflow.local',
      firstName: 'Noa',
      lastName: 'Levi',
      role: 'STUDENT',
    },
    accessToken: 'test-access-token',
    accessTokenExpiresIn: '15m',
  },
};

function AuthStateProbe() {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error(
      'AuthStateProbe must be rendered inside AuthProvider.',
    );
  }

  return (
    <div>
      <span data-testid="initializing">
        {String(auth.isInitializing)}
      </span>

      <span data-testid="authenticated">
        {String(auth.isAuthenticated)}
      </span>

      <span data-testid="user-email">
        {auth.user?.email ?? 'none'}
      </span>

      <button
        type="button"
        onClick={() => void auth.login(credentials)}
      >
        Test login
      </button>

      <button
        type="button"
        onClick={() => void auth.logout()}
      >
        Test logout
      </button>

      <button
        type="button"
        onClick={() => void auth.refreshSession()}
      >
        Test refresh
      </button>
    </div>
  );
}

function renderAuthProvider() {
  return render(
    <AuthProvider>
      <AuthStateProbe />
    </AuthProvider>,
  );
}

async function waitForInitialization() {
  await waitFor(() => {
    expect(
      screen.getByTestId('initializing'),
    ).toHaveTextContent('false');
  });
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(refreshSessionRequest).mockRejectedValue(
      new Error('No active session'),
    );

    vi.mocked(loginRequest).mockResolvedValue(
      sessionResponse,
    );

    vi.mocked(logoutRequest).mockResolvedValue(
      undefined,
    );
  });

  it('restores an existing session during initialization', async () => {
    vi.mocked(
      refreshSessionRequest,
    ).mockResolvedValueOnce(sessionResponse);

    renderAuthProvider();

    expect(
      screen.getByTestId('initializing'),
    ).toHaveTextContent('true');

    await waitForInitialization();

    expect(
      refreshSessionRequest,
    ).toHaveBeenCalledTimes(1);

    expect(setAccessToken).toHaveBeenCalledWith(
      'test-access-token',
    );

    expect(
      screen.getByTestId('authenticated'),
    ).toHaveTextContent('true');

    expect(
      screen.getByTestId('user-email'),
    ).toHaveTextContent(
      'student@examflow.local',
    );
  });

  it('clears the session when initialization fails', async () => {
    renderAuthProvider();

    await waitForInitialization();

    expect(
      refreshSessionRequest,
    ).toHaveBeenCalledTimes(1);

    expect(setAccessToken).toHaveBeenCalledWith(null);

    expect(
      screen.getByTestId('authenticated'),
    ).toHaveTextContent('false');

    expect(
      screen.getByTestId('user-email'),
    ).toHaveTextContent('none');
  });

  it('logs in and stores the access token', async () => {
    const user = userEvent.setup();

    renderAuthProvider();

    await waitForInitialization();

    await user.click(
      screen.getByRole('button', {
        name: 'Test login',
      }),
    );

    expect(loginRequest).toHaveBeenCalledWith(
      credentials,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('authenticated'),
      ).toHaveTextContent('true');
    });

    expect(setAccessToken).toHaveBeenLastCalledWith(
      'test-access-token',
    );

    expect(
      screen.getByTestId('user-email'),
    ).toHaveTextContent(
      'student@examflow.local',
    );
  });

  it('logs out and clears the current session', async () => {
    const user = userEvent.setup();

    vi.mocked(
      refreshSessionRequest,
    ).mockResolvedValueOnce(sessionResponse);

    renderAuthProvider();

    await waitForInitialization();

    expect(
      screen.getByTestId('authenticated'),
    ).toHaveTextContent('true');

    await user.click(
      screen.getByRole('button', {
        name: 'Test logout',
      }),
    );

    expect(logoutRequest).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(
        screen.getByTestId('authenticated'),
      ).toHaveTextContent('false');
    });

    expect(setAccessToken).toHaveBeenLastCalledWith(
      null,
    );

    expect(
      screen.getByTestId('user-email'),
    ).toHaveTextContent('none');
  });

  it('updates the session when refresh succeeds', async () => {
    const user = userEvent.setup();

    renderAuthProvider();

    await waitForInitialization();

    vi.mocked(
      refreshSessionRequest,
    ).mockResolvedValueOnce(sessionResponse);

    await user.click(
      screen.getByRole('button', {
        name: 'Test refresh',
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('authenticated'),
      ).toHaveTextContent('true');
    });

    expect(setAccessToken).toHaveBeenLastCalledWith(
      'test-access-token',
    );

    expect(
      screen.getByTestId('user-email'),
    ).toHaveTextContent(
      'student@examflow.local',
    );
  });
});