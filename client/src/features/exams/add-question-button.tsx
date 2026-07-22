import { useState } from 'react';
import {
    AddOutlined,
    DeleteOutlined,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    MenuItem,
    Radio,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';
import {
    Controller,
    useFieldArray,
    useForm,
    useWatch,
} from 'react-hook-form';

import {
    createQuestionFormSchema,
    type CreateQuestionFormValues,
} from './create-question.schema';
import {
    createQuestion,
    getQuestionTypes,
} from './exam.api';
import type {
    CreateQuestionInput,
    QuestionTypeCode,
} from './exam.types';

interface AddQuestionButtonProps {
    examId: string;
}

interface ApiErrorResponse {
    error?: {
        message?: string;
    };
}

const choiceQuestionTypes =
    new Set<QuestionTypeCode>([
        'SINGLE_CHOICE',
        'MULTIPLE_CHOICE',
        'TRUE_FALSE',
    ]);

const defaultValues: CreateQuestionFormValues = {
    typeCode: 'SINGLE_CHOICE',
    prompt: '',
    points: 10,
    isRequired: true,
    options: [
        {
            text: '',
            isCorrect: true,
        },
        {
            text: '',
            isCorrect: false,
        },
    ],
    correctNumericAnswer: null,
    numericTolerance: 0,
};

function createDefaultOptions(
    typeCode: QuestionTypeCode,
): CreateQuestionFormValues['options'] {
    if (typeCode === 'TRUE_FALSE') {
        return [
            {
                text: 'True',
                isCorrect: true,
            },
            {
                text: 'False',
                isCorrect: false,
            },
        ];
    }

    if (typeCode === 'SINGLE_CHOICE') {
        return [
            {
                text: '',
                isCorrect: true,
            },
            {
                text: '',
                isCorrect: false,
            },
        ];
    }

    if (typeCode === 'MULTIPLE_CHOICE') {
        return [
            {
                text: '',
                isCorrect: false,
            },
            {
                text: '',
                isCorrect: false,
            },
        ];
    }

    return [];
}

function getCreateErrorMessage(error: unknown): string {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
        return 'An unexpected error occurred while creating the question.';
    }

    if (!error.response) {
        return 'The API is unavailable. Make sure the server is running.';
    }

    if (error.response.status === 409) {
        return (
            error.response.data?.error?.message ??
            'Only draft exams can be changed.'
        );
    }

    return (
        error.response.data?.error?.message ??
        'The question could not be created. Please try again.'
    );
}

