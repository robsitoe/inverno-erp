/** Nome da via impressa a partir do número de cópias escolhido (1 = Original, 2 = Duplicado...). */
export function copyLabel(copies?: number | null): string {
  return ['Original', 'Original', 'Duplicado', 'Triplicado', 'Quadruplicado'][Number(copies) || 1] || 'Original';
}
