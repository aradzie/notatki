export type IdGenerator = () => string;

const alphabet =
  "abcdefghijklmnopqrstuvwxyz" + //
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "0123456789";
// 256 = 4 * 62 + 8: using every byte modulo 62 would favor the first
// eight characters. Accept only 0–247 so each character has four mappings.
const byteLimit = 256 - (256 % alphabet.length);

/**
 * Generates an ID with uniformly distributed alphanumeric characters.
 */
export function idGenerator(length: number = 10): string {
  // Allow room for rejected bytes, capped at 1,024 bytes; refill as needed.
  const bytes = new Uint8Array(Math.min(1024, length * 2));
  let index = bytes.byteLength;
  let result = "";
  while (result.length < length) {
    // Fill before the first read, then reuse the buffer whenever it runs out.
    if (index === bytes.byteLength) {
      crypto.getRandomValues(bytes);
      index = 0;
    }
    const byte = bytes[index]!;
    if (byte < byteLimit) {
      result += alphabet[byte % alphabet.length];
    }
    index += 1;
  }
  return result;
}
