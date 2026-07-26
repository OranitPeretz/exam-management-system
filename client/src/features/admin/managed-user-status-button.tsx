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

import { updateManagedUserStatus } from './admin.api';
import type { ManagedUser } from './admin.types';

interface ManagedUserStatusButtonProps {
  user: ManagedUser;
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

  return 'The user status could not be updated.';
}

export function ManagedUserStatusButton({
  user,
}: ManagedUserStatusButtonProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] =
    useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      updateManagedUserStatus(user.id, {
        isActive: !user.isActive,
      }),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin', 'users'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'courses'],
        }),
      ]);

      setDialogOpen(false);
    },
  });

  if (user.role === 'ADMIN') {
    return (
      <Typography
        variant="caption"
        color="text.secondary"
      >
        Administrator status is protected.
      </Typography>
    );
  }

  const actionLabel = user.isActive
    ? 'Deactivate'
    : 'Reactivate';

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
        variant={
          user.isActive
            ? 'outlined'
            : 'contained'
        }
        color={
          user.isActive
            ? 'warning'
            : 'success'
        }
        onClick={() => {
          mutation.reset();
          setDialogOpen(true);
        }}
      >
        {actionLabel}
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {actionLabel} user
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{ pt: 1 }}
          >
            {user.isActive ? (
              <Alert severity="warning">
                This user will no longer be able
                to sign in. Existing refresh
                sessions will also be revoked.
              </Alert>
            ) : (
              <Alert severity="info">
                This user will regain access to
                the system.
              </Alert>
            )}

            <Typography>
              {actionLabel}{' '}
              <strong>
                {user.firstName}{' '}
                {user.lastName}
              </strong>
              ?
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              {user.email}
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
            variant="contained"
            color={
              user.isActive
                ? 'warning'
                : 'success'
            }
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
              ? 'Updating...'
              : actionLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}