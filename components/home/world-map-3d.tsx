'use client'

import { Fragment, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls, PerformanceMonitor, Sparkles, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { Check, LockKeyhole, Minus, Plus, RotateCcw, Skull } from 'lucide-react'
import { Stars as StarRating, worldThemes, type WorldPalette } from '@/components/journey/level-meta'
import type { LevelProgress, WorldTheme } from '@/lib/journeys/types'
import type { LevelSummary, ProjectSummary } from '@/lib/server/journeys'
import { cn } from '@/lib/utils'
import { levelPoints, type LevelState } from './world-map'

// The journey as a 3D sea of low-poly floating islands. Same data and the same clicks as the 2D
// map (WorldMap). Level pins, world banners and "You are here" are ordinary page elements in an
// overlay, moved every frame to where their anchor in the scene projects, so they stay real
// buttons in the normal tab order. Drag to look around, ctrl/⌘ + scroll or pinch to zoom.

type Vec3 = [number, number, number]
type Controls = ComponentRef<typeof OrbitControls>
/** Registers a point in the scene that an overlay label follows. */
type Anchor = (key: string) => (node: THREE.Object3D | null) => void

const SPACING_X = 9.8
const SPACING_Z = 9.2
const TOP = 0.25
const FOV = 40
const ELEVATION = 0.92
/** The sea lies well below the islands, so they float. */
const SEA = -6.5

// ---- small helpers -----------------------------------------------------------------------

function hash(a: number, b: number, c: number, seed: number) {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + seed * 19.19) * 43758.5453
  return value - Math.floor(value)
}

/** Low-poly jitter. Points at the same place move the same way, so faces never crack apart. */
function jitter(geometry: THREE.BufferGeometry, amount: number, seed: number, flatTop = false) {
  const position = geometry.attributes.position
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const [kx, ky, kz] = [Math.round(x * 100), Math.round(y * 100), Math.round(z * 100)]
    const radius = Math.hypot(x, z)
    if (radius > 0.001) {
      const scale = (radius + (hash(kx, ky, kz, seed) - 0.5) * amount) / radius
      position.setX(index, x * scale)
      position.setZ(index, z * scale)
    }
    if (!(flatTop && y > 0)) position.setY(index, y + (hash(kz, kx, ky, seed + 1) - 0.5) * amount * 0.6)
  }
  geometry.computeVertexNormals()
  return geometry
}

/** Colours a geometry from `bottom` to `top` along y (vertex colours). */
function paint(geometry: THREE.BufferGeometry, top: string, bottom: string) {
  const position = geometry.attributes.position
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox!
  const from = new THREE.Color(bottom)
  const to = new THREE.Color(top)
  const color = new THREE.Color()
  const colors = new Float32Array(position.count * 3)
  for (let index = 0; index < position.count; index++) {
    color.copy(from).lerp(to, (position.getY(index) - min.y) / (max.y - min.y || 1))
    colors.set([color.r, color.g, color.b], index * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

/** Worlds not reached yet are drawn washed out. */
const muted = (hex: string, reached: boolean) => (reached ? hex : `#${new THREE.Color(hex).lerp(new THREE.Color('#8a94a6'), 0.55).getHexString()}`)

function islandRadius(levels: number) {
  return 3.2 + Math.max(0, levels - 5) * 0.28
}

/** Island centres: rows that snake back and forth, row 0 at the back like the 2D map. */
function layout(count: number, cols: number) {
  const columns = Math.max(1, Math.min(cols, count))
  const rows = Math.ceil(count / columns)
  const positions: Vec3[] = Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns)
    const step = index % columns
    const col = row % 2 ? columns - 1 - step : step
    return [(col - (columns - 1) / 2) * SPACING_X, 0, (row - (rows - 1) / 2) * SPACING_Z]
  })
  return { positions, columns, rows }
}

/** Camera position for looking at `target` from `distance` away, at the map's usual angle. */
function viewFrom(target: THREE.Vector3, distance: number) {
  return target.clone().add(new THREE.Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION)).multiplyScalar(distance))
}

function overviewDistance(columns: number, rows: number, aspect: number) {
  const vertical = THREE.MathUtils.degToRad(FOV) / 2
  const horizontal = Math.atan(Math.tan(vertical) * aspect)
  const halfWidth = ((columns - 1) * SPACING_X) / 2 + 4.6
  const halfDepth = ((rows - 1) * SPACING_Z) / 2 + 4.6
  return Math.max(halfWidth / Math.tan(horizontal) + halfDepth * 0.25, (halfDepth * Math.sin(ELEVATION) + 2.4) / Math.tan(vertical)) * 1.04
}

// A shared texture of lit and dark windows for the city towers.
let windowTexture: THREE.CanvasTexture | null = null
function windows() {
  if (windowTexture) return windowTexture
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 64
  const context = canvas.getContext('2d')!
  context.fillStyle = '#1e1b4b'
  context.fillRect(0, 0, 32, 64)
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 4; col++) {
      context.fillStyle = hash(row, col, 3, 9) > 0.3 ? '#fde68a' : '#312e81'
      context.fillRect(3 + col * 7, 3 + row * 6, 4, 3)
    }
  }
  windowTexture = new THREE.CanvasTexture(canvas)
  windowTexture.colorSpace = THREE.SRGBColorSpace
  windowTexture.magFilter = THREE.NearestFilter
  return windowTexture
}

// ---- decorations -------------------------------------------------------------------------

function Material({ color, emissive, emissiveIntensity = 0, opacity }: { color: string; emissive?: string; emissiveIntensity?: number; opacity?: number }) {
  return <meshStandardMaterial color={color} emissive={emissive ?? '#000000'} emissiveIntensity={emissiveIntensity} flatShading roughness={0.85} transparent={opacity !== undefined} opacity={opacity ?? 1} />
}

function Tree({ position, scale = 1, leaf }: { position: [number, number]; scale?: number; leaf: [string, string] }) {
  return (
    <group position={[position[0], TOP, position[1]]} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.5, 5]} />
        <Material color="#7c4a1e" />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <icosahedronGeometry args={[0.42, 0]} />
        <Material color={leaf[1]} />
      </mesh>
      <mesh position={[0.12, 0.92, 0.08]} castShadow>
        <icosahedronGeometry args={[0.26, 0]} />
        <Material color={leaf[0]} />
      </mesh>
    </group>
  )
}

