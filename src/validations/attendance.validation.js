// src/validations/attendance.validation.js
const Joi = require('joi');

const attendanceValidation = {
    /**
     * Validation for marking attendance
     */
    markAttendance: {
        body: Joi.object({
            internshipId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid internship ID format',
                    'any.required': 'Internship ID is required',
                }),

            studentId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .optional()
                .messages({
                    'string.pattern.base': 'Invalid student ID format',
                }),

            date: Joi.date()
                .iso()
                .max('now')
                .optional()
                .default(() => new Date())
                .messages({
                    'date.max': 'Cannot mark attendance for future dates',
                }),

            status: Joi.string()
                .valid('present', 'absent', 'late', 'excused')
                .default('present')
                .messages({
                    'any.only': 'Status must be one of: present, absent, late, excused',
                }),

            remarks: Joi.string()
                .max(500)
                .optional()
                .allow(null, '')
                .messages({
                    'string.max': 'Remarks cannot exceed 500 characters',
                }),

            location: Joi.array()
                .items(Joi.number())
                .length(2)
                .optional()
                .messages({
                    'array.length': 'Location must contain exactly 2 coordinates [longitude, latitude]',
                }),
        }),
    },

    /**
     * Validation for bulk marking attendance
     */
    bulkMarkAttendance: {
        body: Joi.object({
            internshipId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid internship ID format',
                    'any.required': 'Internship ID is required',
                }),

            date: Joi.date()
                .iso()
                .max('now')
                .required()
                .messages({
                    'date.max': 'Cannot mark attendance for future dates',
                    'any.required': 'Date is required',
                }),

            attendanceRecords: Joi.array()
                .items(
                    Joi.object({
                        studentId: Joi.string()
                            .pattern(/^[0-9a-fA-F]{24}$/)
                            .required()
                            .messages({
                                'string.pattern.base': 'Invalid student ID format',
                                'any.required': 'Student ID is required',
                            }),

                        status: Joi.string()
                            .valid('present', 'absent', 'late', 'excused')
                            .required()
                            .messages({
                                'any.only': 'Status must be one of: present, absent, late, excused',
                                'any.required': 'Status is required',
                            }),

                        remarks: Joi.string()
                            .max(500)
                            .optional()
                            .allow(null, ''),
                    })
                )
                .min(1)
                .required()
                .messages({
                    'array.min': 'At least one attendance record is required',
                    'any.required': 'Attendance records are required',
                }),
        }),
    },

    /**
     * Validation for checking out
     */
    checkOut: {
        body: Joi.object({
            internshipId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid internship ID format',
                    'any.required': 'Internship ID is required',
                }),

            date: Joi.date()
                .iso()
                .max('now')
                .optional()
                .default(() => new Date()),
        }),
    },

    /**
     * Validation for getting attendance records
     */
    getAttendance: {
        query: Joi.object({
            internshipId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .optional()
                .messages({
                    'string.pattern.base': 'Invalid internship ID format',
                }),

            studentId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .optional()
                .messages({
                    'string.pattern.base': 'Invalid student ID format',
                }),

            status: Joi.string()
                .valid('present', 'absent', 'late', 'excused')
                .optional()
                .messages({
                    'any.only': 'Status must be one of: present, absent, late, excused',
                }),

            startDate: Joi.date()
                .iso()
                .optional()
                .messages({
                    'date.base': 'Invalid start date format',
                }),

            endDate: Joi.date()
                .iso()
                .min(Joi.ref('startDate'))
                .optional()
                .messages({
                    'date.base': 'Invalid end date format',
                    'date.min': 'End date must be after start date',
                }),

            page: Joi.number()
                .integer()
                .min(1)
                .default(1)
                .optional()
                .messages({
                    'number.min': 'Page must be at least 1',
                }),

            limit: Joi.number()
                .integer()
                .min(1)
                .max(100)
                .default(50)
                .optional()
                .messages({
                    'number.min': 'Limit must be at least 1',
                    'number.max': 'Limit cannot exceed 100',
                }),
        }),
    },

    /**
     * Validation for getting attendance by ID
     */
    getById: {
        params: Joi.object({
            id: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
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
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid attendance ID format',
                    'any.required': 'Attendance ID is required',
                }),
        }),

        body: Joi.object({
            status: Joi.string()
                .valid('present', 'absent', 'late', 'excused')
                .optional()
                .messages({
                    'any.only': 'Status must be one of: present, absent, late, excused',
                }),

            remarks: Joi.string()
                .max(500)
                .optional()
                .allow(null, '')
                .messages({
                    'string.max': 'Remarks cannot exceed 500 characters',
                }),

            checkInTime: Joi.date()
                .iso()
                .max('now')
                .optional()
                .messages({
                    'date.max': 'Check-in time cannot be in the future',
                }),

            checkOutTime: Joi.date()
                .iso()
                .max('now')
                .min(Joi.ref('checkInTime'))
                .optional()
                .messages({
                    'date.max': 'Check-out time cannot be in the future',
                    'date.min': 'Check-out time must be after check-in time',
                }),

            editReason: Joi.string()
                .max(500)
                .optional()
                .messages({
                    'string.max': 'Edit reason cannot exceed 500 characters',
                }),
        }).min(1),
    },

    /**
     * Validation for deleting attendance
     */
    deleteAttendance: {
        params: Joi.object({
            id: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid attendance ID format',
                    'any.required': 'Attendance ID is required',
                }),
        }),
    },

    /**
     * Validation for getting student stats
     */
    getStats: {
        params: Joi.object({
            internshipId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid internship ID format',
                    'any.required': 'Internship ID is required',
                }),

            studentId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid student ID format',
                    'any.required': 'Student ID is required',
                }),
        }),
    },

    /**
     * Validation for getting internship report
     */
    getReport: {
        params: Joi.object({
            internshipId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid internship ID format',
                    'any.required': 'Internship ID is required',
                }),
        }),

        query: Joi.object({
            startDate: Joi.date()
                .iso()
                .optional()
                .messages({
                    'date.base': 'Invalid start date format',
                }),

            endDate: Joi.date()
                .iso()
                .min(Joi.ref('startDate'))
                .optional()
                .messages({
                    'date.base': 'Invalid end date format',
                    'date.min': 'End date must be after start date',
                }),
        }),
    },

    /**
     * Validation for approving attendance
     */
    approveAttendance: {
        params: Joi.object({
            id: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid attendance ID format',
                    'any.required': 'Attendance ID is required',
                }),
        }),
    },
};

module.exports = attendanceValidation;