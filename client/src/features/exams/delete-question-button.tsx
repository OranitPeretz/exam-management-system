import { useState } from 'react';
import { DeleteOutlined } from '@mui/icons-material';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';

import { deleteQuestion } from './exam.api';
import type { ManagedQuestion } from './exam.types';

interface DeleteQuestionButtonProps {
  examId: string;
  question: ManagedQuestion;
}

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

function getDeleteErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'An unexpected error occurred while deleting the question.';
  }

  if (!error.response) {
    return 'The API is unavailable. Make sure the server is running.';
  }

  if (error.response.status === 409) {
    return (
      error.response.data?.error?.message ??
      'Only questions in draft exams can be deleted.'
    );
  }

  if (error.response.status === 403) {
    return 'You do not have permission to delete this question.';
  }

  return (
    error.response.data?.error?.message ??
    'The question could not be deleted. Please try again.'
  );
}

export function DeleteQuestionButton({
  examId,
  question,
}: DeleteQuestionButtonProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () =>
      deleteQuestion(examId, question.id),
    onSuccess: async () => {
      setIsOpen(false);

      await queryClient.invalidateQueries({
        queryKey: ['lecturer', 'exams'],
      });
    },
  });

  const handleOpen = () => {
    deleteMutation.reset();
    setIsOpen(true);
  };

  const handleClose = () => {
    if (deleteMutation.isPending) {
      return;
    }

    deleteMutation.reset();
    setIsOpen(false);
  };

  return (
    <>
      <Tooltip title="Delete question">
        <IconButton
          color="error"
          aria-label={`Delete question ${question.position}`}
          onClick={handleOpen}
        >
          <DeleteOutlined />
        </IconButton>
      </Tooltip>

      <Dialog
        open={isOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Delete question?</DialogTitle>

        <DialogContent>
          <DialogContentText>
            This action will permanently delete question{' '}
            {question.position}: “{question.prompt}”
          </DialogContentText>

          {deleteMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {getDeleteErrorMessage(
                deleteMutation.error,
              )}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            color="inherit"
            disabled={deleteMutation.isPending}
            onClick={handleClose}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? (
              <CircularProgress
                size={20}
                color="inherit"
              />
            ) : (
              'Delete question'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}