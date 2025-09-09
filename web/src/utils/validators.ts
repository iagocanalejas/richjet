export function isValidBalance(balance: number): boolean {
    return !isNaN(balance) && balance >= 0;
}

export function isValidISIN(isin: string): boolean {
    if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return false;

    // Convert letters to numbers (A = 10, B = 11, ..., Z = 35)
    const converted = isin
        .slice(0, -1)
        .split('')
        .map((char) => (/[A-Z]/.test(char) ? (char.charCodeAt(0) - 55).toString() : char))
        .join('');

    // Append check digit
    const full = converted + isin.slice(-1);

    // Apply Luhn algorithm
    let sum = 0;
    let double = false;

    for (let i = full.length - 1; i >= 0; i--) {
        let digit = parseInt(full[i]!, 10);
        if (double) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        double = !double;
    }

    return sum % 10 === 0;
}
