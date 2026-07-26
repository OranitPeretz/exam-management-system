import {
  AddOutlined,
  ArrowBack,
  LogoutOutlined,
  PersonAddOutlined,
  RefreshOutlined,
  SchoolOutlined,
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';
import {
  type FormEvent,
  useState,
} from 'react';
import { useNavigate } from 'react-router';

import { useAuth } from '../auth/use-auth';
import {
  createManagedCourse,
  enrollStudent as enrollStudentRequest,
  getManagedCourses,
  getManagedUsers,
} from './admin.api';
import type {
  CreateManagedCourseInput,
  ManagedCourse,
} from './admin.types';

interface CourseFormState {
  code: string;
  name: string;
  description: string;
  lecturerId: string;
}

const initialCourseForm: CourseFormState = {
  code: '',
  name: '',
  description: '',
  lecturerId: '',
};

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

  if (error.response.status === 403) {
    return 'Only administrators can manage courses.';
  }

  if (error.response.status === 409) {
    return 'The requested record already exists.';
  }

  return 'The request could not be completed. Please try again.';
}

interface SummaryCardProps {
  label: string;
  value: number;
  color: string;
}

function SummaryCard({
  label,
  value,
  color,
}: SummaryCardProps) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2.5 }}>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          {label}
        </Typography>

        <Typography
          variant="h4"
          sx={{
            mt: 0.5,
            color,
            fontWeight: 700,
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

interface CourseCardProps {
  course: ManagedCourse;
  onEnroll: (course: ManagedCourse) => void;
}

function CourseCard({
  course,
  onEnroll,
}: CourseCardProps) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
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
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  mb: 0.5,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Chip
                  label={course.code}
                  color="primary"
                  size="small"
                />

                <Chip
                  label={
                    course.isActive
                      ? 'Active'
                      : 'Inactive'
                  }
                  color={
                    course.isActive
                      ? 'success'
                      : 'default'
                  }
                  size="small"
                  variant="outlined"
                />
              </Stack>

              <Typography
                component="h2"
                variant="h5"
                sx={{ fontWeight: 700 }}
              >
                {course.name}
              </Typography>

              <Typography color="text.secondary">
                Lecturer: {course.lecturer.firstName}{' '}
                {course.lecturer.lastName}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                {course.lecturer.email}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={<PersonAddOutlined />}
              disabled={!course.isActive}
              onClick={() => onEnroll(course)}
            >
              Enroll student
            </Button>
          </Stack>

          {course.description && (
            <Typography color="text.secondary">
              {course.description}
            </Typography>
          )}

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
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Active students
              </Typography>

              <Typography sx={{ fontWeight: 700 }}>
                {course.enrollments.length}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Exams
              </Typography>

              <Typography sx={{ fontWeight: 700 }}>
                {course._count.exams}
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography
              variant="subtitle1"
              sx={{ mb: 1.5, fontWeight: 700 }}
            >
              Enrolled students
            </Typography>

            {course.enrollments.length === 0 ? (
              <Alert severity="info">
                No students are currently enrolled
                in this course.
              </Alert>
            ) : (
              <Stack spacing={1}>
                {course.enrollments.map(
                  (enrollment) => (
                    <Box
                      key={enrollment.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography
                          sx={{ fontWeight: 600 }}
                        >
                          {
                            enrollment.student
                              .firstName
                          }{' '}
                          {
                            enrollment.student
                              .lastName
                          }
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          {enrollment.student.email}
                        </Typography>
                      </Box>

                      <Chip
                        label={enrollment.status}
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  ),
                )}
              </Stack>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function AdminCoursesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const [
    createDialogOpen,
    setCreateDialogOpen,
  ] = useState(false);

  const [
    courseForm,
    setCourseForm,
  ] = useState<CourseFormState>(
    initialCourseForm,
  );

  const [
    enrollmentCourse,
    setEnrollmentCourse,
  ] = useState<ManagedCourse | null>(null);

  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState('');

  const coursesQuery = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: getManagedCourses,
  });

  const usersQuery = useQuery({
    queryKey: [
      'admin',
      'users',
      {
        isActive: true,
      },
    ],
    queryFn: () =>
      getManagedUsers({
        isActive: true,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (
      input: CreateManagedCourseInput,
    ) => createManagedCourse(input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'courses'],
      });

      setCourseForm(initialCourseForm);
      setCreateDialogOpen(false);
    },
  });

  const enrollmentMutation = useMutation({
    mutationFn: ({
      courseId,
      studentId,
    }: {
      courseId: string;
      studentId: string;
    }) =>
      enrollStudentRequest(courseId, {
        studentId,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'courses'],
      });

      setSelectedStudentId('');
      setEnrollmentCourse(null);
    },
  });

  const courses = coursesQuery.data ?? [];
  const users = usersQuery.data?.users ?? [];

  const lecturers = users.filter(
    (user) =>
      user.role === 'LECTURER' &&
      user.isActive,
  );

  const students = users.filter(
    (user) =>
      user.role === 'STUDENT' &&
      user.isActive,
  );

  const enrolledStudentIds = new Set(
    enrollmentCourse?.enrollments.map(
      (enrollment) =>
        enrollment.student.id,
    ) ?? [],
  );

  const availableStudents = students.filter(
    (student) =>
      !enrolledStudentIds.has(student.id),
  );

  const activeCourseCount = courses.filter(
    (course) => course.isActive,
  ).length;

  const enrollmentCount = courses.reduce(
    (total, course) =>
      total + course.enrollments.length,
    0,
  );

  const isLoading =
    coursesQuery.isLoading ||
    usersQuery.isLoading;

  const queryError =
    coursesQuery.error ?? usersQuery.error;

  const handleCreateDialogClose = () => {
    if (createMutation.isPending) {
      return;
    }

    createMutation.reset();
    setCourseForm(initialCourseForm);
    setCreateDialogOpen(false);
  };

  const handleEnrollmentDialogClose = () => {
    if (enrollmentMutation.isPending) {
      return;
    }

    enrollmentMutation.reset();
    setSelectedStudentId('');
    setEnrollmentCourse(null);
  };

  const handleCreateCourse = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    createMutation.mutate({
      code: courseForm.code.trim(),
      name: courseForm.name.trim(),
      description:
        courseForm.description.trim() ||
        undefined,
      lecturerId: courseForm.lecturerId,
    });
  };

  const handleEnrollStudent = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !enrollmentCourse ||
      !selectedStudentId
    ) {
      return;
    }

    enrollmentMutation.mutate({
      courseId: enrollmentCourse.id,
      studentId: selectedStudentId,
    });
  };

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
      <AppBar position="static">
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

          <SchoolOutlined sx={{ ml: 1 }} />

          <Typography
            variant="h6"
            sx={{
              ml: 1,
              flexGrow: 1,
              fontWeight: 700,
            }}
          >
            Course Administration
          </Typography>

          <Tooltip title="Refresh courses">
            <IconButton
              color="inherit"
              aria-label="Refresh courses"
              disabled={
                coursesQuery.isFetching ||
                usersQuery.isFetching
              }
              onClick={() => {
                void Promise.all([
                  coursesQuery.refetch(),
                  usersQuery.refetch(),
                ]);
              }}
            >
              <RefreshOutlined />
            </IconButton>
          </Tooltip>

          <Button
            color="inherit"
            startIcon={<LogoutOutlined />}
            onClick={() => {
              void handleLogout();
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="lg"
        sx={{ py: { xs: 3, md: 5 } }}
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
                xs: 'stretch',
                sm: 'center',
              },
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                component="h1"
                variant="h3"
                sx={{ fontWeight: 700 }}
              >
                Course Management
              </Typography>

              <Typography color="text.secondary">
                Create courses, assign lecturers
                and enroll students.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              disabled={lecturers.length === 0}
              onClick={() =>
                setCreateDialogOpen(true)
              }
            >
              Create course
            </Button>
          </Stack>

          {lecturers.length === 0 &&
            !isLoading && (
              <Alert severity="warning">
                Create an active lecturer account
                before creating a course.
              </Alert>
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
            <SummaryCard
              label="Total courses"
              value={courses.length}
              color="primary.main"
            />

            <SummaryCard
              label="Active courses"
              value={activeCourseCount}
              color="success.main"
            />

            <SummaryCard
              label="Active enrollments"
              value={enrollmentCount}
              color="secondary.main"
            />
          </Box>

          {queryError && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    void Promise.all([
                      coursesQuery.refetch(),
                      usersQuery.refetch(),
                    ]);
                  }}
                >
                  Try again
                </Button>
              }
            >
              {getErrorMessage(queryError)}
            </Alert>
          )}

          {isLoading && (
            <Box
              sx={{
                py: 8,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {!isLoading &&
            !queryError &&
            courses.length === 0 && (
              <Alert severity="info">
                No courses have been created yet.
              </Alert>
            )}

          {!isLoading &&
            !queryError &&
            courses.length > 0 && (
              <Stack spacing={2}>
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onEnroll={
                      setEnrollmentCourse
                    }
                  />
                ))}
              </Stack>
            )}
        </Stack>
      </Container>

      <Dialog
        open={createDialogOpen}
        onClose={handleCreateDialogClose}
        fullWidth
        maxWidth="sm"
      >
        <Box
          component="form"
          onSubmit={handleCreateCourse}
        >
          <DialogTitle>
            Create a new course
          </DialogTitle>

          <DialogContent>
            <Stack
              spacing={2.5}
              sx={{ pt: 1 }}
            >
              {createMutation.error && (
                <Alert severity="error">
                  {getErrorMessage(
                    createMutation.error,
                  )}
                </Alert>
              )}

              <TextField
                label="Course code"
                value={courseForm.code}
                required
                autoFocus
                slotProps={{
                  htmlInput: {
                    minLength: 2,
                    maxLength: 20,
                    pattern: '[A-Za-z0-9-]+',
                  },
                }}
                helperText="Letters, numbers and hyphens only."
                onChange={(event) =>
                  setCourseForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
              />

              <TextField
                label="Course name"
                value={courseForm.name}
                required
                slotProps={{
                  htmlInput: {
                    minLength: 2,
                    maxLength: 120,
                  },
                }}
                onChange={(event) =>
                  setCourseForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />

              <TextField
                label="Description"
                value={courseForm.description}
                multiline
                minRows={3}
                slotProps={{
                  htmlInput: {
                    maxLength: 500,
                  },
                }}
                onChange={(event) =>
                  setCourseForm((current) => ({
                    ...current,
                    description:
                      event.target.value,
                  }))
                }
              />

              <FormControl required>
                <InputLabel id="course-lecturer-label">
                  Lecturer
                </InputLabel>

                <Select
                  labelId="course-lecturer-label"
                  label="Lecturer"
                  value={courseForm.lecturerId}
                  onChange={(event) =>
                    setCourseForm((current) => ({
                      ...current,
                      lecturerId:
                        event.target.value,
                    }))
                  }
                >
                  {lecturers.map((lecturer) => (
                    <MenuItem
                      key={lecturer.id}
                      value={lecturer.id}
                    >
                      {lecturer.firstName}{' '}
                      {lecturer.lastName} —{' '}
                      {lecturer.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={handleCreateDialogClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending}
              startIcon={
                createMutation.isPending ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                ) : (
                  <AddOutlined />
                )
              }
            >
              {createMutation.isPending
                ? 'Creating...'
                : 'Create course'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={Boolean(enrollmentCourse)}
        onClose={handleEnrollmentDialogClose}
        fullWidth
        maxWidth="sm"
      >
        <Box
          component="form"
          onSubmit={handleEnrollStudent}
        >
          <DialogTitle>
            Enroll a student
          </DialogTitle>

          <DialogContent>
            <Stack
              spacing={2.5}
              sx={{ pt: 1 }}
            >
              {enrollmentCourse && (
                <Alert severity="info">
                  Course: {enrollmentCourse.code} —{' '}
                  {enrollmentCourse.name}
                </Alert>
              )}

              {enrollmentMutation.error && (
                <Alert severity="error">
                  {getErrorMessage(
                    enrollmentMutation.error,
                  )}
                </Alert>
              )}

              {availableStudents.length === 0 ? (
                <Alert severity="warning">
                  There are no additional active
                  students available for enrollment.
                </Alert>
              ) : (
                <FormControl required>
                  <InputLabel id="enrollment-student-label">
                    Student
                  </InputLabel>

                  <Select
                    labelId="enrollment-student-label"
                    label="Student"
                    value={selectedStudentId}
                    onChange={(event) =>
                      setSelectedStudentId(
                        event.target.value,
                      )
                    }
                  >
                    {availableStudents.map(
                      (student) => (
                        <MenuItem
                          key={student.id}
                          value={student.id}
                        >
                          {student.firstName}{' '}
                          {student.lastName} —{' '}
                          {student.email}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>
              )}
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={
                handleEnrollmentDialogClose
              }
              disabled={
                enrollmentMutation.isPending
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={
                enrollmentMutation.isPending ||
                !selectedStudentId ||
                availableStudents.length === 0
              }
              startIcon={
                enrollmentMutation.isPending ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                ) : (
                  <PersonAddOutlined />
                )
              }
            >
              {enrollmentMutation.isPending
                ? 'Enrolling...'
                : 'Enroll student'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}