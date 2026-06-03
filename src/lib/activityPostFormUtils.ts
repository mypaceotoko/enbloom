export function parseActivityPostTags(value: string) {
  return value
    .split(/[、,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}
