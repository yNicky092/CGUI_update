import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { PhysicsEngine, COLOR_MAP } from '../physics/engine';
import { SimulationRecorder } from '../physics/recorder';
import { ParticleInfo, CollisionEvent, DimensionMode } from '../types';
import { RotateCw, ZoomIn, ZoomOut, Maximize2, Crosshair, Sparkles, Orbit } from 'lucide-react';

interface ThreeSimulationCanvasProps {
  engine: PhysicsEngine;
  recorder?: SimulationRecorder;
  isRunning: boolean;
  selectedParticleIdx: number | null;
  onSelectParticle: (info: ParticleInfo | null) => void;
  showFluxTubes: boolean;
  showHalos: boolean;
  lastCollisionEvent?: CollisionEvent | null;
  dimensionMode?: DimensionMode;
}

const COLOR_THREE: Record<number, THREE.Color> = {
  0: new THREE.Color(0xff4d4d), // Red Quark
  1: new THREE.Color(0x4ade80), // Green Quark
  2: new THREE.Color(0x60a5fa), // Blue Quark
};

export const ThreeSimulationCanvas: React.FC<ThreeSimulationCanvasProps> = ({
  engine,
  recorder,
  isRunning,
  selectedParticleIdx,
  onSelectParticle,
  showFluxTubes,
  showHalos,
  lastCollisionEvent,
  dimensionMode = '2d_projection',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animIdRef = useRef<number | null>(null);

  // Instanced Mesh ref
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  // Lines for flux tubes
  const linesMeshRef = useRef<THREE.LineSegments | null>(null);
  // Selection indicator
  const selectorMeshRef = useRef<THREE.Mesh | null>(null);

  const [cameraState, setCameraState] = useState<{ zoom: number }>({ zoom: 1 });

  // Camera navigation coordinates
  const cameraAngleRef = useRef({ theta: 0.1, phi: 0.35, radius: 1100 });
  const cameraTargetRef = useRef(
    new THREE.Vector3(
      engine.params.width / 2,
      engine.params.height / 2,
      0
    )
  );

  const updateCameraPosition = useCallback(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    const { theta, phi, radius } = cameraAngleRef.current;
    const target = cameraTargetRef.current;

    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

    cam.position.set(x, y, z);
    cam.lookAt(target);
  }, []);

  // Reset view to default 3D isometric perspective
  const resetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.15, phi: 0.45, radius: 1200 };
    cameraTargetRef.current.set(
      engine.params.width / 2,
      engine.params.height / 2,
      0
    );
    updateCameraPosition();
  }, [engine.params.width, engine.params.height, updateCameraPosition]);

  // Focus camera on a coordinate
  const focusOn = useCallback((x: number, y: number, z: number) => {
    cameraTargetRef.current.set(x, y, z);
    cameraAngleRef.current.radius = 450;
    updateCameraPosition();
  }, [updateCameraPosition]);

  useEffect(() => {
    if (lastCollisionEvent) {
      // Smoothly look at the collision
      focusOn(lastCollisionEvent.x, lastCollisionEvent.y, lastCollisionEvent.z);
    }
  }, [lastCollisionEvent, focusOn]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 650;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x05050c);

    // Fog for depth cueing
    scene.fog = new THREE.FogExp2(0x05050c, 0.00045);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
    cameraRef.current = camera;
    updateCameraPosition();

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(500, 1000, 700);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 1.5, 2000);
    pointLight.position.set(engine.params.width / 2, engine.params.height / 2, 300);
    scene.add(pointLight);

    // 3D Bounding Box Guide
    const boxGeo = new THREE.BoxGeometry(
      engine.params.width,
      engine.params.height,
      engine.params.depth || 600
    );
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxLine = new THREE.LineSegments(
      boxEdges,
      new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.35 })
    );
    boxLine.position.set(
      engine.params.width / 2,
      engine.params.height / 2,
      0
    );
    scene.add(boxLine);

    // Instanced Mesh for Particles
    const sphereGeo = new THREE.SphereGeometry(1, 14, 14);
    const sphereMat = new THREE.MeshStandardMaterial({
      roughness: 0.2,
      metalness: 0.3,
      emissiveIntensity: 0.4,
    });
    const maxParticles = engine.params.maxParticles;
    const instancedMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, maxParticles);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);
    instancedMeshRef.current = instancedMesh;

    // Selection Reticle Mesh
    const selGeo = new THREE.RingGeometry(8, 11, 24);
    const selMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const selMesh = new THREE.Mesh(selGeo, selMat);
    selMesh.visible = false;
    scene.add(selMesh);
    selectorMeshRef.current = selMesh;

    // Line segments for 3D Flux Tubes
    const maxBonds = maxParticles * 3;
    const linePositions = new Float32Array(maxBonds * 6);
    const lineColors = new Float32Array(maxBonds * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const linesMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(linesMesh);
    linesMeshRef.current = linesMesh;

    // Mouse Interaction for 3D Orbit & Pan
    let isDragging = false;
    let dragMode: 'orbit' | 'pan' = 'orbit';
    let prevX = 0;
    let prevY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      dragMode = e.button === 2 ? 'pan' : 'orbit';
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      if (dragMode === 'orbit') {
        cameraAngleRef.current.theta -= dx * 0.006;
        cameraAngleRef.current.phi = Math.max(
          0.05,
          Math.min(Math.PI - 0.05, cameraAngleRef.current.phi - dy * 0.006)
        );
      } else {
        // Pan
        const cam = cameraRef.current;
        if (cam) {
          const panSpeed = cameraAngleRef.current.radius * 0.0012;
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
          cameraTargetRef.current.addScaledVector(right, -dx * panSpeed);
          cameraTargetRef.current.addScaledVector(up, dy * panSpeed);
        }
      }
      updateCameraPosition();
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      cameraAngleRef.current.radius = Math.max(
        150,
        Math.min(3000, cameraAngleRef.current.radius * factor)
      );
      updateCameraPosition();
      setCameraState({ zoom: 1000 / cameraAngleRef.current.radius });
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    // Raycast for particle picking on click
    const handleClick = (e: MouseEvent) => {
      if (Math.abs(e.clientX - prevX) > 4 || Math.abs(e.clientY - prevY) > 4) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Simple closest-particle search
      const n = engine.numParticles;
      let closestIdx = -1;
      let minRayDist = 18.0;

      for (let i = 0; i < n; i++) {
        const pPos = new THREE.Vector3(engine.posX[i], engine.posY[i], engine.posZ[i]);
        const distToRay = raycaster.ray.distanceToPoint(pPos);
        if (distToRay < minRayDist) {
          minRayDist = distToRay;
          closestIdx = i;
        }
      }

      if (closestIdx !== -1) {
        onSelectParticle(engine.getParticleInfo(closestIdx));
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });
    dom.addEventListener('contextmenu', handleContextMenu);
    dom.addEventListener('click', handleClick);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          camera.aspect = cr.width / cr.height;
          camera.updateProjectionMatrix();
          renderer.setSize(cr.width, cr.height);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation / Render Loop
    const dummy = new THREE.Object3D();
    const colorObj = new THREE.Color();

    const render = () => {
      animIdRef.current = requestAnimationFrame(render);

      // Simulation Step
      if (recorder?.isReplaying) {
        recorder.updatePlayback(0.016, engine);
      } else if (isRunning) {
        engine.step(0.016);
        if (recorder?.isRecording) {
          recorder.captureFrame(engine);
        }
      }

      const n = engine.numParticles;
      const im = instancedMeshRef.current;
      if (im) {
        im.count = n;
        for (let i = 0; i < n; i++) {
          const px = engine.posX[i];
          const py = engine.posY[i];
          let pz = engine.posZ[i];
          const rad = engine.radius[i];

          if (dimensionMode === '8d_complexified') {
            // Internal manifold coordinate projection: extra dimension y1 creates physical depth modulation
            pz += engine.extraDimY1[i] * 1.5;
          }

          dummy.position.set(px, py, pz);
          dummy.scale.set(rad, rad, rad);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);

          if (dimensionMode === '8d_complexified') {
            const [r, g, b] = engine.get8DColor(i);
            colorObj.setRGB(r / 255, g / 255, b / 255);
            if (showHalos && engine.qEm[i] !== 0) {
              colorObj.addScalar(engine.qEm[i] > 0 ? 0.2 : -0.1);
            }
            im.setColorAt(i, colorObj);
          } else {
            // 2D projection mode: distinct vibrant color for each quark flavor
            const [r, g, b] = engine.getQuarkColor(i);
            colorObj.setRGB(r / 255, g / 255, b / 255);
            if (showHalos && engine.qEm[i] !== 0) {
              colorObj.addScalar(engine.qEm[i] > 0 ? 0.2 : -0.1);
            }
            im.setColorAt(i, colorObj);
          }
        }
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
      }

      // Update Selection Indicator
      if (selMesh) {
        if (selectedParticleIdx !== null && selectedParticleIdx < n) {
          const sx = engine.posX[selectedParticleIdx];
          const sy = engine.posY[selectedParticleIdx];
          let sz = engine.posZ[selectedParticleIdx];
          if (dimensionMode === '8d_complexified') {
            sz += engine.extraDimY1[selectedParticleIdx] * 1.5;
          }
          selMesh.position.set(sx, sy, sz);
          selMesh.quaternion.copy(camera.quaternion);
          selMesh.visible = true;
        } else {
          selMesh.visible = false;
        }
      }

      // Update 3D Flux Tubes
      if (linesMeshRef.current && showFluxTubes) {
        const tubes = engine.fluxTubes;
        const posArr = (linesMeshRef.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        const colArr = (linesMeshRef.current.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;
        let lineIdx = 0;

        for (let t = 0; t < tubes.length && lineIdx < maxBonds * 6; t++) {
          const { i, j, isBaryonBond } = tubes[t];
          if (i >= n || j >= n) continue;

          let z1 = engine.posZ[i];
          let z2 = engine.posZ[j];
          if (dimensionMode === '8d_complexified') {
            z1 += engine.extraDimY1[i] * 1.5;
            z2 += engine.extraDimY1[j] * 1.5;
          }

          posArr[lineIdx] = engine.posX[i];
          posArr[lineIdx + 1] = engine.posY[i];
          posArr[lineIdx + 2] = z1;

          posArr[lineIdx + 3] = engine.posX[j];
          posArr[lineIdx + 4] = engine.posY[j];
          posArr[lineIdx + 5] = z2;

          let rgb1: [number, number, number];
          let rgb2: [number, number, number];
          if (dimensionMode === '8d_complexified') {
            rgb1 = engine.get8DColor(i);
            rgb2 = engine.get8DColor(j);
          } else {
            rgb1 = engine.getQuarkColor(i);
            rgb2 = engine.getQuarkColor(j);
          }

          colArr[lineIdx] = rgb1[0] / 255;
          colArr[lineIdx + 1] = rgb1[1] / 255;
          colArr[lineIdx + 2] = rgb1[2] / 255;

          colArr[lineIdx + 3] = rgb2[0] / 255;
          colArr[lineIdx + 4] = rgb2[1] / 255;
          colArr[lineIdx + 5] = rgb2[2] / 255;

          lineIdx += 6;
        }

        linesMeshRef.current.geometry.setDrawRange(0, lineIdx / 3);
        linesMeshRef.current.geometry.attributes.position.needsUpdate = true;
        linesMeshRef.current.geometry.attributes.color.needsUpdate = true;
        linesMeshRef.current.visible = true;
      } else if (linesMeshRef.current) {
        linesMeshRef.current.visible = false;
      }

      renderer.render(scene, camera);
    };

    render();

    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);
      dom.removeEventListener('contextmenu', handleContextMenu);
      dom.removeEventListener('click', handleClick);
      resizeObserver.disconnect();

      renderer.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      boxGeo.dispose();
      boxEdges.dispose();
      selGeo.dispose();
      selMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();

      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, [
    engine,
    recorder,
    isRunning,
    selectedParticleIdx,
    onSelectParticle,
    showFluxTubes,
    showHalos,
    updateCameraPosition,
  ]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 3D Navigation Controls Overlay */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 p-1.5 rounded-lg shadow-lg">
        <button
          onClick={resetCamera}
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition text-xs flex items-center gap-1 cursor-pointer"
          title="Reset 3D Camera View"
        >
          <RotateCw size={13} />
          <span className="text-[11px] font-mono">Reset View</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

        <button
          onClick={() => {
            cameraAngleRef.current.radius = Math.max(150, cameraAngleRef.current.radius * 0.8);
            updateCameraPosition();
          }}
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>

        <button
          onClick={() => {
            cameraAngleRef.current.radius = Math.min(3000, cameraAngleRef.current.radius * 1.25);
            updateCameraPosition();
          }}
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
      </div>

      {/* Active Dimension State Indicator */}
      <div className="absolute top-3 right-3 z-20 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-md text-[11px] font-mono flex items-center gap-2 pointer-events-none shadow-lg">
        {dimensionMode === '8d_complexified' ? (
          <>
            <Orbit size={13} className="text-purple-400" />
            <span className="text-purple-300 font-semibold">8D Complexified State</span>
            <span className="text-slate-500 text-[10px]">(K₄ Geodesics)</span>
          </>
        ) : (
          <>
            <Sparkles size={13} className="text-sky-400" />
            <span className="text-sky-300 font-semibold">2D Projection</span>
            <span className="text-slate-500 text-[10px]">(Quark Flavors)</span>
          </>
        )}
      </div>

      {/* 3D Coordinate & Nav Hint */}
      <div className="absolute bottom-3 left-3 z-20 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-2.5 py-1.5 rounded text-[10px] font-mono text-slate-400 pointer-events-none flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span>3D Viewport: Drag to Orbit | Right-Click to Pan | Scroll to Zoom</span>
      </div>
    </div>
  );
};
