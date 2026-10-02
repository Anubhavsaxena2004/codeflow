const MAX_MESSAGE_LENGTH = 72

function normalize(message: string): string {
  return message.replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_LENGTH)
}

/** Per-challenge push: "feat: build <path> — <challenge title>" */
export function challengeMessage(path: string, challengeTitle: string): string {
  return normalize(`feat: build ${path} — ${challengeTitle}`)
}

/** Bulk/milestone push: "feat: complete <stage name> stage" */
export function stageMessage(stageName: string): string {
  return normalize(`feat: complete ${stageName} stage`)
}

export function defaultBulkMessage(): string {
  return 'feat: update project files'
}

export function defaultFileMessage(path: string): string {
  return normalize(`feat: update ${path}`)
}
