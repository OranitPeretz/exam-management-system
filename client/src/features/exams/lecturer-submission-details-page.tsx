import {
    ArrowBack,
    CheckCircleOutlined,
    LogoutOutlined,
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
    Divider,
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
import { getLecturerSubmissionDetails } from './lecturer-submission.api';
import type {
    LecturerSubmissionQuestion,
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
        return 'An unexpected error occurred while loading the submission.';
    }

    if (!error.response) {
        return 'The API is unavailable. Make sure the server is running.';
    }

    if (error.response.status === 403) {
        return 'You do not have permission to review this submission.';
    }

    if (error.response.status === 404) {
        return 'The requested submission was not found.';
    }

    return 'The submission could not be loaded. Please try again.';
}

interface QuestionAnswerProps {
    question: LecturerSubmissionQuestion;
}

function QuestionAnswer({
    question,
}: QuestionAnswerProps) {
    const { answer } = question;

    if (!answer) {
        return (
            <Alert severity="warning">
                The student did not answer this question.
            </Alert>
        );
    }

    if (
        (
            question.type.code === 'SINGLE_CHOICE' ||
            question.type.code === 'MULTIPLE_CHOICE' ||
            question.type.code === 'TRUE_FALSE'
        ) &&
        question.options.length > 0
    ) {
        return (
            <Stack spacing={1}>
                {question.options.map((option) => {
                    const isSelected =
                        answer.selectedOptionIds.includes(option.id);

                    return (
                        <Box
                            key={option.id}
                            sx={{
                                p: 1.5,
                                border: 1,
                                borderColor: option.isCorrect
                                    ? 'success.main'
                                    : 'divider',
                                borderRadius: 2,
                                bgcolor: isSelected
                                    ? 'action.selected'
                                    : 'background.paper',
                            }}
                        >
                            <Stack
                                direction={{
                                    xs: 'column',
                                    sm: 'row',
                                }}
                                spacing={1}
                                sx={{
                                    alignItems: {
                                        xs: 'flex-start',
                                        sm: 'center',
                                    },
                                }}
                            >
                                <Typography sx={{ flexGrow: 1 }}>
                                    {option.position}. {option.text}
                                </Typography>

                                {isSelected && (
                                    <Chip
                                        label="Student answer"
                                        color="primary"
                                        size="small"
                                    />
                                )}

                                {option.isCorrect && (
                                    <Chip
                                        icon={<CheckCircleOutlined />}
                                        label="Correct answer"
                                        color="success"
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                            </Stack>
                        </Box>
                    );
                })}
            </Stack>
        );
    }

    if (question.type.code === 'TRUE_FALSE') {
        return (
            <Box
                sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.default',
                }}
            >
                <Typography
                    variant="body2"
                    color="text.secondary"
                >
                    Student answer
                </Typography>

                <Typography sx={{ fontWeight: 700 }}>
                    {answer.booleanValue === null
                        ? 'No answer'
                        : answer.booleanValue
                            ? 'True'
                            : 'False'}
                </Typography>
            </Box>
        );
    }

    if (question.type.code === 'NUMERIC') {
        return (
            <Box
                sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.default',
                }}
            >
                <Typography
                    variant="body2"
                    color="text.secondary"
                >
                    Student answer
                </Typography>

                <Typography sx={{ fontWeight: 700 }}>
                    {answer.numericValue ?? 'No answer'}
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.default',
            }}
        >
            <Typography
                variant="body2"
                color="text.secondary"
            >
                Student answer
            </Typography>

            <Typography
                sx={{
                    mt: 1,
                    whiteSpace: 'pre-wrap',
                }}
            >
                {answer.textValue || 'No answer'}
            </Typography>
        </Box>
    );
}

