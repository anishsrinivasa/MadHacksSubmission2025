function numberToWords(num: number): string {
  if (num === 0) return 'zero';
  if (num < 0) return `negative ${numberToWords(-num)}`;

  const ones = [
    '',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
  ];
  const teens = [
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
  ];
  const tens = [
    '',
    '',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety',
  ];

  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const tensDigit = Math.floor(num / 10);
    const onesDigit = num % 10;
    return tens[tensDigit] + (onesDigit !== 0 ? ` ${ones[onesDigit]}` : '');
  }
  if (num < 1000) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    return `${ones[hundreds]} hundred${remainder ? ` and ${numberToWords(remainder)}` : ''}`;
  }
  if (num < 1_000_000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return `${numberToWords(thousands)} thousand${remainder ? ` ${numberToWords(remainder)}` : ''}`;
  }
  if (num < 1_000_000_000) {
    const millions = Math.floor(num / 1_000_000);
    const remainder = num % 1_000_000;
    return `${numberToWords(millions)} million${remainder ? ` ${numberToWords(remainder)}` : ''}`;
  }

  return num.toString();
}

export function convertTextNumbers(text: string): string {
  return text.replace(/\d+/g, (match) => numberToWords(parseInt(match, 10)));
}

