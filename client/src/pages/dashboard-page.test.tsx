import {
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
    MemoryRouter,
    useLocation,
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
import { DashboardPage } from './dashboard-page';

vi.mock('../features/auth/use-auth', () => ({
    useAuth: vi.fn(),
}));

const logoutMock = vi.fn(async () => undefined);

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
        logout: logoutMock,
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

function CurrentLocation() {
    const location = useLocation();

    return (
        <span data-testid="current-location">
            {location.pathname}
        </span>
    );
}

function renderDashboard() {
    return render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <DashboardPage />
            <CurrentLocation />
        </MemoryRouter>,
    );
}

describe('DashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth();
    });

    it('shows all management actions to an admin', async () => {
        const user = userEvent.setup();

        mockAuthenticatedUser('ADMIN');
        renderDashboard();

        expect(
            screen.getByRole('heading', {
                name: 'Administration Dashboard',
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'Manage users',
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'Manage courses',
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'Manage exams',
            }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('button', {
                name: 'View my exams',
            }),
        ).not.toBeInTheDocument();

        await user.click(
            screen.getByRole('button', {
                name: 'Manage users',
            }),
        );

        expect(
            screen.getByTestId('current-location'),
        ).toHaveTextContent('/admin/users');
    });

    it('shows only exam management to a lecturer', async () => {
        const user = userEvent.setup();

        mockAuthenticatedUser('LECTURER');
        renderDashboard();

        expect(
            screen.getByRole('heading', {
                name: 'Lecturer Dashboard',
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'Manage exams',
            }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('button', {
                name: 'Manage users',
            }),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByRole('button', {
                name: 'Manage courses',
            }),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByRole('button', {
                name: 'View my results',
            }),
        ).not.toBeInTheDocument();

        await user.click(
            screen.getByRole('button', {
                name: 'Manage exams',
            }),
        );

        expect(
            screen.getByTestId('current-location'),
        ).toHaveTextContent('/lecturer/exams');
    });

    it('shows student exam and result actions to a student', async () => {
        const user = userEvent.setup();

        mockAuthenticatedUser('STUDENT');
        renderDashboard();

        expect(
            screen.getByRole('heading', {
                name: 'Student Dashboard',
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'View my exams',
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'View my results',
            }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('button', {
                name: 'Manage exams',
            }),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByRole('button', {
                name: 'Manage users',
            }),
        ).not.toBeInTheDocument();

        await user.click(
            screen.getByRole('button', {
                name: 'View my results',
            }),
        );

        expect(
            screen.getByTestId('current-location'),
        ).toHaveTextContent('/student/results');
    });

    it('logs out and navigates to the login page', async () => {
        const user = userEvent.setup();

        mockAuthenticatedUser('LECTURER');
        renderDashboard();

        await user.click(
            screen.getByRole('button', {
                name: 'Logout',
            }),
        );

        await waitFor(() => {
            expect(logoutMock).toHaveBeenCalledTimes(1);

            expect(
                screen.getByTestId('current-location'),
            ).toHaveTextContent('/login');
        });
    });

    it('does not render dashboard content without a user', () => {
        mockAuth({
            user: null,
            isAuthenticated: false,
        });

        renderDashboard();

        expect(
            screen.queryByText('ExamFlow'),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByRole('button', {
                name: 'Logout',
            }),
        ).not.toBeInTheDocument();
    });

});