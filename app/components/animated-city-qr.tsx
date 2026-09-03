'use client'

/* Three.js se carga desde public/ para que la portada no dependa de un CDN. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, type MouseEvent } from 'react'

const QR_URL = 'https://apoyopls.org/'
const QR_ROWS = [
  '1111111001111100101111111',
  '1000001001110111001000001',
  '1011101010111010101011101',
  '1011101011011110001011101',
  '1011101011000010001011101',
  '1000001010000101101000001',
  '1111111010101010101111111',
  '0000000010000000000000000',
  '1011111001000111101111100',
  '0010110111001000110100010',
  '0111101110010111001101011',
  '1110000101101011101000001',
  '1101111111011100011010111',
  '1000110101100100100101010',
  '1000111101111111010111011',
  '1011010111010011010110001',
  '1011111100010001111110100',
  '0000000011001100100011000',
  '1111111000000110101010111',
  '1000001011001100100011011',
  '1011101011001011111110111',
  '1011101011100000111011111',
  '1011101011111000110001101',
  '1000001001110011100111001',
  '1111111011010000011111111',
]

type BuildingMotion = {
  cityHeight: number
  cityRotation: number
  cityWidth: number
  cityX: number
  cityZ: number
  phase: number
  qrX: number
  qrZ: number
}

async function loadThree(): Promise<any> {
  const modulePath = '/three.module.min.js'
  return import(/* webpackIgnore: true */ modulePath)
}

function disposeScene(scene: any) {
  scene.traverse((object: any) => {
    object.geometry?.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.filter(Boolean).forEach((material: any) => material.dispose())
  })
}

function seeded(index: number, salt = 0) {
  const value = Math.sin(index * 91.733 + salt * 37.719) * 43758.5453
  return value - Math.floor(value)
}

function addTree(THREE: any, parent: any, x: number, z: number, scale: number, materials: any[]) {
  const tree = new THREE.Group()
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x7a513d, roughness: 1, transparent: true })
  const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x55a96a, roughness: 0.95, flatShading: true, transparent: true })
  materials.push(trunkMaterial, leavesMaterial)

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.58, 6), trunkMaterial)
  trunk.position.y = 0.29
  trunk.castShadow = true
  tree.add(trunk)

  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), leavesMaterial)
  leaves.position.y = 0.75
  leaves.castShadow = true
  tree.add(leaves)
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), leavesMaterial)
  crown.position.set(0.1, 1.02, 0)
  crown.castShadow = true
  tree.add(crown)

  tree.position.set(x, 0.14, z)
  tree.scale.setScalar(scale)
  tree.userData.phase = x + z
  parent.add(tree)
  return tree
}

function addVehicle(THREE: any, parent: any, color: number, large: boolean, materials: any[]) {
  const vehicle = new THREE.Group()
  const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.65, transparent: true })
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x173c3b, roughness: 0.25, metalness: 0.15, transparent: true })
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x132d2b, roughness: 0.9, transparent: true })
  materials.push(bodyMaterial, glassMaterial, wheelMaterial)

  const width = large ? 1.35 : 0.78
  const depth = large ? 0.56 : 0.46
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, large ? 0.38 : 0.27, depth), bodyMaterial)
  body.position.y = 0.28
  body.castShadow = true
  vehicle.add(body)

  const glass = new THREE.Mesh(new THREE.BoxGeometry(width * 0.62, 0.2, depth * 0.92), glassMaterial)
  glass.position.y = large ? 0.47 : 0.4
  vehicle.add(glass)

  for (const x of [-width * 0.3, width * 0.3]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.055, 10), wheelMaterial)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(x, 0.13, depth * 0.46)
    vehicle.add(wheel)
  }

  parent.add(vehicle)
  return vehicle
}

function easeInOut(value: number) {
  return value * value * (3 - 2 * value)
}

function createQrPng() {
  const moduleSize = 18
  const quietZone = 4
  const size = (QR_ROWS.length + quietZone * 2) * moduleSize
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('No fue posible preparar la imagen del QR.'))

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, size, size)
  context.fillStyle = '#075c3b'
  QR_ROWS.forEach((row, rowIndex) => {
    Array.from(row).forEach((module, columnIndex) => {
      if (module === '1') context.fillRect((columnIndex + quietZone) * moduleSize, (rowIndex + quietZone) * moduleSize, moduleSize, moduleSize)
    })
  })

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No fue posible crear el PNG del QR.')), 'image/png')
  })
}

