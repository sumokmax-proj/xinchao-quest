import { defineConfig } from 'vitest/config';
import pkg from './package.json';

// GitHub Pages 주소가 https://<계정>.github.io/xinchao-quest/ 이므로 base를 저장소 이름에 맞춘다.
export default defineConfig({
  base: '/xinchao-quest/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    chunkSizeWarningLimit: 800, // three가 커서 기본 경고(500kB)를 넘음. 압축하면 약 150kB
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
