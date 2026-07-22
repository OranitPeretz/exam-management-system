import type { ReactNode } from 'react';
import {
    ArrowBack,
    AssignmentTurnedInOutlined,
    LogoutOutlined,
    QuizOutlined,
    RefreshOutlined,
    ScheduleOutlined,
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
    Divider,
    IconButton,
    Stack,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/use-auth';
import { getManagedExams } from './exam.api';
import type {
    ExamStatus,
    ManagedExamSummary,
} from './exam.types';
import { CreateExamButton } from './create-exam-button';


type StatusColor =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'info';

const statusConfiguration: Record<
    ExamStatus,
    {
        label: string;
        color: StatusColor;
    }
> = {
    DRAFT: {
        label: 'Draft',
        color: 'default',
    },
    PUBLISHED: {
        label: 'Published',
        color: 'primary',
    },
    CLOSED: {
        label: 'Closed',
        color: 'warning',
    },
    GRADING: {
        label: 'Grading',
        color: 'secondary',
    },
    RESULTS_PUBLISHED: {
        label: 'Results published',
        color: 'success',
    },
    ARCHIVED: {
        label: 'Archived',
        color: 'default',
    },
};

function formatDate(value: string | null): string {
    if (!value) {
        return 'Not scheduled';
    }

    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
    if (
        axios.isAxiosError(error) &&
        error.response?.status === 403
    ) {
        return 'You do not have permission to view lecturer exams.';
    }

    if (axios.isAxiosError(error) && !error.response) {
        return 'The API is unavailable. Make sure the server is running.';
    }

    return 'The exams could not be loaded. Please try again.';
}

interface SummaryCardProps {
    label: string;
    value: number;
    icon: ReactNode;
    color: string;
}

function SummaryCard({
    label,
    value,
    icon,
    color,
}: SummaryCardProps) {
    return (
        <Card variant="outlined">
            <CardContent sx={{ p: 2.5 }}>
                <Stack
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: 'center' }}
                >
                    <Box
                        sx={{
                            width: 46,
                            height: 46,
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: 2,
                            color,
                            bgcolor: `${color}14`,
                        }}
                    >
                        {icon}
                    </Box>

                    <Box>
                        <Typography
                            variant="h5"
                            sx={{ fontWeight: 700 }}
                        >
                            {value}
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            {label}
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

interface ExamCardProps {
    exam: ManagedExamSummary;
}

function ExamCard({ exam }: ExamCardProps) {
    const status = statusConfiguration[exam.status];

    return (
        <Card variant="outlined">
            <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
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
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography
                                variant="h6"
                                sx={{ fontWeight: 700 }}
                            >
                                {exam.title}
                            </Typography>

                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                {exam.course.code} · {exam.course.name}
                            </Typography>
                        </Box>

                        <Chip
                            label={status.label}
                            color={status.color}
                            size="small"
                        />
                    </Stack>

                    {exam.description && (
                        <Typography color="text.secondary">
                            {exam.description}
                        </Typography>
                    )}

                    <Divider />

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, minmax(0, 1fr))',
                                md: 'repeat(4, minmax(0, 1fr))',
                            },
                            gap: 2,
                        }}
                    >
                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center' }}
                        >
                            <QuizOutlined
                                fontSize="small"
                                color="primary"
                            />
                            <Typography variant="body2">
                                {exam._count.questions} questions
                            </Typography>
                        </Stack>

                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center' }}
                        >
                            <AssignmentTurnedInOutlined
                                fontSize="small"
                                color="primary"
                            />
                            <Typography variant="body2">
                                {exam._count.attempts} attempts
                            </Typography>
                        </Stack>

                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center' }}
                        >
                            <ScheduleOutlined
                                fontSize="small"
                                color="primary"
                            />
                            <Typography variant="body2">
                                {exam.durationMinutes} minutes
                            </Typography>
                        </Stack>

                        <Typography variant="body2">
                            Passing grade: {exam.passingPercentage}%
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'background.default',
                        }}
                    >
                        <Typography
                            variant="caption"
                            color="text.secondary"
                        >
                            Availability
                        </Typography>

                        <Typography variant="body2">
                            {formatDate(exam.startAt)} — {formatDate(exam.endAt)}
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

export default function LecturerExamsPage() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const {
        data: exams = [],
        error,
        isLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ['lecturer', 'exams'],
        queryFn: getManagedExams,
    });

    const draftCount = exams.filter(
        (exam) => exam.status === 'DRAFT',
    ).length;

    const publishedCount = exams.filter(
        (exam) => exam.status === 'PUBLISHED',
    ).length;

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
                    <Tooltip title="Back to dashboard">
                        <IconButton
                            color="inherit"
                            aria-label="Back to dashboard"
                            onClick={() => navigate('/dashboard')}
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
                        ExamFlow
                    </Typography>

                    <Tooltip title="Refresh exams">
                        <span>
                            <IconButton
                                color="inherit"
                                aria-label="Refresh exams"
                                disabled={isFetching}
                                onClick={() => void refetch()}
                            >
                                {isFetching ? (
                                    <CircularProgress
                                        size={20}
                                        color="inherit"
                                    />
                                ) : (
                                    <RefreshOutlined />
                                )}
                            </IconButton>
                        </span>
                    </Tooltip>

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
                <Stack spacing={4}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
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
                                variant="h4"
                                sx={{ fontWeight: 700 }}
                            >
                                Exam management
                            </Typography>

                            <Typography color="text.secondary">
                                Review exams, schedules, questions, and submission activity.
                            </Typography>
                        </Box>

                        <CreateExamButton />
                    </Stack>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(3, minmax(0, 1fr))',
                            },
                            gap: 2,
                        }}
                    >
                        <SummaryCard
                            label="Total exams"
                            value={exams.length}
                            icon={<QuizOutlined />}
                            color="#4f46e5"
                        />

                        <SummaryCard
                            label="Draft exams"
                            value={draftCount}
                            icon={<QuizOutlined />}
                            color="#64748b"
                        />

                        <SummaryCard
                            label="Published exams"
                            value={publishedCount}
                            icon={<AssignmentTurnedInOutlined />}
                            color="#15803d"
                        />
                    </Box>

                    {error && (
                        <Alert
                            severity="error"
                            action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => void refetch()}
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
                                minHeight: 220,
                                display: 'grid',
                                placeItems: 'center',
                            }}
                        >
                            <CircularProgress aria-label="Loading exams" />
                        </Box>
                    )}

                    {!isLoading && !error && exams.length === 0 && (
                        <Alert severity="info">
                            No exams have been created yet.
                        </Alert>
                    )}

                    {!isLoading && !error && exams.length > 0 && (
                        <Stack spacing={2}>
                            {exams.map((exam) => (
                                <ExamCard key={exam.id} exam={exam} />
                            ))}
                        </Stack>
                    )}
                </Stack>
            </Container>
        </Box>
    );
}