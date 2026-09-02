import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      outDir: 'dist',
      // 生成声明文件
      rollupTypes: true,
      // 清理输出目录
      cleanOutDir: true,
    }),
  ],
  build: {
    // 库构建配置
    lib: {
      entry: {
        wxAuth: resolve(__dirname, 'src/index.ts'),
      },
      name: 'WxAuthSDK',
      fileName: (format, entryName) => {
        if (entryName === 'wxAuth') {
          return format === 'es' ? 'wx-auth.js' : 'wx-auth.umd.js';
        }
        return `${entryName}.js`;
      },
      formats: ['es', 'umd'],
    },
    // 外部依赖（不打包进库）
    rollupOptions: {
      external: [],
      output: {
        // CSS 文件会单独输出
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'wx-auth.css';
          }
          return '[name].[ext]';
        },
      },
    },
    // CSS 处理
    cssCodeSplit: true,
    // 压缩
    minify: 'esbuild',
    // 输出目录
    outDir: 'dist',
    // 清空输出目录
    emptyOutDir: true,
    // 不生成 sourcemap（可选）
    sourcemap: false,
  },
});
