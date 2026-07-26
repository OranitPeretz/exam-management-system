import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

import { dropStudentFromCourse } from './admin.api';
import type {
  ManagedCourseEnrollment,
} from './admin.types';

interface RemoveCourseEnrollmentButtonProps {
  courseId: string;
  courseLabel: string;
  enrollment: ManagedCourseEnrollment;
}

function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'An unexpected error occurred.';
  }

  const responseMessage =
    error.response?.data?.error?.message;

  if (typeof responseMessage === 'string') {
    return responseMessage;
  }

  if (!error.response) {
    return 'The API is unavailable. Make sure the server is running.';
  }

  return 'The student could not be removed from the course.';
}

export function RemoveCourseEnrollmentButton({
  courseId,
  courseLabel,
  enrollment,
}: RemoveCourseEnrollmentButtonProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] =
    useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      dropStudentFromCourse(
        courseId,
        enrollment.student.id,
      ),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin', 'courses'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'users'],
        }),
      ]);

      setDialogOpen(false);
    },
  });

  const handleClose = () => {
    if (mutation.isPending) {
      return;
    }

    mutation.reset();
    setDialogOpen(false);
  };

  return (
    <>
      <Button
        color="warning"
        size="small"
        variant="outlined"
        onClick={() => {
          mutation.reset();
          setDialogOpen(true);
        }}
      >
        Remove
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Remove student from course
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{ pt: 1 }}
          >
            <Alert severity="warning">
              The enrollment will be marked as
              dropped. Academic history, attempts
              and grades will not be deleted.
            </Alert>

            <Typography>
              Remove{' '}
              <strong>
                {enrollment.student.firstName}{' '}
                {enrollment.student.lastName}
              </strong>{' '}
              from this course?
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              {enrollment.student.email}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Course: {courseLabel}
            </Typography>

            {mutation.error && (
              <Alert severity="error">
                {getErrorMessage(
                  mutation.error,
                )}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>

          <Button
            color="warning"
            variant="contained"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            startIcon={
              mutation.isPending ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : undefined
            }
          >
            {mutation.isPending
              ? 'Removing...'
              : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}