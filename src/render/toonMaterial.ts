import {
  DataTexture,
  MeshToonMaterial,
  NearestFilter,
  RGBAFormat,
  UnsignedByteType,
} from 'three'

export function createToonGradient(): DataTexture {
  const data = new Uint8Array([
    40, 40, 40, 255,
    100, 100, 100, 255,
    180, 180, 180, 255,
    230, 230, 230, 255,
    255, 255, 255, 255,
  ])
  const texture = new DataTexture(data, 5, 1, RGBAFormat, UnsignedByteType)
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.needsUpdate = true
  return texture
}

export function createToonMaterial(
  gradient: DataTexture,
  color: number,
): MeshToonMaterial {
  return new MeshToonMaterial({
    color,
    gradientMap: gradient,
  })
}
