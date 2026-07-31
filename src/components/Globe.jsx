import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const NIGHT_TEXTURE = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg'

const COORDS = {
  AD: [42.5, 1.5],    AE: [23.4, 53.8],  AF: [33.9, 67.7],  AG: [17.1, -61.8],
  AL: [41.2, 20.2],   AM: [40.1, 45.0],  AO: [-11.2, 17.9], AR: [-38.4, -63.6],
  AT: [47.5, 14.5],   AU: [-25.3, 133.8],AZ: [40.1, 47.6],  BA: [44.2, 17.9],
  BB: [13.2, -59.6],  BD: [23.7, 90.4],  BE: [50.8, 4.5],   BF: [12.4, -1.6],
  BG: [42.7, 25.5],   BH: [26.0, 50.5],  BJ: [9.3, 2.3],    BN: [4.5, 114.7],
  BO: [-16.3, -63.6], BR: [-14.2, -51.9],BS: [24.3, -76.0], BT: [27.5, 90.4],
  BW: [-22.3, 24.7],  BY: [53.7, 27.9],  BZ: [17.2, -88.5], CA: [56.1, -106.3],
  CD: [-4.0, 21.8],   CF: [6.6, 20.9],   CG: [-0.2, 15.8],  CH: [46.8, 8.2],
  CI: [7.5, -5.5],    CL: [-35.7, -71.5],CM: [3.8, 11.5],   CO: [4.6, -74.1],
  CR: [9.7, -83.8],   CU: [21.5, -79.5], CV: [16.0, -24.0], CY: [35.1, 33.4],
  CZ: [49.8, 15.5],   DE: [51.2, 10.5],  DJ: [11.8, 42.6],  DK: [56.3, 9.5],
  DO: [18.7, -70.2],  DZ: [28.0, 1.7],   EC: [-1.8, -78.2], EE: [58.6, 25.0],
  EG: [26.8, 30.8],   ER: [15.2, 39.8],  ES: [40.5, -3.7],  ET: [9.1, 40.5],
  FI: [61.9, 25.7],   FJ: [-16.6, 179.4],FR: [46.2, 2.2],   GA: [-0.8, 11.6],
  GB: [55.4, -3.4],   GH: [7.9, -1.0],   GM: [13.4, -15.3], GN: [11.0, -10.9],
  GQ: [1.7, 10.3],    GR: [39.1, 21.8],  GT: [15.8, -90.2], GW: [11.8, -15.2],
  GY: [4.9, -58.9],   HN: [15.2, -86.2], HR: [45.1, 15.2],  HT: [18.9, -72.3],
  HU: [47.2, 19.5],   ID: [-0.8, 113.9], IE: [53.4, -8.2],  IL: [31.5, 34.8],
  IN: [20.6, 78.9],   IQ: [33.2, 43.7],  IS: [65.0, -18.5], IT: [41.9, 12.6],
  JM: [18.1, -77.3],  JO: [31.2, 36.5],  JP: [36.2, 138.3], KE: [-0.0, 37.9],
  KG: [41.2, 74.8],   KH: [12.6, 104.9], KR: [35.9, 127.8], KW: [29.3, 47.5],
  KZ: [48.0, 66.9],   LA: [17.9, 102.5], LB: [33.9, 35.5],  LI: [47.1, 9.6],
  LK: [7.9, 80.8],    LR: [6.4, -9.4],   LS: [-29.6, 28.2], LT: [55.2, 23.9],
  LU: [49.8, 6.1],    LV: [56.9, 24.6],  LY: [26.3, 17.2],  MA: [31.8, -7.1],
  MD: [47.4, 28.4],   ME: [42.7, 19.4],  MG: [-18.8, 46.9], MK: [41.6, 21.7],
  ML: [17.6, -2.0],   MM: [21.9, 95.9],  MN: [46.9, 103.8], MO: [22.2, 113.5],
  MR: [21.0, -10.9],  MT: [35.9, 14.4],  MU: [-20.3, 57.6], MV: [3.2, 73.2],
  MW: [-13.3, 34.3],  MX: [23.6, -102.6],MY: [4.2, 108.0],  MZ: [-18.7, 35.5],
  NA: [-22.9, 18.5],  NE: [17.6, 8.1],   NG: [9.1, 8.7],    NI: [12.9, -85.2],
  NL: [52.1, 5.3],    NO: [60.5, 8.5],   NP: [28.4, 84.1],  NZ: [-40.9, 174.9],
  OM: [21.5, 55.9],   PA: [8.5, -80.8],  PE: [-9.2, -75.0], PG: [-6.3, 143.9],
  PH: [12.9, 121.8],  PK: [30.4, 69.3],  PL: [51.9, 19.1],  PT: [39.4, -8.2],
  PY: [-23.4, -58.4], QA: [25.4, 51.2],  RO: [45.9, 24.9],  RS: [44.0, 21.0],
  RU: [61.5, 105.3],  RW: [-1.9, 29.9],  SA: [23.9, 45.1],  SD: [12.9, 30.2],
  SE: [60.1, 18.6],   SG: [1.4, 103.8],  SI: [46.2, 14.8],  SK: [48.7, 19.7],
  SL: [8.5, -11.8],   SN: [14.5, -14.5], SO: [6.1, 46.2],   SR: [3.9, -56.0],
  SS: [6.9, 31.3],    SV: [13.8, -88.9], SZ: [-26.5, 31.5], TD: [15.5, 18.7],
  TG: [8.6, 0.8],     TH: [15.9, 100.9], TJ: [38.9, 71.3],  TM: [38.9, 59.6],
  TN: [33.9, 9.6],    TR: [38.9, 35.2],  TT: [10.7, -61.2], TW: [23.7, 121.0],
  TZ: [-6.4, 34.9],   UA: [48.4, 31.2],  UG: [1.4, 32.3],   US: [37.1, -95.7],
  UY: [-32.5, -55.8], UZ: [41.4, 64.6],  VE: [6.4, -66.6],  VN: [14.1, 108.3],
  YE: [15.6, 48.5],   ZA: [-30.6, 22.9], ZM: [-13.1, 27.8], ZW: [-20.0, 30.0],
}

