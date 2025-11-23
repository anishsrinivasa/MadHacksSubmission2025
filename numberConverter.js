// Number to words converter for TTS clarity
// Converts numbers in text to English words for better Fish Audio pronunciation

/**
 * Convert a number to its English word representation
 * @param {number} num - The number to convert
 * @returns {string} - The number in words
 */
function numberToWords(num) {
    if (num === 0) return 'zero';
    if (num < 0) return 'negative ' + numberToWords(-num);

    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    // Single digit (1-9)
    if (num < 10) {
        return ones[num];
    }

    // Teens (10-19)
    if (num < 20) {
        return teens[num - 10];
    }

    // Two digits (20-99)
    if (num < 100) {
        const tensDigit = Math.floor(num / 10);
        const onesDigit = num % 10;
        return tens[tensDigit] + (onesDigit !== 0 ? ' ' + ones[onesDigit] : '');
    }

    // Hundreds (100-999)
    if (num < 1000) {
        const hundreds = Math.floor(num / 100);
        const remainder = num % 100;
        return ones[hundreds] + ' hundred' + (remainder !== 0 ? ' and ' + numberToWords(remainder) : '');
    }

    // Thousands (1,000-999,999)
    if (num < 1000000) {
        const thousands = Math.floor(num / 1000);
        const remainder = num % 1000;
        return numberToWords(thousands) + ' thousand' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }

    // Millions (1,000,000-999,999,999)
    if (num < 1000000000) {
        const millions = Math.floor(num / 1000000);
        const remainder = num % 1000000;
        return numberToWords(millions) + ' million' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }

    // For numbers beyond billions, just return as string
    return num.toString();
}

/**
 * Convert all numbers in text to words
 * @param {string} text - The text containing numbers
 * @returns {string} - The text with numbers converted to words
 */
function convertTextNumbers(text) {
    // Replace all sequences of digits with their word equivalents
    return text.replace(/\d+/g, (match) => {
        const num = parseInt(match, 10);
        return numberToWords(num);
    });
}

// Example usage:
// numberToWords(105) => "one hundred and five"
// numberToWords(911) => "nine hundred and eleven"
// numberToWords(2025) => "two thousand and twenty five"
// convertTextNumbers("i am 25 years old") => "i am twenty five years old"
