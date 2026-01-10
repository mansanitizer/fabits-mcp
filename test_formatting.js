
function formatPhoneNumber(phone) {
    // Remove whitespace
    const cleaned = phone.replace(/\s+/g, '');

    // If it starts with +, assume it has country code
    if (cleaned.startsWith('+')) {
        return cleaned;
    }

    // If it is 10 digits/starts with 6-9, assume Indian number and add +91
    // This is a "default to +91" strategy
    return `+91${cleaned}`;
}

const numbers = [
    "7378666101",
    "+917378666101",
    "917378666101",
    " +91 7378666101 ",
    "07378666101"
];

console.log("Testing Phone Number Formatting:");
numbers.forEach(num => {
    console.log(`Input: '${num}' -> Output: '${formatPhoneNumber(num)}'`);
});
