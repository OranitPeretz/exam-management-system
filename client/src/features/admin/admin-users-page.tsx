import {
    ArrowBack,
    LogoutOutlined,
    PersonAddOutlined,
    RefreshOutlined,
} from '@mui/icons-material';
import {
    Alert,
    AppBar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';
import {
    type FormEvent,
    useState,
} from 'react';
import { useNavigate } from 'react-router';

import { useAuth } from '../auth/use-auth';
import {
    createManagedUser,
    getManagedUsers,
} from './admin.api';
import type {
    AdminUserRole,
    CreatableUserRole,
    CreateManagedUserInput,
    ManagedUser,
} from './admin.types';

const initialForm: CreateManagedUserInput = {
    email: '',
    firstName: '',
    lastName: '',
    role: 'STUDENT',
    password: '',
};

function getErrorMessage(error: unknown): string {
    if (!axios.isAxiosError(error)) {
        return 'An unexpected error occurred.';
    }

    const responseMessage = error.response?.data?.error?.message;

    if (typeof responseMessage === 'string') {
        return responseMessage;
    }

    if (!error.response) {
        return 'The API is unavailable. Make sure the server is running.';
    }

    if (error.response.status === 403) {
        return 'Only administrators can manage users.';
    }

    return 'The request could not be completed. Please try again.';
}

function getRoleColor(
    role: AdminUserRole,
): 'default' | 'primary' | 'secondary' {
    if (role === 'ADMIN') {
        return 'secondary';
    }

    if (role === 'LECTURER') {
        return 'primary';
    }

    return 'default';
}

interface SummaryCardProps {
    label: string;
    value: number;
    color: string;
}

function SummaryCard({
    label,
    value,
    color,
}: SummaryCardProps) {
    return (
        <Card variant="outlined">
            <CardContent sx={{ p: 2.5 }}>
                <Typography
                    color="text.secondary"
                    variant="body2"
                >
                    {label}
                </Typography>

                <Typography
                    variant="h4"
                    sx={{
                        mt: 0.5,
                        color,
                        fontWeight: 700,
                    }}
                >
                    {value}
                </Typography>
            </CardContent>
        </Card>
    );
}

interface UserCardProps {
    user: ManagedUser;
}

function UserCard({ user }: UserCardProps) {
    return (
        <Card variant="outlined">
            <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                    <Stack
                        direction={{
                            xs: 'column',
                            sm: 'row',
                        }}
                        spacing={2}
                        sx={{
                            alignItems: {
                                xs: 'flex-start',
                                sm: 'center',
                            },
                        }}
                    >
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography
                                component="h2"
                                variant="h6"
                                sx={{ fontWeight: 700 }}
                            >
                                {user.firstName} {user.lastName}
                            </Typography>

                            <Typography color="text.secondary">
                                {user.email}
                            </Typography>
                        </Box>

                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center' }}
                        >
                            <Chip
                                label={user.role}
                                color={getRoleColor(user.role)}
                                size="small"
                            />

                            <Chip
                                label={
                                    user.isActive
                                        ? 'Active'
                                        : 'Inactive'
                                }
                                color={
                                    user.isActive
                                        ? 'success'
                                        : 'default'
                                }
                                size="small"
                                variant="outlined"
                            />
                        </Stack>
                    </Stack>

                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'background.default',
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, 1fr)',
                            },
                            gap: 1.5,
                        }}
                    >
                        <Box>
                            <Typography
                                color="text.secondary"
                                variant="body2"
                            >
                                Course enrollments
                            </Typography>

                            <Typography sx={{ fontWeight: 600 }}>
                                {user._count.enrollments}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography
                                color="text.secondary"
                                variant="body2"
                            >
                                Courses taught
                            </Typography>

                            <Typography sx={{ fontWeight: 600 }}>
                                {user._count.coursesTaught}
                            </Typography>
                        </Box>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

