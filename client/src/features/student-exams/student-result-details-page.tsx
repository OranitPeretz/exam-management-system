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
  IconButton,
  LinearProgress,
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
import { getStudentResultDetails } from './student-result.api';
import type {
  StudentResultAnswer,
  StudentResultQuestion,
} from './student-result.types';

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

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
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'An unexpected error occurred while loading the result.';
  }

  if (!error.response) {
    return 'The API is unavailable. Make sure the server is running.';
  }

  if (error.response.status === 404) {
    return 'The requested published result was not found.';
  }

  if (error.response.status === 403) {
    return 'You do not have permission to view this result.';
  }

  return (
    error.response.data?.error?.message ??
    'The result could not be loaded. Please try again.'
  );
}

function getWrittenAnswer(
  answer: StudentResultAnswer,
): string {
  if (answer.textValue !== null) {
    return (
      answer.textValue ||
      'No written response.'
    );
  }

  if (answer.numericValue !== null) {
    return String(answer.numericValue);
  }

  if (answer.booleanValue !== null) {
    return answer.booleanValue
      ? 'True'
      : 'False';
  }

  return 'No written response.';
}

function readNumericCorrectAnswer(
  gradingConfig: unknown,
): number | null {
  if (
    typeof gradingConfig !== 'object' ||
    gradingConfig === null ||
    Array.isArray(gradingConfig)
  ) {
    return null;
  }

  const configuration =
    gradingConfig as Record<string, unknown>;

  return typeof configuration.correctAnswer ===
    'number'
    ? configuration.correctAnswer
    : null;
}

interface QuestionResultCardProps {
  question: StudentResultQuestion;
  feedbackAvailable: boolean;
}

