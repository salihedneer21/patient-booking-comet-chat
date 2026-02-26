function randomIndex(max: number): number {
  if (max <= 0) return 0;

  try {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % max;
  } catch {
    return Math.floor(Math.random() * max);
  }
}

export function generateStrongPassword(length = 14): string {
  const normalizedLength = Math.max(12, Math.floor(length));

  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const symbols = "!@#$%^&*-_=+?";
  const all = lower + upper + digits + symbols;

  const pick = (alphabet: string) => alphabet[randomIndex(alphabet.length)];

  const passwordChars = [pick(lower), pick(upper), pick(digits), pick(symbols)];

  while (passwordChars.length < normalizedLength) {
    passwordChars.push(pick(all));
  }

  for (let i = passwordChars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
}

