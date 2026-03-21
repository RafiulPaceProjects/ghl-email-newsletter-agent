export function parseFlagValue(
  args: string[],
  key: string,
): string | undefined {
  const withEqualsPrefix = `${key}=`;
  const withEquals = args.find(arg => arg.startsWith(withEqualsPrefix));
  if (withEquals) {
    return withEquals.slice(withEqualsPrefix.length).trim() || undefined;
  }

  const index = args.findIndex(arg => arg === key);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1].trim() || undefined;
  }

  return undefined;
}

export function extractFlag(
  args: string[],
  key: string,
): {value?: string; rest: string[]} {
  const rest: string[] = [];
  let value: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === key) {
      const next = args[index + 1];
      if (next) {
        value = next.trim() || undefined;
        index += 1;
      }
      continue;
    }

    const withEqualsPrefix = `${key}=`;
    if (arg.startsWith(withEqualsPrefix)) {
      value = arg.slice(withEqualsPrefix.length).trim() || undefined;
      continue;
    }

    rest.push(arg);
  }

  return {value, rest};
}