export function AddQuestionButton({
    examId,
}: AddQuestionButtonProps) {
    const queryClient = useQueryClient();

    const [isOpen, setIsOpen] = useState(false);
    const [successMessage, setSuccessMessage] =
        useState<string | null>(null);

    const {
        control,
        register,
        handleSubmit,
        reset,
        setValue,
        formState: {
            errors,
        },
    } = useForm<CreateQuestionFormValues>({
        resolver: zodResolver(createQuestionFormSchema),
        defaultValues,
    });

    const {
        fields,
        append,
        remove,
        replace,
    } = useFieldArray({
        control,
        name: 'options',
    });

    const selectedTypeCode = useWatch({
        control,
        name: 'typeCode',
        defaultValue: 'SINGLE_CHOICE',
    });

    const optionValues = useWatch({
        control,
        name: 'options',
        defaultValue: defaultValues.options,
    });

    const {
        data: questionTypes = [],
        error: questionTypesError,
        isLoading: isLoadingQuestionTypes,
    } = useQuery({
        queryKey: ['lecturer', 'question-types'],
        queryFn: getQuestionTypes,
        enabled: isOpen,
    });

    const createMutation = useMutation({
        mutationFn: (input: CreateQuestionInput) =>
            createQuestion(examId, input),
        onSuccess: async (question) => {
            await queryClient.invalidateQueries({
                queryKey: ['lecturer', 'exams'],
            });

            setSuccessMessage(
                `Question ${question.position} was created successfully.`,
            );

            reset(defaultValues);
            setIsOpen(false);
        },
    });

    const handleOpen = () => {
        createMutation.reset();
        reset(defaultValues);
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

    const handleTypeChange = (
        typeCode: QuestionTypeCode,
    ) => {
        replace(createDefaultOptions(typeCode));

        setValue(
            'correctNumericAnswer',
            typeCode === 'NUMERIC' ? 0 : null,
        );

        setValue('numericTolerance', 0);
    };

    const selectSingleCorrectOption = (
        selectedIndex: number,
    ) => {
        optionValues.forEach((_option, index) => {
            setValue(
                `options.${index}.isCorrect`,
                index === selectedIndex,
                {
                    shouldValidate: true,
                },
            );
        });
    };

    const onSubmit = handleSubmit((values) => {
        const input: CreateQuestionInput = {
            typeCode: values.typeCode,
            prompt: values.prompt,
            points: values.points,
            isRequired: values.isRequired,
            ...(choiceQuestionTypes.has(values.typeCode) && {
                options: values.options.map((option) => ({
                    text: option.text,
                    isCorrect: option.isCorrect,
                })),
            }),
            ...(values.typeCode === 'NUMERIC' &&
                values.correctNumericAnswer !== null && {
                correctNumericAnswer:
                    values.correctNumericAnswer,
                numericTolerance: values.numericTolerance,
            }),
        };

        createMutation.mutate(input);
    });

    const isChoiceQuestion =
        choiceQuestionTypes.has(selectedTypeCode);

    const usesSingleCorrectAnswer =
        selectedTypeCode === 'SINGLE_CHOICE' ||
        selectedTypeCode === 'TRUE_FALSE';

    return (
        <>
            <Button
                variant="contained"
                startIcon={<AddOutlined />}
                onClick={handleOpen}
            >
                Add question
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
                    <DialogTitle>Add a question</DialogTitle>

                    <DialogContent dividers>
                        <Stack spacing={3}>
                            {questionTypesError && (
                                <Alert severity="error">
                                    The available question types could not be loaded.
                                </Alert>
                            )}

                            {createMutation.error && (
                                <Alert severity="error">
                                    {getCreateErrorMessage(
                                        createMutation.error,
                                    )}
                                </Alert>
                            )}

                            <Controller
                                name="typeCode"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        select
                                        label="Question type"
                                        fullWidth
                                        value={field.value}
                                        disabled={
                                            isLoadingQuestionTypes ||
                                            questionTypes.length === 0
                                        }
                                        error={Boolean(errors.typeCode)}
                                        helperText={
                                            errors.typeCode?.message ??
                                            (isLoadingQuestionTypes
                                                ? 'Loading question types...'
                                                : undefined)
                                        }
                                        onChange={(event) => {
                                            const typeCode =
                                                event.target
                                                    .value as QuestionTypeCode;

                                            field.onChange(typeCode);
                                            handleTypeChange(typeCode);
                                        }}
                                    >
                                        {questionTypes.map((questionType) => (
                                            <MenuItem
                                                key={questionType.id}
                                                value={questionType.code}
                                            >
                                                {questionType.name}
                                                {questionType.isAutoGradable
                                                    ? ' — automatic grading'
                                                    : ' — manual grading'}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />

                            <TextField
                                {...register('prompt')}
                                label="Question prompt"
                                fullWidth
                                multiline
                                minRows={3}
                                autoFocus
                                error={Boolean(errors.prompt)}
                                helperText={errors.prompt?.message}
                            />

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'minmax(0, 1fr) minmax(0, 2fr)',
                                    },
                                    gap: 2,
                                }}
                            >
                                <TextField
                                    {...register('points', {
                                        valueAsNumber: true,
                                    })}
                                    label="Points"
                                    type="number"
                                    fullWidth
                                    error={Boolean(errors.points)}
                                    helperText={errors.points?.message}
                                    slotProps={{
                                        htmlInput: {
                                            min: 1,
                                            max: 100,
                                        },
                                    }}
                                />

                                <Controller
                                    name="isRequired"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControlLabel
                                            label="Students must answer this question"
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
                            </Box>

                            {isChoiceQuestion && (
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography
                                            variant="h6"
                                            sx={{ fontWeight: 700 }}
                                        >
                                            Answer options
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            {selectedTypeCode ===
                                                'MULTIPLE_CHOICE'
                                                ? 'Select every correct answer.'
                                                : 'Select exactly one correct answer.'}
                                        </Typography>
                                    </Box>

                                    {typeof errors.options?.message ===
                                        'string' && (
                                            <Alert severity="error">
                                                {errors.options.message}
                                            </Alert>
                                        )}

                                    {fields.map((optionField, index) => (
                                        <Stack
                                            key={optionField.id}
                                            direction="row"
                                            spacing={1}
                                            sx={{ alignItems: 'flex-start' }}
                                        >
                                            <Controller
                                                name={
                                                    `options.${index}.isCorrect` as const
                                                }
                                                control={control}
                                                render={({ field }) =>
                                                    usesSingleCorrectAnswer ? (
                                                        <Radio
                                                            checked={field.value}
                                                            aria-label={`Mark option ${index + 1
                                                                } as correct`}
                                                            onChange={() =>
                                                                selectSingleCorrectOption(
                                                                    index,
                                                                )
                                                            }
                                                        />
                                                    ) : (
                                                        <Checkbox
                                                            checked={field.value}
                                                            aria-label={`Mark option ${index + 1
                                                                } as correct`}
                                                            onChange={(
                                                                _event,
                                                                checked,
                                                            ) =>
                                                                field.onChange(checked)
                                                            }
                                                        />
                                                    )
                                                }
                                            />

                                            <TextField
                                                {...register(
                                                    `options.${index}.text` as const,
                                                )}
                                                label={`Option ${index + 1}`}
                                                fullWidth
                                                disabled={
                                                    selectedTypeCode ===
                                                    'TRUE_FALSE'
                                                }
                                                error={Boolean(
                                                    errors.options?.[index]?.text,
                                                )}
                                                helperText={
                                                    errors.options?.[index]?.text
                                                        ?.message
                                                }
                                            />

                                            <Tooltip title="Remove option">
                                                <span>
                                                    <IconButton
                                                        aria-label={`Remove option ${index + 1
                                                            }`}
                                                        disabled={
                                                            fields.length <= 2 ||
                                                            selectedTypeCode ===
                                                            'TRUE_FALSE'
                                                        }
                                                        onClick={() => remove(index)}
                                                    >
                                                        <DeleteOutlined />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Stack>
                                    ))}

                                    {selectedTypeCode !== 'TRUE_FALSE' && (
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            startIcon={<AddOutlined />}
                                            disabled={fields.length >= 10}
                                            onClick={() =>
                                                append({
                                                    text: '',
                                                    isCorrect: false,
                                                })
                                            }
                                            sx={{ alignSelf: 'flex-start' }}
                                        >
                                            Add option
                                        </Button>
                                    )}
                                </Stack>
                            )}

                            {selectedTypeCode === 'NUMERIC' && (
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
                                        {...register(
                                            'correctNumericAnswer',
                                            {
                                                setValueAs: (value) =>
                                                    value === ''
                                                        ? null
                                                        : Number(value),
                                            },
                                        )}
                                        label="Correct numeric answer"
                                        type="number"
                                        fullWidth
                                        error={Boolean(
                                            errors.correctNumericAnswer,
                                        )}
                                        helperText={
                                            errors.correctNumericAnswer?.message
                                        }
                                    />

                                    <TextField
                                        {...register('numericTolerance', {
                                            valueAsNumber: true,
                                        })}
                                        label="Accepted tolerance"
                                        type="number"
                                        fullWidth
                                        error={Boolean(
                                            errors.numericTolerance,
                                        )}
                                        helperText={
                                            errors.numericTolerance?.message ??
                                            'Use 0 for an exact answer.'
                                        }
                                        slotProps={{
                                            htmlInput: {
                                                min: 0,
                                                step: 'any',
                                            },
                                        }}
                                    />
                                </Box>
                            )}

                            {(selectedTypeCode === 'SHORT_TEXT' ||
                                selectedTypeCode === 'LONG_TEXT') && (
                                    <Alert severity="info">
                                        Text answers will require manual grading by
                                        the lecturer.
                                    </Alert>
                                )}
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
                                isLoadingQuestionTypes ||
                                questionTypes.length === 0
                            }
                        >
                            {createMutation.isPending ? (
                                <CircularProgress
                                    size={20}
                                    color="inherit"
                                />
                            ) : (
                                'Create question'
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