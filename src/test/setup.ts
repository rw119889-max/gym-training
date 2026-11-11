import { beforeEach, vi } from 'vitest'

const alertMock = vi.fn()

class MemoryStorage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

// 逻辑层只依赖 localStorage 与 window.alert，这里给出最小实现，避免引入 jsdom。
Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
})

Object.defineProperty(globalThis, 'window', {
  value: { alert: alertMock },
  configurable: true,
  writable: true,
})

beforeEach(() => {
  ;(globalThis.localStorage as MemoryStorage).clear()
  alertMock.mockClear()
})