function Pine({ position, scale = 1, leaf }: { position: [number, number]; scale?: number; leaf: [string, string] }) {
  return (
    <group position={[position[0], TOP, position[1]]} scale={scale}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.36, 5]} />
        <Material color="#6b3f1d" />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <coneGeometry args={[0.48, 0.75, 7]} />
        <Material color={leaf[1]} />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <coneGeometry args={[0.34, 0.6, 7]} />
        <Material color={leaf[0]} />
      </mesh>
    </group>
  )
}

function House({ position }: { position: [number, number] }) {
  return (
    <group position={[position[0], TOP, position[1]]} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.64, 0.75]} />
        <Material color="#fff3c4" />
      </mesh>
      <mesh position={[0, 0.88, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.82, 0.55, 4]} />
        <Material color="#ef4444" />
      </mesh>
      <mesh position={[0.26, 1.02, 0.05]} castShadow>
        <boxGeometry args={[0.14, 0.32, 0.14]} />
        <Material color="#9a3412" />
      </mesh>
      <mesh position={[0, 0.2, 0.38]}>
        <boxGeometry args={[0.2, 0.36, 0.02]} />
        <Material color="#92400e" />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.4, 0.38]}>
          <boxGeometry args={[0.18, 0.16, 0.02]} />
          <Material color="#38bdf8" emissive="#fde68a" emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  )
}

function Flag({ position, motion }: { position: Vec3; motion: boolean }) {
  const flag = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (motion && flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 3 + position[0]) * 0.35
  })
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 4]} />
        <Material color="#4c1d95" />
      </mesh>
      <mesh ref={flag} position={[0.12, 0.32, 0]}>
        <boxGeometry args={[0.24, 0.14, 0.01]} />
        <Material color="#ef4444" />
      </mesh>
    </group>
  )
}

function Castle({ position, motion }: { position: [number, number]; motion: boolean }) {
  const towers: [number, number][] = [[-0.62, -0.42], [0.62, -0.42], [-0.62, 0.42], [0.62, 0.42]]
  return (
    <group position={[position[0], TOP, position[1]]} scale={1.05}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.9, 0.75]} />
        <Material color="#f5f3ff" />
      </mesh>
      {towers.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.22, 1.2, 8]} />
            <Material color="#ddd6fe" />
          </mesh>
          <mesh position={[0, 1.42, 0]} castShadow>
            <coneGeometry args={[0.28, 0.5, 8]} />
            <Material color="#7c3aed" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.26, 0.6, 8]} />
        <Material color="#ede9fe" />
      </mesh>
      <mesh position={[0, 1.72, 0]} castShadow>
        <coneGeometry args={[0.33, 0.62, 8]} />
        <Material color="#a855f7" />
      </mesh>
      <Flag position={[0, 2.02, 0]} motion={motion} />
      <Flag position={[-0.62, 1.66, -0.42]} motion={motion} />
      <Flag position={[0.62, 1.66, -0.42]} motion={motion} />
      <mesh position={[0, 0.2, 0.38]}>
        <boxGeometry args={[0.28, 0.4, 0.02]} />
        <Material color="#4c1d95" />
      </mesh>
    </group>
  )
}

function Crystal({ position, color, scale = 1, night }: { position: [number, number]; color: string; scale?: number; night: boolean }) {
  return (
    <group position={[position[0], TOP, position[1]]} scale={scale}>
      <mesh position={[0, 0.42, 0]} scale={[0.6, 1.5, 0.6]} rotation={[0, 0.4, 0.12]} castShadow>
        <octahedronGeometry args={[0.32, 0]} />
        <Material color={color} emissive={color} emissiveIntensity={night ? 1.1 : 0.35} />
      </mesh>
      <mesh position={[0.22, 0.24, 0.1]} scale={[0.5, 1.1, 0.5]} rotation={[0.2, 0, -0.35]} castShadow>
        <octahedronGeometry args={[0.22, 0]} />
        <Material color={color} emissive={color} emissiveIntensity={night ? 0.9 : 0.25} />
      </mesh>
    </group>
  )
}

function Torch({ position, motion, night }: { position: [number, number]; motion: boolean; night: boolean }) {
  const flame = useRef<THREE.Mesh>(null)
  const flameMat = useRef<THREE.MeshStandardMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    if (!motion) return
    const t = clock.elapsedTime
    if (flame.current) flame.current.scale.y = 1 + Math.sin(t * 12 + position[0] * 5) * 0.18
    if (flameMat.current) flameMat.current.emissiveIntensity = 1 + Math.sin(t * 10 + position[1] * 3) * 0.4
    if (light.current) light.current.intensity = 2.4 + Math.sin(t * 15 + position[0] * 3) * 0.8
  })
  return (
    <group position={[position[0], TOP, position[1]]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.6, 5]} />
        <Material color="#78350f" />
      </mesh>
      <mesh ref={flame} position={[0, 0.7, 0]}>
        <coneGeometry args={[0.09, 0.24, 6]} />
        <meshStandardMaterial ref={flameMat} color="#fb923c" emissive="#ea580c" emissiveIntensity={1} roughness={0.2} />
      </mesh>
      {night && <pointLight ref={light} position={[0, 0.8, 0]} color="#fb923c" intensity={3} distance={3.5} />}
    </group>
  )
}

function DatabaseStone({ position, night }: { position: [number, number]; night: boolean }) {
  return (
    <group position={[position[0], TOP, position[1]]}>
      {[0, 1, 2].map((level) => (
        <group key={level} position={[0, 0.22 + level * 0.36, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.55, 0.55, 0.3, 12]} />
            <Material color="#7c6aa8" />
          </mesh>
          <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.55, 0.035, 6, 24]} />
            <Material color="#f97316" emissive="#f97316" emissiveIntensity={night ? 1.4 : 0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Lab({ position, motion }: { position: [number, number]; motion: boolean }) {
  const beacon = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (beacon.current) beacon.current.emissiveIntensity = motion ? 0.6 + Math.max(0, Math.sin(clock.elapsedTime * 4)) * 2 : 1.4
  })
  return (
    <group position={[position[0], TOP, position[1]]}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 0.9, 0.4, 14]} />
        <Material color="#e0f2fe" />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.72, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#67e8f9" transparent opacity={0.55} roughness={0.1} metalness={0.2} emissive="#22d3ee" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 4]} />
        <Material color="#0e7490" />
      </mesh>
      <mesh position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial ref={beacon} color="#f43f5e" emissive="#f43f5e" emissiveIntensity={1} />
      </mesh>
    </group>
  )
}

