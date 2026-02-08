import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Player, Platform, Coin, Enemy, LevelData, GameState } from '../types';

interface GameCanvasProps {
  avatarUrl: string;
  onGameOver: (score: number, win: boolean) => void;
  onBack: () => void;
}

const GRAVITY = 0.5;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const FRICTION = 0.8;
const TERMINAL_VELOCITY = 12;
const MAX_LEVEL = 3;

const GameCanvas: React.FC<GameCanvasProps> = ({ avatarUrl, onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>(GameState.PLAYING);

  // Game Ref State
  const playerRef = useRef<Player>({
    x: 50,
    y: 200,
    width: 40,
    height: 40,
    vx: 0,
    vy: 0,
    grounded: false,
    facingRight: true,
  });

  const levelRef = useRef<LevelData>({
    platforms: [],
    coins: [],
    enemies: [],
    finishLineX: 3000,
  });

  const cameraRef = useRef({ x: 0 });
  const avatarImageRef = useRef<HTMLImageElement | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Initialize Level
  useEffect(() => {
    const generateLevel = (levelIndex: number) => {
      let platforms: Platform[] = [];
      let coins: Coin[] = [];
      let enemies: Enemy[] = [];
      let finishX = 3000;

      if (levelIndex === 1) {
        // --- LEVEL 1: The Grasslands (Tutorial) ---
        finishX = 3000;
        // Ground
        for (let i = 0; i < 40; i++) {
          if (i !== 5 && i !== 12 && i !== 25) {
              platforms.push({ x: i * 100, y: 500, width: 100, height: 100, type: 'ground' });
          }
        }
        // Platforms
        platforms.push({ x: 300, y: 350, width: 150, height: 40, type: 'brick' });
        platforms.push({ x: 600, y: 250, width: 40, height: 40, type: 'block' });
        platforms.push({ x: 640, y: 250, width: 40, height: 40, type: 'brick' });
        platforms.push({ x: 680, y: 250, width: 40, height: 40, type: 'block' });
        platforms.push({ x: 900, y: 350, width: 100, height: 40, type: 'brick' });
        platforms.push({ x: 1300, y: 300, width: 200, height: 40, type: 'brick' });
        platforms.push({ x: 1800, y: 440, width: 60, height: 60, type: 'pipe' });
        platforms.push({ x: 2200, y: 460, width: 40, height: 40, type: 'block' });
        platforms.push({ x: 2240, y: 420, width: 40, height: 40, type: 'block' });
        platforms.push({ x: 2280, y: 380, width: 40, height: 40, type: 'block' });
        platforms.push({ x: 3000, y: 460, width: 40, height: 40, type: 'block' });

        // Coins
        coins.push({ x: 320, y: 300, width: 20, height: 20, collected: false });
        coins.push({ x: 360, y: 300, width: 20, height: 20, collected: false });
        coins.push({ x: 600, y: 180, width: 20, height: 20, collected: false });
        coins.push({ x: 1000, y: 400, width: 20, height: 20, collected: false });
        coins.push({ x: 1400, y: 250, width: 20, height: 20, collected: false });

        // Enemies
        enemies.push({ id: 1, x: 500, y: 460, width: 30, height: 30, vx: -2, vy: 0, type: 'goomba', dead: false });
        enemies.push({ id: 2, x: 1000, y: 460, width: 30, height: 30, vx: -2, vy: 0, type: 'goomba', dead: false });
        enemies.push({ id: 3, x: 1400, y: 260, width: 30, height: 30, vx: 2, vy: 0, type: 'goomba', dead: false });

      } else if (levelIndex === 2) {
        // --- LEVEL 2: Sky Peaks (Verticality & Gaps) ---
        finishX = 3200;
        
        // Start Platform
        platforms.push({ x: 0, y: 500, width: 300, height: 100, type: 'ground' });

        // Floating Islands
        platforms.push({ x: 400, y: 400, width: 100, height: 40, type: 'brick' });
        platforms.push({ x: 600, y: 300, width: 100, height: 40, type: 'brick' });
        platforms.push({ x: 850, y: 400, width: 100, height: 40, type: 'brick' });
        
        // Long middle section with enemies
        platforms.push({ x: 1100, y: 500, width: 400, height: 40, type: 'ground' });
        enemies.push({ id: 10, x: 1200, y: 460, width: 30, height: 30, vx: -3, vy: 0, type: 'goomba', dead: false });
        enemies.push({ id: 11, x: 1400, y: 460, width: 30, height: 30, vx: 3, vy: 0, type: 'goomba', dead: false });

        // High road
        platforms.push({ x: 1600, y: 350, width: 80, height: 40, type: 'block' });
        platforms.push({ x: 1800, y: 250, width: 80, height: 40, type: 'block' });
        platforms.push({ x: 2000, y: 350, width: 80, height: 40, type: 'block' });
        
        // Low road trap
        platforms.push({ x: 1800, y: 550, width: 100, height: 40, type: 'brick' }); 

        // Final stretch
        platforms.push({ x: 2300, y: 450, width: 100, height: 40, type: 'brick' });
        platforms.push({ x: 2500, y: 350, width: 100, height: 40, type: 'brick' });
        platforms.push({ x: 2700, y: 250, width: 100, height: 40, type: 'brick' });
        
        // Finish
        platforms.push({ x: 3000, y: 500, width: 400, height: 100, type: 'ground' });
        platforms.push({ x: 3200, y: 460, width: 40, height: 40, type: 'block' });

        // Coins
        coins.push({ x: 640, y: 250, width: 20, height: 20, collected: false });
        coins.push({ x: 1830, y: 200, width: 20, height: 20, collected: false });
        coins.push({ x: 2740, y: 200, width: 20, height: 20, collected: false });

      } else if (levelIndex === 3) {
        // --- LEVEL 3: The Void (Precision) ---
        finishX = 3500;

        // Start
        platforms.push({ x: 0, y: 500, width: 200, height: 100, type: 'ground' });

        // Tiny steps
        platforms.push({ x: 300, y: 500, width: 60, height: 40, type: 'block' });
        platforms.push({ x: 450, y: 450, width: 60, height: 40, type: 'block' });
        platforms.push({ x: 600, y: 400, width: 60, height: 40, type: 'block' });
        platforms.push({ x: 750, y: 350, width: 60, height: 40, type: 'block' });

        // The wall
        platforms.push({ x: 950, y: 200, width: 40, height: 300, type: 'pipe' }); // Wall
        platforms.push({ x: 880, y: 450, width: 60, height: 40, type: 'brick' }); // Step up

        // Enemy Gauntlet
        platforms.push({ x: 1100, y: 500, width: 500, height: 40, type: 'ground' });
        enemies.push({ id: 20, x: 1200, y: 460, width: 30, height: 30, vx: -4, vy: 0, type: 'goomba', dead: false });
        enemies.push({ id: 21, x: 1400, y: 460, width: 30, height: 30, vx: 4, vy: 0, type: 'goomba', dead: false });
        enemies.push({ id: 22, x: 1300, y: 350, width: 30, height: 30, vx: 2, vy: 0, type: 'goomba', dead: false }); // Flying-ish? No, needs platform.
        platforms.push({ x: 1250, y: 380, width: 100, height: 40, type: 'brick' }); // Platform for enemy 22

        // The Drop
        platforms.push({ x: 1700, y: 400, width: 80, height: 40, type: 'brick' });
        platforms.push({ x: 1900, y: 300, width: 80, height: 40, type: 'brick' });
        
        // Floor is lava section
        platforms.push({ x: 2200, y: 550, width: 40, height: 40, type: 'block' });
        platforms.push({ x: 2350, y: 500, width: 40, height: 40, type: 'block' });
        platforms.push({ x: 2500, y: 450, width: 40, height: 40, type: 'block' });
        platforms.push({ x: 2650, y: 400, width: 40, height: 40, type: 'block' });
        
        // Finish platform
        platforms.push({ x: 2900, y: 500, width: 600, height: 100, type: 'ground' });
        platforms.push({ x: 3500, y: 460, width: 40, height: 40, type: 'block' });

        // Coins
        coins.push({ x: 765, y: 300, width: 20, height: 20, collected: false });
        coins.push({ x: 1300, y: 330, width: 20, height: 20, collected: false });
        coins.push({ x: 2510, y: 400, width: 20, height: 20, collected: false });
      }

      levelRef.current = { platforms, coins, enemies, finishLineX: finishX };
      
      // Reset Player Logic
      playerRef.current.x = 50;
      playerRef.current.y = 200;
      playerRef.current.vx = 0;
      playerRef.current.vy = 0;
      cameraRef.current.x = 0;
    };

    generateLevel(currentLevel);

    // Load Avatar
    const img = new Image();
    img.src = avatarUrl;
    img.onload = () => {
      avatarImageRef.current = img;
    };
  }, [avatarUrl, currentLevel]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const resetPlayer = useCallback(() => {
    playerRef.current.x = 50;
    playerRef.current.y = 200;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    cameraRef.current.x = 0;
  }, []);

  // Game Loop
  const update = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    const player = playerRef.current;
    const { platforms, coins, enemies, finishLineX } = levelRef.current;
    const keys = keysRef.current;

    // --- Movement ---
    if (keys['ArrowRight'] || keys['KeyD']) {
      if (player.vx < MOVE_SPEED) player.vx++;
      player.facingRight = true;
    }
    if (keys['ArrowLeft'] || keys['KeyA']) {
      if (player.vx > -MOVE_SPEED) player.vx--;
      player.facingRight = false;
    }
    if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && player.grounded) {
      player.vy = JUMP_FORCE;
      player.grounded = false;
    }

    // Physics
    player.vx *= FRICTION;
    player.vy += GRAVITY;

    // Terminal velocity
    if (player.vy > TERMINAL_VELOCITY) player.vy = TERMINAL_VELOCITY;

    player.x += player.vx;
    player.y += player.vy;
    player.grounded = false; // Assume in air until collision proves otherwise

    // --- Collisions (Platforms) ---
    // AABB Collision
    for (const p of platforms) {
      const dir = colCheck(player, p);
      if (dir === 'b') {
        player.grounded = true;
        player.vy = 0;
      } else if (dir === 't') {
        player.vy *= -0.5;
      }
    }

    // --- Collisions (Enemies) ---
    for (const e of enemies) {
      if (e.dead) continue;
      
      // Enemy Movement
      e.vy += GRAVITY;
      e.x += e.vx;
      e.y += e.vy; // Apply Gravity to enemy

      // Enemy Platform Collision
      let enemyGrounded = false;
      for (const p of platforms) {
        const dir = colCheck(e, p);
        if (dir === 'b') enemyGrounded = true;
        if (dir === 'l' || dir === 'r') e.vx *= -1; // Bounce off walls
      }
      if(!enemyGrounded && e.y > 600) {
          // simple floor check if missed platform
          e.y = 500 - e.height;
      }

      // Player-Enemy Collision
      const hit = checkOverlap(player, e);
      if (hit) {
        const hitFromAbove = player.vy > 0 && (player.y + player.height - player.vy) < e.y;
        
        if (hitFromAbove) {
          e.dead = true;
          player.vy = -8; // Bounce
          setScore(s => s + 100);
        } else {
          // Player hit
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameState(GameState.GAME_OVER);
              onGameOver(score, false);
            } else {
              resetPlayer();
            }
            return newLives;
          });
          return; // Stop update for this frame
        }
      }
    }

    // --- Coins ---
    for (const c of coins) {
      if (!c.collected && checkOverlap(player, c)) {
        c.collected = true;
        setScore(s => s + 50);
      }
    }

    // --- World Bounds ---
    if (player.y > 700) {
      // Fell off world
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState(GameState.GAME_OVER);
          onGameOver(score, false);
        } else {
          resetPlayer();
        }
        return newLives;
      });
    }

    // --- Level Transition ---
    if (player.x > finishLineX) {
      if (currentLevel < MAX_LEVEL) {
          // Reset player X immediately to prevent multiple triggers while state updates
          player.x = 50; 
          setCurrentLevel(prev => prev + 1);
          // Level generation happens in useEffect
      } else {
          setGameState(GameState.VICTORY);
          onGameOver(score, true);
      }
    }

    // --- Camera ---
    // Keep player in center-ish
    const targetCamX = player.x - 400; // Center offset
    cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
    if (cameraRef.current.x < 0) cameraRef.current.x = 0;

  }, [gameState, onGameOver, score, resetPlayer, currentLevel]);

  // Render Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Camera transform
    ctx.save();
    ctx.translate(-cameraRef.current.x, 0);

    // Background Sky
    // Darken sky for harder levels
    if (currentLevel === 1) ctx.fillStyle = '#6b8cff';
    else if (currentLevel === 2) ctx.fillStyle = '#4a6fa5';
    else ctx.fillStyle = '#2d3748';
    
    ctx.fillRect(cameraRef.current.x, 0, canvas.width, canvas.height);

    // Clouds (Simple decor)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(100, 100, 30, 0, Math.PI * 2);
    ctx.arc(140, 90, 40, 0, Math.PI * 2);
    ctx.arc(180, 100, 30, 0, Math.PI * 2);
    ctx.fill();

    // Draw Platforms
    const { platforms, coins, enemies, finishLineX } = levelRef.current;

    platforms.forEach(p => {
      if (p.type === 'ground') ctx.fillStyle = '#5c9e60'; // Green
      else if (p.type === 'brick') ctx.fillStyle = '#b85c3e'; // Brown brick
      else if (p.type === 'block') ctx.fillStyle = '#e8b756'; // Gold block
      else if (p.type === 'pipe') ctx.fillStyle = '#28a828'; // Pipe Green
      
      ctx.fillRect(p.x, p.y, p.width, p.height);
      
      // Decoration for blocks
      if (p.type === 'brick' || p.type === 'block') {
         ctx.strokeStyle = 'rgba(0,0,0,0.2)';
         ctx.strokeRect(p.x, p.y, p.width, p.height);
      }
    });

    // Draw Flag
    ctx.fillStyle = '#fff';
    ctx.fillRect(finishLineX + 10, 100, 5, 360); // Pole
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(finishLineX + 15, 100, 60, 40); // Flag

    // Draw Coins
    ctx.fillStyle = '#ffd700';
    coins.forEach(c => {
      if (!c.collected) {
        ctx.beginPath();
        ctx.arc(c.x + c.width/2, c.y + c.height/2, c.width/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d4af37';
        ctx.stroke();
      }
    });

    // Draw Enemies
    enemies.forEach(e => {
      if (!e.dead) {
        ctx.fillStyle = '#8b4513';
        // Goomba shape body
        ctx.fillRect(e.x, e.y, e.width, e.height);
        // Eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(e.x + 5, e.y + 5, 8, 8);
        ctx.fillRect(e.x + 18, e.y + 5, 8, 8);
        ctx.fillStyle = 'black';
        ctx.fillRect(e.x + 7, e.y + 7, 3, 3);
        ctx.fillRect(e.x + 20, e.y + 7, 3, 3);
      }
    });

    // Draw Player Body (Mario Style)
    const player = playerRef.current;
    
    // We render the body relative to the player's position
    // Center X
    const cx = player.x + player.width / 2;
    // Body Y position (approx under head area)
    const bodyY = player.y + 22;
    
    // Simple leg animation
    const walkCycle = Math.floor(Date.now() / 100) % 2;
    const isMoving = Math.abs(player.vx) > 0.5;
    const legOffset = isMoving ? (walkCycle ? 3 : -3) : 0;
    
    // Legs (Blue)
    ctx.fillStyle = '#2563eb'; 
    // Left Leg
    ctx.fillRect(cx - 8 + legOffset, bodyY + 12, 6, 8);
    // Right Leg
    ctx.fillRect(cx + 2 - legOffset, bodyY + 12, 6, 8);

    // Shirt (Red)
    ctx.fillStyle = '#dc2626'; 
    ctx.fillRect(cx - 10, bodyY, 20, 12);
    
    // Overalls (Blue straps and bottom)
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(cx - 10, bodyY + 6, 20, 6); // Bottom part of overalls
    ctx.fillRect(cx - 8, bodyY, 4, 12); // Left strap
    ctx.fillRect(cx + 4, bodyY, 4, 12); // Right strap
    
    // Buttons (Yellow)
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 7, bodyY + 8, 2, 2);
    ctx.fillRect(cx + 5, bodyY + 8, 2, 2);

    // Arms (Red)
    ctx.fillStyle = '#dc2626';
    if (isMoving) {
        // Swing arms
        ctx.fillRect(cx - 14 - legOffset, bodyY + 2, 4, 10);
        ctx.fillRect(cx + 10 + legOffset, bodyY + 2, 4, 10);
    } else {
        ctx.fillRect(cx - 14, bodyY + 2, 4, 10);
        ctx.fillRect(cx + 10, bodyY + 2, 4, 10);
    }

    // Draw Head (The generated Avatar)
    if (avatarImageRef.current) {
      const headSize = 36;
      // Head sits on top of body, slightly overlapping
      const headY = player.y - 8; 
      
      ctx.save();
      
      // Face circle mask
      ctx.beginPath();
      ctx.arc(cx, headY + headSize/2, headSize / 2, 0, Math.PI * 2);
      ctx.clip();
      
      // Draw image flipped if moving left
      if (!player.facingRight) {
        ctx.translate(cx + headSize/2, headY);
        ctx.scale(-1, 1);
        ctx.drawImage(avatarImageRef.current, 0, 0, headSize, headSize);
      } else {
        ctx.drawImage(avatarImageRef.current, cx - headSize/2, headY, headSize, headSize);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = '#fca5a5'; // Skin tone
      ctx.beginPath();
      ctx.arc(cx, player.y + 10, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // HUD (Fixed position)
    ctx.font = '20px "Press Start 2P"';
    ctx.fillStyle = 'white';
    ctx.fillText(`SCORE: ${score}`, 20, 40);
    ctx.fillText(`LIVES: ${lives}`, 20, 70);
    ctx.fillText(`WORLD 1-${currentLevel}`, 580, 40);

  }, [score, lives, currentLevel]);

  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [update, draw]);


  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border-4 border-slate-700 rounded-lg shadow-2xl bg-black"
      />
      <div className="absolute top-4 right-4 flex gap-2">
         <button onClick={onBack} className="px-4 py-2 bg-red-600 text-xs text-white hover:bg-red-500 rounded font-bold border-b-4 border-red-800 active:border-b-0 active:translate-y-1">
           EXIT GAME
         </button>
      </div>
    </div>
  );
};

