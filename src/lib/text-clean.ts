/** Replace em/en dashes from LLM output with natural punctuation. */
export function stripEmDashes(text: string): string {
  if (!text) return text;
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ", ")
    .replace(/,\s*([.!?;:])/g, "$1");
}
