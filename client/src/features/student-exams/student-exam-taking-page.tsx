import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ArrowBack,
  LogoutOutlined,
  ScheduleOutlined,
} from '@mui/icons-material';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';
import {
  useNavigate,
  useParams,
} from 'react-router';

import { useAuth } from '../auth/use-auth';
import {
  getStudentExams,
  startOrResumeAttempt,
  submitStudentAttempt,
} from './student-exam.api';
import { StudentQuestionCard } from './student-question-card';

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

interface ExamTimerProps {
  expiresAt: string;
  serverTime: string;
  onExpired: () => void;
}

function calculateRemainingSeconds(
  expiresAt: string,
  serverTime: string,
): number {
  const serverOffset =
    new Date(serverTime).getTime() - Date.now();

  const currentServerTime =
    Date.now() + serverOffset;

  return Math.max(
    Math.floor(
      (
        new Date(expiresAt).getTime() -
        currentServerTime
      ) / 1000,
    ),
    0,
  );
}

function ExamTimer({
  expiresAt,
  serverTime,
  onExpired,
}: ExamTimerProps) {
  const [remainingSeconds, setRemainingSeconds] =
    useState(() =>
      calculateRemainingSeconds(
        expiresAt,
        serverTime,
      ),
    );

  const hasNotifiedExpiration = useRef(false);

  useEffect(() => {
    const serverOffset =
      new Date(serverTime).getTime() -
      Date.now();

    const intervalId = window.setInterval(() => {
      const currentServerTime =
        Date.now() + serverOffset;

      const nextRemainingSeconds = Math.max(
        Math.floor(
          (
            new Date(expiresAt).getTime() -
            currentServerTime
          ) / 1000,
        ),
        0,
      );

      setRemainingSeconds(nextRemainingSeconds);

      if (
        nextRemainingSeconds === 0 &&
        !hasNotifiedExpiration.current
      ) {
        hasNotifiedExpiration.current = true;
        onExpired();
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    expiresAt,
    onExpired,
    serverTime,
  ]);

  const minutes = Math.floor(
    remainingSeconds / 60,
  );

  const seconds = remainingSeconds % 60;

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center' }}
    >
      <ScheduleOutlined />

      <Typography
        sx={{
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color:
            remainingSeconds <= 300
              ? 'error.main'
              : 'inherit',
        }}
      >
        {String(minutes).padStart(2, '0')}:
        {String(seconds).padStart(2, '0')}
      </Typography>
    </Stack>
  );
}

function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'An unexpected error occurred.';
  }

  if (!error.response) {
    return 'The API is unavailable. Make sure the server is running.';
  }

  return (
    error.response.data?.error?.message ??
    'The request could not be completed.'
  );
}

