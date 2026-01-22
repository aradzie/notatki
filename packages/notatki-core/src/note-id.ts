export type IdGenerator = () => string;

const alphabet =
  "abcdefghijklmnopqrstuvwxyz" + //
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "0123456789";

export const idGenerator: IdGenerator = (length = 10) => {
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += alphabet[values.at(i)! % alphabet.length];
  }
  return result;
};
