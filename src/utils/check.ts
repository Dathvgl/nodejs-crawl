export function strExist(str: string | null | undefined) {
  return str ? str : "";
}

export function strEmpty(str: string | null | undefined) {
  return str ? str : undefined;
}

export function strBase64(buffer?: Buffer, range: number = 100) {
  const array: string[] = [];
  if (!buffer) return array;

  const base64 = `data:image/png;base64,${Buffer.from(buffer).toString(
    "base64"
  )}`;

  const length = Math.ceil(base64.length / range);
  const regex = new RegExp(`.{1,${length}}`, "g");

  const split = base64.match(regex);
  split?.forEach((item) => {
    array.push(item);
  });

  return array;
}

export function numExist(num: number | null | undefined) {
  return num ? num : 0;
}

export function numStrExist(num: string | undefined) {
  return num ? Number.parseFloat(num) : 0;
}

export function numFromStr(str?: string) {
  if (!str) return 0;
  return parseInt(str.match(/\d+(?:\.?\d+)?/g)?.[0] ?? "0");
}

export function numNegative(str?: string) {
  if (!str) return 0;
  return parseInt(str.match(/\d+(?:\.?\d+)?/g)?.[0] ?? "-1");
}

export function numThousand(str?: string) {
  if (!str) return 0;
  const num = parseInt(str.replaceAll(".", ""));
  return isNaN(num) ? 0 : num;
}
