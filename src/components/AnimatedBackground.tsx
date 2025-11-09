import React, { useEffect, useRef } from 'react';

interface Blade {
  x: number;
  baseY: number;
  height: number;
  width: number;
  swayOffset: number;
  swaySpeed: number;
  swayAmount: number;
}

const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bladesRef = useRef<Blade[]>([]);
  const animationFrameRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create grass blades
    const createGrass = () => {
      const blades: Blade[] = [];
      const bladeCount = Math.floor(canvas.width / 8);
      
      for (let i = 0; i < bladeCount; i++) {
        blades.push({
          x: (i * canvas.width) / bladeCount + Math.random() * 5,
          baseY: canvas.height,
          height: Math.random() * 80 + 40,
          width: Math.random() * 3 + 2,
          swayOffset: Math.random() * Math.PI * 2,
          swaySpeed: Math.random() * 0.5 + 0.5,
          swayAmount: Math.random() * 15 + 10,
        });
      }
      bladesRef.current = blades;
    };

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createGrass();
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    const animate = () => {
      timeRef.current += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Soft gradient background (nature colors)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(145, 200, 150, 0.08)'); // soft green
      gradient.addColorStop(0.5, 'rgba(100, 180, 140, 0.05)');
      gradient.addColorStop(1, 'rgba(80, 160, 120, 0.1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grass blades
      bladesRef.current.forEach((blade) => {
        const sway = Math.sin(timeRef.current * blade.swaySpeed + blade.swayOffset) * blade.swayAmount;
        
        // Grass blade as bezier curve
        ctx.beginPath();
        ctx.moveTo(blade.x, blade.baseY);
        
        const controlX = blade.x + sway;
        const controlY = blade.baseY - blade.height * 0.6;
        const endX = blade.x + sway * 1.5;
        const endY = blade.baseY - blade.height;
        
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        
        // Gradient for grass blade (darker at base, lighter at tip)
        const bladeGradient = ctx.createLinearGradient(
          blade.x,
          blade.baseY,
          endX,
          endY
        );
        bladeGradient.addColorStop(0, 'rgba(60, 130, 80, 0.4)');
        bladeGradient.addColorStop(0.5, 'rgba(80, 160, 100, 0.35)');
        bladeGradient.addColorStop(1, 'rgba(100, 180, 120, 0.25)');
        
        ctx.strokeStyle = bladeGradient;
        ctx.lineWidth = blade.width;
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

export default AnimatedBackground;
