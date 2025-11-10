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

interface FloatingGrass {
  x: number;
  y: number;
  size: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  drift: number;
}

const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bladesRef = useRef<Blade[]>([]);
  const floatingGrassRef = useRef<FloatingGrass[]>([]);
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

    // Create floating grass particles
    const createFloatingGrass = () => {
      const particles: FloatingGrass[] = [];
      const particleCount = 30;
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 20 + 10,
          speed: Math.random() * 0.5 + 0.2,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          opacity: Math.random() * 0.4 + 0.2,
          drift: Math.random() * 0.3 - 0.15,
        });
      }
      floatingGrassRef.current = particles;
    };

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createGrass();
      createFloatingGrass();
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    const animate = () => {
      timeRef.current += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Nature-themed gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(180, 220, 170, 0.15)'); // lighter green top
      gradient.addColorStop(0.5, 'rgba(140, 200, 150, 0.12)'); // mid green
      gradient.addColorStop(1, 'rgba(120, 180, 140, 0.18)'); // deeper green bottom
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
        
        // Gradient for grass blade (more vibrant green)
        const bladeGradient = ctx.createLinearGradient(
          blade.x,
          blade.baseY,
          endX,
          endY
        );
        bladeGradient.addColorStop(0, 'rgba(50, 120, 70, 0.6)');
        bladeGradient.addColorStop(0.5, 'rgba(70, 150, 90, 0.5)');
        bladeGradient.addColorStop(1, 'rgba(90, 180, 110, 0.4)');
        
        ctx.strokeStyle = bladeGradient;
        ctx.lineWidth = blade.width;
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      // Draw and update floating grass particles
      floatingGrassRef.current.forEach((particle) => {
        // Update position
        particle.y -= particle.speed;
        particle.x += particle.drift;
        particle.rotation += particle.rotationSpeed;

        // Reset if out of bounds
        if (particle.y < -particle.size) {
          particle.y = canvas.height + particle.size;
          particle.x = Math.random() * canvas.width;
        }
        if (particle.x < -particle.size) particle.x = canvas.width + particle.size;
        if (particle.x > canvas.width + particle.size) particle.x = -particle.size;

        // Draw floating grass particle
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        // Draw grass blade shape
        ctx.beginPath();
        ctx.moveTo(0, particle.size / 2);
        ctx.quadraticCurveTo(
          particle.size / 4,
          0,
          0,
          -particle.size / 2
        );
        
        const particleGradient = ctx.createLinearGradient(
          0,
          particle.size / 2,
          0,
          -particle.size / 2
        );
        particleGradient.addColorStop(0, `rgba(60, 130, 80, ${particle.opacity})`);
        particleGradient.addColorStop(1, `rgba(100, 180, 120, ${particle.opacity * 0.6})`);
        
        ctx.strokeStyle = particleGradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        ctx.restore();
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
