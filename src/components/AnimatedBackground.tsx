import React, { useEffect, useRef } from 'react';

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
  const floatingGrassRef = useRef<FloatingGrass[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create floating grass particles
    const createFloatingGrass = () => {
      const particles: FloatingGrass[] = [];
      const particleCount = 40;
      
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
      createFloatingGrass();
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Nature-themed gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(180, 220, 170, 0.15)');
      gradient.addColorStop(0.5, 'rgba(140, 200, 150, 0.12)');
      gradient.addColorStop(1, 'rgba(120, 180, 140, 0.18)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
