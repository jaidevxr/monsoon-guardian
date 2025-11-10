import React, { useMemo } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

const AnimatedBackground: React.FC = () => {
  // Generate floating particles with variety of colors
  const particles = useMemo(() => {
    const colors = [
      'bg-primary/30',
      'bg-accent/30',
      'bg-secondary/30',
      'bg-primary-glow/20',
      'bg-accent-glow/20',
    ];
    
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 150 + 50,
      duration: Math.random() * 15 + 15,
      delay: Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Large animated gradient orbs with blur for glassmorphism effect */}
      <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-gradient-to-br from-primary/20 to-accent/10 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-20 right-10 w-[600px] h-[600px] bg-gradient-to-tl from-accent/15 to-primary/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-r from-secondary/10 to-primary/5 rounded-full blur-[150px] animate-float" style={{ animationDelay: '2s' }} />
      
      {/* Mesh gradient overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(142,76,36,0.03),transparent_50%)] animate-shimmer" />
      
      {/* Floating glowing particles */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`absolute ${particle.color} rounded-full opacity-30 backdrop-blur-sm animate-float`}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
              boxShadow: '0 0 20px currentColor',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AnimatedBackground;
