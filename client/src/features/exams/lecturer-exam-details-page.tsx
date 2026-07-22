import {
  ArrowBack,
  CheckCircleOutlined,
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
import {
  useNavigate,
  useParams,
} from 'react-router';

import { useAuth } from '../auth/use-auth';
import { getManagedExam } from './exam.api';
import type { ExamStatus } from './exam.types';

type StatusColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning';

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
  if (!axios.isAxiosError(error)) {
    return 'An unexpected error occurred.';
  }

  if (!error.response) {
    return 'The API is unavailable. Make sure the server is running.';
  }

  if (error.response.status === 404) {
    return 'The requested exam was not found.';
  }

  if (error.response.status === 403) {
    return 'You do not have permission to manage this exam.';
  }

  return 'The exam could not be loaded. Please try again.';
}

export default function LecturerExamDetailsPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const {
    data: exam,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['lecturer', 'exams', examId],
    queryFn: () => getManagedExam(examId as string),
    enabled: Boolean(examId),
  });

  const totalPoints =
    exam?.questions.reduce(
      (sum, question) => sum + question.points,
      0,
    ) ?? 0;

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
          <Tooltip title="Back to exams">
            <IconButton
              color="inherit"
              aria-label="Back to exams"
              onClick={() => navigate('/lecturer/exams')}
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

          <Tooltip title="Refresh exam">
            <span>
              <IconButton
                color="inherit"
                aria-label="Refresh exam"
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
            <CircularProgress aria-label="Loading exam" />
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

        {exam && (
          <Stack spacing={3}>
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
                        {exam.title}
                      </Typography>

                      <Typography color="text.secondary">
                        {exam.course.code} · {exam.course.name}
                      </Typography>
                    </Box>

                    <Chip
                      label={
                        statusConfiguration[exam.status].label
                      }
                      color={
                        statusConfiguration[exam.status].color
                      }
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
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Questions
                      </Typography>

                      <Typography sx={{ fontWeight: 700 }}>
                        {exam.questions.length}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Total points
                      </Typography>

                      <Typography sx={{ fontWeight: 700 }}>
                        {totalPoints}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Duration
                      </Typography>

                      <Typography sx={{ fontWeight: 700 }}>
                        {exam.durationMinutes} minutes
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Passing grade
                      </Typography>

                      <Typography sx={{ fontWeight: 700 }}>
                        {exam.passingPercentage}%
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        md: 'repeat(2, minmax(0, 1fr))',
                      },
                      gap: 2,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'background.default',
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <ScheduleOutlined color="primary" />

                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Starts
                        </Typography>

                        <Typography variant="body2">
                          {formatDate(exam.startAt)}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <ScheduleOutlined color="primary" />

                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Ends
                        </Typography>

                        <Typography variant="body2">
                          {formatDate(exam.endAt)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  {exam.instructions && (
                    <Alert severity="info">
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700 }}
                      >
                        Instructions
                      </Typography>

                      <Typography variant="body2">
                        {exam.instructions}
                      </Typography>
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>

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
                  component="h2"
                  variant="h5"
                  sx={{ fontWeight: 700 }}
                >
                  Questions
                </Typography>

                <Typography color="text.secondary">
                  Review the questions and correct answers for this exam.
                </Typography>
              </Box>

              <Chip
                icon={<QuizOutlined />}
                label={`${exam.questions.length} questions`}
                variant="outlined"
              />
            </Stack>

            {exam.questions.length === 0 && (
              <Alert severity="info">
                This exam does not have any questions yet.
              </Alert>
            )}

            {exam.questions.map((question) => (
              <Card
                key={question.id}
                variant="outlined"
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
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
                        label={`${question.points} ${
                          question.points === 1
                            ? 'point'
                            : 'points'
                        }`}
                        size="small"
                      />

                      <Chip
                        label={
                          question.isRequired
                            ? 'Required'
                            : 'Optional'
                        }
                        size="small"
                        color={
                          question.isRequired
                            ? 'primary'
                            : 'default'
                        }
                        variant="outlined"
                      />
                    </Stack>

                    <Typography
                      component="h3"
                      variant="h6"
                      sx={{ fontWeight: 700 }}
                    >
                      {question.prompt}
                    </Typography>

                    {question.options.length > 0 && (
                      <>
                        <Divider />

                        <Box
                          component="ol"
                          sx={{
                            m: 0,
                            pl: 3,
                          }}
                        >
                          {question.options.map((option) => (
                            <Box
                              component="li"
                              key={option.id}
                              sx={{ mb: 1 }}
                            >
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: 'center' }}
                              >
                                <Typography>
                                  {option.text}
                                </Typography>

                                {option.isCorrect && (
                                  <Chip
                                    icon={
                                      <CheckCircleOutlined />
                                    }
                                    label="Correct answer"
                                    color="success"
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Stack>
                            </Box>
                          ))}
                        </Box>
                      </>
                    )}

                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {question.type.isAutoGradable
                        ? 'Automatically graded'
                        : 'Requires manual grading'}
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