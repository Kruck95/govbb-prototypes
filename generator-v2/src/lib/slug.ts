export function slugify(input: string, maxLen = 80): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, maxLen) || 'untitled'
  );
}