async function shareOrDownloadQr(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await createQrPng()
  const file = new File([blob], 'qr-apoyopls.png', { type: 'image/png' })
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.matchMedia('(pointer: coarse)').matches)
  let canShareFile = false
  if (isMobile && typeof navigator.share === 'function') {
    try {
      canShareFile = typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] })
    } catch {
      canShareFile = false
    }
  }

  if (isMobile && canShareFile) {
    try {
      await navigator.share({ title: 'QR de PLs al llamado', text: QR_URL, files: [file] })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = 'qr-apoyopls.png'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  return 'downloaded'
}

export function AnimatedCityQr() {
  const canvasHost = useRef<HTMLDivElement>(null)
  const qrTarget = useRef(0)
  const [showQr, setShowQr] = useState(false)
  const [qrActionState, setQrActionState] = useState<'idle' | 'busy' | 'success' | 'error'>('idle')

  const toggleScene = () => {
    const next = !showQr
    qrTarget.current = next ? 1 : 0
    setShowQr(next)
    setQrActionState('idle')
  }

  const handleQrAction = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (qrActionState === 'busy') return
    setQrActionState('busy')
    try {
      const result = await shareOrDownloadQr()
      if (result === 'cancelled') setQrActionState('idle')
      else setQrActionState('success')
    } catch (error) {
      console.error('No fue posible descargar o compartir el QR.', error)
      setQrActionState('error')
    }
  }

  useEffect(() => {
    let stopped = false
    let animationFrame = 0
    let renderer: any
    let scene: any
    let resize: (() => void) | undefined

    const host = canvasHost.current
    if (!host) return

    const startScene = (THREE: any) => {
      if (stopped) return

      scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf7f3e8)

      const camera = new THREE.OrthographicCamera(-7, 7, 7, -7, 0.1, 80)
      const isoPosition = new THREE.Vector3(10.6, 9.6, 11.8)
      const qrPosition = new THREE.Vector3(0, 15.5, 0.015)
      const isoUp = new THREE.Vector3(0, 1, 0)
      const qrUp = new THREE.Vector3(0, 0, -1)
      const cameraTarget = new THREE.Vector3()

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.domElement.className = 'three-city-canvas-element'
      renderer.domElement.setAttribute('aria-hidden', 'true')
      host.replaceChildren(renderer.domElement)
      host.dataset.threeReady = 'true'

      const hemisphere = new THREE.HemisphereLight(0xfff7df, 0x315f52, 2.35)
      scene.add(hemisphere)
      const sun = new THREE.DirectionalLight(0xffe7bb, 3.1)
      sun.position.set(-7, 13, 9)
      sun.castShadow = true
      sun.shadow.mapSize.set(1024, 1024)
      sun.shadow.camera.left = -11
      sun.shadow.camera.right = 11
      sun.shadow.camera.top = 11
      sun.shadow.camera.bottom = -11
      scene.add(sun)

      const world = new THREE.Group()
      scene.add(world)

      const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xe5ddcf, roughness: 1 })
      const base = new THREE.Mesh(new THREE.BoxGeometry(11.55, 0.25, 11.55), baseMaterial)
      base.position.y = -0.125
      base.receiveShadow = true
      world.add(base)

      const cell = 0.34
      const qrSize = QR_ROWS.length
      const buildingMotions: BuildingMotion[] = []
      QR_ROWS.forEach((row, rowIndex) => {
        Array.from(row).forEach((module, columnIndex) => {
          if (module !== '1') return
          const index = buildingMotions.length
          const qrX = (columnIndex - (qrSize - 1) / 2) * cell
          const qrZ = (rowIndex - (qrSize - 1) / 2) * cell
          const distance = Math.hypot(qrX, qrZ) / 5.8
          const skyline = Math.max(0, 1 - distance)
          buildingMotions.push({
            cityHeight: 0.42 + seeded(index, 1) * 1.75 + skyline * (1.35 + seeded(index, 2) * 2.5),
            cityRotation: (seeded(index, 3) - 0.5) * 0.2,
            cityWidth: 0.24 + seeded(index, 4) * 0.075,
            cityX: qrX * 0.76 + (seeded(index, 5) - 0.5) * 0.38,
            cityZ: qrZ * 0.76 + (seeded(index, 6) - 0.5) * 0.38,
            phase: seeded(index, 7) * Math.PI * 2,
            qrX,
            qrZ,
          })
        })
      })

      const buildingGeometry = new THREE.BoxGeometry(1, 1, 1)
      const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0.025, transparent: true })
      const buildings = new THREE.InstancedMesh(buildingGeometry, buildingMaterial, buildingMotions.length)
      buildings.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      buildings.castShadow = true
      buildings.receiveShadow = true
      const palette = [0x0d613e, 0x176f48, 0x247c53, 0x2e895b, 0x397651]
      buildingMotions.forEach((_, index) => buildings.setColorAt(index, new THREE.Color(palette[index % palette.length])))
      if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true
      world.add(buildings)

      const qrTileMaterial = new THREE.MeshBasicMaterial({ color: 0x075c3b, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
      const qrTiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(cell * 1.025, cell * 1.025), qrTileMaterial, buildingMotions.length)
      const qrTileDummy = new THREE.Object3D()
      buildingMotions.forEach((motion, index) => {
        qrTileDummy.position.set(motion.qrX, 0.14, motion.qrZ)
        qrTileDummy.rotation.set(-Math.PI / 2, 0, 0)
        qrTileDummy.updateMatrix()
        qrTiles.setMatrixAt(index, qrTileDummy.matrix)
      })
      qrTiles.instanceMatrix.needsUpdate = true
      qrTiles.visible = false
      world.add(qrTiles)

      const decorMaterials: any[] = []
      const cityDecor = new THREE.Group()
      world.add(cityDecor)

      const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x244b49, roughness: 1, transparent: true })
      const roadLineMaterial = new THREE.MeshBasicMaterial({ color: 0xf6d85e, transparent: true })
      decorMaterials.push(roadMaterial, roadLineMaterial)
      const road = new THREE.Mesh(new THREE.BoxGeometry(10.9, 0.045, 0.82), roadMaterial)
      road.position.set(0, 0.145, 4.72)
      road.receiveShadow = true
      cityDecor.add(road)
      for (let x = -4.7; x <= 4.7; x += 1.35) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.67, 0.012, 0.055), roadLineMaterial)
        line.position.set(x, 0.172, 4.72)
        cityDecor.add(line)
      }

      const trees = [
        addTree(THREE, cityDecor, -4.75, -4.35, 1.05, decorMaterials),
        addTree(THREE, cityDecor, -4.2, 4.15, 0.9, decorMaterials),
        addTree(THREE, cityDecor, 4.65, -4.2, 1.12, decorMaterials),
        addTree(THREE, cityDecor, 4.3, 3.95, 0.83, decorMaterials),
      ]

      const bus = addVehicle(THREE, cityDecor, 0xefd94b, true, decorMaterials)
      bus.position.set(-5.5, 0.14, 4.72)
      const car = addVehicle(THREE, cityDecor, 0x5ed19a, false, decorMaterials)
      car.position.set(4.8, 0.14, 4.72)

      const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0xffed8b,
        emissive: 0xffca57,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.92,
        roughness: 0.4,
      })
      decorMaterials.push(windowMaterial)
      const litBuildings = buildingMotions.filter((motion, index) => motion.cityHeight > 1.65 && index % 3 === 0)
      const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.16, 0.025), windowMaterial, litBuildings.length)
      const windowDummy = new THREE.Object3D()
      litBuildings.forEach((motion, index) => {
        windowDummy.position.set(motion.cityX, Math.min(motion.cityHeight * 0.58, 1.4), motion.cityZ + motion.cityWidth / 2 + 0.018)
        windowDummy.updateMatrix()
        windows.setMatrixAt(index, windowDummy.matrix)
      })
      windows.instanceMatrix.needsUpdate = true
      cityDecor.add(windows)

      const resizeScene = () => {
        const rect = host.getBoundingClientRect()
        const width = Math.max(1, rect.width)
        const height = Math.max(1, rect.height)
        renderer.setSize(width, height, false)
      }
      resize = resizeScene
      resizeScene()
      window.addEventListener('resize', resizeScene)

      const clock = new THREE.Clock()
      const dummy = new THREE.Object3D()
      const cityBaseColor = new THREE.Color(0xe5ddcf)
      const qrBaseColor = new THREE.Color(0xfffdf7)
      const currentBaseColor = new THREE.Color()
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      let progress = qrTarget.current

      const animate = () => {
        if (stopped) return
        const delta = Math.min(clock.getDelta(), 0.05)
        const time = clock.elapsedTime
        const target = qrTarget.current
        if (prefersReducedMotion) progress = target
        else if (progress !== target) progress = Math.max(0, Math.min(1, progress + Math.sign(target - progress) * delta / 1.25))

        const transition = easeInOut(progress)
        const cityAmount = 1 - transition

        buildingMotions.forEach((motion, index) => {
          const idle = prefersReducedMotion ? 0 : Math.sin(time * 0.8 + motion.phase) * 0.025 * cityAmount
          const height = THREE.MathUtils.lerp(motion.cityHeight + idle, 0.13, transition)
          const width = THREE.MathUtils.lerp(motion.cityWidth, cell * 0.94, transition)
          dummy.position.set(
            THREE.MathUtils.lerp(motion.cityX, motion.qrX, transition),
            height / 2 + 0.13,
            THREE.MathUtils.lerp(motion.cityZ, motion.qrZ, transition),
          )
          dummy.rotation.set(0, motion.cityRotation * cityAmount, 0)
          dummy.scale.set(width, height, width)
          dummy.updateMatrix()
          buildings.setMatrixAt(index, dummy.matrix)
        })
        buildings.instanceMatrix.needsUpdate = true

        const qrTileOpacity = Math.max(0, Math.min(1, (transition - 0.7) / 0.24))
        qrTileMaterial.opacity = qrTileOpacity
        qrTiles.visible = qrTileOpacity > 0.01
        buildingMaterial.opacity = 1 - Math.max(0, Math.min(1, (transition - 0.74) / 0.24))
        buildingMaterial.depthWrite = buildingMaterial.opacity > 0.4
        buildings.visible = buildingMaterial.opacity > 0.01

        const decorOpacity = Math.max(0, 1 - transition * 1.45)
        decorMaterials.forEach((material) => {
          material.opacity = decorOpacity
          material.depthWrite = decorOpacity > 0.35
        })
        cityDecor.visible = decorOpacity > 0.01
        trees.forEach((tree) => { tree.rotation.z = (prefersReducedMotion ? 0 : Math.sin(time * 0.85 + tree.userData.phase) * 0.025) * cityAmount })
        bus.position.x = -5.5 + ((time * 0.72) % 11)
        car.position.x = 4.8 - ((time * 1.05) % 10.5)
        windowMaterial.emissiveIntensity = 0.9 + (prefersReducedMotion ? 0 : (Math.sin(time * 2.1) + 1) * 0.35)

        camera.position.lerpVectors(isoPosition, qrPosition, transition)
        camera.up.lerpVectors(isoUp, qrUp, transition).normalize()
        cameraTarget.set(0, THREE.MathUtils.lerp(1.05, 0, transition), THREE.MathUtils.lerp(0, 0.72, transition))
        camera.lookAt(cameraTarget)

        const rect = host.getBoundingClientRect()
        const aspect = Math.max(0.2, rect.width / Math.max(1, rect.height))
        const verticalSize = THREE.MathUtils.lerp(11.9, 13.25, transition)
        camera.left = -verticalSize * aspect / 2
        camera.right = verticalSize * aspect / 2
        camera.top = verticalSize / 2
        camera.bottom = -verticalSize / 2
        camera.updateProjectionMatrix()

        currentBaseColor.lerpColors(cityBaseColor, qrBaseColor, transition)
        baseMaterial.color.copy(currentBaseColor)
        renderer.shadowMap.enabled = transition < 0.93
        renderer.render(scene, camera)
        animationFrame = window.requestAnimationFrame(animate)
      }
      animate()
    }

    loadThree().then(startScene).catch((error: unknown) => {
      if (!stopped) {
        host.dataset.threeError = error instanceof Error ? error.message : 'No fue posible cargar la escena 3D.'
        console.error('No fue posible renderizar la ciudad QR.', error)
      }
    })

    return () => {
      stopped = true
      window.cancelAnimationFrame(animationFrame)
      if (resize) window.removeEventListener('resize', resize)
      if (renderer) renderer.dispose()
      if (scene) disposeScene(scene)
      delete host.dataset.threeReady
      delete host.dataset.threeError
      host.replaceChildren()
    }
  }, [])

  return (
    <div
      className={`hero-art animated-city-card${showQr ? ' is-qr' : ''}`}
    >
      <button
        type="button"
        className="city-scene-toggle"
        onClick={toggleScene}
        aria-pressed={showQr}
        aria-label={showQr ? 'Volver a mostrar la ciudad en tres dimensiones' : `Convertir la ciudad en un código QR para ${QR_URL}`}
      >
        <div ref={canvasHost} className="three-city-canvas" aria-hidden="true" />
      </button>
      <div className="city-card-top"><span className="city-live-dot" />{showQr ? 'QR listo · apoyopls.org' : 'Ciudad 3D interactiva'}</div>
      <div className="city-card-bottom">
        {showQr ? (
          <button
            type="button"
            className={`qr-action-button qr-action-${qrActionState}`}
            onClick={handleQrAction}
            disabled={qrActionState === 'busy'}
            aria-label="Descargar o compartir la imagen del código QR"
          >
            <span className="qr-action-text">
              <strong>{qrActionState === 'busy' ? 'Preparando QR…' : qrActionState === 'success' ? 'QR listo' : qrActionState === 'error' ? 'Intenta de nuevo' : <><span className="qr-action-download">Descargar QR</span><span className="qr-action-share">Compartir QR</span></>}</strong>
              <small>{QR_URL}</small>
            </span>
            <span className="qr-action-icon" aria-hidden="true">{qrActionState === 'busy' ? '…' : qrActionState === 'success' ? '✓' : '⇩'}</span>
          </button>
        ) : (
          <>
            <span><strong>Toca la ciudad</strong>Los edificios formarán nuestro QR.</span>
            <span className="city-card-arrow" aria-hidden="true">⌗</span>
          </>
        )}
      </div>
    </div>
  )
}
