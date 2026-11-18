import { realpathSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

// Windows 已知问题（vitest-dev/vitest#10812）：若工作目录盘符与系统规范大小写不一致
// （例如终端处于 d:\gym-training，而系统规范为 D:\gym-training），worker 内部状态
// 初始化会失败，所有测试文件在 describe() 处抛出
// "Vitest failed to find the runner" / "Cannot read properties of undefined (reading 'config')"。
// 在配置加载时把 cwd 规范化为系统真实大小写，保证任何终端下测试都能启动。
process.chdir(realpathSync(process.cwd()))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
