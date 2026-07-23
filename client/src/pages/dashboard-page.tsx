import { LogoutOutlined } from '@mui/icons-material';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Stack,
    Toolbar,
    Typography,
} from '@mui/material';
import { useNavigate } from 'react-router';
import { useAuth } from '../features/auth/use-auth';

const roleContent = {
    ADMIN: {
        title: 'Administration Dashboard',
        description: 'Manage users, roles, courses, and system activity.',
    },
    LECTURER: {
        title: 'Lecturer Dashboard',
        description: 'Create exams, manage questions, and review submissions.',
    },
    STUDENT: {
        title: 'Student Dashboard',
        description: 'View available exams, submit answers, and review grades.',
    },
} as const;

export function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) {
        return null;
    }

    const content = roleContent[user.role];

    const canManageExams =
        user.role === 'LECTURER' ||
        user.role === 'ADMIN';

    const canViewStudentExams =
        user.role === 'STUDENT';

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            navigate('/login', { replace: true });
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
            }}
        >
            <AppBar position="static" elevation={0}>
                <Toolbar>
                    <Typography
                        variant="h6"
                        sx={{ flexGrow: 1, fontWeight: 700 }}
                    >
                        ExamFlow
                    </Typography>

                    <Button
                        color="inherit"
                        startIcon={<LogoutOutlined />}
                        onClick={() => void handleLogout()}
                    >
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ py: 5 }}>
                <Stack spacing={3}>
                    <Card variant="outlined">
                        <CardContent sx={{ p: 3 }}>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                sx={{
                                    alignItems: {
                                        xs: 'flex-start',
                                        sm: 'center',
                                    },
                                }}
                            >
                                <Avatar sx={{ width: 56, height: 56 }}>
                                    {user.firstName.charAt(0)}
                                    {user.lastName.charAt(0)}
                                </Avatar>

                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography
                                        variant="h5"
                                        sx={{ fontWeight: 700 }}
                                    >
                                        Welcome, {user.firstName} {user.lastName}
                                    </Typography>

                                    <Typography color="text.secondary">
                                        {user.email}
                                    </Typography>
                                </Box>

                                <Chip label={user.role} color="primary" />
                            </Stack>
                        </CardContent>
                    </Card>

                    <Box>
                        <Typography
                            component="h1"
                            variant="h4"
                            sx={{ fontWeight: 700 }}
                        >
                            {content.title}
                        </Typography>

                        <Typography color="text.secondary">
                            {content.description}
                        </Typography>
                    </Box>

                    <Card variant="outlined">
                        <CardContent sx={{ p: 3 }}>
                            <Typography
                                variant="h6"
                                gutterBottom
                                sx={{ fontWeight: 700 }}
                            >
                                Secure workspace
                            </Typography>

                            <Typography color="text.secondary">
                                Your available actions are determined by your authenticated role.
                            </Typography>

                            {canManageExams && (
                                <Button
                                    variant="contained"
                                    sx={{ mt: 3 }}
                                    onClick={() =>
                                        navigate('/lecturer/exams')
                                    }
                                >
                                    Manage exams
                                </Button>
                            )}
                            {canViewStudentExams && (
                                <Stack
                                    direction={{
                                        xs: 'column',
                                        sm: 'row',
                                    }}
                                    spacing={2}
                                    sx={{
                                        mt: 3,
                                        alignItems: {
                                            xs: 'stretch',
                                            sm: 'center',
                                        },
                                    }}
                                >
                                    <Button
                                        variant="contained"
                                        onClick={() =>
                                            navigate('/student/exams')
                                        }
                                    >
                                        View my exams
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        onClick={() =>
                                            navigate('/student/results')
                                        }
                                    >
                                        View my results
                                    </Button>
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Stack>
            </Container>
        </Box>
    );
}