export default function AdminUsersPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { logout } = useAuth();

    const [dialogOpen, setDialogOpen] =
        useState(false);

    const [form, setForm] =
        useState<CreateManagedUserInput>(
            initialForm,
        );

    const {
        data,
        error,
        isLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ['admin', 'users'],
        queryFn: () => getManagedUsers(),
    });

    const createMutation = useMutation({
        mutationFn: createManagedUser,
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ['admin', 'users'],
            });

            setForm(initialForm);
            setDialogOpen(false);
        },
    });

    const users = data?.users ?? [];

    const studentCount = users.filter(
        (user) => user.role === 'STUDENT',
    ).length;

    const lecturerCount = users.filter(
        (user) => user.role === 'LECTURER',
    ).length;

    const activeCount = users.filter(
        (user) => user.isActive,
    ).length;

    const handleDialogClose = () => {
        if (createMutation.isPending) {
            return;
        }

        createMutation.reset();
        setForm(initialForm);
        setDialogOpen(false);
    };

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        createMutation.mutate({
            email: form.email.trim(),
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            role: form.role,
            password: form.password,
        });
    };

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            navigate('/login', {
                replace: true,
            });
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
            }}
        >
            <AppBar position="static">
                <Toolbar>
                    <Tooltip title="Back to dashboard">
                        <IconButton
                            color="inherit"
                            aria-label="Back to dashboard"
                            onClick={() =>
                                navigate('/dashboard')
                            }
                        >
                            <ArrowBack />
                        </IconButton>
                    </Tooltip>

                    <Typography
                        variant="h6"
                        sx={{
                            ml: 1,
                            flexGrow: 1,
                            fontWeight: 700,
                        }}
                    >
                        ExamFlow Administration
                    </Typography>

                    <Tooltip title="Refresh users">
                        <IconButton
                            color="inherit"
                            aria-label="Refresh users"
                            disabled={isFetching}
                            onClick={() => {
                                void refetch();
                            }}
                        >
                            <RefreshOutlined />
                        </IconButton>
                    </Tooltip>

                    <Button
                        color="inherit"
                        startIcon={<LogoutOutlined />}
                        onClick={() => {
                            void handleLogout();
                        }}
                    >
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Container
                maxWidth="lg"
                sx={{ py: { xs: 3, md: 5 } }}
            >
                <Stack spacing={3}>
                    <Stack
                        direction={{
                            xs: 'column',
                            sm: 'row',
                        }}
                        spacing={2}
                        sx={{
                            alignItems: {
                                xs: 'stretch',
                                sm: 'center',
                            },
                        }}
                    >
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography
                                component="h1"
                                variant="h3"
                                sx={{ fontWeight: 700 }}
                            >
                                User Management
                            </Typography>

                            <Typography color="text.secondary">
                                Create and review student and
                                lecturer accounts.
                            </Typography>
                        </Box>

                        <Button
                            variant="contained"
                            startIcon={<PersonAddOutlined />}
                            onClick={() =>
                                setDialogOpen(true)
                            }
                        >
                            Add user
                        </Button>
                    </Stack>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(3, 1fr)',
                            },
                            gap: 2,
                        }}
                    >
                        <SummaryCard
                            label="Students"
                            value={studentCount}
                            color="primary.main"
                        />

                        <SummaryCard
                            label="Lecturers"
                            value={lecturerCount}
                            color="secondary.main"
                        />

                        <SummaryCard
                            label="Active users"
                            value={activeCount}
                            color="success.main"
                        />
                    </Box>

                    {error && (
                        <Alert
                            severity="error"
                            action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => {
                                        void refetch();
                                    }}
                                >
                                    Try again
                                </Button>
                            }
                        >
                            {getErrorMessage(error)}
                        </Alert>
                    )}

                    {isLoading && (
                        <Box
                            sx={{
                                py: 8,
                                display: 'grid',
                                placeItems: 'center',
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    )}

                    {!isLoading &&
                        !error &&
                        users.length === 0 && (
                            <Alert severity="info">
                                No users were found.
                            </Alert>
                        )}

                    {!isLoading &&
                        !error &&
                        users.length > 0 && (
                            <Stack spacing={2}>
                                <Typography
                                    component="h2"
                                    variant="h5"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Registered users
                                </Typography>

                                {users.map((user) => (
                                    <UserCard
                                        key={user.id}
                                        user={user}
                                    />
                                ))}
                            </Stack>
                        )}
                </Stack>
            </Container>

            <Dialog
                open={dialogOpen}
                onClose={handleDialogClose}
                fullWidth
                maxWidth="sm"
            >
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                >
                    <DialogTitle>
                        Create a new user
                    </DialogTitle>

                    <DialogContent>
                        <Stack
                            spacing={2.5}
                            sx={{ pt: 1 }}
                        >
                            <Alert severity="info">
                                The administrator creates the
                                account and provides the initial
                                credentials to the user.
                            </Alert>

                            {createMutation.error && (
                                <Alert severity="error">
                                    {getErrorMessage(
                                        createMutation.error,
                                    )}
                                </Alert>
                            )}

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'repeat(2, 1fr)',
                                    },
                                    gap: 2,
                                }}
                            >
                                <TextField
                                    label="First name"
                                    value={form.firstName}
                                    required
                                    autoFocus
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            firstName:
                                                event.target.value,
                                        }))
                                    }
                                />

                                <TextField
                                    label="Last name"
                                    value={form.lastName}
                                    required
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            lastName:
                                                event.target.value,
                                        }))
                                    }
                                />
                            </Box>

                            <TextField
                                label="Email address"
                                type="email"
                                value={form.email}
                                required
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        email: event.target.value,
                                    }))
                                }
                            />

                            <FormControl required>
                                <InputLabel id="new-user-role-label">
                                    Role
                                </InputLabel>

                                <Select
                                    labelId="new-user-role-label"
                                    label="Role"
                                    value={form.role}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            role: event.target
                                                .value as CreatableUserRole,
                                        }))
                                    }
                                >
                                    <MenuItem value="STUDENT">
                                        Student
                                    </MenuItem>

                                    <MenuItem value="LECTURER">
                                        Lecturer
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                label="Initial password"
                                type="password"
                                value={form.password}
                                required
                                slotProps={{
                                    htmlInput: {
                                        minLength: 8,
                                        maxLength: 128,
                                        pattern:
                                            '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,128}',
                                        title:
                                            'Password must contain uppercase and lowercase letters, a number and a special character.',
                                    },
                                }}
                                helperText="Use uppercase and lowercase letters, a number and a special character."
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        password: event.target.value,
                                    }))
                                }
                            />
                        </Stack>
                    </DialogContent>

                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            onClick={handleDialogClose}
                            disabled={createMutation.isPending}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={createMutation.isPending}
                            startIcon={
                                createMutation.isPending ? (
                                    <CircularProgress
                                        color="inherit"
                                        size={18}
                                    />
                                ) : (
                                    <PersonAddOutlined />
                                )
                            }
                        >
                            {createMutation.isPending
                                ? 'Creating...'
                                : 'Create user'}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Box>
    );
}