export default function StudentExamTakingPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const [isStartDialogOpen, setIsStartDialogOpen] =
    useState(false);

  const [isSubmitDialogOpen, setIsSubmitDialogOpen] =
    useState(false);

  const {
    data: exams = [],
    error: examsError,
    isLoading: isLoadingExams,
  } = useQuery({
    queryKey: ['student', 'exams'],
    queryFn: getStudentExams,
  });

  const examSummary = exams.find(
    (exam) => exam.id === examId,
  );

  const startMutation = useMutation({
    mutationFn: (selectedExamId: string) =>
      startOrResumeAttempt(selectedExamId),
    onSuccess: async () => {
      setIsStartDialogOpen(false);

      await queryClient.invalidateQueries({
        queryKey: ['student', 'exams'],
      });
    },
  });

  const attemptData = startMutation.data;

  const activeAnswerSaves = useIsMutating({
    mutationKey: [
      'student',
      'answer',
      attemptData?.attempt.id ?? '',
    ],
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!attemptData) {
        throw new Error(
          'An active attempt is required.',
        );
      }

      return submitStudentAttempt(
        attemptData.attempt.id,
      );
    },
    onSuccess: async () => {
      setIsSubmitDialogOpen(false);

      await queryClient.invalidateQueries({
        queryKey: ['student', 'exams'],
      });
    },
  });

  const handleExpired = useCallback(() => {
    if (
      attemptData &&
      !submitMutation.isPending
    ) {
      submitMutation.mutate();
    }
  }, [
    attemptData,
    submitMutation,
  ]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  if (submitMutation.data) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Card variant="outlined">
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={3}>
                <Alert severity="success">
                  Exam submitted successfully
                </Alert>

                <Typography
                  component="h1"
                  variant="h4"
                  sx={{ fontWeight: 700 }}
                >
                  Submission complete
                </Typography>

                <Typography>
                  {submitMutation.data.message}
                </Typography>

                <Typography color="text.secondary">
                  Answered questions:{' '}
                  {
                    submitMutation.data
                      .answeredQuestions
                  }{' '}
                  of{' '}
                  {
                    submitMutation.data
                      .totalQuestions
                  }
                </Typography>

                <Button
                  variant="contained"
                  onClick={() =>
                    navigate('/student/exams')
                  }
                >
                  Return to my exams
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Tooltip title="Back to my exams">
            <IconButton
              color="inherit"
              aria-label="Back to my exams"
              onClick={() =>
                navigate('/student/exams')
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

          {attemptData && (
            <ExamTimer
              expiresAt={
                attemptData.attempt.expiresAt
              }
              serverTime={
                attemptData.serverTime
              }
              onExpired={handleExpired}
            />
          )}

          {!attemptData && (
            <Button
              color="inherit"
              startIcon={<LogoutOutlined />}
              onClick={() => void handleLogout()}
            >
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 5 }}>
        {isLoadingExams && (
          <Box
            sx={{
              minHeight: 300,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {examsError && (
          <Alert severity="error">
            {getApiErrorMessage(examsError)}
          </Alert>
        )}

        {!isLoadingExams &&
          !examsError &&
          !examSummary && (
            <Alert severity="error">
              The requested exam is not available.
            </Alert>
          )}

        {examSummary && !attemptData && (
          <Card variant="outlined">
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography
                    component="h1"
                    variant="h4"
                    sx={{ fontWeight: 700 }}
                  >
                    {examSummary.title}
                  </Typography>

                  <Typography color="text.secondary">
                    {examSummary.course.code} ·{' '}
                    {examSummary.course.name}
                  </Typography>
                </Box>

                {examSummary.description && (
                  <Typography>
                    {examSummary.description}
                  </Typography>
                )}

                <Alert severity="warning">
                  The timer starts immediately after you
                  confirm. Do not close the browser during
                  the exam.
                </Alert>

                <Typography>
                  <strong>Questions:</strong>{' '}
                  {examSummary.questionCount}
                </Typography>

                <Typography>
                  <strong>Duration:</strong>{' '}
                  {examSummary.durationMinutes} minutes
                </Typography>

                <Typography>
                  <strong>Attempts remaining:</strong>{' '}
                  {examSummary.remainingAttempts}
                </Typography>

                {startMutation.error && (
                  <Alert severity="error">
                    {getApiErrorMessage(
                      startMutation.error,
                    )}
                  </Alert>
                )}

                {(examSummary.canStart ||
                  examSummary.canResume) && (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() =>
                      setIsStartDialogOpen(true)
                    }
                  >
                    {examSummary.canResume
                      ? 'Resume exam'
                      : 'Start exam'}
                  </Button>
                )}

                {!examSummary.canStart &&
                  !examSummary.canResume && (
                    <Alert severity="info">
                      This exam cannot be started.
                    </Alert>
                  )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {attemptData && (
          <Stack spacing={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={1}>
                  <Typography
                    component="h1"
                    variant="h4"
                    sx={{ fontWeight: 700 }}
                  >
                    {attemptData.exam.title}
                  </Typography>

                  <Typography color="text.secondary">
                    {attemptData.exam.course.code} ·{' '}
                    {attemptData.exam.course.name}
                  </Typography>

                  {attemptData.exam.instructions && (
                    <Alert severity="info">
                      {attemptData.exam.instructions}
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {attemptData.exam.questions.map(
              (question) => (
                <StudentQuestionCard
                  key={question.id}
                  attemptId={
                    attemptData.attempt.id
                  }
                  question={question}
                  initialAnswer={
                    attemptData.attempt.answers.find(
                      (answer) =>
                        answer.questionId ===
                        question.id,
                    )
                  }
                />
              ),
            )}

            {submitMutation.error && (
              <Alert severity="error">
                {getApiErrorMessage(
                  submitMutation.error,
                )}
              </Alert>
            )}

            <Button
              variant="contained"
              color="success"
              size="large"
              disabled={
                submitMutation.isPending ||
                activeAnswerSaves > 0
              }
              onClick={() =>
                setIsSubmitDialogOpen(true)
              }
            >
              {activeAnswerSaves > 0
                ? 'Waiting for answers to save...'
                : 'Submit exam'}
            </Button>
          </Stack>
        )}
      </Container>

      <Dialog
        open={isStartDialogOpen}
        onClose={() =>
          setIsStartDialogOpen(false)
        }
      >
        <DialogTitle>
          {examSummary?.canResume
            ? 'Resume exam?'
            : 'Start exam?'}
        </DialogTitle>

        <DialogContent>
          <DialogContentText>
            {examSummary?.canResume
              ? 'Your existing attempt and saved answers will be restored.'
              : 'The exam timer will begin immediately after confirmation.'}
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button
            color="inherit"
            onClick={() =>
              setIsStartDialogOpen(false)
            }
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={
              startMutation.isPending ||
              !examId
            }
            onClick={() => {
              if (examId) {
                startMutation.mutate(examId);
              }
            }}
          >
            {startMutation.isPending ? (
              <CircularProgress
                size={20}
                color="inherit"
              />
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isSubmitDialogOpen}
        onClose={() =>
          setIsSubmitDialogOpen(false)
        }
      >
        <DialogTitle>Submit exam?</DialogTitle>

        <DialogContent>
          <DialogContentText>
            After submission, your answers can no longer
            be changed.
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button
            color="inherit"
            onClick={() =>
              setIsSubmitDialogOpen(false)
            }
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="success"
            disabled={
              submitMutation.isPending ||
              activeAnswerSaves > 0
            }
            onClick={() =>
              submitMutation.mutate()
            }
          >
            {submitMutation.isPending ? (
              <CircularProgress
                size={20}
                color="inherit"
              />
            ) : (
              'Confirm submission'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}