export default function LecturerSubmissionDetailsPage() {
    const {
        examId,
        attemptId,
    } = useParams();

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
            'attempts',
            attemptId,
        ],
        queryFn: () =>
            getLecturerSubmissionDetails(
                attemptId as string,
            ),
        enabled: Boolean(attemptId),
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
                    <Tooltip title="Back to submissions">
                        <IconButton
                            color="inherit"
                            aria-label="Back to submissions"
                            onClick={() =>
                                navigate(
                                    `/lecturer/exams/${examId}/submissions`,
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

                    <Tooltip title="Refresh submission">
                        <span>
                            <IconButton
                                color="inherit"
                                aria-label="Refresh submission"
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
                {(!examId || !attemptId) && (
                    <Alert severity="error">
                        Valid exam and submission IDs are required.
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
                        <CircularProgress aria-label="Loading submission" />
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
                                <Stack spacing={3}>
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
                                                component="h1"
                                                variant="h4"
                                                sx={{ fontWeight: 700 }}
                                            >
                                                {data.student.firstName}{' '}
                                                {data.student.lastName}
                                            </Typography>

                                            <Typography color="text.secondary">
                                                {data.student.email}
                                            </Typography>
                                        </Box>

                                        <Chip
                                            label={
                                                statusConfiguration[
                                                    data.submission.status
                                                ].label
                                            }
                                            color={
                                                statusConfiguration[
                                                    data.submission.status
                                                ].color
                                            }
                                        />
                                    </Stack>

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
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Attempt
                                            </Typography>

                                            <Typography sx={{ fontWeight: 700 }}>
                                                {data.submission.attemptNumber}
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
                                                {data.submission.score === null
                                                    ? 'Pending'
                                                    : `${data.submission.score} / ${data.submission.maxScore}`}
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
                                                {data.submission.percentage === null
                                                    ? 'Pending'
                                                    : `${data.submission.percentage}%`}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Submitted
                                            </Typography>

                                            <Typography sx={{ fontWeight: 700 }}>
                                                {formatDate(
                                                    data.submission.submittedAt,
                                                )}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {data.submission.feedback && (
                                        <Alert severity="info">
                                            <strong>Overall feedback:</strong>{' '}
                                            {data.submission.feedback}
                                        </Alert>
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>

                        <Box>
                            <Typography
                                component="h2"
                                variant="h5"
                                sx={{ fontWeight: 700 }}
                            >
                                Answer review
                            </Typography>

                            <Typography color="text.secondary">
                                Review the student answers, awarded
                                points and feedback.
                            </Typography>
                        </Box>

                        {data.questions.map((question) => (
                            <Card
                                key={question.id}
                                variant="outlined"
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Stack spacing={2.5}>
                                        <Stack
                                            direction={{
                                                xs: 'column',
                                                sm: 'row',
                                            }}
                                            spacing={1}
                                            sx={{
                                                alignItems: {
                                                    xs: 'flex-start',
                                                    sm: 'center',
                                                },
                                            }}
                                        >
                                            <Typography
                                                variant="overline"
                                                color="primary"
                                                sx={{ fontWeight: 700 }}
                                            >
                                                Question {question.position}
                                            </Typography>

                                            <Box sx={{ flexGrow: 1 }} />

                                            <Chip
                                                label={question.type.name}
                                                size="small"
                                                variant="outlined"
                                            />

                                            <Chip
                                                label={`${question.points} ${question.points === 1
                                                        ? 'point'
                                                        : 'points'
                                                    }`}
                                                size="small"
                                            />

                                            <Chip
                                                label={
                                                    question.answer
                                                        ?.awardedPoints === null ||
                                                        question.answer
                                                            ?.awardedPoints === undefined
                                                        ? 'Not graded'
                                                        : `${question.answer.awardedPoints} / ${question.points} points`
                                                }
                                                color={
                                                    question.answer
                                                        ?.awardedPoints === null ||
                                                        question.answer
                                                            ?.awardedPoints === undefined
                                                        ? 'default'
                                                        : 'success'
                                                }
                                                size="small"
                                            />
                                        </Stack>

                                        <Typography
                                            component="h3"
                                            variant="h6"
                                            sx={{ fontWeight: 700 }}
                                        >
                                            {question.prompt}
                                        </Typography>

                                        <Divider />

                                        <QuestionAnswer
                                            question={question}
                                        />

                                        {question.answer?.feedback && (
                                            <Alert severity="info">
                                                <strong>
                                                    Question feedback:
                                                </strong>{' '}
                                                {question.answer.feedback}
                                            </Alert>
                                        )}

                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {question.requiresManualGrading
                                                ? 'Requires manual grading'
                                                : 'Automatically graded'}
                                        </Typography>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                )}
            </Container>
        </Box>
    );
}