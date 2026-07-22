import {
  useEffect,
  useState,
} from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

import { saveStudentAnswer } from './student-exam.api';
import type {
  SaveStudentAnswerInput,
  StudentAttemptAnswer,
  StudentAttemptQuestion,
} from './student-exam.types';

interface StudentQuestionCardProps {
  attemptId: string;
  question: StudentAttemptQuestion;
  initialAnswer?: StudentAttemptAnswer;
}

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

function getSaveErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'The answer could not be saved.';
  }

  return (
    error.response?.data?.error?.message ??
    'The answer could not be saved.'
  );
}

export function StudentQuestionCard({
  attemptId,
  question,
  initialAnswer,
}: StudentQuestionCardProps) {
  const [selectedOptionIds, setSelectedOptionIds] =
    useState<string[]>(
      initialAnswer?.selectedOptionIds ?? [],
    );

  const [textValue, setTextValue] = useState(
    initialAnswer?.textValue ?? '',
  );

  const [numericValue, setNumericValue] = useState(
    initialAnswer?.numericValue === null ||
      initialAnswer?.numericValue === undefined
      ? ''
      : String(initialAnswer.numericValue),
  );

  const [answerVersion, setAnswerVersion] =
    useState<number | null>(
      initialAnswer?.version ?? null,
    );

  const [hasPendingTextChange, setHasPendingTextChange] =
    useState(false);

  const saveMutation = useMutation({
    mutationKey: [
      'student',
      'answer',
      attemptId,
      question.id,
    ],
    mutationFn: (input: SaveStudentAnswerInput) =>
      saveStudentAnswer(
        attemptId,
        question.id,
        input,
      ),
    onSuccess: (result) => {
      setAnswerVersion(result.answer.version);
    },
  });

  useEffect(() => {
    if (!hasPendingTextChange) {
      return;
    }

    const isTextQuestion =
      question.type.code === 'SHORT_TEXT' ||
      question.type.code === 'LONG_TEXT';

    const isNumericQuestion =
      question.type.code === 'NUMERIC';

    if (!isTextQuestion && !isNumericQuestion) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const versionInput =
        answerVersion === null
          ? {}
          : {
              version: answerVersion,
            };

      if (isTextQuestion) {
        saveMutation.mutate({
          textValue,
          ...versionInput,
        });
      }

      if (isNumericQuestion) {
        saveMutation.mutate({
          numericValue:
            numericValue.trim() === ''
              ? null
              : Number(numericValue),
          ...versionInput,
        });
      }

      setHasPendingTextChange(false);
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    answerVersion,
    hasPendingTextChange,
    numericValue,
    question.type.code,
    saveMutation,
    textValue,
  ]);

  const saveSelectedOptions = (
    nextOptionIds: string[],
  ) => {
    setSelectedOptionIds(nextOptionIds);

    saveMutation.mutate({
      selectedOptionIds: nextOptionIds,
      ...(answerVersion !== null && {
        version: answerVersion,
      }),
    });
  };

  const isSingleSelection =
    question.type.code === 'SINGLE_CHOICE' ||
    question.type.code === 'TRUE_FALSE';

  const isMultipleSelection =
    question.type.code === 'MULTIPLE_CHOICE';

  const isTextQuestion =
    question.type.code === 'SHORT_TEXT' ||
    question.type.code === 'LONG_TEXT';

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Stack
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={1}
            sx={{
              alignItems: {
                xs: 'flex-start',
                sm: 'center',
              },
            }}
          >
            <Typography
              variant="overline"
              color="primary"
              sx={{ fontWeight: 700 }}
            >
              Question {question.position}
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            <Chip
              label={question.type.name}
              size="small"
              variant="outlined"
            />

            <Chip
              label={`${question.points} ${
                question.points === 1
                  ? 'point'
                  : 'points'
              }`}
              size="small"
            />

            {question.isRequired && (
              <Chip
                label="Required"
                color="primary"
                size="small"
                variant="outlined"
              />
            )}
          </Stack>

          <Typography
            component="h2"
            variant="h6"
            sx={{ fontWeight: 700 }}
          >
            {question.prompt}
          </Typography>

          {isSingleSelection && (
            <FormControl>
              <FormLabel>Choose one answer</FormLabel>

              <RadioGroup
                value={selectedOptionIds[0] ?? ''}
                onChange={(event) =>
                  saveSelectedOptions([
                    event.target.value,
                  ])
                }
              >
                {question.options.map((option) => (
                  <FormControlLabel
                    key={option.id}
                    value={option.id}
                    label={option.text}
                    disabled={saveMutation.isPending}
                    control={<Radio />}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          )}

          {isMultipleSelection && (
            <FormControl>
              <FormLabel>
                Choose all applicable answers
              </FormLabel>

              <FormGroup>
                {question.options.map((option) => {
                  const isSelected =
                    selectedOptionIds.includes(
                      option.id,
                    );

                  return (
                    <FormControlLabel
                      key={option.id}
                      label={option.text}
                      disabled={
                        saveMutation.isPending
                      }
                      control={
                        <Checkbox
                          checked={isSelected}
                          onChange={(
                            _event,
                            checked,
                          ) => {
                            const nextOptionIds =
                              checked
                                ? [
                                    ...selectedOptionIds,
                                    option.id,
                                  ]
                                : selectedOptionIds.filter(
                                    (optionId) =>
                                      optionId !==
                                      option.id,
                                  );

                            saveSelectedOptions(
                              nextOptionIds,
                            );
                          }}
                        />
                      }
                    />
                  );
                })}
              </FormGroup>
            </FormControl>
          )}

          {isTextQuestion && (
            <TextField
              label="Your answer"
              value={textValue}
              multiline
              minRows={
                question.type.code === 'LONG_TEXT'
                  ? 5
                  : 2
              }
              fullWidth
              onChange={(event) => {
                setTextValue(event.target.value);
                setHasPendingTextChange(true);
              }}
            />
          )}

          {question.type.code === 'NUMERIC' && (
            <TextField
              label="Your numeric answer"
              value={numericValue}
              type="number"
              fullWidth
              onChange={(event) => {
                setNumericValue(event.target.value);
                setHasPendingTextChange(true);
              }}
            />
          )}

          <Box>
            {hasPendingTextChange && (
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Waiting to save...
              </Typography>
            )}

            {!hasPendingTextChange &&
              saveMutation.isPending && (
                <Typography
                  variant="caption"
                  color="primary"
                >
                  Saving...
                </Typography>
              )}

            {!hasPendingTextChange &&
              saveMutation.isSuccess &&
              !saveMutation.isPending && (
                <Typography
                  variant="caption"
                  color="success.main"
                >
                  Saved
                </Typography>
              )}
          </Box>

          {saveMutation.error && (
            <Alert severity="error">
              {getSaveErrorMessage(
                saveMutation.error,
              )}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}