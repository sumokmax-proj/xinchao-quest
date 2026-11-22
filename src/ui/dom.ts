/** id로 HTML 요소 찾기. 없으면 바로 에러 (index.html과 코드가 어긋난 것을 빨리 알기 위해) */
export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} 요소가 index.html에 없음`);
  return e as T;
}

/** 단어 데이터를 HTML에 넣을 때 태그로 해석되지 않게 */
export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);

export const fmtDong = (n: number): string => n.toLocaleString('vi-VN') + '₫';
