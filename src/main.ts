import './style.css';
import { CONFIG } from './config';
import { Game } from './core/Game';
import { bindInput } from './core/Input';
import { createRenderer } from './render/scene';
import { el } from './ui/dom';
import { Hud } from './ui/Hud';
import { isOverlayOpen, showError } from './ui/Overlays';
import type * as THREE from 'three';

function boot(): void {
  const gameEl = el('game');
  el('version').textContent = 'v' + __APP_VERSION__;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = createRenderer();
  } catch {
    showError();
    return;
  }
  gameEl.insertBefore(renderer.domElement, gameEl.firstChild);

  const game = new Game();
  // 개발 서버에서만: 자동 플레이 점검용으로 콘솔에서 게임 상태를 볼 수 있게 (배포 빌드에는 안 들어감)
  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;

  /** 화면 크기·도트 모드에 맞춰 캔버스 크기 조정. 도트 모드는 가로 약 200px로 그려서 늘린다 */
  function resize(): void {
    const w = gameEl.clientWidth;
    const h = gameEl.clientHeight;
    const pixel = game.settings.pixel;
    game.cam.resize(w, h);
    const scale = pixel ? Math.max(1, w / CONFIG.render.pixelBaseWidth) : 1;
    renderer.setPixelRatio(pixel ? 1 : Math.min(window.devicePixelRatio || 1, CONFIG.render.maxPixelRatio));
    renderer.setSize(Math.round(w / scale), Math.round(h / scale), false);
    renderer.domElement.classList.toggle('pixel', pixel);
    Hud.setToggles(pixel, game.settings.sound);
  }
  window.addEventListener('resize', resize);

  bindInput(renderer.domElement, el('dpad'), {
    press: (d) => game.press(d),
    release: (d) => game.release(d),
    releaseAll: () => game.releaseAll(),
    blocked: isOverlayOpen,
  });
  el('btnStart').addEventListener('click', () => game.start());
  el('btnRetry').addEventListener('click', () => game.retry());
  el('btnBook').addEventListener('click', () => game.openBook());
  el('btnBook2').addEventListener('click', () => game.openBook());
  el('btnPixel').addEventListener('click', () => {
    game.togglePixel();
    resize();
  });
  el('btnSound').addEventListener('click', () => {
    game.toggleSound();
    resize();
  });

  resize();

  let last = performance.now();
  function frame(now: number): void {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); // 탭을 오래 비웠다 와도 한 프레임 최대 0.05초
    last = now;
    game.update(dt, now);
    renderer.render(game.scene, game.cam.camera);
    game.updateLabels(gameEl.clientWidth);
  }
  requestAnimationFrame(frame);
}

boot();
