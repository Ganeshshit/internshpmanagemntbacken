// src/middlewares/upload.middleware.js
const multer = require('multer');
const { AppError } = require('./error.middleware');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const path = require('path');

const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['pdf', 'doc', 'docx'];

    const originalName = file.originalname || '';
    const ext = originalName
        .split('.')
        .pop()
        .toLowerCase()
        .trim();

    // Accept valid document extensions ONLY
    if (allowedExtensions.includes(ext)) {
        return cb(null, true);
    }

    return cb(
        new AppError('Only PDF, DOC, DOCX files are allowed', 400),
        false
    );
};


// Multer configuration
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB limit
    },
});

// Error handling wrapper for multer
const multerErrorHandler = (multerFn) => {
    return (req, res, next) => {
        multerFn(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new AppError('File size exceeds 10 MB limit', 400));
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return next(new AppError('Unexpected field in upload', 400));
                }
                return next(new AppError(err.message, 400));
            } else if (err) {
                return next(err);
            }
            next();
        });
    };
};

// Export configured upload middleware
module.exports = {
    single: (fieldName) => multerErrorHandler(upload.single(fieldName)),
    array: (fieldName, maxCount) =>
        multerErrorHandler(upload.array(fieldName, maxCount)),
    fields: (fields) => multerErrorHandler(upload.fields(fields)),
    none: () => multerErrorHandler(upload.none()),
};