function Flask({ position, color, night }: { position: [number, number]; color: string; night: boolean }) {
  return (
    <group position={[position[0], TOP, position[1]]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <coneGeometry args={[0.24, 0.44, 8]} />
        <meshStandardMaterial color="#f0f9ff" transparent opacity={0.65} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <coneGeometry args={[0.19, 0.2, 8]} />
        <Material color={color} emissive={color} emissiveIntensity={night ? 1.2 : 0.4} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.18, 6]} />
        <meshStandardMaterial color="#f0f9ff" transparent opacity={0.65} />
      </mesh>
    </group>
  )
}

function Tower({ position, height, color, night }: { position: [number, number]; height: number; color: string; night: boolean }) {
  const texture = useMemo(() => windows(), [])
  return (
    <mesh position={[position[0], TOP + height / 2, position[1]]} castShadow receiveShadow>
      <boxGeometry args={[0.5, height, 0.5]} />
      <meshStandardMaterial color={color} map={texture} emissive="#fde68a" emissiveMap={texture} emissiveIntensity={night ? 1 : 0.15} roughness={0.6} />
    </mesh>
  )
}

function Waterfall({ radius, motion }: { radius: number; motion: boolean }) {
  const water = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (motion && water.current) water.current.opacity = 0.75 + Math.sin(clock.elapsedTime * 6) * 0.08
  })
  return (
    <group position={[-0.9, 0, radius * 0.93]} rotation={[0.15, 0, 0]}>
      <mesh position={[0, -1.05, 0]}>
        <boxGeometry args={[0.45, 2.3, 0.05]} />
        <meshStandardMaterial ref={water} color="#7dd3fc" emissive="#bae6fd" emissiveIntensity={0.35} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

function Decorations({ theme, palette, radius, motion, night }: { theme: WorldTheme; palette: WorldPalette; radius: number; motion: boolean; night: boolean }) {
  const r = radius / 3.2
  const at = (x: number, z: number): [number, number] => [x * r, z * r]
  const leaf = palette.leaf
  switch (theme) {
    case 'village':
      return (
        <>
          <House position={at(0.95, -1.75)} />
          {([[-1.6, -1.5], [-0.6, -2.15], [2.5, -0.6], [-2.6, 0.2], [2.4, 1.05], [-1.9, 1.55]] as const).map(([x, z]) => (
            <Tree key={`${x}${z}`} position={at(x, z)} leaf={leaf} scale={0.9} />
          ))}
        </>
      )
    case 'forest':
      return (
        <>
          {([[-2.4, -0.8], [-1.6, -1.9], [-0.6, -2.3], [0.6, -2.2], [1.7, -1.8], [2.5, -0.7], [-2.6, 0.9], [2.6, 0.8], [-1.7, 1.9], [1.8, 1.8]] as const).map(([x, z], index) => (
            <Pine key={`${x}${z}`} position={at(x, z)} leaf={leaf} scale={0.8 + (index % 3) * 0.12} />
          ))}
          <Waterfall radius={radius} motion={motion} />
        </>
      )
    case 'dungeon':
      return (
        <>
          <DatabaseStone position={at(0.8, -1.8)} night={night} />
          <Torch position={at(-0.3, -2.0)} motion={motion} night={night} />
          <Torch position={at(1.9, -1.5)} motion={motion} night={night} />
          <Crystal position={at(-2.4, -0.4)} color="#c084fc" night={night} />
          <Crystal position={at(-1.8, 1.6)} color="#22d3ee" scale={0.8} night={night} />
          <Crystal position={at(2.5, 0.2)} color="#f0abfc" night={night} />
          <Crystal position={at(2.0, 1.7)} color="#fb923c" scale={0.8} night={night} />
          <Crystal position={at(-1.3, -2.0)} color="#a78bfa" scale={0.7} night={night} />
        </>
      )
    case 'castle':
      return (
        <>
          <Castle position={at(0.6, -1.7)} motion={motion} />
          {([[-2.4, 0.3], [2.5, 0.6], [-1.8, 1.6], [-1.7, -1.8], [2.0, 1.7]] as const).map(([x, z]) => (
            <Tree key={`${x}${z}`} position={at(x, z)} leaf={leaf} scale={0.8} />
          ))}
        </>
      )
    case 'lab':
      return (
        <>
          <Lab position={at(0.8, -1.8)} motion={motion} />
          <Flask position={at(-2.4, 0.5)} color="#a3e635" night={night} />
          <Flask position={at(2.5, 0.6)} color="#f472b6" night={night} />
          <Tree position={at(-1.5, -1.9)} leaf={leaf} scale={0.8} />
          <Tree position={at(2.2, 1.6)} leaf={leaf} scale={0.75} />
          <Tree position={at(-2.0, 1.6)} leaf={leaf} scale={0.7} />
        </>
      )
    case 'city':
      return (
        <>
          {([[-0.9, -1.9, 1.1, '#6366f1'], [-0.2, -2.05, 1.7, '#3b82f6'], [0.5, -1.95, 2.5, '#2563eb'], [1.2, -1.75, 1.3, '#8b5cf6'], [1.9, -1.35, 2.0, '#7c3aed']] as const).map(([x, z, height, color]) => (
            <Tower key={`${x}${z}`} position={at(x, z)} height={height} color={color} night={night} />
          ))}
          {([[-2.4, 0.6], [2.6, 0.8], [-1.8, 1.6]] as const).map(([x, z]) => (
            <Tree key={`${x}${z}`} position={at(x, z)} leaf={leaf} scale={0.75} />
          ))}
        </>
      )
  }
}

// ---- the learner -------------------------------------------------------------------------

function Mascot({ position, motion }: { position: Vec3; motion: boolean }) {
  const body = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!body.current) return
    const t = clock.elapsedTime
    body.current.position.y = position[1] + (motion ? Math.abs(Math.sin(t * 2.4)) * 0.12 : 0)
    body.current.rotation.y = motion ? Math.sin(t * 0.8) * 0.35 : 0
  })
  return (
    <group ref={body} position={position}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.22, 4, 10]} />
        <meshStandardMaterial color="#16a34a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.66, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color="#fcd2b0" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.72, -0.02]} rotation={[-0.25, 0, 0]}>
        <sphereGeometry args={[0.215, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial color="#3b2a20" roughness={0.9} />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.66, 0.18]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshBasicMaterial color="#111827" />
        </mesh>
      ))}
    </group>
  )
}

