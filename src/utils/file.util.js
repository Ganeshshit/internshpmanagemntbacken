// src/utils/file.util.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FileUtil {
  /**
   * Save uploaded file to local storage
   * @param {Object} file - Multer file object
   * @param {String} folder - Destination folder
   */
  static async saveFile(file, folder = 'uploads') {
    const uploadDir = path.join(process.cwd(), 'uploads', folder);

    // Ensure directory exists
    await this.ensureDirectory(uploadDir);

    // Generate unique filename
    const uniqueName = this.generateUniqueFilename(file.originalname);
    const filePath = path.join(uploadDir, uniqueName);

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Return file info
    return {
      url: `/uploads/${folder}/${uniqueName}`,
      path: filePath,
      filename: uniqueName,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  /**
   * Delete file from storage
   * @param {String} fileUrl - File URL or path
   */
  static async deleteFile(fileUrl) {
    try {
      // Extract path from URL
      const filePath = fileUrl.startsWith('/uploads')
        ? path.join(process.cwd(), fileUrl)
        : fileUrl;

      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Ensure directory exists
   * @param {String} dirPath - Directory path
   */
  static async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Generate unique filename
   * @param {String} originalName - Original filename
   */
  static generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);

    // Sanitize filename
    const sanitized = nameWithoutExt
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);

    return `${sanitized}_${timestamp}_${random}${ext}`;
  }

  /**
   * Validate file size
   * @param {Number} size - File size in bytes
   * @param {Number} maxSize - Max size in MB
   */
  static validateFileSize(size, maxSize = 10) {
    const maxSizeBytes = maxSize * 1024 * 1024;
    return size <= maxSizeBytes;
  }

  /**
   * Validate file type
   * @param {String} mimetype - File mimetype
   * @param {Array} allowedTypes - Allowed mimetypes
   */
  static validateFileType(mimetype, allowedTypes = []) {
    return allowedTypes.includes(mimetype);
  }

  /**
   * Get file extension
   * @param {String} filename - Filename
   */
  static getFileExtension(filename) {
    return path.extname(filename).toLowerCase();
  }

  /**
   * Format file size to human readable
   * @param {Number} bytes - File size in bytes
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Check if file exists
   * @param {String} filePath - File path
   */
  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   * @param {String} filePath - File path
   */
  static async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      return null;
    }
  }
}

module.exports = FileUtil;