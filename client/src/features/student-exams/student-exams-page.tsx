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
import { getStudentExams } from './student-exam.api';
import type {
    StudentExamAvailability,
    StudentExamSummary,
} from './student-exam.types';

type ChipColor =
    | 'default'
    | 'primary'
    | 'success'
    | 'warning';

const availabilityConfiguration: Record<
    StudentExamAvailability,
    {
        label: string;
        color: ChipColor;
    }
> = {
    UPCOMING: {
        label: 'Upcoming',
        color: 'primary',
    },
    AVAILABLE: {
        label: 'Available',
        color: 'success',
    },
    ENDED: {
        label: 'Ended',
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

function formatAttemptStatus(
    status: string,
): string {
    return status
        .toLowerCase()
        .split('_')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1),
        )
        .join(' ');
}

function getErrorMessage(error: unknown): string {
    if (!axios.isAxiosError(error)) {
        return 'An unexpected error occurred while loading exams.';
    }

    if (!error.response) {
        return 'The API is unavailable. Make sure the server is running.';
    }

    if (error.response.status === 403) {
        return 'Only students can access this page.';
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

interface StudentExamCardProps {
    exam: StudentExamSummary;
    onOpen: (examId: string) => void;
}

function StudentExamCard({
    exam,
    onOpen,
}: StudentExamCardProps) {
    const availability =
        availabilityConfiguration[
        exam.availabilityStatus
        ];

    return (
        <Card variant="outlined">
            <CardContent
                sx={{
                    p: {
                        xs: 2.5,
                        md: 3,
                    },
                }}
            >
                <Stack spacing={2.5}>
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
                                variant="h5"
                                sx={{ fontWeight: 700 }}
                            >
                                {exam.title}
                            </Typography>

                            <Typography color="text.secondary">
                                {exam.course.code} · {exam.course.name}
                            </Typography>
                        </Box>

                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ flexWrap: 'wrap' }}
                        >
                            <Chip
                                label={availability.label}
                                color={availability.color}
                            />

                            {exam.canResume && (
                                <Chip
                                    label="Attempt in progress"
                                    color="warning"
                                    variant="outlined"
                                />
                            )}

                            {exam.latestAttempt &&
                                !exam.canResume && (
                                    <Chip
                                        label={`Attempt: ${formatAttemptStatus(
                                            exam.latestAttempt.status,
                                        )}`}
                                        variant="outlined"
                                    />
                                )}
                            {(exam.canStart || exam.canResume) && (
                                <Button
                                    variant="contained"
                                    onClick={() => onOpen(exam.id)}
                                >
                                    {exam.canResume
                                        ? 'Resume exam'
                                        : 'Start exam'}
                                </Button>
                            )}
                        </Stack>
                    </Stack>

                    {exam.description && (
                        <Typography color="text.secondary">
                            {exam.description}
                        </Typography>
                    )}

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
                                color="primary"
                                fontSize="small"
                            />

                            <Typography variant="body2">
                                {exam.questionCount} questions
                            </Typography>
                        </Stack>

                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center' }}
                        >
                            <ScheduleOutlined
                                color="primary"
                                fontSize="small"
                            />

                            <Typography variant="body2">
                                {exam.durationMinutes} minutes
                            </Typography>
                        </Stack>

                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center' }}
                        >
                            <AssignmentTurnedInOutlined
                                color="primary"
                                fontSize="small"
                            />

                            <Typography variant="body2">
                                {exam.attemptsUsed} of{' '}
                                {exam.maxAttempts} attempts used
                            </Typography>
                        </Stack>

                        <Typography variant="body2">
                            Passing grade: {exam.passingPercentage}%
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: 'repeat(2, minmax(0, 1fr))',
                            },
                            gap: 1,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'background.default',
                        }}
                    >
                        <Typography variant="body2">
                            <strong>Starts:</strong>{' '}
                            {formatDate(exam.startAt)}
                        </Typography>

                        <Typography variant="body2">
                            <strong>Ends:</strong>{' '}
                            {formatDate(exam.endAt)}
                        </Typography>
                    </Box>

                    {exam.canStart && (
                        <Alert severity="success">
                            This exam is available and can be started.
                        </Alert>
                    )}

                    {exam.canResume && (
                        <Alert severity="warning">
                            You have an active attempt that can be resumed.
                        </Alert>
                    )}

                    {exam.availabilityStatus ===
                        'UPCOMING' && (
                            <Alert severity="info">
                                This exam will become available at its
                                scheduled start time.
                            </Alert>
                        )}

                    {exam.availabilityStatus === 'ENDED' && (
                        <Alert severity="info">
                            The availability window for this exam has
                            ended.
                        </Alert>
                    )}

                    {exam.remainingAttempts === 0 &&
                        !exam.canResume && (
                            <Alert severity="info">
                                No attempts remain for this exam.
                            </Alert>
                        )}
                </Stack>
            </CardContent>
        </Card>
    );
}

export default function StudentExamsPage() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const {
        data: exams = [],
        error,
        isLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ['student', 'exams'],
        queryFn: getStudentExams,
    });

    const availableCount = exams.filter(
        (exam) =>
            exam.availabilityStatus === 'AVAILABLE',
    ).length;

    const upcomingCount = exams.filter(
        (exam) =>
            exam.availabilityStatus === 'UPCOMING',
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
                    <Box>
                        <Typography
                            component="h1"
                            variant="h4"
                            sx={{ fontWeight: 700 }}
                        >
                            My exams
                        </Typography>

                        <Typography color="text.secondary">
                            Review your exam schedule and attempt status.
                        </Typography>
                    </Box>

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
                            label="Available now"
                            value={availableCount}
                            icon={<ScheduleOutlined />}
                            color="#15803d"
                        />

                        <SummaryCard
                            label="Upcoming"
                            value={upcomingCount}
                            icon={<ScheduleOutlined />}
                            color="#0369a1"
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
                                minHeight: 250,
                                display: 'grid',
                                placeItems: 'center',
                            }}
                        >
                            <CircularProgress aria-label="Loading exams" />
                        </Box>
                    )}

                    {!isLoading &&
                        !error &&
                        exams.length === 0 && (
                            <Alert severity="info">
                                No exams are available for your courses.
                            </Alert>
                        )}

                    {!isLoading &&
                        !error &&
                        exams.length > 0 && (
                            <Stack spacing={2}>
                                {exams.map((exam) => (
                                    <StudentExamCard
                                        key={exam.id}
                                        exam={exam}
                                        onOpen={(examId) =>
                                            navigate(`/student/exams/${examId}/take`)
                                        }
                                    />
                                ))}
                            </Stack>
                        )}
                </Stack>
            </Container>
        </Box>
    );
}