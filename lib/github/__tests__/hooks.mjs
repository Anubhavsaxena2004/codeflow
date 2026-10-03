// The service modules use extensionless relative imports and the `@/` path
// alias (they target the bundler's module resolution). Plain Node ESM needs a
// real file, so this hook retries a failed resolution with ".mjs" / ".ts"
// appended and maps `@/x` to the project root.
const ROOT = new URL('../../../', import.meta.url)

function candidatesFor(specifier) {
  if (specifier.startsWith('@/')) return ['.mjs', '.ts'].map((extension) => `${new URL(specifier.slice(2), ROOT).href}${extension}`)
  if (specifier.startsWith('.') || specifier.startsWith('file:')) return [specifier, `${specifier}.mjs`, `${specifier}.ts`]
  return null
}

export async function resolve(specifier, context, nextResolve) {
  const candidates = candidatesFor(specifier)
  if (!candidates) return nextResolve(specifier, context)

  let lastError
  for (const candidate of candidates) {
    try {
      return await nextResolve(candidate, context)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}
