// builtin

// external

// internal


export function getSelectedLetter(index: number): string {
    if (index < 0) return '';
    const code = 'A'.charCodeAt(0) + index;
    if (code > 'Z'.charCodeAt(0)) return '';
    return String.fromCharCode(code);
}