import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Sparkles,
  Compass,
  Layers,
  Eye,
  Maximize2,
  Info,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

export const Spacecraft3DView: React.FC = () => {
  const { telemetry } = useTelemetry();
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);

  const orientationRef = useRef({
    pitch: telemetry.tilt.value.pitch,
    roll: telemetry.tilt.value.roll,
    yaw: telemetry.tilt.value.yaw,
  });

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  useEffect(() => {
    orientationRef.current = {
      pitch: telemetry.tilt.value.pitch,
      roll: telemetry.tilt.value.roll,
      yaw: telemetry.tilt.value.yaw,
    };
  }, [telemetry.tilt.value]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    const scene = new THREE.Scene();
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 320;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(3.2, 2.0, 3.6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.5);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xfff5e6, 2.2);
    sun.position.set(5, 7, 4);
    scene.add(sun);

    const earthAlbedo = new THREE.DirectionalLight(0x0284c7, 0.8);
    earthAlbedo.position.set(-4, -6, -3);
    scene.add(earthAlbedo);

    // Stars
    const starCount = isHeadless ? 40 : 180;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 50;
      starPos[i + 1] = (Math.random() - 0.5) * 50;
      starPos[i + 2] = (Math.random() - 0.5) * 50;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // CubeSat 3U Model Group
    const satGroup = new THREE.Group();
    scene.add(satGroup);

    // 1. Chassis (Gold MLI Insulation)
    const bodyGeo = new THREE.BoxGeometry(0.85, 1.8, 0.85);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.8,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    satGroup.add(body);

    // Aluminum Structure Rails
    const railWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.BoxGeometry(0.88, 1.84, 0.88)),
      new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.6 })
    );
    satGroup.add(railWire);

    // 2. Solar Wings (Left & Right)
    const panelGeo = new THREE.BoxGeometry(1.4, 1.0, 0.04);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.85,
    });

    const leftWing = new THREE.Mesh(panelGeo, panelMat);
    leftWing.position.set(-1.18, 0, 0);
    satGroup.add(leftWing);

    const rightWing = new THREE.Mesh(panelGeo, panelMat);
    rightWing.position.set(1.18, 0, 0);
    satGroup.add(rightWing);

    // Solar cells wireframe
    const cellWireMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
    const cellWireL = new THREE.LineSegments(new THREE.WireframeGeometry(panelGeo), cellWireMat);
    cellWireL.position.copy(leftWing.position);
    satGroup.add(cellWireL);

    const cellWireR = new THREE.LineSegments(new THREE.WireframeGeometry(panelGeo), cellWireMat);
    cellWireR.position.copy(rightWing.position);
    satGroup.add(cellWireR);

    // 3. OV7670 Camera Lens Port
    const camRingGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.12, 24);
    const camRingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 });
    const camRing = new THREE.Mesh(camRingGeo, camRingMat);
    camRing.position.set(0, 0.95, 0);
    satGroup.add(camRing);

    // 4. HC-SR04 Transducer Cylinders (Ultrasonic Proximity forward face)
    const usGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16);
    const usMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const us1 = new THREE.Mesh(usGeo, usMat);
    us1.rotation.x = Math.PI / 2;
    us1.position.set(-0.2, 0.3, 0.46);
    satGroup.add(us1);

    const us2 = new THREE.Mesh(usGeo, usMat);
    us2.rotation.x = Math.PI / 2;
    us2.position.set(0.2, 0.3, 0.46);
    satGroup.add(us2);

    // 5. Antennas
    const antPoints = [
      new THREE.Vector3(0, -0.9, 0),
      new THREE.Vector3(0, -1.6, 0.3),
      new THREE.Vector3(0, -0.9, 0),
      new THREE.Vector3(0.5, -1.5, -0.3),
    ];
    const antGeo = new THREE.BufferGeometry().setFromPoints(antPoints);
    const antLine = new THREE.Line(antGeo, new THREE.LineBasicMaterial({ color: 0xffffff }));
    satGroup.add(antLine);

    // Mouse Drag Interaction
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let dragRotX = 0;
    let dragRotY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      dragRotY += dx * 0.01;
      dragRotX += dy * 0.01;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      starField.rotation.y = elapsed * 0.01;

      const p = THREE.MathUtils.degToRad(orientationRef.current.pitch);
      const r = THREE.MathUtils.degToRad(orientationRef.current.roll);
      const y = THREE.MathUtils.degToRad(orientationRef.current.yaw);

      const autoY = autoRotateRef.current && !isDragging ? elapsed * 0.2 : 0;

      satGroup.rotation.x = THREE.MathUtils.lerp(satGroup.rotation.x, p + dragRotX, 0.1);
      satGroup.rotation.y = THREE.MathUtils.lerp(satGroup.rotation.y, y + dragRotY + autoY, 0.08);
      satGroup.rotation.z = THREE.MathUtils.lerp(satGroup.rotation.z, r, 0.1);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
      bodyGeo.dispose();
      bodyMat.dispose();
      panelGeo.dispose();
      panelMat.dispose();
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
    };
  }, []);

  const sensors = [
    {
      id: 'MPU6050',
      label: 'MPU6050 6-DoF IMU',
      loc: 'Internal Avionics Core',
      desc: '3-axis gyroscope & 3-axis accelerometer measuring attitude tilt angles.',
    },
    {
      id: 'INA219',
      label: 'INA219 Power Shunt',
      loc: 'Power Management Bus',
      desc: 'Monitors high-side voltage (0-26V) and current draw (mA) on 2S bus.',
    },
    {
      id: 'HCSR04',
      label: 'HC-SR04 Ultrasonic',
      loc: 'Nadir/Forward Face',
      desc: '40 kHz sonar transducers measuring obstacle proximity (2-400 cm).',
    },
    {
      id: 'LDR',
      label: 'LDR Cadmium-Sulfide',
      loc: 'Solar Panel Facet',
      desc: 'Photo-resistor measuring solar irradiance and detecting orbital eclipse.',
    },
    {
      id: 'OV7670',
      label: 'OV7670 Camera',
      loc: 'Top Aperture',
      desc: 'VGA camera connected through ESP32-S3 for scientific observations.',
    },
    {
      id: 'SERVO',
      label: 'SG90 Micro Servo',
      loc: 'Solar Array Wing Hinge',
      desc: 'Actuates solar array angle (0-180°) for optimal solar tracking.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full space-y-4">
      {/* Header */}
      <div className="bg-slate-950/70 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-wide">
              3D SPACECRAFT ATTITUDE & SUBSYSTEMS
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Interactive CubeSat 3U engineering model reflecting live MPU6050 telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {telemetry.isDemoMode ? (
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SIMULATED ATTITUDE</span>
            </span>
          ) : (
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              LIVE MPU6050 ORIENTATION
            </span>
          )}

          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-xl border font-mono text-xs transition-colors ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {autoRotate ? 'AUTO-ORBIT: ON' : 'AUTO-ORBIT: PAUSED'}
          </button>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div className="relative w-full h-[360px] sm:h-[440px] rounded-2xl bg-gradient-to-b from-slate-950 via-[#070e20] to-slate-950 border border-cyan-500/30 overflow-hidden shadow-2xl">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Live Euler Angles HUD Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono bg-slate-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-cyan-500/30">
          <div className="flex space-x-4">
            <span>
              PITCH: <strong className="text-white">{telemetry.tilt.value.pitch.toFixed(1)}°</strong>
            </span>
            <span>
              ROLL: <strong className="text-white">{telemetry.tilt.value.roll.toFixed(1)}°</strong>
            </span>
            <span>
              YAW: <strong className="text-white">{telemetry.tilt.value.yaw.toFixed(1)}°</strong>
            </span>
          </div>
          <span className="text-slate-400 text-[10px] hidden sm:inline">
            DRAG TO ROTATE • PINCH/SCROLL TO ZOOM
          </span>
        </div>
      </div>

      {/* Subsystem Hardware Component Map */}
      <div className="bg-slate-950/70 border border-cyan-500/20 rounded-2xl p-4 backdrop-blur-md">
        <h4 className="font-heading font-bold text-xs uppercase tracking-widest text-slate-400 mb-3">
          SPACECRAFT SENSOR & ACTUATOR POSITIONS
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {sensors.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedSensor(selectedSensor === s.id ? null : s.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                selectedSensor === s.id
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-md ring-1 ring-cyan-400/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-xs text-white">{s.label}</span>
                <span className="text-[10px] font-mono text-cyan-400/80">{s.loc}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug font-sans">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