function latLonToVec3(lat, lon, r = 1) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  )
}

// Rim-glow shader: makes edges of the atmosphere sphere glow blue, center transparent
const rimVert = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

function rimFrag(r, g, b, power, intensity) {
  return `
    varying vec3 vNormal;
    varying vec3 vViewPos;
    void main() {
      float rim = 1.0 - abs(dot(normalize(vNormal), normalize(-vViewPos)));
      float glow = pow(rim, ${power.toFixed(1)}) * ${intensity.toFixed(1)};
      gl_FragColor = vec4(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}, glow);
    }
  `
}

export default function Globe({ freeCountries = [], subCountries = [] }) {
  const mountRef = useRef(null)
  const dotsRef = useRef({})

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Fall back to 440 in case the element hasn't fully laid out yet
    const W = mount.clientWidth || 440
    const H = mount.clientHeight || 440

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    // FOV=50, z=3.2 → visible half-height at globe center = tan(25°)*3.2 = 1.49
    // This comfortably fits the outer atmosphere at r=1.18 with room to spare
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100)
    camera.position.z = 3.2

    // No ambient — city lights via emissiveMap are the sole light source
    scene.add(new THREE.AmbientLight(0xffffff, 0.0))

    const loader = new THREE.TextureLoader()
    const nightTex = loader.load(NIGHT_TEXTURE)

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 72, 72),
      new THREE.MeshStandardMaterial({
        color: 0x000000,       // pure black base — oceans stay dark
        emissiveMap: nightTex, // city lights glow gold/white from within
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.6, // dark enough that only dense cities pop
        roughness: 1,
        metalness: 0,
      })
    )
    scene.add(globe)

    // Inner rim — tight electric-blue atmospheric edge
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: rimVert,
        fragmentShader: rimFrag(0.2, 0.5, 1.0, 5.0, 0.55),
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        transparent: true,
        depthWrite: false,
      })
    ))

    // Outer halo — wider, much softer
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: rimVert,
        fragmentShader: rimFrag(0.08, 0.25, 0.9, 8.0, 0.28),
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        transparent: true,
        depthWrite: false,
      })
    ))

    // Country dots (invisible by default, light up when a movie is selected)
    const dotGeo = new THREE.SphereGeometry(0.013, 7, 7)
    Object.entries(COORDS).forEach(([code, [lat, lon]]) => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xa78bfa,
        transparent: true,
        opacity: 0,
      })
      const dot = new THREE.Mesh(dotGeo, mat)
      dot.position.copy(latLonToVec3(lat, lon, 1.022))
      globe.add(dot) // child of globe so it rotates with it
      dotsRef.current[code] = dot
    })

    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      globe.rotation.y += 0.0016
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      nightTex.dispose()
      renderer.dispose()
    }
  }, [])

  // Update dot visibility and color when streaming data changes
  useEffect(() => {
    const freeSet = new Set(freeCountries)
    const subSet = new Set(subCountries)
    const hasData = freeCountries.length > 0 || subCountries.length > 0

    Object.entries(dotsRef.current).forEach(([code, dot]) => {
      if (!hasData) {
        dot.material.opacity = 0
        dot.scale.setScalar(1)
      } else if (freeSet.has(code)) {
        dot.material.color.set(0xd8b4fe) // soft purple
        dot.material.opacity = 1
        dot.scale.setScalar(2.6)
      } else if (subSet.has(code)) {
        dot.material.color.set(0x7dd3fc) // soft blue
        dot.material.opacity = 0.85
        dot.scale.setScalar(1.5)
      } else {
        dot.material.opacity = 0
        dot.scale.setScalar(1)
      }
      dot.material.needsUpdate = true
    })
  }, [freeCountries, subCountries])

  return <div ref={mountRef} className="globe-mount" />
}
