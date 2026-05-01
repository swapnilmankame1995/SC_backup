/**
 * Input Validation Utilities
 * Protect against malicious input and data integrity issues
 */

export const Validation = {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate Indian phone number
   */
  isValidPhone(phone: string): boolean {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  /**
   * Validate password strength
   * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
   */
  isValidPassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain an uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain a lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain a number' };
    }
    return { valid: true };
  },

  /**
   * Validate file type for laser cutting
   */
  isValidDesignFile(filename: string): boolean {
    const validExtensions = ['.dxf', '.svg', '.ai', '.dwg'];
    const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    return validExtensions.includes(extension);
  },

  /**
   * Validate image file type for sketches
   */
  isValidImageFile(filename: string): boolean {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    return validExtensions.includes(extension);
  },

  /**
   * Validate file size (in bytes)
   */
  isValidFileSize(sizeInBytes: number, maxMB: number = 50): boolean {
    const maxBytes = maxMB * 1024 * 1024;
    return sizeInBytes <= maxBytes;
  },

  /**
   * Sanitize string input (prevent XSS)
   */
  sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .trim()
      .slice(0, 1000); // Limit length
  },

  /**
   * Validate quantity
   */
  isValidQuantity(quantity: number): boolean {
    return Number.isInteger(quantity) && quantity > 0 && quantity <= 10000;
  },

  /**
   * Validate price/amount
   */
  isValidAmount(amount: number): boolean {
    return !isNaN(amount) && amount > 0 && amount < 10000000; // Max 1 crore
  },

  /**
   * Validate PIN code (Indian)
   */
  isValidPinCode(pincode: string): boolean {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(pincode);
  },

  /**
   * Validate GST number (if customer provides)
   */
  isValidGST(gst: string): boolean {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst);
  },
};
