import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import { getHealth } from './features/health/health.api';

function App() {
  const {
    data: health,
    error,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
  });

  const apiIsOnline = health?.data.status === 'ok';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #eef2ff 0%, #fdf2f8 50%, #f8fafc 100%)',
        py: { xs: 5, md: 9 },
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Box>
            <Chip
              color={apiIsOnline ? 'success' : 'default'}
              icon={apiIsOnline ? <CheckCircleRoundedIcon /> : undefined}
              label={apiIsOnline ? 'API Online' : 'Checking API'}
              sx={{ mb: 2 }}
            />

            <Typography component="h1" variant="h3">
              ExamFlow
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }} variant="h6">
              Full Stack Exam Management System
            </Typography>
          </Box>

          {isPending && (
            <Card>
              <CardContent>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: 'center' }}
                >
                  <CircularProgress size={24} />
                  <Typography>Connecting to the backend API...</Typography>
                </Stack>
              </CardContent>
            </Card>
          )}

          {isError && (
            <Alert
              action={
                <Button
                  color="inherit"
                  disabled={isFetching}
                  onClick={() => void refetch()}
                  size="small"
                >
                  Retry
                </Button>
              }
              severity="error"
            >
              {error instanceof Error
                ? error.message
                : 'The backend API is unavailable.'}
            </Alert>
          )}

          {health && (
            <Card>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <CloudDoneRoundedIcon color="success" />
                      <Typography variant="h5">System connection</Typography>
                    </Stack>

                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      React is communicating successfully with the Express API.
                    </Typography>

                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      Service: {health.data.service}
                    </Typography>

                    <Typography color="text.secondary">
                      Last check:{' '}
                      {new Date(health.data.timestamp).toLocaleString()}
                    </Typography>
                  </Box>

                  <Button
                    disabled={isFetching}
                    onClick={() => void refetch()}
                    startIcon={<RefreshRoundedIcon />}
                    variant="outlined"
                  >
                    {isFetching ? 'Checking...' : 'Check again'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, 1fr)',
              },
            }}
          >
            <Card>
              <CardContent>
                <CloudDoneRoundedIcon color="primary" />
                <Typography sx={{ mt: 2 }} variant="h5">
                  Frontend and API
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  React, TypeScript and Express are connected.
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <StorageRoundedIcon color="primary" />
                <Typography sx={{ mt: 2 }} variant="h5">
                  Database
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  PostgreSQL and Prisma are the next implementation step.
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <SecurityRoundedIcon color="secondary" />
                <Typography sx={{ mt: 2 }} variant="h5">
                  Security
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  JWT authentication and role-based authorization are planned.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

export default App;