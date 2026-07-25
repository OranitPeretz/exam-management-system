import {
  EnrollmentStatus,
  UserRole,
} from '../../generated/prisma/client.js';

import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import type {
  CreateAdminCourseInput,
} from './admin-course.schemas.js';

const managedCourseInclude = {
  lecturer: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  },

  enrollments: {
    where: {
      status: EnrollmentStatus.ACTIVE,
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      student: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },

  _count: {
    select: {
      enrollments: true,
      exams: true,
    },
  },
};

export async function listManagedCourses() {
  return prisma.course.findMany({
    include: managedCourseInclude,
    orderBy: {
      code: 'asc',
    },
  });
}

export async function createManagedCourse(
  input: CreateAdminCourseInput,
  adminId: string,
  ipAddress?: string,
) {
  const [
    existingCourse,
    lecturer,
  ] = await Promise.all([
    prisma.course.findUnique({
      where: {
        code: input.code,
      },
      select: {
        id: true,
      },
    }),

    prisma.user.findUnique({
      where: {
        id: input.lecturerId,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    }),
  ]);

  if (existingCourse) {
    throw new AppError(
      409,
      'COURSE_CODE_ALREADY_EXISTS',
      'A course with this code already exists.',
    );
  }

  if (
    !lecturer ||
    lecturer.role !== UserRole.LECTURER ||
    !lecturer.isActive
  ) {
    throw new AppError(
      400,
      'INVALID_LECTURER',
      'The selected lecturer is invalid or inactive.',
    );
  }

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const course =
          await transaction.course.create({
            data: {
              code: input.code,
              name: input.name,
              description:
                input.description?.trim() ||
                null,
              lecturerId: lecturer.id,
              isActive: true,
            },
            include: managedCourseInclude,
          });

        await transaction.auditLog.create({
          data: {
            actorId: adminId,
            action: 'COURSE_CREATED',
            entityType: 'Course',
            entityId: course.id,
            ipAddress: ipAddress ?? null,
            metadata: {
              code: course.code,
              name: course.name,
              lecturerId: lecturer.id,
            },
          },
        });

        return course;
      },
    );
  } catch (error) {
    const duplicateCourse =
      await prisma.course.findUnique({
        where: {
          code: input.code,
        },
        select: {
          id: true,
        },
      });

    if (duplicateCourse) {
      throw new AppError(
        409,
        'COURSE_CODE_ALREADY_EXISTS',
        'A course with this code already exists.',
      );
    }

    throw error;
  }
}

export async function enrollStudentInCourse(
  courseId: string,
  studentId: string,
  adminId: string,
  ipAddress?: string,
) {
  const [
    course,
    student,
  ] = await Promise.all([
    prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
    }),

    prisma.user.findUnique({
      where: {
        id: studentId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    }),
  ]);

  if (!course || !course.isActive) {
    throw new AppError(
      404,
      'COURSE_NOT_FOUND',
      'The course was not found or is inactive.',
    );
  }

  if (
    !student ||
    student.role !== UserRole.STUDENT ||
    !student.isActive
  ) {
    throw new AppError(
      400,
      'INVALID_STUDENT',
      'The selected student is invalid or inactive.',
    );
  }

  const existingEnrollment =
    await prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId,
        },
      },
    });

  if (
    existingEnrollment?.status ===
    EnrollmentStatus.ACTIVE
  ) {
    throw new AppError(
      409,
      'STUDENT_ALREADY_ENROLLED',
      'The student is already enrolled in this course.',
    );
  }

  return prisma.$transaction(
    async (transaction) => {
      const enrollment =
        existingEnrollment
          ? await transaction.enrollment.update(
              {
                where: {
                  id: existingEnrollment.id,
                },
                data: {
                  status:
                    EnrollmentStatus.ACTIVE,
                },
                include: {
                  course: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
                  student: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            )
          : await transaction.enrollment.create(
              {
                data: {
                  courseId,
                  studentId,
                  status:
                    EnrollmentStatus.ACTIVE,
                },
                include: {
                  course: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
                  student: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            );

      await transaction.auditLog.create({
        data: {
          actorId: adminId,
          action: 'STUDENT_ENROLLED',
          entityType: 'Enrollment',
          entityId: enrollment.id,
          ipAddress: ipAddress ?? null,
          metadata: {
            courseId,
            courseCode: course.code,
            studentId,
            studentEmail: student.email,
          },
        },
      });

      return enrollment;
    },
  );
}