const cloudinary = require('../config/cloudinary.config');

const uploadToCloudinary = (fileBuffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: options.folder || 'assignments',
                resource_type: 'raw', // REQUIRED for PDF / DOC / DOCX
                use_filename: true,
                unique_filename: true,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        uploadStream.end(fileBuffer);
    });
};

module.exports = {
    uploadToCloudinary,
};
