import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SatelliteViewerProps {
  pitch: number;
  roll: number;
  yaw: number;
  mode: string;
  isFiringThruster?: boolean;
}

export const SatelliteViewer: React.FC<SatelliteViewerProps> = ({
  pitch,
  roll,
  yaw,
  mode,
  isFiringThruster = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const satelliteGroupRef = useRef<THREE.Group | null>(null);
  const thrusterPlumeRef = useRef<THREE.Mesh | null>(null);
  const orientationRef = useRef({ pitch, roll, yaw });
  const thrusterRef = useRef(isFiringThruster);

  // Keep refs up to date without remounting Three scene
  useEffect(() => {
    orientationRef.current = { pitch, roll, yaw };
  }, [pitch, roll, yaw]);

  useEffect(() => {
    thrusterRef.current = isFiringThruster;
  }, [isFiringThruster]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect headless test environment to save resources
    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 240;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(2.8, 1.8, 3.2);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    sunLight.position.set(6, 8, 5);
    scene.add(sunLight);

    const earthReflection = new THREE.DirectionalLight(0x0284c7, 0.9);
    earthReflection.position.set(-4, -6, -3);
    scene.add(earthReflection);

    // Stars background particles
    const starCount = isHeadless ? 40 : 150;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 40;
      starPositions[i + 1] = (Math.random() - 0.5) * 40;
      starPositions[i + 2] = (Math.random() - 0.5) * 40;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.12,
      transparent: true,
      opacity: 0.7,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Aurora-01 Satellite Model Group
    const satGroup = new THREE.Group();
    satelliteGroupRef.current = satGroup;
    scene.add(satGroup);

    // 1. Satellite Main Chassis (Gold Kapton / Anodized Spaceframe)
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Gold MLI insulation
      metalness: 0.85,
      roughness: 0.25,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    satGroup.add(body);

    // Chassis corner rails (Aluminum anodized frame)
    const railGeometry = new THREE.BoxGeometry(0.84, 1.64, 0.84);
    const wireframe = new THREE.WireframeGeometry(railGeometry);
    const line = new THREE.LineSegments(
      wireframe,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 })
    );
    satGroup.add(line);

    // 2. Solar Array Wings (Left & Right)
    const panelWidth = 1.3;
    const panelHeight = 0.9;
    const panelDepth = 0.04;
    const panelGeometry = new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth);
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep blue-black photovoltaic cell
      roughness: 0.1,
      metalness: 0.9,
    });

    // Left Solar Wing
    const leftWing = new THREE.Mesh(panelGeometry, panelMaterial);
    leftWing.position.set(-1.1, 0, 0);
    satGroup.add(leftWing);

    // Right Solar Wing
    const rightWing = new THREE.Mesh(panelGeometry, panelMaterial);
    rightWing.position.set(1.1, 0, 0);
    satGroup.add(rightWing);

    // Solar panel cell grid accents
    const gridMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.6 });
    const cellWireframeL = new THREE.LineSegments(new THREE.WireframeGeometry(panelGeometry), gridMat);
    cellWireframeL.position.copy(leftWing.position);
    satGroup.add(cellWireframeL);

    const cellWireframeR = new THREE.LineSegments(new THREE.WireframeGeometry(panelGeometry), gridMat);
    cellWireframeR.position.copy(rightWing.position);
    satGroup.add(cellWireframeR);

    // 3. Optical Payload Camera Lens / Aperture (Nadir Face)
    const lensRingGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.15, 24);
    const lensRingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const lensRing = new THREE.Mesh(lensRingGeo, lensRingMat);
    lensRing.position.set(0, 0.85, 0);
    satGroup.add(lensRing);

    const lensGeo = new THREE.CircleGeometry(0.18, 24);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, 0.93, 0);
    lens.rotation.x = -Math.PI / 2;
    satGroup.add(lens);

    // 4. VHF/UHF Dipole Antenna rods
    const antennaMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const antennaPoints = [
      new THREE.Vector3(0, -0.8, 0),
      new THREE.Vector3(0, -1.5, 0.3),
      new THREE.Vector3(0, -0.8, 0),
      new THREE.Vector3(0.4, -1.4, -0.2),
    ];
    const antennaGeo = new THREE.BufferGeometry().setFromPoints(antennaPoints);
    const antenna = new THREE.Line(antennaGeo, antennaMat);
    satGroup.add(antenna);

    // 5. Cold Gas / Reaction Thruster Plume
    const plumeGeo = new THREE.ConeGeometry(0.2, 0.7, 16);
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      wireframe: true,
    });
    const plume = new THREE.Mesh(plumeGeo, plumeMat);
    plume.position.set(0, -1.15, 0);
    plume.rotation.x = Math.PI;
    satGroup.add(plume);
    thrusterPlumeRef.current = plume;

    // Interactive Drag to Rotate
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let userRotX = 0;
    let userRotY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      userRotY += deltaX * 0.01;
      userRotX += deltaY * 0.01;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Resize observer
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

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Slow background starfield drift
      stars.rotation.y = elapsed * 0.02;

      // Update satellite rotation based on live telemetry tilt + user orbit drag
      if (satGroup) {
        const radPitch = THREE.MathUtils.degToRad(orientationRef.current.pitch);
        const radRoll = THREE.MathUtils.degToRad(orientationRef.current.roll);
        const radYaw = THREE.MathUtils.degToRad(orientationRef.current.yaw);

        // Gentle auto-float when not dragging
        const autoOrbit = isDragging ? 0 : Math.sin(elapsed * 0.5) * 0.05;

        satGroup.rotation.x = THREE.MathUtils.lerp(satGroup.rotation.x, radPitch + userRotX + autoOrbit, 0.1);
        satGroup.rotation.y = THREE.MathUtils.lerp(satGroup.rotation.y, radYaw + userRotY + elapsed * 0.15, 0.05);
        satGroup.rotation.z = THREE.MathUtils.lerp(satGroup.rotation.z, radRoll, 0.1);
      }

      // Thruster plume pulsing
      if (thrusterPlumeRef.current) {
        if (thrusterRef.current) {
          thrusterPlumeRef.current.visible = true;
          (thrusterPlumeRef.current.material as THREE.MeshBasicMaterial).opacity =
            0.6 + Math.sin(elapsed * 25) * 0.3;
          thrusterPlumeRef.current.scale.set(
            1 + Math.random() * 0.2,
            1 + Math.random() * 0.4,
            1 + Math.random() * 0.2
          );
        } else {
          thrusterPlumeRef.current.visible = false;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      bodyGeometry.dispose();
      bodyMaterial.dispose();
      panelGeometry.dispose();
      panelMaterial.dispose();
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[200px] flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-slate-950 via-[#0a1124] to-slate-950 border border-cyan-500/20 shadow-[inset_0_0_30px_rgba(0,240,255,0.05)]">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      
      {/* 3D Viewport Overlays */}
      <div className="absolute top-2.5 left-3 flex items-center space-x-2 pointer-events-none">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <span className="text-[11px] font-mono tracking-widest text-cyan-400/90 uppercase font-semibold">
          3D ATTITUDE VIEW • AURORA-01
        </span>
      </div>

      <div className="absolute top-2.5 right-3 text-right pointer-events-none">
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700/60">
          DRAG TO ROTATE
        </span>
      </div>

      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-cyan-300/80 bg-slate-950/70 backdrop-blur-sm px-2.5 py-1 rounded border border-cyan-500/20 pointer-events-none">
        <div className="flex space-x-3">
          <span>P: <strong className="text-white">{pitch > 0 ? `+${pitch}` : pitch}°</strong></span>
          <span>R: <strong className="text-white">{roll > 0 ? `+${roll}` : roll}°</strong></span>
          <span>Y: <strong className="text-white">{yaw > 0 ? `+${yaw}` : yaw}°</strong></span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-slate-400">BUS:</span>
          <span className="text-emerald-400 font-semibold">{mode}</span>
        </div>
      </div>
    </div>
  );
};
