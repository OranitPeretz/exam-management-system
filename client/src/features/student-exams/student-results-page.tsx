import type { ReactNode } from 'react';
import {
  ArrowBack,
  AssessmentOutlined,
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
import { useNavigate } from 'react-router';

import { useAuth } from '../auth/use-auth';
import { getStudentResults } from './student-result.api';
import type { StudentResultSummary } from './student-result.types';

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
    return 'An unexpected error occurred while loading results.';
  }

  if (!error.response) {
    return 'The API is unavailable. Make sure the server is running.';
  }

  if (error.response.status === 403) {
    return 'Only students can access exam results.';
  }

  return 'The results could not be loaded. Please try again.';
}

interface SummaryCardProps {
  label: string;
  value: string | number;
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
              bgcolor: 'background.default',
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

interface ResultCardProps {
  result: StudentResultSummary;
}

function ResultCard({ result }: ResultCardProps) {
  const score = result.score ?? 0;
  const maxScore = result.maxScore ?? 0;

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
                {result.exam.title}
              </Typography>

              <Typography color="text.secondary">
                {result.exam.course.code} ·{' '}
                {result.exam.course.name}
              </Typography>
            </Box>

            <Chip
              icon={
                result.passed
                  ? <CheckCircleOutlined />
                  : undefined
              }
              label={
                result.passed
                  ? 'Passed'
                  : 'Not passed'
              }
              color={
                result.passed
                  ? 'success'
                  : 'error'
              }
            />
          </Stack>

          {result.exam.description && (
            <Typography color="text.secondary">
              {result.exam.description}
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
                variant="h6"
                sx={{ fontWeight: 700 }}
              >
                {score} / {maxScore}
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
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: result.passed
                    ? 'success.main'
                    : 'error.main',
                }}
              >
                {result.percentage}%
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
                variant="h6"
                sx={{ fontWeight: 700 }}
              >
                {result.exam.passingPercentage}%
              </Typography>
            </Box>
          </Box>

          <LinearProgress
            variant="determinate"
            value={Math.min(
              Math.max(result.percentage, 0),
              100,
            )}
            color={
              result.passed
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
              {result.attemptNumber}
            </Typography>

            <Typography variant="body2">
              <strong>Published:</strong>{' '}
              {formatDate(
                result.exam.resultsPublishedAt,
              )}
            </Typography>
          </Box>

          {result.feedbackAvailable &&
            result.feedback && (
              <Alert severity="info">
                <strong>Lecturer feedback:</strong>{' '}
                {result.feedback}
              </Alert>
            )}

          {!result.feedbackAvailable && (
            <Alert severity="info">
              Detailed feedback is disabled for this
              exam.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function StudentResultsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const {
    data: results = [],
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['student', 'results'],
    queryFn: getStudentResults,
  });

  const passedResults = results.filter(
    (result) => result.passed,
  ).length;

  const averagePercentage =
    results.length === 0
      ? 0
      : Math.round(
          results.reduce(
            (sum, result) =>
              sum + result.percentage,
            0,
          ) / results.length,
        );

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
            ExamFlow
          </Typography>

          <Tooltip title="Refresh results">
            <span>
              <IconButton
                color="inherit"
                aria-label="Refresh results"
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
        <Stack spacing={3}>
          <Box>
            <Typography
              component="h1"
              variant="h4"
              sx={{ fontWeight: 700 }}
            >
              My Results
            </Typography>

            <Typography color="text.secondary">
              Review your published grades and lecturer
              feedback.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            <SummaryCard
              label="Published results"
              value={results.length}
              icon={<AssessmentOutlined />}
              color="primary.main"
            />

            <SummaryCard
              label="Passed exams"
              value={passedResults}
              icon={<CheckCircleOutlined />}
              color="success.main"
            />

            <SummaryCard
              label="Average grade"
              value={`${averagePercentage}%`}
              icon={<AssessmentOutlined />}
              color="secondary.main"
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
              <CircularProgress aria-label="Loading results" />
            </Box>
          )}

          {!isLoading &&
            !error &&
            results.length === 0 && (
              <Alert severity="info">
                No results have been published yet.
              </Alert>
            )}

          {!isLoading &&
            !error &&
            results.length > 0 && (
              <Stack spacing={2}>
                {results.map((result) => (
                  <ResultCard
                    key={result.attemptId}
                    result={result}
                  />
                ))}
              </Stack>
            )}
        </Stack>
      </Container>
    </Box>
  );
}