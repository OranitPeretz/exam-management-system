import type {
    RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import type {
    CreateAdminCourseInput,
    EnrollStudentInput,
} from './admin-course.schemas.js';
import {
    createManagedCourse,
    dropStudentFromCourse,
    enrollStudentInCourse,
    listManagedCourses,
} from './admin-course.service.js';

export const listManagedCoursesController:
    RequestHandler = async (
        _request,
        response,
        next,
    ) => {
        try {
            const courses =
                await listManagedCourses();

            response.status(200).json({
                data: {
                    courses,
                },
            });
        } catch (error) {
            next(error);
        }
    };

export const createManagedCourseController:
    RequestHandler = async (
        request,
        response,
        next,
    ) => {
        try {
            if (!request.auth) {
                throw new AppError(
                    401,
                    'AUTHENTICATION_REQUIRED',
                    'Authentication is required.',
                );
            }

            const input =
                request.body as CreateAdminCourseInput;

            const course =
                await createManagedCourse(
                    input,
                    request.auth.userId,
                    request.ip,
                );

            response.status(201).json({
                data: {
                    course,
                },
            });
        } catch (error) {
            next(error);
        }
    };

export const enrollStudentController:
    RequestHandler = async (
        request,
        response,
        next,
    ) => {
        try {
            if (!request.auth) {
                throw new AppError(
                    401,
                    'AUTHENTICATION_REQUIRED',
                    'Authentication is required.',
                );
            }

            const courseId =
                request.params.courseId;

            if (
                typeof courseId !== 'string' ||
                courseId.trim().length === 0
            ) {
                throw new AppError(
                    400,
                    'COURSE_ID_REQUIRED',
                    'A valid course ID is required.',
                );
            }

            const input =
                request.body as EnrollStudentInput;

            const enrollment =
                await enrollStudentInCourse(
                    courseId,
                    input.studentId,
                    request.auth.userId,
                    request.ip,
                );

            response.status(201).json({
                data: {
                    enrollment,
                },
            });
        } catch (error) {
            next(error);
        }
    };

    export const dropStudentEnrollmentController:
  RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      if (!request.auth) {
        throw new AppError(
          401,
          'AUTHENTICATION_REQUIRED',
          'Authentication is required.',
        );
      }

      const courseId =
        request.params.courseId;

      const studentId =
        request.params.studentId;

      if (
        typeof courseId !== 'string' ||
        courseId.trim().length === 0
      ) {
        throw new AppError(
          400,
          'COURSE_ID_REQUIRED',
          'A valid course ID is required.',
        );
      }

      if (
        typeof studentId !== 'string' ||
        studentId.trim().length === 0
      ) {
        throw new AppError(
          400,
          'STUDENT_ID_REQUIRED',
          'A valid student ID is required.',
        );
      }

      const enrollment =
        await dropStudentFromCourse(
          courseId,
          studentId,
          request.auth.userId,
          request.ip,
        );

      response.status(200).json({
        data: {
          enrollment,
        },
      });
    } catch (error) {
      next(error);
    }
  };