// ---- level pins --------------------------------------------------------------------------

function Pin({ level, number, state, row, selected, palette, onSelect }: {
  level: LevelSummary
  number: number
  state: LevelState
  row?: LevelProgress
  selected: boolean
  palette: WorldPalette
  onSelect: () => void
}) {
  const boss = !!level.boss
  const locked = state === 'locked'
  return (
    <div className="relative flex origin-center flex-col items-center" style={{ transform: 'scale(var(--pin-scale, 1))' }}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        title={level.title}
        aria-label={`Level ${number}: ${level.title}${boss ? ' (boss)' : ''}, ${state === 'done' ? 'passed' : state === 'current' ? 'next up' : state === 'open' ? 'open' : 'locked'}`}
        className={cn(
          'grid place-items-center rounded-full border-[3px] font-extrabold shadow-[0_6px_14px_rgb(0_0_0/0.35)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none',
          boss ? 'size-10 text-sm' : 'size-8 text-[12px]',
          locked ? 'border-white/70 bg-slate-300 text-slate-500 dark:border-slate-400/40 dark:bg-slate-600 dark:text-slate-300' : boss || state === 'done' ? 'border-white text-white' : '',
          selected ? 'outline-[3px] outline-offset-2 outline-solid outline-[#fde047]' : 'focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[#fde047]',
        )}
        style={{
          background: locked ? undefined : boss ? 'linear-gradient(145deg, #f87171, #b91c1c)' : state === 'done' ? `linear-gradient(145deg, ${palette.color}, ${palette.deep})` : '#ffffff',
          ...(!locked && !boss && state !== 'done' ? { borderColor: palette.color, color: palette.deep } : {}),
        }}
      >
        {boss ? <Skull className="size-5" /> : locked ? <LockKeyhole className="size-3.5" /> : number}
      </button>
      {(boss || row) && (
        <span className="pointer-events-none mt-0.5 flex flex-col items-center gap-0.5">
          {boss && <span className="rounded bg-[#dc2626] px-1 text-[8px] font-extrabold leading-3.5 tracking-wider text-white shadow">BOSS</span>}
          {row && (
            <span className="rounded-full bg-white/90 px-0.5 leading-none shadow-sm dark:bg-[#0a1022]/80">
              <StarRating count={row.stars} />
            </span>
          )}
        </span>
      )}
    </div>
  )
}

// ---- islands -----------------------------------------------------------------------------

interface IslandProps {
  id: string
  index: number
  position: Vec3
  theme: WorldTheme
  palette: WorldPalette
  levels: { level: LevelSummary; index: number }[]
  done: Record<string, LevelProgress>
  stateOf: (index: number) => LevelState
  selectedId: string | null
  onIsland: () => void
  anchor: Anchor
  reached: boolean
  motion: boolean
  night: boolean
}

function IslandShadow({ radius }: { radius: number }) {
  return (
    <mesh position={[0, SEA + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius * 1.15, 24]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
    </mesh>
  )
}

function FoamRing({ radius, index, motion }: { radius: number; index: number; motion: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (!ringRef.current || !matRef.current || !motion) return
    const t = (clock.elapsedTime * 0.33 + index * 0.4) % 1
    const scale = 1 + t * 0.15
    ringRef.current.scale.set(scale, scale, 1)
    matRef.current.opacity = (1 - t) * 0.45
  })
  return (
    <mesh ref={ringRef} position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.96, radius * 1.1, 24]} />
      <meshBasicMaterial ref={matRef} color="#ffffff" transparent opacity={0.4} depthWrite={false} />
    </mesh>
  )
}

