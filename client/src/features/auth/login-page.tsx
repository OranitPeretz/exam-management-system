import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  LockOutlined,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { useAuth } from './use-auth';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must contain at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
  message?: string;
}

function getLoginErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'An unexpected error occurred. Please try again.';
  }

  if (!error.response) {
    return 'The API is unavailable. Make sure the server is running.';
  }

  if (error.response.status === 401) {
    return 'The email or password is incorrect.';
  }

  if (error.response.status === 429) {
    return 'Too many login attempts. Please wait and try again.';
  }

  return (
    error.response.data?.error?.message ??
    error.response.data?.message ??
    'Login failed. Please try again.'
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const previousLocation = (
    location.state as { from?: { pathname?: string } } | null
  )?.from?.pathname;

  const destination = previousLocation ?? '/dashboard';

  const onSubmit = handleSubmit(async (credentials) => {
    setServerError(null);

    try {
      await login(credentials);
      navigate(destination, { replace: true });
    } catch (error) {
      setServerError(getLoginErrorMessage(error));
    }
  });

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 4,
        background:
          'linear-gradient(135deg, #f3f4ff 0%, #fff4f8 50%, #f7f9ff 100%)',
      }}
    >
      <Container maxWidth="xs">
        <Stack spacing={3}>
          <Stack sx={{ alignItems: 'center', textAlign: 'center' }} spacing={1}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'primary.main',
              }}
            >
              <LockOutlined />
            </Avatar>

            <Typography component="h1" variant="h3" sx={{ fontWeight: 700 }}>
              ExamFlow
            </Typography>

            <Typography color="text.secondary">
              Full Stack Exam Management System
            </Typography>
          </Stack>

          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack
                component="form"
                onSubmit={onSubmit}
                noValidate
                spacing={2.5}
              >
                <Box>
                  <Typography component="h2" variant="h5" sx={{ fontWeight: 700 }}>
                    Welcome back
                  </Typography>

                  <Typography color="text.secondary" variant="body2">
                    Sign in to continue to your dashboard.
                  </Typography>
                </Box>

                {serverError && (
                  <Alert severity="error" role="alert">
                    {serverError}
                  </Alert>
                )}

                <TextField
                  {...register('email')}
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  fullWidth
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                />

                <TextField
                  {...register('password')}
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  fullWidth
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            aria-label={
                              showPassword ? 'Hide password' : 'Show password'
                            }
                            edge="end"
                            onClick={() => setShowPassword((current) => !current)}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  sx={{ minHeight: 48 }}
                >
                  {isSubmitting ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <CircularProgress size={18} color="inherit" />
                      <span>Signing in...</span>
                    </Stack>
                  ) : (
                    'Sign in'
                  )}
                </Button>

                {import.meta.env.DEV && (
                  <Alert severity="info">
                    Demo student: student@examflow.local / Student123!
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}