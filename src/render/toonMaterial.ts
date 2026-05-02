import {
  Color,
  DataTexture,
  MeshToonMaterial,
  NearestFilter,
  RGBAFormat,
  UnsignedByteType,
} from 'three'

/**
 * Adds a rim-light contribution to an existing MeshToonMaterial via onBeforeCompile.
 * The rim effect brightens silhouette edges facing away from the camera.
 * Uses vViewPosition (available in toon fragment shader) and the resolved `normal`.
 *
 * @param material - MeshToonMaterial to extend in-place
 * @param rimStrength - rim brightness multiplier (default 0.4)
 */
export function addRimLight(material: MeshToonMaterial, rimStrength = 0.4): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uRimStrength'] = { value: rimStrength }
    // Inject uniform declaration after #include <common>
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nuniform float uRimStrength;',
    )
    // Inject rim contribution into outgoingLight before opaque_fragment writes gl_FragColor
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
float rim = 1.0 - max(dot(normalize(vViewPosition), normal), 0.0);
rim = pow(rim, 2.0) * uRimStrength;
outgoingLight += vec3(rim);
#include <opaque_fragment>
      `.trim(),
    )
    // Store uniforms on userData so callers can update uRimStrength at runtime
    material.userData['uniforms'] = shader.uniforms
  }
  // Mark material as needing shader program recompilation
  material.needsUpdate = true
}

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

// Colorblind-safe palette (deuteranopia/protanopia, per D-13)
const COLORBLIND_BIRD_COLOR = 0xffd166 // high-luminance yellow
const COLORBLIND_PIPE_COLOR = 0x118ab2 // teal-blue (high contrast vs sky)
const DEFAULT_BIRD_COLOR = 0xff7043    // orange
const DEFAULT_PIPE_COLOR = 0x4caf50    // green

export function applyColorblindPalette(
  birdMaterial: { color: Color },
  pipeMaterial: { color: Color },
): void {
  birdMaterial.color.set(COLORBLIND_BIRD_COLOR)
  pipeMaterial.color.set(COLORBLIND_PIPE_COLOR)
}

export function applyDefaultPalette(
  birdMaterial: { color: Color },
  pipeMaterial: { color: Color },
): void {
  birdMaterial.color.set(DEFAULT_BIRD_COLOR)
  pipeMaterial.color.set(DEFAULT_PIPE_COLOR)
}
