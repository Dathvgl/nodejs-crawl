export function strBase<T>(str?: string | null | undefined, base?: string): T {
  return (str ? str : base) as T;
}

export function strEmpty(str: string | null | undefined) {
  return strBase<string>(str, "");
}

export function strUndefined(str: string | null | undefined) {
  return strBase<undefined>(str, undefined);
}

export function numBase(
  value?: number | string | null,
  parse?: {
    default?: number;
    regex?: RegExp;
    type?: "int" | "float";
  }
) {
  const base = parse?.default ?? 0;

  switch (typeof value) {
    case "string": {
      try {
        if (!parse) {
          return parseInt(value);
        } else {
          if (!parse.regex) {
            if (parse.type == "float") {
              return parseInt(value);
            } else {
              return parseFloat(value);
            }
          }

          if (parse.type == "float") {
            return parseInt(value.match(parse.regex)?.[0] ?? `${base}`);
          } else {
            return parseFloat(value.match(parse.regex)?.[0] ?? `${base}`);
          }
        }
      } catch (error) {
        return base;
      }
    }
    case "number":
      return value;
    default:
      return base;
  }
}

export function numStrTime(str?: string) {
  return numBase(str, { type: "int", regex: /\d+(?:\.?\d+)?/g });
}

export function numThousand(str?: string) {
  return numBase(str?.replaceAll(".", ""));
}
