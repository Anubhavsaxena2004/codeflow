// Lets plain `node --test` import the TypeScript modules: maps `@/x` to the project root,
// tries the extensions the bundler would, and compiles .ts with the project's TypeScript
// (works on Node 20, which cannot strip types itself).
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const ROOT = new URL('../../../', import.meta.url)

function candidatesFor(specifier, parentURL) {
  const base = specifier.startsWith('@/') ? new URL(specifier.slice(2), ROOT).href : specifier.startsWith('.') ? new URL(specifier, parentURL).href : null
  if (!base) return null
  return [base, `${base}.ts`, `${base}.mjs`, `${base}/index.ts`]
}

export async function resolve(specifier, context, nextResolve) {
  const candidates = candidatesFor(specifier, context.parentURL)
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

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.ts')) return nextLoad(url, context)
  const source = await readFile(new URL(url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    fileName: url,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
  })
  return { format: 'module', source: outputText, shortCircuit: true }
}
