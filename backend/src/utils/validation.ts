export const validateVPA = (vpa: string): boolean => {
    // Pattern: ^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$
    const vpaRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    return vpaRegex.test(vpa);
};

export const validateLuhn = (cardNumber: string): boolean => {
    const sanitized = cardNumber.replace(/[\s-]/g, '');
    if (!/^\d{13,19}$/.test(sanitized)) return false;

    let sum = 0;
    let shouldDouble = false;

    // Loop from right to left
    for (let i = sanitized.length - 1; i >= 0; i--) {
        let digit = parseInt(sanitized.charAt(i));

        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        shouldDouble = !shouldDouble;
    }

    return (sum % 10) === 0;
};

export const detectCardNetwork = (cardNumber: string): string => {
    const sanitized = cardNumber.replace(/[\s-]/g, '');

    // Check first digits
    if (sanitized.startsWith('4')) return 'visa';

    // Mastercard: 51-55
    const firstTwo = parseInt(sanitized.substring(0, 2));
    if (firstTwo >= 51 && firstTwo <= 55) return 'mastercard';

    // Amex: 34, 37
    if (sanitized.startsWith('34') || sanitized.startsWith('37')) return 'amex';

    // RuPay: 60, 65, 81-89
    if (sanitized.startsWith('60') || sanitized.startsWith('65')) return 'rupay';
    if (firstTwo >= 81 && firstTwo <= 89) return 'rupay';

    return 'unknown';
};

export const validateExpiry = (month: string, year: string): boolean => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    let expYear = parseInt(year);
    const expMonth = parseInt(month);

    if (isNaN(expYear) || isNaN(expMonth)) return false;
    if (expMonth < 1 || expMonth > 12) return false;

    // Handle 2-digit year (Request says 25 -> 2025)
    if (year.length === 2) {
        expYear += 2000;
    }

    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;

    return true;
};
