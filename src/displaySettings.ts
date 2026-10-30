/**
 * Настройки отображения, которые читаются рендерером каждый кадр.
 * App синхронизирует их с настройками «Игра» в меню паузы (localStorage: city_sim_game_settings).
 */
export interface DisplaySettings {
  /** Показывать сетку (softbody-узлы и балки) у всех машин. Клавиша G включает её временно. */
  showSoftbodyMesh: boolean;
  /** Плотность дыма и выхлопа в процентах: 0 — дыма нет, 100 — полный. */
  smokeDensity: number;
}

let current: DisplaySettings = { showSoftbodyMesh: false, smokeDensity: 100 };

export function setDisplaySettings(next: Partial<DisplaySettings>): void {
  current = { ...current, ...next };
}

export function getDisplaySettings(): Readonly<DisplaySettings> {
  return current;
}
