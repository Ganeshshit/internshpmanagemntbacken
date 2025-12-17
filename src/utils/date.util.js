// src/utils/date.util.js
// Date and time utilities

class DateUtil {
  /**
   * Get current date without time
   */
  static getCurrentDate() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * Check if date is today
   */
  static isToday(date) {
    const today = this.getCurrentDate();
    const checkDate = new Date(date);
    return checkDate.toDateString() === today.toDateString();
  }

  /**
   * Check if date is past
   */
  static isPast(date) {
    return new Date(date) < new Date();
  }

  /**
   * Check if date is future
   */
  static isFuture(date) {
    return new Date(date) > new Date();
  }

  /**
   * Check if date is within range
   */
  static isWithinRange(date, startDate, endDate) {
    const check = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return check >= start && check <= end;
  }

  /**
   * Add days to date
   */
  static addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Get difference in days
   */
  static getDaysDifference(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    return Math.round(Math.abs((firstDate - secondDate) / oneDay));
  }

  /**
   * Format date to YYYY-MM-DD
   */
  static formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get start of day
   */
  static getStartOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get end of day
   */
  static getEndOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  /**
   * Check if submission is late
   */
  static isLateSubmission(submittedAt, dueDate) {
    return new Date(submittedAt) > new Date(dueDate);
  }
}

module.exports = DateUtil;