function QuestionResultCard({
  question,
  feedbackAvailable,
}: QuestionResultCardProps) {
  const selectedOptionIds = new Set(
    question.answer?.selectedOptionIds ?? [],
  );

  const awardedPoints =
    question.answer?.awardedPoints ?? 0;

  const correctNumericAnswer =
    readNumericCorrectAnswer(
      question.gradingConfig,
    );

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
                variant="overline"
                color="primary"
                sx={{ fontWeight: 700 }}
              >
                Question {question.position}
              </Typography>

              <Typography
                component="h2"
                variant="h6"
                sx={{ fontWeight: 700 }}
              >
                {question.prompt}
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              sx={{
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Chip
                size="small"
                label={question.type.name}
                variant="outlined"
              />

              <Chip
                size="small"
                label={`${awardedPoints} / ${question.points} points`}
                color={
                  awardedPoints === question.points
                    ? 'success'
                    : 'default'
                }
              />
            </Stack>
          </Stack>

          {question.options.length > 0 && (
            <Stack spacing={1.25}>
              {question.options.map((option) => {
                const isSelected =
                  selectedOptionIds.has(option.id);

                const isCorrect =
                  option.isCorrect === true;

                return (
                  <Box
                    key={option.id}
                    sx={{
                      p: 1.5,
                      border: 1,
                      borderRadius: 2,
                      borderColor: isCorrect
                        ? 'success.main'
                        : isSelected
                          ? 'primary.main'
                          : 'divider',
                      bgcolor:
                        isCorrect || isSelected
                          ? 'background.default'
                          : 'transparent',
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
                      <Typography
                        sx={{ flexGrow: 1 }}
                      >
                        {option.position}.{' '}
                        {option.text}
                      </Typography>

                      {isSelected && (
                        <Chip
                          size="small"
                          color="primary"
                          label="Your answer"
                        />
                      )}

                      {isCorrect && (
                        <Chip
                          size="small"
                          color="success"
                          icon={
                            <CheckCircleOutlined />
                          }
                          label="Correct answer"
                        />
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}

          {question.options.length === 0 &&
            question.answer && (
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
                  gutterBottom
                >
                  Your answer
                </Typography>

                <Typography
                  sx={{
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {getWrittenAnswer(
                    question.answer,
                  )}
                </Typography>
              </Box>
            )}

          {!question.answer && (
            <Alert severity="warning">
              This question was not answered.
            </Alert>
          )}

          {correctNumericAnswer !== null &&
            feedbackAvailable && (
              <Alert severity="success">
                <strong>Correct answer:</strong>{' '}
                {correctNumericAnswer}
              </Alert>
            )}

          {question.answer?.feedback &&
            feedbackAvailable && (
              <Alert severity="info">
                <strong>
                  Lecturer feedback:
                </strong>{' '}
                {question.answer.feedback}
              </Alert>
            )}

          <Typography
            variant="caption"
            color="text.secondary"
          >
            {question.answer?.isAutoGraded
              ? 'Automatically graded'
              : 'Graded by lecturer'}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function StudentResultDetailsPage() {
  const { attemptId } = useParams();
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
      'student',
      'results',
      attemptId,
    ],
    queryFn: () => {
      if (!attemptId) {
        throw new Error(
          'A result ID is required.',
        );
      }

      return getStudentResultDetails(
        attemptId,
      );
    },
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
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Tooltip title="Back to results">
            <IconButton
              color="inherit"
              aria-label="Back to results"
              onClick={() =>
                navigate('/student/results')
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

          <Tooltip title="Refresh result">
            <span>
              <IconButton
                color="inherit"
                aria-label="Refresh result"
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
            onClick={() =>
              void handleLogout()
            }
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 5 }}>
        {!attemptId && (
          <Alert severity="error">
            A result ID is required.
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
            <CircularProgress aria-label="Loading result" />
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
          <Stack spacing={3}>
            <Card variant="outlined">
              <CardContent
                sx={{
                  p: {
                    xs: 2.5,
                    md: 4,
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
                        {data.exam.title}
                      </Typography>

                      <Typography color="text.secondary">
                        {data.exam.course.code} ·{' '}
                        {data.exam.course.name}
                      </Typography>
                    </Box>

                    <Chip
                      icon={
                        data.result.passed
                          ? <CheckCircleOutlined />
                          : undefined
                      }
                      label={
                        data.result.passed
                          ? 'Passed'
                          : 'Not passed'
                      }
                      color={
                        data.result.passed
                          ? 'success'
                          : 'error'
                      }
                    />
                  </Stack>

                  {data.exam.description && (
                    <Typography color="text.secondary">
                      {data.exam.description}
                    </Typography>
                  )}

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
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Score
                      </Typography>

                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 700 }}
                      >
                        {data.result.score ?? 0} /{' '}
                        {data.result.maxScore ?? 0}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Final grade
                      </Typography>

                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          color: data.result.passed
                            ? 'success.main'
                            : 'error.main',
                        }}
                      >
                        {data.result.percentage}%
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Passing grade
                      </Typography>

                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 700 }}
                      >
                        {
                          data.exam
                            .passingPercentage
                        }
                        %
                      </Typography>
                    </Box>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={Math.min(
                      Math.max(
                        data.result.percentage,
                        0,
                      ),
                      100,
                    )}
                    color={
                      data.result.passed
                        ? 'success'
                        : 'error'
                    }
                    sx={{
                      height: 8,
                      borderRadius: 4,
                    }}
                  />

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
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2">
                      <strong>Attempt:</strong>{' '}
                      {data.result.attemptNumber}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Published:</strong>{' '}
                      {formatDate(
                        data.exam
                          .resultsPublishedAt,
                      )}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Submitted:</strong>{' '}
                      {formatDate(
                        data.result.submittedAt,
                      )}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Graded:</strong>{' '}
                      {formatDate(
                        data.result.gradedAt,
                      )}
                    </Typography>
                  </Box>

                  {data.result.feedback && (
                    <Alert severity="info">
                      <strong>
                        Lecturer feedback:
                      </strong>{' '}
                      {data.result.feedback}
                    </Alert>
                  )}

                  {!data.result.feedbackAvailable && (
                    <Alert severity="info">
                      Detailed feedback is disabled
                      for this exam.
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
                Question review
              </Typography>

              <Typography color="text.secondary">
                Review your answers, awarded points
                and available feedback.
              </Typography>
            </Box>

            {data.questions.map((question) => (
              <QuestionResultCard
                key={question.id}
                question={question}
                feedbackAvailable={
                  data.result.feedbackAvailable
                }
              />
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}