// src/utils/file.util.js
// File handling utilities

const path = require('path');
const fs = require('fs').promises;

class FileUtil {
  /**
   * Allowed file extensions
   */
  static allowedExtensions = {
    documents: ['.pdf', '.doc', '.docx', '.txt'],
    images: ['.jpg', '.jpeg', '.png', '.gif'],
    all: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif'],
  };

  /**
   * Get file extension
   */
  static getExtension(filename) {
    return path.extname(filename).toLowerCase();
  }

  /**
   * Validate file type
   */
  static isValidFileType(filename, allowedTypes = 'all') {
    const ext = this.getExtension(filename);
    const allowed = this.allowedExtensions[allowedTypes] || this.allowedExtensions.all;
    return allowed.includes(ext);
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(originalName) {
    const ext = this.getExtension(originalName);
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    return `file-${timestamp}-${random}${ext}`;
  }

  /**
   * Get file size in readable format
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Validate file size (in bytes)
   */
  static isValidFileSize(size, maxSize = 10 * 1024 * 1024) {
    return size <= maxSize;
  }

  /**
   * Delete file
   */
  static async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Check if file exists
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
   * Get file info
   */
  static async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: this.getExtension(filePath),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }
}

module.exports = FileUtil;