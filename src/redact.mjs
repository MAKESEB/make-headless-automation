const sensitiveKeyPattern = /(api[_-]?key|token|secret|password|authorization|credential)/i;
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const authHeaderPattern = /\b(Bearer|Token)\s+[A-Za-z0-9._~+/=-]+/g;
const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const makeZoneUrlPattern = /https?:\/\/(?:eu1|eu2|us1|us2|we)\.make\.com/gi;

export function redact(value, key = "") {
  if (value === null || value === undefined) {
    return value;
  }

  if (sensitiveKeyPattern.test(key)) {
    return "[REDACTED]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redact(entryValue, entryKey)])
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  return value
    .replace(authHeaderPattern, "$1 [REDACTED]")
    .replace(emailPattern, "[redacted-email]")
    .replace(uuidPattern, "[redacted-id]")
    .replace(makeZoneUrlPattern, "https://[make-zone]");
}

export function redactedJson(value) {
  return `${JSON.stringify(redact(value), null, 2)}\n`;
}
