export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomUUID()}`
}

export function randomString(length: number): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, length)
}

export function randomInt(max: number): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] % max
}

export function randomFloat(): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] / 2 ** 32
}
