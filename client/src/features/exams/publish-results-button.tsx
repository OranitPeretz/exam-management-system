import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
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
import {
  useState,
} from 'react';

import { publishExamResults } from './exam.api';
import type {
  ExamStatus,
} from './exam.types';

interface PublishResultsButtonProps {
  examId: string;
  examStatus: ExamStatus;
  totalSubmissions: number;
  waitingForGrading: number;
}

function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'An unexpected error occurred while publishing the results.';
  }

  if (!error.response) {
    return 'The API is unavailable. Make sure the server is running.';
  }

  const responseData = error.response.data as {
    error?: {
      message?: string;
    };
  };

  if (responseData.error?.message) {
    return responseData.error.message;
  }

  if (error.response.status === 409) {
    return 'The results cannot be published because some submissions still require grading or the results were already published.';
  }

  if (error.response.status === 403) {
    return 'You do not have permission to publish results for this exam.';
  }

  return 'The results could not be published. Please try again.';
}

export function PublishResultsButton({
  examId,
  examStatus,
  totalSubmissions,
  waitingForGrading,
}: PublishResultsButtonProps) {
  const queryClient = useQueryClient();

  const [
    confirmationOpen,
    setConfirmationOpen,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const publishMutation = useMutation({
    mutationFn: () =>
      publishExamResults(examId),

    onSuccess: async (result) => {
      setConfirmationOpen(false);

      setSuccessMessage(
        `${result.message} ${result.notifiedStudents} ${
          result.notifiedStudents === 1
            ? 'student was'
            : 'students were'
        } notified.`,
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            'lecturer',
            'exams',
            examId,
            'submissions',
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'lecturer',
            'exams',
            examId,
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'lecturer',
            'exams',
          ],
        }),
      ]);
    },
  });

  const resultsPublished =
    examStatus === 'RESULTS_PUBLISHED';

  const supportedStatus =
    examStatus === 'PUBLISHED' ||
    examStatus === 'CLOSED' ||
    examStatus === 'GRADING';

  if (
    !resultsPublished &&
    !supportedStatus
  ) {
    return null;
  }

  const publicationBlocked =
    totalSubmissions === 0 ||
    waitingForGrading > 0;

  let blockedReason: string | null = null;

  if (totalSubmissions === 0) {
    blockedReason =
      'Results cannot be published before at least one student submits the exam.';
  } else if (waitingForGrading > 0) {
    blockedReason = `${waitingForGrading} ${
      waitingForGrading === 1
        ? 'submission is'
        : 'submissions are'
    } still waiting for grading.`;
  }

  return (
    <>
      <Stack
        spacing={0.5}
        sx={{
          alignItems: {
            xs: 'stretch',
            md: 'flex-end',
          },
        }}
      >
        <Button
          variant="contained"
          color={
            resultsPublished
              ? 'success'
              : 'primary'
          }
          disabled={
            resultsPublished ||
            publicationBlocked
          }
          onClick={() => {
            publishMutation.reset();
            setConfirmationOpen(true);
          }}
        >
          {resultsPublished
            ? 'Results published'
            : 'Publish results'}
        </Button>

        {blockedReason && (
          <Typography
            variant="caption"
            color="text.secondary"
          >
            {blockedReason}
          </Typography>
        )}
      </Stack>

      <Dialog
        open={confirmationOpen}
        fullWidth
        maxWidth="sm"
        onClose={() => {
          if (!publishMutation.isPending) {
            setConfirmationOpen(false);
          }
        }}
      >
        <DialogTitle>
          Publish exam results?
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              Publishing the results will make grades
              and feedback visible to all students who
              completed this exam.
            </Typography>

            <Alert severity="warning">
              This action cannot be repeated. Make sure
              every submission has been reviewed.
            </Alert>

            {publishMutation.error && (
              <Alert severity="error">
                {getErrorMessage(
                  publishMutation.error,
                )}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={publishMutation.isPending}
            onClick={() =>
              setConfirmationOpen(false)
            }
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={publishMutation.isPending}
            startIcon={
              publishMutation.isPending ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : undefined
            }
            onClick={() =>
              publishMutation.mutate()
            }
          >
            {publishMutation.isPending
              ? 'Publishing...'
              : 'Confirm publication'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={6000}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        onClose={() =>
          setSuccessMessage(null)
        }
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() =>
            setSuccessMessage(null)
          }
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
}