package com.paymentgateway.payment_gateway.util;

import java.time.YearMonth;
import java.util.regex.Pattern;

public class PaymentValidator {

    // VPA (UPI) Validation 
    private static final Pattern VPA_PATTERN = Pattern.compile("^[a-zA-Z0-9._\\-]+@[a-zA-Z0-9\\-]+$");

    public static boolean isValidVPA(String vpa) {
        if (vpa == null || vpa.trim().isEmpty()) {
            return false;
        }
        return VPA_PATTERN.matcher(vpa.trim()).matches();
    }

    // Luhn Algorithm 
    public static boolean isValidCardNumber(String cardNumber) {
        if (cardNumber == null || cardNumber.isEmpty()) {
            return false;
        }

        // Step 1: Remove spaces and dashes
        String cleanedNumber = cardNumber.replaceAll("[\\s\\-]", "");

        // Step 2: Verify contains only digits and length between 13-19
        if (!cleanedNumber.matches("\\d+")) {
            return false;
        }
        if (cleanedNumber.length() < 13 || cleanedNumber.length() > 19) {
            return false;
        }

        // Step 3: Apply Luhn algorithm
        int sum = 0;
        boolean alternate = false;

        // Start from the rightmost digit
        for (int i = cleanedNumber.length() - 1; i >= 0; i--) {
            int digit = Character.getNumericValue(cleanedNumber.charAt(i));

            // Moving left, double every second digit (2nd from right, 4th from right, etc.)
            if (alternate) {
                digit *= 2;
                // If any doubled digit is greater than 9, subtract 9 from it
                if (digit > 9) {
                    digit = digit - 9;
                }
            }

            // Sum all digits (both doubled and unchanged)
            sum += digit;
            alternate = !alternate;
        }

        // The card number is valid if the sum modulo 10 equals 0
        return (sum % 10 == 0);
    }

    // Card Network Detection 
    public static String detectCardNetwork(String cardNumber) {
        if (cardNumber == null || cardNumber.isEmpty()) {
            return "unknown";
        }

        // Remove spaces and dashes
        String cleanedNumber = cardNumber.replaceAll("[\\s\\-]", "");

        // Check first digits
        if (cleanedNumber.startsWith("4")) {
            return "visa";
        }
        if (cleanedNumber.matches("^5[1-5].*")) {
            return "mastercard";
        }
        if (cleanedNumber.startsWith("34") || cleanedNumber.startsWith("37")) {
            return "amex";
        }
        if (cleanedNumber.startsWith("60") || cleanedNumber.startsWith("65") || cleanedNumber.matches("^8[1-9].*")) {
            return "rupay";
        }
        
        return "unknown";
    }

    // Expiry Validation 
    public static boolean isValidExpiry(String expiryMonth, String expiryYear) {
        try {
            // Parse month: must be 1-12
            int month = Integer.parseInt(expiryMonth);
            if (month < 1 || month > 12) {
                return false;
            }

            // Parse year: accept both formats
            int year = Integer.parseInt(expiryYear);
            if (year < 100) {
                year += 2000;  // 2-digit: 25 = 2025
            }
            // 4-digit: use as-is

            // Compare expiry with current date
            YearMonth expiryDate = YearMonth.of(year, month);
            YearMonth currentDate = YearMonth.now();

            // Expiry must be >= current month/year
            return !expiryDate.isBefore(currentDate);
            
        } catch (Exception e) {
            return false;
        }
    }

    // Extract last 4 digits
    public static String getCardLast4(String cardNumber) {
        if (cardNumber == null || cardNumber.isEmpty()) {
            return null;
        }
        String cleanedNumber = cardNumber.replaceAll("[\\s\\-]", "");
        if (cleanedNumber.length() < 4) {
            return cleanedNumber;
        }
        return cleanedNumber.substring(cleanedNumber.length() - 4);
    }

    // Validate CVV
    public static boolean isValidCVV(String cvv, String cardNetwork) {
        if (cvv == null || !cvv.matches("\\d+")) {
            return false;
        }
        if ("amex".equals(cardNetwork)) {
            return cvv.length() == 4;
        } else {
            return cvv.length() == 3;
        }
    }
}