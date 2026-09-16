import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CollisionEvent } from '../types';

interface ThreeCollisionViewerProps {
  event: CollisionEvent;
  width?: number;
  height?: number;
  interactive?: boolean;
}

const COLOR_HEX: Record<number, number> = {
  0: 0xef4444, // Red Quark
  1: 0x22c55e, // Green Quark
  2: 0x3b82f6, // Blue Quark
};

export const ThreeCollisionViewer: React.FC<ThreeCollisionViewerProps> = ({
  event,
  width = 240,
  height = 160,
  interactive = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animIdRef = useRef<number | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x070b14);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 55);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.8, 150);
    pointLight.position.set(20, 30, 25);
    scene.add(pointLight);

    const impactLight = new THREE.PointLight(
      event.collisionType === 'inelastic' ? 0xc084fc : 0xf59e0b,
      3.0,
      80
    );
    impactLight.position.set(0, 0, 0);
    scene.add(impactLight);

    // 3D Coordinate Grid Guide (Subtle)
    const grid = new THREE.GridHelper(40, 10, 0x334155, 0x1e293b);
    grid.position.y = -10;
    scene.add(grid);

    // Group for entire interactive model
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // 1. Particle A
    const colorA = COLOR_HEX[event.particleA.color] ?? 0xffffff;
    const radA = Math.max(2.5, Math.min(6.5, event.particleA.mass * 1.8));
    const geoA = new THREE.SphereGeometry(radA, 24, 24);
    const matA = new THREE.MeshStandardMaterial({
      color: colorA,
      emissive: colorA,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.4,
    });
    const meshA = new THREE.Mesh(geoA, matA);
    meshA.position.set(-11, 0, 0);
    modelGroup.add(meshA);

    // Charge ring for A if charged
    if (event.particleA.qEm !== 0) {
      const ringGeo = new THREE.TorusGeometry(radA + 1.2, 0.25, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: event.particleA.qEm > 0 ? 0xf87171 : 0x4ade80,
      });
      const ringA = new THREE.Mesh(ringGeo, ringMat);
      ringA.rotation.x = Math.PI / 2;
      meshA.add(ringA);
    }

    // 2. Particle B
    const colorB = COLOR_HEX[event.particleB.color] ?? 0xffffff;
    const radB = Math.max(2.5, Math.min(6.5, event.particleB.mass * 1.8));
    const geoB = new THREE.SphereGeometry(radB, 24, 24);
    const matB = new THREE.MeshStandardMaterial({
      color: colorB,
      emissive: colorB,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.4,
    });
    const meshB = new THREE.Mesh(geoB, matB);
    meshB.position.set(11, 0, 0);
    modelGroup.add(meshB);

    // Charge ring for B if charged
    if (event.particleB.qEm !== 0) {
      const ringGeo = new THREE.TorusGeometry(radB + 1.2, 0.25, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: event.particleB.qEm > 0 ? 0xf87171 : 0x4ade80,
      });
      const ringB = new THREE.Mesh(ringGeo, ringMat);
      ringB.rotation.x = Math.PI / 2;
      meshB.add(ringB);
    }

    // 3. Shockwave Expanding Rings (Three.js Torus / Sphere Wireframe)
    const shockwaveGeo = new THREE.TorusGeometry(8, 0.35, 12, 36);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: event.collisionType === 'inelastic' ? 0xa855f7 : 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveMesh.rotation.x = Math.PI / 2;
    modelGroup.add(shockwaveMesh);

    // Secondary spherical impact shell
    const shellGeo = new THREE.IcosahedronGeometry(7, 1);
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    modelGroup.add(shellMesh);

    // 4. Impulse Vector Arrows (matter-js / physics impulse visualization)
    const dirA = new THREE.Vector3(1, 0.3, 0).normalize();
    const arrowA = new THREE.ArrowHelper(dirA, new THREE.Vector3(-11, 0, 0), 8, colorA, 2.5, 1.5);
    modelGroup.add(arrowA);

    const dirB = new THREE.Vector3(-1, -0.3, 0).normalize();
    const arrowB = new THREE.ArrowHelper(dirB, new THREE.Vector3(11, 0, 0), 8, colorB, 2.5, 1.5);
    modelGroup.add(arrowB);

    // 5. Spark Particle Clouds
    const sparkCount = 45;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities: THREE.Vector3[] = [];

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = 0;
      sparkPositions[i * 3 + 2] = 0;

      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(Math.random() * 2 - 1);
      const sp = 0.2 + Math.random() * 0.7;
      sparkVelocities.push(
        new THREE.Vector3(
          Math.sin(theta) * Math.cos(phi) * sp,
          Math.sin(theta) * Math.sin(phi) * sp,
          Math.cos(theta) * sp
        )
      );
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 1.6,
      transparent: true,
      opacity: 0.9,
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    modelGroup.add(sparkPoints);

    // Mouse Interaction for 3D Orbiting
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (!interactive) return;
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !interactive) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      modelGroup.rotation.y += dx * 0.015;
      modelGroup.rotation.x += dy * 0.015;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (!interactive) return;
      e.preventDefault();
      camera.position.z = Math.max(25, Math.min(110, camera.position.z + e.deltaY * 0.08));
    };

    const canvasEl = renderer.domElement;
    canvasEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvasEl.addEventListener('wheel', handleWheel, { passive: false });

    // Animation Loop
    let cycle = 0;
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      cycle += 0.035;

      // Auto-rotation when not dragging
      if (!isDragging) {
        modelGroup.rotation.y += 0.008;
      }

      // Shockwave pulsing
      const shockScale = 1.0 + (cycle % 2.5) * 0.7;
      shockwaveMesh.scale.set(shockScale, shockScale, shockScale);
      shockwaveMat.opacity = Math.max(0, 1.0 - (cycle % 2.5) / 2.5);

      shellMesh.rotation.x += 0.01;
      shellMesh.rotation.y += 0.015;
      const shellScale = 1.0 + Math.sin(cycle) * 0.2;
      shellMesh.scale.set(shellScale, shellScale, shellScale);

      // Animate sparks
      const posAttr = sparkGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < sparkCount; i++) {
        const vel = sparkVelocities[i];
        arr[i * 3] += vel.x;
        arr[i * 3 + 1] += vel.y;
        arr[i * 3 + 2] += vel.z;

        // Reset spark when it reaches distance
        const distSq =
          arr[i * 3] ** 2 + arr[i * 3 + 1] ** 2 + arr[i * 3 + 2] ** 2;
        if (distSq > 220) {
          arr[i * 3] = 0;
          arr[i * 3 + 1] = 0;
          arr[i * 3 + 2] = 0;
        }
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      canvasEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvasEl.removeEventListener('wheel', handleWheel);

      renderer.dispose();
      geoA.dispose();
      matA.dispose();
      geoB.dispose();
      matB.dispose();
      shockwaveGeo.dispose();
      shockwaveMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
      if (container.contains(canvasEl)) {
        container.removeChild(canvasEl);
      }
    };
  }, [event, width, height, interactive]);

  return (
    <div
      ref={mountRef}
      className="relative rounded-md overflow-hidden border border-slate-800 shadow-inner cursor-grab active:cursor-grabbing select-none"
      style={{ width, height }}
      title="Interactive 3D Collision Reconstruction - Drag to rotate, scroll to zoom"
    />
  );
};
