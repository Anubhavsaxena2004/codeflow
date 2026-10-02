// The service modules use extensionless relative imports (they target the
// bundler's module resolution). Plain Node ESM needs the file extension, so
// this hook retries a failed relative resolution with ".mjs" and ".ts"
// appended — helpers are .mjs, the service modules are .ts.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    if (specifier.startsWith('.') || specifier.startsWith('file:')) {
      for (const extension of ['.mjs', '.ts']) {
        try {
          return await nextResolve(`${specifier}${extension}`, context)
        } catch {
          // Try the next extension.
        }
      }
    }
    throw error
  }
}