function Island({ id, index, position, theme, palette, levels, done, stateOf, selectedId, onIsland, anchor, reached, motion, night }: IslandProps) {
  const radius = islandRadius(levels.length)
  const float = useRef<THREE.Group>(null)
  const pulse = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const top = useMemo(() => paint(jitter(new THREE.CylinderGeometry(radius, radius * 0.97, 0.5, 18, 1), 0.28, index + 1, true), muted(palette.top[0], reached), muted(palette.top[1], reached)), [radius, index, palette, reached])
  const band = useMemo(() => paint(jitter(new THREE.CylinderGeometry(radius * 0.97, radius * 0.88, 0.6, 18, 1), 0.3, index + 11), muted(palette.cliff[0], reached), muted(palette.cliff[1], reached)), [radius, index, palette, reached])
  const rock = useMemo(() => {
    const cone = new THREE.ConeGeometry(radius * 0.88, radius * 1.1, 11, 3)
    cone.rotateX(Math.PI)
    return paint(jitter(cone, 0.55, index + 21), muted(palette.cliff[0], reached), muted(palette.cliff[1], reached))
  }, [radius, index, palette, reached])

  const points = useMemo(() => {
    const scale = radius / 3.2
    return levelPoints(levels.length).map((point): Vec3 => [((point.x - 206) / 116) * 2.0 * scale, TOP + 0.09, ((point.y - 160) * 0.022 + 0.35) * scale])
  }, [levels.length, radius])

  const currentIndex = levels.findIndex(({ index: levelIndex }) => stateOf(levelIndex) === 'current')
  const selectedIndex = levels.findIndex(({ level }) => level.id === selectedId)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (float.current) float.current.position.y = motion ? Math.sin(t * 0.6 + index * 1.4) * 0.12 + (hovered ? 0.12 : 0) : hovered ? 0.12 : 0
    if (pulse.current) {
      const scale = motion ? 1 + ((t * 0.9) % 1) * 0.9 : 1.3
      pulse.current.scale.set(scale, scale, scale)
      ;(pulse.current.material as THREE.MeshBasicMaterial).opacity = motion ? 0.75 * (1 - ((t * 0.9) % 1)) : 0.5
    }
    if (ring.current) ring.current.rotation.z = t * 0.8
  })

  return (
    <group position={position}>
      <IslandShadow radius={radius} />
      <group ref={float}>
        <FoamRing radius={radius} index={index} motion={motion} />
        <group
          onClick={(event) => {
            event.stopPropagation()
            onIsland()
          }}
          onPointerOver={(event) => {
            event.stopPropagation()
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = ''
          }}
        >
          <mesh geometry={top} receiveShadow castShadow>
            <meshStandardMaterial vertexColors flatShading roughness={0.9} />
          </mesh>
          <mesh geometry={band} position={[0, -0.5, 0]} castShadow>
            <meshStandardMaterial vertexColors flatShading roughness={0.95} />
          </mesh>
          <mesh geometry={rock} position={[0, -0.8 - (radius * 1.1) / 2, 0]} castShadow>
            <meshStandardMaterial vertexColors flatShading roughness={1} />
          </mesh>
        </group>

        <Decorations theme={theme} palette={palette} radius={radius} motion={motion} night={night} />

        {!reached && (
          <group position={[0, TOP + 1.2, 0]} scale={radius * 0.45}>
            <mesh position={[-0.4, 0, 0]}>
              <sphereGeometry args={[0.7, 8, 8]} />
              <meshStandardMaterial color="#cbd5e1" transparent opacity={0.7} flatShading roughness={1} />
            </mesh>
            <mesh position={[0.4, 0.1, 0]}>
              <sphereGeometry args={[0.8, 8, 8]} />
              <meshStandardMaterial color="#cbd5e1" transparent opacity={0.75} flatShading roughness={1} />
            </mesh>
            <mesh position={[0, 0.3, 0.2]}>
              <sphereGeometry args={[0.6, 8, 8]} />
              <meshStandardMaterial color="#94a3b8" transparent opacity={0.7} flatShading roughness={1} />
            </mesh>
          </group>
        )}

        {/* The path between levels: dotted ahead, gold where it has been walked */}
        {points.slice(1).map((point, step) => {
          const from = points[step]
          const walked = !!done[levels[step].level.id] && !!done[levels[step + 1].level.id]
          const mid: Vec3 = [(from[0] + point[0]) / 2, TOP + 0.12, (from[2] + point[2]) / 2 - 0.25]
          return (
            <Line
              key={step}
              points={new THREE.QuadraticBezierCurve3(new THREE.Vector3(...from), new THREE.Vector3(...mid), new THREE.Vector3(...point)).getPoints(14)}
              color={walked ? '#fde047' : '#ffffff'}
              lineWidth={walked ? 4 : 3}
              dashed={!walked}
              dashSize={0.12}
              gapSize={0.16}
              transparent
              opacity={0.95}
            />
          )
        })}

        {levels.map(({ level, index: levelIndex }, position) => {
          const state = stateOf(levelIndex)
          const point = points[position]
          const boss = !!level.boss
          const padColor = state === 'locked' ? '#94a3b8' : boss ? '#ef4444' : state === 'done' ? palette.color : '#ffffff'
          return (
            <group key={level.id} position={point}>
              <mesh position={[0, -0.03, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[boss ? 0.5 : 0.4, boss ? 0.55 : 0.45, 0.12, 20]} />
                <meshStandardMaterial color={padColor} emissive={boss && state !== 'locked' ? '#ef4444' : '#000000'} emissiveIntensity={night ? 0.6 : 0.2} roughness={0.5} />
              </mesh>
              {boss && state !== 'locked' && state !== 'done' && motion && <Sparkles count={12} scale={[1.4, 1.2, 1.4]} position={[0, 0.5, 0]} size={4} speed={0.6} color="#f87171" />}
              <group ref={anchor(`pin-${level.id}`)} position={[0, 0.42, 0]} />
            </group>
          )
        })}

        {selectedIndex >= 0 && (
          <mesh ref={ring} position={[points[selectedIndex][0], TOP + 0.04, points[selectedIndex][2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.58, 0.68, 32, 1, 0, Math.PI * 1.6]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.95} side={THREE.DoubleSide} />
          </mesh>
        )}

        {currentIndex >= 0 && (
          <>
            <mesh ref={pulse} position={[points[currentIndex][0], TOP + 0.03, points[currentIndex][2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.45, 0.52, 32]} />
              <meshBasicMaterial color={palette.color} transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
            <Mascot position={[points[currentIndex][0] + 0.15, TOP, points[currentIndex][2] - 0.75]} motion={motion} />
            <group ref={anchor('here')} position={[points[currentIndex][0] + 0.15, TOP + 1.55, points[currentIndex][2] - 0.75]} />
          </>
        )}

        <group ref={anchor(`banner-${id}`)} position={[0, TOP + 2.3, -radius * 1.02]} />
      </group>
    </group>
  )
}

// ---- the world around the islands ---------------------------------------------------------

function Ocean({ night, motion }: { night: boolean; motion: boolean }) {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(220, 220, 90, 90)
    plane.rotateX(-Math.PI / 2)
    return plane
  }, [])
  const base = useMemo(() => Float32Array.from(geometry.attributes.position.array), [geometry])
  useFrame(({ clock }) => {
    if (!motion) return
    const t = clock.elapsedTime
    const position = geometry.attributes.position
    for (let index = 0; index < position.count; index++) {
      const x = base[index * 3]
      const z = base[index * 3 + 2]
      position.setY(index, Math.sin(x * 0.32 + t * 0.9) * 0.14 + Math.cos(z * 0.27 + t * 0.7) * 0.12)
    }
    position.needsUpdate = true
  })
  return (
    <mesh geometry={geometry} position={[0, SEA, 0]} receiveShadow>
      <meshStandardMaterial color={night ? '#0c2f52' : '#38bdf8'} emissive={night ? '#082848' : '#0c4a6e'} emissiveIntensity={night ? 0.35 : 0.08} roughness={0.35} metalness={0.15} flatShading />
    </mesh>
  )
}

