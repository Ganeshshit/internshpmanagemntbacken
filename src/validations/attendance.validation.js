// src/validations/attendance.validation.js
const Joi = require('joi');

const attendanceValidation = {
    /**
     * Validation for marking attendance
     */
    markAttendance: {
        body: Joi.object({
            internshipId: Joi.string()
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .messages({
                    'string.pattern.base': 'Invalid internship ID format',
                    'any.required': 'Internship ID is required',
                }),

            studentId: Joi.string()
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .messages({
                    'string.pattern.base': 'Invalid student ID format',
                    'any.required': 'Student ID is required',
                }),

            date: Joi.date()
                .required()
                .max('now')
                .messages({
                    'date.max': 'Date cannot be in the future',
                    'any.required': 'Date is required',
                }),

            status: Joi.string()
                .required()
                .valid('present', 'absent', 'late', 'excused', 'half-day')
                .messages({
                    'any.only': 'Status must be one of: present, absent, late, excused, half-day',
                    'any.required': 'Status is required',
                }),

            checkInTime: Joi.string()
                .optional()
                .allow('', null)
                .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
                .messages({
                    'string.pattern.base': 'Check-in time must be in HH:MM format',
                }),

            checkOutTime: Joi.string()
                .optional()
                .allow('', null)
                .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
                .messages({
                    'string.pattern.base': 'Check-out time must be in HH:MM format',
                }),

            remarks: Joi.string()
                .optional()
                .allow('', null)
                .max(500)
                .messages({
                    'string.max': 'Remarks cannot exceed 500 characters',
                }),

            location: Joi.object({
                type: Joi.string().valid('Point').default('Point'),
                coordinates: Joi.array().items(Joi.number()).length(2),
            }).optional(),
        }),
    },

    /**
     * Validation for bulk marking attendance
     */
    bulkMarkAttendance: {
        body: Joi.object({
            internshipId: Joi.string()
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .messages({
                    'string.pattern.base': 'Invalid internship ID format',
                    'any.required': 'Internship ID is required',
                }),

            date: Joi.date()
                .required()
                .max('now')
                .messages({
                    'date.max': 'Date cannot be in the future',
                    'any.required': 'Date is required',
                }),

            attendanceRecords: Joi.array()
                .min(1)
                .items(
                    Joi.object({
                        studentId: Joi.string()
                            .required()
                            .regex(/^[0-9a-fA-F]{24}$/)
                            .messages({
                                'string.pattern.base': 'Invalid student ID format',
                                'any.required': 'Student ID is required',
                            }),

                        status: Joi.string()
                            .required()
                            .valid('present', 'absent', 'late', 'excused', 'half-day')
                            .messages({
                                'any.only': 'Status must be one of: present, absent, late, excused, half-day',
                                'any.required': 'Status is required',
                            }),

                        checkInTime: Joi.string()
                            .optional()
                            .allow('', null),

                        checkOutTime: Joi.string()
                            .optional()
                            .allow('', null),

                        remarks: Joi.string()
                            .optional()
                            .allow('', null)
                            .max(500)
                            .messages({
                                'string.max': 'Remarks cannot exceed 500 characters',
                            }),
                    })
                )
                .required()
                .messages({
                    'array.min': 'At least one attendance record is required',
                    'any.required': 'Attendance records are required',
                }),
        }),
    },

    /**
     * Validation for getting attendance with filters
     */
    getAttendance: {
        query: Joi.object({
            internshipId: Joi.string()
                .optional()
                .regex(/^[0-9a-fA-F]{24}$/)
                .messages({
                    'string.pattern.base': 'Invalid internship ID format',
                }),

            studentId: Joi.string()
                .optional()
                .regex(/^[0-9a-fA-F]{24}$/)
                .messages({
                    'string.pattern.base': 'Invalid student ID format',
                }),

            status: Joi.string()
                .optional()
                .valid('present', 'absent', 'late', 'excused', 'half-day')
                .messages({
                    'any.only': 'Status must be one of: present, absent, late, excused, half-day',
                }),

            startDate: Joi.date().optional(),

            endDate: Joi.date()
                .optional()
                .when('startDate', {
                    is: Joi.exist(),
                    then: Joi.date().min(Joi.ref('startDate')),
                })
                .messages({
                    'date.min': 'End date must be after start date',
                }),

            month: Joi.number()
                .optional()
                .min(1)
                .max(12)
                .messages({
                    'number.min': 'Month must be between 1 and 12',
                    'number.max': 'Month must be between 1 and 12',
                }),

            year: Joi.number()
                .optional()
                .min(2000)
                .max(2100)
                .messages({
                    'number.min': 'Year must be between 2000 and 2100',
                    'number.max': 'Year must be between 2000 and 2100',
                }),

            page: Joi.number().optional().min(1).default(1),

            limit: Joi.number().optional().min(1).max(100).default(50),
        }),
    },

    /**
     * Validation for getting attendance by ID
     */
    getById: {
        params: Joi.object({
            id: Joi.string()
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .messages({
                    'string.pattern.base': 'Invalid attendance ID format',
                    'any.required': 'Attendance ID is required',
                }),
        }),
    },

    /**
     * Validation for updating attendance
     */
    updateAttendance: {
        params: Joi.object({
            id: Joi.string()
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .messages({
                    'string.pattern.base': 'Invalid attendance ID format',
                    'any.required': 'Attendance ID is required',
                }),
        }),

        body: Joi.object({
            status: Joi.string()
                .optional()
                .valid('present', 'absent', 'late', 'excused', 'half-day')
                .messages({
                    'any.only': 'Status must be one of: present, absent, late, excused, half-day',
                }),

            checkInTime: Joi.date().optional(),

            checkOutTime: Joi.date()
                .optional()
                .when('checkInTime', {
                    is: Joi.exist(),
                    then: Joi.date().min(Joi.ref('checkInTime')),
                })
                .messages({
                    'date.min': 'Check-out time must be after check-in time',
                }),

            remarks: Joi.string()
                .optional()
                .allow('', null)
                .max(500)
                .messages({
                    'string.max': 'Remarks cannot exceed 500 characters',
                }),

            editReason: Joi.string()
                .required()
                .min(10)
                .max(500)
                .messages({
                    'string.min': 'Edit reason must be at least 10 characters',
                    'string.max': 'Edit reason cannot exceed 500 characters',
                    'any.required': 'Edit reason is required',
                }),
        }).min(2), // At least status/checkIn/checkOut + editReason
    },

    /**
     * Validation for deleting attendance
     */
    deleteAttendance: {
        params: Joi.object({
            id: Joi.string()
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .messages({
                    'string.pattern.base': 'Invalid attendance ID format',
                    'any.required': 'Attendance ID is required',
                }),
        }),
    },

    /**
     * Validation for getting monthly stats
     */
    getMonthlyStats: {
        params: Joi.object({
            internshipId: Joi.string()
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .messages({
                    'string.pattern.base': 'Invalid internship ID format',
                    'any.required': 'Internship ID is required',
                }),

            studentId: Joi.string()
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .messages({
                    'string.pattern.base': 'Invalid student ID format',
                    'any.required': 'Student ID is required',
                }),
        }),

        query: Joi.object({
            month: Joi.number()
                .required()
                .min(1)
                .max(12)
                .messages({
                    'number.min': 'Month must be between 1 and 12',
                    'number.max': 'Month must be between 1 and 12',
                    'any.required': 'Month is required',
                }),

            year: Joi.number()
                .required()
                .min(2000)
                .max(2100)
                .messages({
                    'number.min': 'Year must be between 2000 and 2100',
                    'number.max': 'Year must be between 2000 and 2100',
                    'any.required': 'Year is required',
                }),
        }),
    },

    /**
     * Validation for getting monthly report
     */
    getMonthlyReport: {
        params: Joi.object({
            internshipId: Joi.string()
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .messages({
                    'string.pattern.base': 'Invalid internship ID format',
                    'any.required': 'Internship ID is required',
                }),
        }),

        query: Joi.object({
            month: Joi.number()
                .required()
                .min(1)
                .max(12)
                .messages({
                    'number.min': 'Month must be between 1 and 12',
                    'number.max': 'Month must be between 1 and 12',
                    'any.required': 'Month is required',
                }),

            year: Joi.number()
                .required()
                .min(2000)
                .max(2100)
                .messages({
                    'number.min': 'Year must be between 2000 and 2100',
                    'number.max': 'Year must be between 2000 and 2100',
                    'any.required': 'Year is required',
                }),
        }),
    },
};

module.exports = attendanceValidation;