// --- Physics Helpers ---

// Simple AABB Collision Check
function checkOverlap(a: any, b: any) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Directional Collision Check (Resolves collision)
function colCheck(shapeA: Player | Enemy, shapeB: Platform) {
  const vX = (shapeA.x + (shapeA.width / 2)) - (shapeB.x + (shapeB.width / 2));
  const vY = (shapeA.y + (shapeA.height / 2)) - (shapeB.y + (shapeB.height / 2));
  const hWidths = (shapeA.width / 2) + (shapeB.width / 2);
  const hHeights = (shapeA.height / 2) + (shapeB.height / 2);
  let colDir = null;

  if (Math.abs(vX) < hWidths && Math.abs(vY) < hHeights) {
    const oX = hWidths - Math.abs(vX);
    const oY = hHeights - Math.abs(vY);
    if (oX >= oY) {
      if (vY > 0) {
        colDir = "t"; // Top of player hit bottom of platform
        shapeA.y += oY;
      } else {
        colDir = "b"; // Bottom of player hit top of platform
        shapeA.y -= oY;
      }
    } else {
      if (vX > 0) {
        colDir = "l";
        shapeA.x += oX;
      } else {
        colDir = "r";
        shapeA.x -= oX;
      }
    }
  }
  return colDir;
}

export default GameCanvas;