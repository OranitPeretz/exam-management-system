import { useState } from 'react';
import { PublishOutlined } from '@mui/icons-material';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';

import { publishExam } from './exam.api';
import type { ManagedExamDetails } from './exam.types';

interface PublishExamButtonProps {
  exam: ManagedExamDetails;
}

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

function getPublishErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'An unexpected error occurred while publishing the exam.';
  }

  if (!error.response) {
    return 'The API is unavailable. Make sure the server is running.';
  }

  if (error.response.status === 403) {
    return 'You do not have permission to publish this exam.';
  }

  if (
    error.response.status === 409 ||
    error.response.status === 422
  ) {
    return (
      error.response.data?.error?.message ??
      'The exam does not meet the publication requirements.'
    );
  }

  return (
    error.response.data?.error?.message ??
    'The exam could not be published. Please try again.'
  );
}

export function PublishExamButton({
  exam,
}: PublishExamButtonProps) {
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const totalPoints = exam.questions.reduce(
    (sum, question) => sum + question.points,
    0,
  );

  const publishMutation = useMutation({
    mutationFn: () => publishExam(exam.id),
    onSuccess: async (publishedExam) => {
      setIsOpen(false);
      setSuccessMessage(
        `${publishedExam.title} was published successfully.`,
      );

      queryClient.setQueryData(
        ['lecturer', 'exams', exam.id],
        publishedExam,
      );

      await queryClient.invalidateQueries({
        queryKey: ['lecturer', 'exams'],
      });
    },
  });

  const handleOpen = () => {
    publishMutation.reset();
    setIsOpen(true);
  };

  const handleClose = () => {
    if (publishMutation.isPending) {
      return;
    }

    publishMutation.reset();
    setIsOpen(false);
  };

  return (
    <>
      {exam.status === 'DRAFT' && (
        <Button
          variant="contained"
          color="success"
          startIcon={<PublishOutlined />}
          onClick={handleOpen}
        >
          Publish exam
        </Button>
      )}

      <Dialog
        open={isOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Publish exam?</DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText>
              You are about to publish “{exam.title}”.
            </DialogContentText>

            <Alert severity="warning">
              After publication, the exam and its questions
              can no longer be edited or deleted.
            </Alert>

            <Stack spacing={0.5}>
              <Typography variant="body2">
                <strong>Questions:</strong>{' '}
                {exam.questions.length}
              </Typography>

              <Typography variant="body2">
                <strong>Total points:</strong>{' '}
                {totalPoints}
              </Typography>

              <Typography variant="body2">
                <strong>Duration:</strong>{' '}
                {exam.durationMinutes} minutes
              </Typography>
            </Stack>

            <Alert severity="info">
              Active students enrolled in the course will
              receive a notification.
            </Alert>

            {publishMutation.error && (
              <Alert severity="error">
                {getPublishErrorMessage(
                  publishMutation.error,
                )}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            color="inherit"
            disabled={publishMutation.isPending}
            onClick={handleClose}
          >
            Cancel
          </Button>

          <Button
            color="success"
            variant="contained"
            disabled={publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
          >
            {publishMutation.isPending ? (
              <CircularProgress
                size={20}
                color="inherit"
              />
            ) : (
              'Confirm publication'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={successMessage !== null}
        autoHideDuration={5000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
}