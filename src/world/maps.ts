import type { MapData } from './Grid';

/** src/data/maps/*.json 을 전부 읽어 "파일 이름 → 맵"으로. 맵 파일만 추가하면 코드 수정 없이 쓸 수 있다 */
const files = import.meta.glob<MapData>('../data/maps/*.json', { eager: true, import: 'default' });

export const MAPS: Record<string, MapData> = Object.fromEntries(
  Object.entries(files).map(([path, data]) => [path.replace(/^.*\/(.+)\.json$/, '$1'), data]),
);

export function getMap(name: string): MapData {
  const m = MAPS[name];
  if (!m) throw new Error(`맵 ${name}.json 이 없음`);
  return m;
}