function Clouds({ motion, night }: { motion: boolean; night: boolean }) {
  const group = useRef<THREE.Group>(null)
  const clouds = useMemo(() => Array.from({ length: 14 }, (_, index) => ({ x: (hash(index, 1, 2, 5) - 0.5) * 80, y: -4.4 - hash(index, 3, 1, 5) * 1.2, z: (hash(index, 2, 7, 5) - 0.5) * 56, s: 0.9 + hash(index, 9, 4, 5) * 0.9 })), [])
  useFrame((_, delta) => {
    if (!motion || !group.current) return
    for (const cloud of group.current.children) {
      cloud.position.x += delta * 0.6
      if (cloud.position.x > 44) cloud.position.x = -44
    }
  })
  return (
    <group ref={group}>
      {clouds.map((cloud, index) => (
        <group key={index} position={[cloud.x, cloud.y, cloud.z]} scale={cloud.s}>
          {[[-0.7, 0, 0, 0.7], [0, 0.25, 0, 0.95], [0.75, 0, 0.1, 0.65], [0.2, -0.1, 0.35, 0.6]].map(([x, y, z, size], part) => (
            <mesh key={part} position={[x, y, z]}>
              <icosahedronGeometry args={[size, 0]} />
              <meshStandardMaterial color={night ? '#3b4a72' : '#ffffff'} emissive={night ? '#000000' : '#ffffff'} emissiveIntensity={night ? 0 : 0.35} flatShading roughness={1} transparent opacity={night ? 0.5 : 0.82} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Bridge({ from, to, faded }: { from: Vec3; to: Vec3; faded: boolean }) {
  const start = new THREE.Vector3(...from)
  const end = new THREE.Vector3(...to)
  const direction = end.clone().sub(start)
  const length = direction.length()
  const angle = Math.atan2(direction.x, direction.z)
  const count = Math.max(4, Math.round(length / 0.34))
  const along = (t: number) => start.clone().lerp(end, t).add(new THREE.Vector3(0, -Math.sin(Math.PI * t) * 0.32, 0))
  const side = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle)).multiplyScalar(0.48)
  const rope = (sign: number) => Array.from({ length: 13 }, (_, step) => along(step / 12).add(side.clone().multiplyScalar(sign)).add(new THREE.Vector3(0, 0.32, 0)))
  return (
    <group>
      {Array.from({ length: count }, (_, step) => {
        const point = along((step + 0.5) / count)
        return (
          <mesh key={step} position={point} rotation={[0, angle, 0]} castShadow>
            <boxGeometry args={[0.9, 0.06, 0.24]} />
            <meshStandardMaterial color={step % 2 ? '#c98243' : '#b56d30'} flatShading transparent={faded} opacity={faded ? 0.55 : 1} />
          </mesh>
        )
      })}
      <Line points={rope(1)} color="#6b3a17" lineWidth={2} transparent opacity={faded ? 0.5 : 1} />
      <Line points={rope(-1)} color="#6b3a17" lineWidth={2} transparent opacity={faded ? 0.5 : 1} />
    </group>
  )
}

/** Moves every overlay label to where its anchor lands on screen; hides it behind the camera. */
function Projector({ anchors, marks }: { anchors: React.RefObject<Map<string, THREE.Object3D>>; marks: React.RefObject<Map<string, HTMLElement>> }) {
  const point = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    for (const [key, element] of marks.current) {
      const anchor = anchors.current.get(key)
      if (!anchor) {
        element.style.visibility = 'hidden'
        continue
      }
      anchor.getWorldPosition(point).project(camera)
      if (point.z > 1) {
        element.style.visibility = 'hidden'
        continue
      }
      element.style.visibility = 'visible'
      element.style.transform = `translate3d(${((point.x + 1) / 2) * size.width}px, ${((1 - point.y) / 2) * size.height}px, 0) translate(-50%, -50%)`
      element.style.zIndex = String(Math.round((1 - point.z) * 5000))
    }
  })
  return null
}

/** Pins and banners shrink as the camera pulls back, so a zoomed-out world stays readable. */
function PinScale({ host, controls }: { host: React.RefObject<HTMLDivElement | null>; controls: React.RefObject<Controls | null> }) {
  const last = useRef(0)
  useFrame(({ camera }) => {
    const target = controls.current?.target
    if (!host.current || !target) return
    const scale = THREE.MathUtils.clamp(30 / camera.position.distanceTo(target), 0.62, 1.15)
    if (Math.abs(scale - last.current) < 0.01) return
    last.current = scale
    host.current.style.setProperty('--pin-scale', scale.toFixed(3))
  })
  return null
}

/** Eases the camera towards a goal; any drag or zoom by the learner takes over immediately. */
function CameraRig({ goal, controls, motion }: { goal: { position: THREE.Vector3; target: THREE.Vector3; nonce: number } | null; controls: React.RefObject<Controls | null>; motion: boolean }) {
  const { camera, gl } = useThree()
  const active = useRef(false)

  useEffect(() => {
    if (!goal) return
    if (!motion && controls.current) {
      camera.position.copy(goal.position)
      controls.current.target.copy(goal.target)
      controls.current.update()
      return
    }
    active.current = true
  }, [goal, motion, camera, controls])

  useEffect(() => {
    const instance = controls.current
    if (!instance) return
    const stop = () => {
      active.current = false
    }
    instance.addEventListener('start', stop)
    // OrbitControls blocks page scrolling on touch screens; let vertical swipes scroll the page.
    const frame = requestAnimationFrame(() => {
      gl.domElement.style.touchAction = 'pan-y'
    })
    return () => {
      instance.removeEventListener('start', stop)
      cancelAnimationFrame(frame)
    }
  }, [controls, gl])

  useFrame((_, delta) => {
    const instance = controls.current
    if (!active.current || !goal || !instance) return
    const k = 1 - Math.pow(0.02, delta)
    camera.position.lerp(goal.position, k)
    instance.target.lerp(goal.target, k)
    instance.update()
    if (camera.position.distanceTo(goal.position) < 0.03 && instance.target.distanceTo(goal.target) < 0.03) active.current = false
  })
  return null
}

function Atmosphere({ night, motion, islandBounds }: { night: boolean; motion: boolean; islandBounds: number }) {
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const dirRef = useRef<THREE.DirectionalLight>(null)
  const { scene } = useThree()

  const daySky = useMemo(() => new THREE.Color('#dff3ff'), [])
  const dayGround = useMemo(() => new THREE.Color('#a3d977'), [])
  const daySun = useMemo(() => new THREE.Color('#fff1d6'), [])
  const dayFog = useMemo(() => new THREE.Color('#eaf7ff'), [])

  const nightSky = useMemo(() => new THREE.Color('#6b7cff'), [])
  const nightGround = useMemo(() => new THREE.Color('#1a1f3a'), [])
  const nightMoon = useMemo(() => new THREE.Color('#b8c7ff'), [])
  const nightFog = useMemo(() => new THREE.Color('#101833'), [])

  useEffect(() => {
    scene.fog = new THREE.Fog(night ? '#101833' : '#eaf7ff', islandBounds * 2.2, islandBounds * 5)
    return () => {
      scene.fog = null
    }
  }, [scene, night, islandBounds])

  useFrame((_, delta) => {
    const k = 1 - Math.exp(-5 * delta)
    const targetHemiSky = night ? nightSky : daySky
    const targetHemiGnd = night ? nightGround : dayGround
    const targetHemiInt = night ? 0.5 : 0.9

    const targetDirCol = night ? nightMoon : daySun
    const targetDirInt = night ? 0.7 : 1.3
    const targetFogCol = night ? nightFog : dayFog

    if (hemiRef.current) {
      hemiRef.current.color.lerp(targetHemiSky, k)
      hemiRef.current.groundColor.lerp(targetHemiGnd, k)
      hemiRef.current.intensity = THREE.MathUtils.lerp(hemiRef.current.intensity, targetHemiInt, k)
    }

    if (dirRef.current) {
      dirRef.current.color.lerp(targetDirCol, k)
      dirRef.current.intensity = THREE.MathUtils.lerp(dirRef.current.intensity, targetDirInt, k)
      const targetPos = night ? [14, 22, 10] : [-16, 24, 12]
      dirRef.current.position.x = THREE.MathUtils.lerp(dirRef.current.position.x, targetPos[0], k)
      dirRef.current.position.y = THREE.MathUtils.lerp(dirRef.current.position.y, targetPos[1], k)
      dirRef.current.position.z = THREE.MathUtils.lerp(dirRef.current.position.z, targetPos[2], k)
    }

    if (scene.fog && 'color' in scene.fog) {
      (scene.fog as THREE.Fog).color.lerp(targetFogCol, k)
    }
  })

  return (
    <>
      <hemisphereLight ref={hemiRef} args={['#dff3ff', '#a3d977', 0.9]} />
      <directionalLight
        ref={dirRef}
        position={[-16, 24, 12]}
        intensity={1.3}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-islandBounds}
        shadow-camera-right={islandBounds}
        shadow-camera-top={islandBounds}
        shadow-camera-bottom={-islandBounds}
        shadow-bias={-0.0005}
      />
      <ambientLight intensity={night ? 0.35 : 0.25} />
      {night && (
        <>
          <Stars radius={80} depth={40} count={1200} factor={3.5} fade speed={motion ? 0.5 : 0} />
          {motion && <Sparkles count={90} scale={[islandBounds * 1.4, 5, islandBounds * 1.2]} position={[0, 1.5, 0]} size={3.5} speed={0.35} color="#fde68a" opacity={0.85} />}
        </>
      )}
    </>
  )
}

// ---- the map -----------------------------------------------------------------------------

export interface WorldMap3DProps {
  journey: ProjectSummary
  done: Record<string, LevelProgress>
  stateOf: (index: number) => LevelState
  selectedId: string | null
  onSelect: (levelId: string) => void
  /** Called when a learner clicks an island (or its banner). */
  onSelectWorld: (worldId: string) => void
  /** Fly the camera to this world; the nonce repeats the flight for the same world. */
  focus: { worldId: string; nonce: number } | null
  night: boolean
  motion: boolean
}

export default function WorldMap3D({ journey, done, stateOf, selectedId, onSelect, onSelectWorld, focus, night, motion }: WorldMap3DProps) {
  const wrapper = useRef<HTMLDivElement>(null)
  const controls = useRef<Controls | null>(null)
  const anchors = useRef(new Map<string, THREE.Object3D>())
  const marks = useRef(new Map<string, HTMLElement>())
  const anchor: Anchor = (key) => (node) => {
    if (node) anchors.current.set(key, node)
    else anchors.current.delete(key)
  }
  const mark = (key: string) => (node: HTMLElement | null) => {
    if (node) marks.current.set(key, node)
    else marks.current.delete(key)
  }
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [visible, setVisible] = useState(true)
  const [tabHidden, setTabHidden] = useState(false)
  const [goal, setGoal] = useState<{ position: THREE.Vector3; target: THREE.Vector3; nonce: number } | null>(null)
  const coarse = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, [])
  const [dpr, setDpr] = useState(coarse ? 1.5 : 1.75)

  useEffect(() => {
    const handleVis = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', handleVis)
    return () => document.removeEventListener('visibilitychange', handleVis)
  }, [])

  useEffect(() => {
    const element = wrapper.current
    if (!element) return
    const resize = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    const seen = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    resize.observe(element)
    seen.observe(element)
    return () => {
      resize.disconnect()
      seen.disconnect()
    }
  }, [])

  const aspect = size.width / Math.max(1, size.height)
  const { positions, columns, rows } = useMemo(() => layout(journey.worlds.length, aspect >= 1.35 ? 3 : aspect >= 0.8 ? 2 : 1), [journey.worlds.length, aspect])

  const worlds = journey.worlds.map((world, worldIndex) => {
    const levels = journey.levels.map((level, index) => ({ level, index })).filter(({ level }) => level.world === world.id)
    return {
      world,
      worldIndex,
      levels,
      palette: worldThemes[world.theme],
      reached: levels.some(({ index }) => stateOf(index) !== 'locked'),
      complete: levels.length > 0 && levels.every(({ level }) => done[level.id]),
    }
  })

  const currentWorld = Math.max(0, worlds.findIndex(({ levels }) => levels.some(({ index }) => stateOf(index) === 'current')))
  const overview = useMemo(() => {
    const target = new THREE.Vector3(0, 0, 0.5)
    return { target, position: viewFrom(target, overviewDistance(columns, rows, aspect) * 0.98) }
  }, [columns, rows, aspect])
  const closeUp = (worldIndex: number) => {
    const [x, , z] = positions[worldIndex] ?? [0, 0, 0]
    const target = new THREE.Vector3(x, 0, z + 0.4)
    // Far enough back that the whole island fits across the screen.
    const fit = 4.6 / (Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * Math.max(aspect, 0.3))
    return { target, position: viewFrom(target, Math.max(13, Math.min(fit, 26))) }
  }
  // Wide screens start on the whole world; narrow ones zoom in on where the learner is.
  const home = () => (aspect >= 1.1 ? overview : closeUp(currentWorld))

  const started = useRef(false)
  useEffect(() => {
    if (started.current || size.width < 10) return
    started.current = true
    setGoal({ ...home(), nonce: Date.now() })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, after the first measurement
  }, [size.width])

  useEffect(() => {
    if (!focus) return
    const worldIndex = journey.worlds.findIndex((world) => world.id === focus.worldId)
    if (worldIndex >= 0) setGoal({ ...closeUp(worldIndex), nonce: focus.nonce })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fly only when a new focus is requested
  }, [focus])

  const zoom = (factor: number) => {
    const instance = controls.current
    if (!instance) return
    const camera = instance.object
    const target = instance.target.clone()
    const distance = THREE.MathUtils.clamp(camera.position.distanceTo(target) * factor, 6, 70)
    setGoal({ target, position: target.clone().add(camera.position.clone().sub(target).setLength(distance)), nonce: Date.now() })
  }

  // Scrolling the page over the map scrolls the page; ctrl/⌘ + scroll (and trackpad pinch) zooms.
  const onWheelCapture = (event: React.WheelEvent) => {
    if (controls.current) controls.current.enableZoom = event.ctrlKey || event.metaKey
  }

  const startAt = useMemo(() => viewFrom(new THREE.Vector3(0, 0, 0), 70).toArray() as Vec3, [])
  const sky = night ? '#081226' : '#bfe8ff'
  const islandBounds = Math.max(columns * SPACING_X, rows * SPACING_Z)

  return (
    <div
      ref={wrapper}
      className="relative h-[clamp(420px,62vh,620px)] w-full overflow-hidden rounded-3xl border border-(--cf-border) shadow-(--cf-shadow) transition-colors duration-500"
      style={{
        background: night
          ? 'linear-gradient(to bottom, #0b1026, #1b1f4a)'
          : 'linear-gradient(to bottom, #bfe9ff, #eaf7ff)',
      }}
      onWheelCapture={onWheelCapture}
    >
      <Canvas
        flat
        shadows={!coarse}
        dpr={dpr}
        frameloop={visible && !tabHidden ? 'always' : 'never'}
        camera={{ fov: FOV, position: motion ? startAt : (home().position.toArray() as Vec3), near: 0.5, far: 260 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(coarse ? 1.5 : 1.75)} />
        <Atmosphere night={night} motion={motion} islandBounds={islandBounds} />
        <Clouds motion={motion} night={night} />

        <Ocean night={night} motion={motion} />

        {positions.slice(1).map((position, index) => {
          const from = positions[index]
          const a = new THREE.Vector3(...from)
          const b = new THREE.Vector3(...position)
          const direction = b.clone().sub(a).normalize()
          const fromRadius = islandRadius(worlds[index].levels.length) * 0.9
          const toRadius = islandRadius(worlds[index + 1].levels.length) * 0.9
          return (
            <Bridge
              key={index}
              from={a.clone().add(direction.clone().multiplyScalar(fromRadius)).add(new THREE.Vector3(0, TOP - 0.05, 0)).toArray() as Vec3}
              to={b.clone().sub(direction.clone().multiplyScalar(toRadius)).add(new THREE.Vector3(0, TOP - 0.05, 0)).toArray() as Vec3}
              faded={!worlds[index + 1].reached}
            />
          )
        })}

        {worlds.map(({ world, worldIndex, levels, palette, reached }) => (
          <Island
            key={world.id}
            id={world.id}
            index={worldIndex}
            position={positions[worldIndex]}
            theme={world.theme}
            palette={palette}
            levels={levels}
            done={done}
            stateOf={stateOf}
            selectedId={selectedId}
            onIsland={() => onSelectWorld(world.id)}
            anchor={anchor}
            reached={reached}
            motion={motion}
            night={night}
          />
        ))}

        <OrbitControls
          ref={controls}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          enableZoom={false}
          minDistance={6}
          maxDistance={70}
          minPolarAngle={0.25}
          maxPolarAngle={1.2}
          screenSpacePanning={false}
          rotateSpeed={0.6}
          panSpeed={0.9}
        />
        <CameraRig goal={goal} controls={controls} motion={motion} />
        <PinScale host={wrapper} controls={controls} />
        <Projector anchors={anchors} marks={marks} />
      </Canvas>

      {/* Labels over the scene. Hidden until the projector has placed them. */}
      <div className="pointer-events-none absolute inset-0 isolate overflow-hidden">
        {worlds.map(({ world, worldIndex, levels, palette, reached, complete }) => (
          <Fragment key={world.id}>
            <div ref={mark(`banner-${world.id}`)} className="invisible absolute left-0 top-0 will-change-transform">
              <button
                type="button"
                onClick={() => onSelectWorld(world.id)}
                className={cn('pointer-events-auto flex origin-center items-center gap-1.5 whitespace-nowrap rounded-xl py-1 pl-1 pr-2.5 text-left text-white shadow-lg ring-1 ring-white/40 transition hover:brightness-110', !reached && 'opacity-75 saturate-50')}
                style={{ background: `linear-gradient(135deg, ${palette.color}, ${palette.deep})`, transform: 'scale(var(--pin-scale, 1))' }}
              >
                <span className="grid size-6 place-items-center rounded-lg bg-white/20 text-[10px] font-extrabold">{worldIndex + 1}</span>
                <span className="text-[12px] font-bold leading-tight">{world.title}</span>
                {complete ? <Check aria-label="World complete" className="size-3.5" /> : !reached ? <LockKeyhole aria-label="Locked" className="size-3" /> : null}
              </button>
            </div>
            {levels.map(({ level, index }) => (
              <div key={level.id} ref={mark(`pin-${level.id}`)} className="invisible absolute left-0 top-0 will-change-transform">
                <div className="pointer-events-auto">
                  <Pin level={level} number={index + 1} state={stateOf(index)} row={done[level.id]} selected={selectedId === level.id} palette={palette} onSelect={() => onSelect(level.id)} />
                </div>
              </div>
            ))}
          </Fragment>
        ))}
        {worlds.some(({ levels }) => levels.some(({ index }) => stateOf(index) === 'current')) && (
          <div ref={mark('here')} className="invisible absolute left-0 top-0 will-change-transform">
            <span className="block whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#1b2140] shadow-md" style={{ transform: 'scale(var(--pin-scale, 1))' }}>
              You are here
            </span>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
        <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {coarse ? 'Drag sideways to turn · pinch to zoom' : 'Drag to turn · right-drag to move · ctrl + scroll to zoom'}
        </span>
        <span className="pointer-events-auto flex gap-1.5">
          {[
            { label: 'Zoom in', icon: Plus, action: () => zoom(0.75) },
            { label: 'Zoom out', icon: Minus, action: () => zoom(1.33) },
            { label: 'Reset the view', icon: RotateCcw, action: () => setGoal({ ...home(), nonce: Date.now() }) },
          ].map(({ label, icon: Icon, action }) => (
            <button key={label} type="button" onClick={action} aria-label={label} title={label} className="grid size-9 place-items-center rounded-xl bg-white/90 text-[#1b2140] shadow-md transition hover:scale-105 dark:bg-[#111a31]/90 dark:text-white">
              <Icon className="size-4" />
            </button>
          ))}
        </span>
      </div>
    </div>
  )
}
