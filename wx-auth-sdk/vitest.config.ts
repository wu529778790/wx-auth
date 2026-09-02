import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    // SDK 模块级单例，串行执行避免状态互相干扰
    sequence: {
      concurrent: false,
    },
  },
});
