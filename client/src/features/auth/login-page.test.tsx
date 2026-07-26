import {
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

import { LoginPage } from './login-page';

const authMocks = vi.hoisted(() => ({
    login: vi.fn(),
}));

vi.mock('./use-auth', () => ({
    useAuth: () => ({
        user: null,
        isAuthenticated: false,
        isInitializing: false,
        login: authMocks.login,
        logout: vi.fn(),
        refreshSession: vi.fn(),
    }),
}));

function renderLoginPage() {
    return render(
        <MemoryRouter initialEntries={['/login']}>
            <Routes>
                <Route
                    path="/login"
                    element={<LoginPage />}
                />

                <Route
                    path="/dashboard"
                    element={<div>Dashboard page</div>}
                />
            </Routes>
        </MemoryRouter>,
    );
}

describe('LoginPage', () => {
    beforeEach(() => {
        authMocks.login.mockReset();
        authMocks.login.mockResolvedValue(undefined);
    });

    it('renders the login form', () => {
        renderLoginPage();

        expect(
            screen.getByRole('heading', {
                name: 'ExamFlow',
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('heading', {
                name: 'Welcome back',
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText('Email address'),
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText('Password'),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'Sign in',
            }),
        ).toBeInTheDocument();
    });

    it('shows validation errors for an empty form', async () => {
        const user = userEvent.setup();

        renderLoginPage();

        await user.click(
            screen.getByRole('button', {
                name: 'Sign in',
            }),
        );

        expect(
            await screen.findByText('Email is required'),
        ).toBeInTheDocument();

        expect(
            await screen.findByText('Password is required'),
        ).toBeInTheDocument();

        expect(authMocks.login).not.toHaveBeenCalled();
    });

    it('logs in and navigates to the dashboard', async () => {
        const user = userEvent.setup();

        renderLoginPage();

        await user.type(
            screen.getByLabelText('Email address'),
            'student@examflow.local',
        );

        await user.type(
            screen.getByLabelText('Password'),
            'Student123!',
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Sign in',
            }),
        );

        await waitFor(() => {
            expect(authMocks.login).toHaveBeenCalledWith({
                email: 'student@examflow.local',
                password: 'Student123!',
            });
        });

        expect(
            await screen.findByText('Dashboard page'),
        ).toBeInTheDocument();
    });

    it('shows an error for incorrect credentials', async () => {
        const user = userEvent.setup();

        authMocks.login.mockRejectedValue({
            isAxiosError: true,
            response: {
                status: 401,
                data: {},
            },
        });

        renderLoginPage();

        await user.type(
            screen.getByLabelText('Email address'),
            'student@example.com',
        );

        await user.type(
            screen.getByLabelText('Password'),
            'Incorrect123!',
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Sign in',
            }),
        );

        expect(
            await screen.findByText(
                'The email or password is incorrect.',
            ),
        ).toBeInTheDocument();

        expect(
            screen.queryByText('Dashboard page'),
        ).not.toBeInTheDocument();
    });

    it('toggles password visibility', async () => {
        const user = userEvent.setup();

        renderLoginPage();

        const passwordInput =
            screen.getByLabelText('Password');

        expect(passwordInput).toHaveAttribute(
            'type',
            'password',
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Show password',
            }),
        );

        expect(passwordInput).toHaveAttribute(
            'type',
            'text',
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Hide password',
            }),
        );

        expect(passwordInput).toHaveAttribute(
            'type',
            'password',
        );
    });
});