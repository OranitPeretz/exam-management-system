import type {
  FormEvent,
} from 'react';
import {
  useState,
} from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';

import { gradeLecturerSubmission } from './lecturer-submission.api';
import type {
  GradeAnswerInput,
  GradeSubmissionInput,
  LecturerSubmissionDetails,
  LecturerSubmissionQuestion,
} from './lecturer-submission.types';

interface GradeDraft {
  awardedPoints: string;
  feedback: string;
}

interface ManualGradingFormProps {
  attemptId: string;
  submission: LecturerSubmissionDetails;
  questions: LecturerSubmissionQuestion[];
}

function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'An unexpected error occurred while saving the grade.';
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
    return 'The submission changed or the results were already published. Refresh the page and try again.';
  }

  if (error.response.status === 403) {
    return 'You do not have permission to grade this submission.';
  }

  return 'The grade could not be saved. Please try again.';
}

export function ManualGradingForm({
  attemptId,
  submission,
  questions,
}: ManualGradingFormProps) {
  const queryClient = useQueryClient();

  const manualQuestions = questions.filter(
    (question) => question.requiresManualGrading,
  );

  const [drafts, setDrafts] = useState<
    Record<string, GradeDraft>
  >(() =>
    Object.fromEntries(
      manualQuestions.map((question) => [
        question.id,
        {
          awardedPoints:
            question.answer?.awardedPoints === null ||
            question.answer?.awardedPoints === undefined
              ? ''
              : String(
                  question.answer.awardedPoints,
                ),
          feedback:
            question.answer?.feedback ?? '',
        },
      ]),
    ),
  );

  const [
    overallFeedback,
    setOverallFeedback,
  ] = useState(submission.feedback ?? '');

  const [
    validationErrors,
    setValidationErrors,
  ] = useState<Record<string, string>>({});

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const gradeMutation = useMutation({
    mutationFn: (
      input: GradeSubmissionInput,
    ) =>
      gradeLecturerSubmission(
        attemptId,
        input,
      ),

    onSuccess: async (updatedData) => {
      queryClient.setQueryData(
        [
          'lecturer',
          'attempts',
          attemptId,
        ],
        updatedData,
      );

      await queryClient.invalidateQueries({
        queryKey: [
          'lecturer',
          'exams',
        ],
      });

      setValidationErrors({});
      setSuccessMessage(
        'The grade and feedback were saved successfully.',
      );
    },
  });

  if (manualQuestions.length === 0) {
    return (
      <Alert severity="success">
        All questions in this submission were graded
        automatically.
      </Alert>
    );
  }

  const updateAwardedPoints = (
    questionId: string,
    value: string,
  ) => {
    setSuccessMessage(null);

    setDrafts((current) => {
      const currentDraft =
        current[questionId] ?? {
          awardedPoints: '',
          feedback: '',
        };

      return {
        ...current,
        [questionId]: {
          ...currentDraft,
          awardedPoints: value,
        },
      };
    });
  };

  const updateQuestionFeedback = (
    questionId: string,
    value: string,
  ) => {
    setSuccessMessage(null);

    setDrafts((current) => {
      const currentDraft =
        current[questionId] ?? {
          awardedPoints: '',
          feedback: '',
        };

      return {
        ...current,
        [questionId]: {
          ...currentDraft,
          feedback: value,
        },
      };
    });
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const nextErrors: Record<string, string> =
      {};

    const answers: GradeAnswerInput[] =
      [];

    for (const question of manualQuestions) {
      const draft = drafts[question.id];

      const value =
        draft?.awardedPoints.trim() ?? '';

      if (value.length === 0) {
        nextErrors[question.id] =
          'Awarded points are required.';
        continue;
      }

      const awardedPoints = Number(value);

      if (
        !Number.isFinite(awardedPoints) ||
        !Number.isInteger(awardedPoints)
      ) {
        nextErrors[question.id] =
          'Awarded points must be a whole number.';
        continue;
      }

      if (
        awardedPoints < 0 ||
        awardedPoints > question.points
      ) {
        nextErrors[question.id] =
          `Awarded points must be between 0 and ${question.points}.`;
        continue;
      }

      const questionFeedback =
        draft?.feedback.trim() ?? '';

      answers.push({
        questionId: question.id,
        awardedPoints,
        feedback:
          questionFeedback.length > 0
            ? questionFeedback
            : undefined,
      });
    }

    setValidationErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0
    ) {
      return;
    }

    setSuccessMessage(null);

    gradeMutation.mutate({
      version: submission.version,
      feedback:
        overallFeedback.trim().length > 0
          ? overallFeedback.trim()
          : undefined,
      answers,
    });
  };

  return (
    <Card variant="outlined">
      <CardContent
        sx={{
          p: {
            xs: 2.5,
            md: 3.5,
          },
        }}
      >
        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit}
        >
          <Stack spacing={3}>
            <Box>
              <Typography
                component="h2"
                variant="h5"
                sx={{ fontWeight: 700 }}
              >
                Manual grading
              </Typography>

              <Typography color="text.secondary">
                Award points and provide feedback for
                questions that require lecturer review.
              </Typography>
            </Box>

            {successMessage && (
              <Alert severity="success">
                {successMessage}
              </Alert>
            )}

            {gradeMutation.error && (
              <Alert severity="error">
                {getErrorMessage(
                  gradeMutation.error,
                )}
              </Alert>
            )}

            {manualQuestions.map(
              (question) => {
                const draft =
                  drafts[question.id] ?? {
                    awardedPoints: '',
                    feedback: '',
                  };

                return (
                  <Box key={question.id}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography
                          variant="overline"
                          color="primary"
                          sx={{ fontWeight: 700 }}
                        >
                          Question{' '}
                          {question.position}
                        </Typography>

                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700 }}
                        >
                          {question.prompt}
                        </Typography>
                      </Box>

                      <TextField
                        label={`Awarded points (maximum ${question.points})`}
                        type="number"
                        value={
                          draft.awardedPoints
                        }
                        error={Boolean(
                          validationErrors[
                            question.id
                          ],
                        )}
                        helperText={
                          validationErrors[
                            question.id
                          ] ??
                          `Enter a value from 0 to ${question.points}.`
                        }
                        disabled={
                          gradeMutation.isPending
                        }
                        slotProps={{
                          htmlInput: {
                            min: 0,
                            max: question.points,
                            step: 1,
                          },
                        }}
                        onChange={(event) =>
                          updateAwardedPoints(
                            question.id,
                            event.target.value,
                          )
                        }
                      />

                      <TextField
                        label="Question feedback"
                        value={draft.feedback}
                        multiline
                        minRows={2}
                        disabled={
                          gradeMutation.isPending
                        }
                        onChange={(event) =>
                          updateQuestionFeedback(
                            question.id,
                            event.target.value,
                          )
                        }
                      />

                      <Divider />
                    </Stack>
                  </Box>
                );
              },
            )}

            <TextField
              label="Overall submission feedback"
              value={overallFeedback}
              multiline
              minRows={3}
              disabled={gradeMutation.isPending}
              onChange={(event) => {
                setSuccessMessage(null);
                setOverallFeedback(
                  event.target.value,
                );
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={gradeMutation.isPending}
              startIcon={
                gradeMutation.isPending ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                ) : undefined
              }
            >
              {gradeMutation.isPending
                ? 'Saving grade...'
                : submission.status === 'GRADED'
                  ? 'Update grade'
                  : 'Save grade'}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}