import {
    ArrowBack,
    AssignmentOutlined,
    CheckCircleOutlined,
    LogoutOutlined,
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
import {
    useNavigate,
    useParams,
} from 'react-router';

import { useAuth } from '../auth/use-auth';
import { getLecturerExamSubmissions } from './lecturer-submission.api';
import type {
    LecturerExamSubmission,
    SubmissionStatus,
} from './lecturer-submission.types';

type StatusColor =
    | 'default'
    | 'primary'
    | 'success'
    | 'warning';

const statusConfiguration: Record<
    SubmissionStatus,
    {
        label: string;
        color: StatusColor;
    }
> = {
    IN_PROGRESS: {
        label: 'In progress',
        color: 'primary',
    },
    SUBMITTED: {
        label: 'Submitted',
        color: 'primary',
    },
    GRADING: {
        label: 'Waiting for grading',
        color: 'warning',
    },
    GRADED: {
        label: 'Graded',
        color: 'success',
    },
    EXPIRED: {
        label: 'Expired',
        color: 'default',
    },
};

function formatDate(value: string | null): string {
    if (!value) {
        return 'Not available';
    }

    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
    if (!axios.isAxiosError(error)) {
        return 'An unexpected error occurred while loading submissions.';
    }

    if (!error.response) {
        return 'The API is unavailable. Make sure the server is running.';
    }

    if (error.response.status === 403) {
        return 'You do not have permission to review submissions for this exam.';
    }

    if (error.response.status === 404) {
        return 'The requested exam was not found.';
    }

    return 'The submissions could not be loaded. Please try again.';
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
                    variant="body2"
                    color="text.secondary"
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

interface SubmissionCardProps {
    submission: LecturerExamSubmission;
    onReview: () => void;
}

function SubmissionCard({
    submission,
    onReview,
}: SubmissionCardProps) {
    const status =
        statusConfiguration[submission.status];

    const studentName =
        `${submission.student.firstName} ${submission.student.lastName}`;

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
                                component="h3"
                                variant="h6"
                                sx={{ fontWeight: 700 }}
                            >
                                {studentName}
                            </Typography>

                            <Typography color="text.secondary">
                                {submission.student.email}
                            </Typography>
                        </Box>

                        <Chip
                            label={status.label}
                            color={status.color}
                        />
                    </Stack>

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
                        <Box>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Attempt
                            </Typography>

                            <Typography sx={{ fontWeight: 700 }}>
                                {submission.attemptNumber}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Answered questions
                            </Typography>

                            <Typography sx={{ fontWeight: 700 }}>
                                {submission.answeredQuestions}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Score
                            </Typography>

                            <Typography sx={{ fontWeight: 700 }}>
                                {submission.score === null
                                    ? 'Pending'
                                    : `${submission.score} / ${submission.maxScore}`}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Percentage
                            </Typography>

                            <Typography sx={{ fontWeight: 700 }}>
                                {submission.percentage === null
                                    ? 'Pending'
                                    : `${submission.percentage}%`}
                            </Typography>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'background.default',
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: 'repeat(2, minmax(0, 1fr))',
                            },
                            gap: 1.5,
                        }}
                    >
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
                                <strong>Submitted:</strong>{' '}
                                {formatDate(submission.submittedAt)}
                            </Typography>
                        </Stack>

                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center' }}
                        >
                            <CheckCircleOutlined
                                color={
                                    submission.status === 'GRADED'
                                        ? 'success'
                                        : 'disabled'
                                }
                                fontSize="small"
                            />

                            <Typography variant="body2">
                                <strong>Graded:</strong>{' '}
                                {formatDate(submission.gradedAt)}
                            </Typography>
                        </Stack>
                    </Box>

                    {submission.feedback && (
                        <Alert severity="info">
                            <strong>Overall feedback:</strong>{' '}
                            {submission.feedback}
                        </Alert>
                    )}
                    <Button
                        variant="outlined"
                        onClick={onReview}
                    >
                        Review submission
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
}

