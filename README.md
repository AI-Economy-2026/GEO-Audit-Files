# GEO-Audit-Files

ENV etc

## Code practice rules

- Imports always at the top of the file
- No unnecessary comments
- Valid, descriptive variable names
- No complex loops or functions
- No nested if/else
- Prefer array methods (`.map`, `.filter`, `.reduce`, `.find`, `.some`, `.every`, `.entries`) over manual `for` loops with index tracking
- Use optional chaining (`?.`) and nullish coalescing (`??`) instead of manual undefined/null checks
- Use `Map` or a plain object for counting/grouping instead of manually checking-then-initializing a key
- Destructure objects/arrays at the point of use rather than repeated property access
- For business logic with real complexity, reach for an established pattern where it fits: Command Bus (encapsulate a write operation as a command object), Event Bus (decouple side effects from the core action), Specification (composable business-rule objects), Middleware Pipeline (chainable request/response steps) — only when the complexity genuinely calls for it, not on every route by default
