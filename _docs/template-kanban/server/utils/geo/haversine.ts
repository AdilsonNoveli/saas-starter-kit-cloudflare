/**
 * Distância geodésica usando fórmula de Haversine.
 * Precisão adequada para raios de entrega (erro < 0.5% até 50 km).
 */
export function haversineDistanceKm(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(destLat - originLat)
  const dLng = toRad(destLng - originLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(originLat)) * Math.cos(toRad(destLat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