export default function LecturerSubmissionsPage() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const {
        data,
        error,
        isLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: [
            'lecturer',
            'exams',
            examId,
            'submissions',
        ],
        queryFn: () =>
            getLecturerExamSubmissions(examId as string),
        enabled: Boolean(examId),
    });

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
            <AppBar
                position="static"
                elevation={0}
            >
                <Toolbar>
                    <Tooltip title="Back to exam">
                        <IconButton
                            color="inherit"
                            aria-label="Back to exam"
                            onClick={() =>
                                navigate(
                                    `/lecturer/exams/${examId}`,
                                )
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
                        ExamFlow
                    </Typography>

                    <Tooltip title="Refresh submissions">
                        <span>
                            <IconButton
                                color="inherit"
                                aria-label="Refresh submissions"
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

            <Container
                maxWidth="lg"
                sx={{ py: 5 }}
            >
                {!examId && (
                    <Alert severity="error">
                        A valid exam ID is required.
                    </Alert>
                )}

                {isLoading && (
                    <Box
                        sx={{
                            minHeight: 300,
                            display: 'grid',
                            placeItems: 'center',
                        }}
                    >
                        <CircularProgress aria-label="Loading submissions" />
                    </Box>
                )}

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

                {data && (
                    <Stack spacing={4}>
                        <Card variant="outlined">
                            <CardContent
                                sx={{
                                    p: {
                                        xs: 2.5,
                                        md: 3.5,
                                    },
                                }}
                            >
                                <Stack
                                    direction={{
                                        xs: 'column',
                                        md: 'row',
                                    }}
                                    spacing={2}
                                    sx={{
                                        alignItems: {
                                            xs: 'flex-start',
                                            md: 'center',
                                        },
                                    }}
                                >
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography
                                            component="h1"
                                            variant="h4"
                                            sx={{ fontWeight: 700 }}
                                        >
                                            {data.exam.title}
                                        </Typography>

                                        <Typography color="text.secondary">
                                            {data.exam.course.code} ·{' '}
                                            {data.exam.course.name}
                                        </Typography>

                                        <Typography
                                            sx={{ mt: 1 }}
                                            color="text.secondary"
                                        >
                                            Review student submissions and
                                            grading progress.
                                        </Typography>
                                    </Box>

                                    <Chip
                                        icon={<AssignmentOutlined />}
                                        label={`${data.exam.totalPoints} total points`}
                                        variant="outlined"
                                    />
                                </Stack>
                            </CardContent>
                        </Card>

                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    md: 'repeat(3, minmax(0, 1fr))',
                                },
                                gap: 2,
                            }}
                        >
                            <SummaryCard
                                label="Total submissions"
                                value={
                                    data.summary.totalSubmissions
                                }
                                color="primary.main"
                            />

                            <SummaryCard
                                label="Waiting for grading"
                                value={
                                    data.summary.waitingForGrading
                                }
                                color="warning.main"
                            />

                            <SummaryCard
                                label="Graded submissions"
                                value={data.summary.graded}
                                color="success.main"
                            />
                        </Box>

                        <Box>
                            <Typography
                                component="h2"
                                variant="h5"
                                sx={{ fontWeight: 700 }}
                            >
                                Student submissions
                            </Typography>

                            <Typography color="text.secondary">
                                Select a submission to review answers,
                                award points and provide feedback.
                            </Typography>
                        </Box>

                        {data.submissions.length === 0 ? (
                            <Alert severity="info">
                                No students have submitted this exam
                                yet.
                            </Alert>
                        ) : (
                            <Stack spacing={2}>
                                {data.submissions.map(
                                    (submission) => (
                                        <SubmissionCard
                                            key={submission.id}
                                            submission={submission}
                                            onReview={() =>
                                                navigate(
                                                    `/lecturer/exams/${data.exam.id}/submissions/${submission.id}`,
                                                )
                                            }
                                        />
                                    ),
                                )}
                            </Stack>
                        )}
                    </Stack>
                )}
            </Container>
        </Box>
    );
}