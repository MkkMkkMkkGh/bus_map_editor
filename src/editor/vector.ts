import type { Vec2 } from '../types'

export const vec = {
  xy: (x: number, y: number): Vec2 => ({ x, y }),
  add: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s }),
  dot: (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y,
  lengthSquared: (a: Vec2): number => a.x * a.x + a.y * a.y,
  distanceSquared: (a: Vec2, b: Vec2): number => {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return dx * dx + dy * dy
  },
  distance: (a: Vec2, b: Vec2): number => Math.sqrt(vec.distanceSquared(a, b)),
}
