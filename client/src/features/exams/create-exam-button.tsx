import { useState } from 'react';
import { AddOutlined } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Snackbar,
    Stack,
    Switch,
    TextField,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';
import {
    useForm,
    Controller
} from 'react-hook-form';
import {
    createExamFormSchema,
    type CreateExamFormValues,
} from './create-exam.schema';
import {
    createExam,
    getLecturerCourses,
} from './exam.api';
import type { CreateExamInput } from './exam.types';

interface ApiErrorResponse {
    error?: {
        message?: string;
    };
}

const defaultValues: CreateExamFormValues = {
    courseId: '',
    title: '',
    description: '',
    instructions: '',
    startAt: '',
    endAt: '',
    durationMinutes: 60,
    maxAttempts: 1,
    passingPercentage: 60,
    shuffleQuestions: false,
    showFeedback: true,
};

function getCreateErrorMessage(error: unknown): string {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
        return 'An unexpected error occurred while creating the exam.';
    }

    if (!error.response) {
        return 'The API is unavailable. Make sure the server is running.';
    }

    return (
        error.response.data?.error?.message ??
        'The exam could not be created. Please try again.'
    );
}

export function CreateExamButton() {
    const queryClient = useQueryClient();

    const [isOpen, setIsOpen] = useState(false);
    const [successMessage, setSuccessMessage] =
        useState<string | null>(null);

    const {
        control,
        register,
        handleSubmit,
        reset,
        formState: {
            errors,
        },
    } = useForm<CreateExamFormValues>({
        resolver: zodResolver(createExamFormSchema),
        defaultValues,
    });

    const {
        data: courses = [],
        error: coursesError,
        isLoading: isLoadingCourses,
    } = useQuery({
        queryKey: ['lecturer', 'courses'],
        queryFn: getLecturerCourses,
        enabled: isOpen,
    });

    const createMutation = useMutation({
        mutationFn: createExam,
        onSuccess: async (exam) => {
            await queryClient.invalidateQueries({
                queryKey: ['lecturer', 'exams'],
            });

            setSuccessMessage(
                `${exam.title} was created successfully.`,
            );
            setIsOpen(false);
            reset(defaultValues);
        },
    });

    const handleOpen = () => {
        createMutation.reset();
        setIsOpen(true);
    };

    const handleClose = () => {
        if (createMutation.isPending) {
            return;
        }

        createMutation.reset();
        reset(defaultValues);
        setIsOpen(false);
    };

    const onSubmit = handleSubmit((values) => {
        const input: CreateExamInput = {
            courseId: values.courseId,
            title: values.title,
            durationMinutes: values.durationMinutes,
            maxAttempts: values.maxAttempts,
            passingPercentage: values.passingPercentage,
            shuffleQuestions: values.shuffleQuestions,
            showFeedback: values.showFeedback,
            ...(values.description && {
                description: values.description,
            }),
            ...(values.instructions && {
                instructions: values.instructions,
            }),
            ...(values.startAt && {
                startAt: new Date(values.startAt).toISOString(),
            }),
            ...(values.endAt && {
                endAt: new Date(values.endAt).toISOString(),
            }),
        };

        createMutation.mutate(input);
    });

    return (
        <>
            <Button
                variant="contained"
                startIcon={<AddOutlined />}
                onClick={handleOpen}
            >
                Create exam
            </Button>

            <Dialog
                open={isOpen}
                onClose={handleClose}
                fullWidth
                maxWidth="md"
            >
                <Box
                    component="form"
                    noValidate
                    onSubmit={onSubmit}
                >
                    <DialogTitle>Create a new exam</DialogTitle>

                    <DialogContent dividers>
                        <Stack spacing={3}>
                            {coursesError && (
                                <Alert severity="error">
                                    The available courses could not be loaded.
                                </Alert>
                            )}

                            {createMutation.error && (
                                <Alert severity="error">
                                    {getCreateErrorMessage(
                                        createMutation.error,
                                    )}
                                </Alert>
                            )}

                            <TextField
                                {...register('courseId')}
                                select
                                label="Course"
                                fullWidth
                                disabled={
                                    isLoadingCourses ||
                                    courses.length === 0
                                }
                                error={Boolean(errors.courseId)}
                                helperText={
                                    errors.courseId?.message ??
                                    (
                                        isLoadingCourses
                                            ? 'Loading courses...'
                                            : undefined
                                    )
                                }
                            >
                                {courses.map((course) => (
                                    <MenuItem
                                        key={course.id}
                                        value={course.id}
                                    >
                                        {course.code} — {course.name}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                {...register('title')}
                                label="Exam title"
                                fullWidth
                                autoFocus
                                error={Boolean(errors.title)}
                                helperText={errors.title?.message}
                            />

                            <TextField
                                {...register('description')}
                                label="Description"
                                fullWidth
                                multiline
                                minRows={2}
                                error={Boolean(errors.description)}
                                helperText={errors.description?.message}
                            />

                            <TextField
                                {...register('instructions')}
                                label="Instructions"
                                fullWidth
                                multiline
                                minRows={3}
                                error={Boolean(errors.instructions)}
                                helperText={errors.instructions?.message}
                            />

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'repeat(2, minmax(0, 1fr))',
                                    },
                                    gap: 2,
                                }}
                            >
                                <TextField
                                    {...register('startAt')}
                                    label="Start time"
                                    type="datetime-local"
                                    fullWidth
                                    error={Boolean(errors.startAt)}
                                    helperText={errors.startAt?.message}
                                    slotProps={{
                                        inputLabel: {
                                            shrink: true,
                                        },
                                    }}
                                />

                                <TextField
                                    {...register('endAt')}
                                    label="End time"
                                    type="datetime-local"
                                    fullWidth
                                    error={Boolean(errors.endAt)}
                                    helperText={errors.endAt?.message}
                                    slotProps={{
                                        inputLabel: {
                                            shrink: true,
                                        },
                                    }}
                                />
                            </Box>

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'repeat(3, minmax(0, 1fr))',
                                    },
                                    gap: 2,
                                }}
                            >
                                <TextField
                                    {...register('durationMinutes', {
                                        valueAsNumber: true,
                                    })}
                                    label="Duration in minutes"
                                    type="number"
                                    fullWidth
                                    error={Boolean(errors.durationMinutes)}
                                    helperText={
                                        errors.durationMinutes?.message
                                    }
                                    slotProps={{
                                        htmlInput: {
                                            min: 1,
                                            max: 480,
                                        },
                                    }}
                                />

                                <TextField
                                    {...register('maxAttempts', {
                                        valueAsNumber: true,
                                    })}
                                    label="Maximum attempts"
                                    type="number"
                                    fullWidth
                                    error={Boolean(errors.maxAttempts)}
                                    helperText={errors.maxAttempts?.message}
                                    slotProps={{
                                        htmlInput: {
                                            min: 1,
                                            max: 10,
                                        },
                                    }}
                                />

                                <TextField
                                    {...register('passingPercentage', {
                                        valueAsNumber: true,
                                    })}
                                    label="Passing percentage"
                                    type="number"
                                    fullWidth
                                    error={Boolean(errors.passingPercentage)}
                                    helperText={
                                        errors.passingPercentage?.message
                                    }
                                    slotProps={{
                                        htmlInput: {
                                            min: 0,
                                            max: 100,
                                        },
                                    }}
                                />
                            </Box>

                            <Stack spacing={1}>
                                <Controller
                                    name="shuffleQuestions"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControlLabel
                                            label="Shuffle question order for each student"
                                            control={
                                                <Switch
                                                    checked={field.value}
                                                    onChange={(
                                                        _event,
                                                        checked,
                                                    ) => field.onChange(checked)}
                                                />
                                            }
                                        />
                                    )}
                                />

                                <Controller
                                    name="showFeedback"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControlLabel
                                            label="Show feedback after results are published"
                                            control={
                                                <Switch
                                                    checked={field.value}
                                                    onChange={(
                                                        _event,
                                                        checked,
                                                    ) => field.onChange(checked)}
                                                />
                                            }
                                        />
                                    )}
                                />
                            </Stack>
                        </Stack>
                    </DialogContent>

                    <DialogActions sx={{ px: 3, py: 2 }}>
                        <Button
                            type="button"
                            color="inherit"
                            disabled={createMutation.isPending}
                            onClick={handleClose}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={
                                createMutation.isPending ||
                                isLoadingCourses ||
                                courses.length === 0
                            }
                        >
                            {createMutation.isPending ? (
                                <CircularProgress
                                    size={20}
                                    color="inherit"
                                />
                            ) : (
                                'Create draft'
                            )}
                        </Button>
                    </DialogActions>
                </Box>
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