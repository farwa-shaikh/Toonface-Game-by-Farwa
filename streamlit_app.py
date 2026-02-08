import streamlit as st
import sys
import subprocess
import os
import base64
import io
import time

# -----------------------------------------------------------------------------
# Dependency Check
# -----------------------------------------------------------------------------
def check_dependencies():
    """Checks for required packages and installs them if missing."""
    required = ["google-genai", "Pillow"]
    missing = []
    
    try:
        import google.genai
    except ImportError:
        missing.append("google-genai")
    
    try:
        import PIL
    except ImportError:
        missing.append("Pillow")

    if missing:
        st.warning(f"Installing missing libraries: {', '.join(missing)}...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing)
            st.rerun()
        except Exception as e:
            st.error(f"Auto-installation failed: {e}")
            st.stop()

check_dependencies()

from PIL import Image
from google import genai
from google.genai import types
import streamlit.components.v1 as components

# -----------------------------------------------------------------------------
# Configuration & CSS
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="ToonFace Adventure",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# Initialize Session State
if 'step' not in st.session_state:
    st.session_state.step = 'MENU' # MENU, READY, PLAYING
if 'avatar_b64' not in st.session_state:
    st.session_state.avatar_b64 = None
if 'uploaded_file_id' not in st.session_state:
    st.session_state.uploaded_file_id = None

# Custom CSS to match App.tsx
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
    
    /* GLOBAL BACKGROUND */
    .stApp {
        background: linear-gradient(to bottom right, #312e81, #581c87, #831843);
        font-family: 'Press Start 2P', cursive;
        color: white;
    }

    /* HEADER */
    .game-title {
        font-size: 3rem;
        text-align: center;
        background: linear-gradient(to right, #facc15, #f97316);
        -webkit-background-clip: text;
        color: transparent;
        text-shadow: 0 5px 5px rgba(0,0,0,0.5);
        margin-bottom: 0.5rem;
        font-weight: 800;
        line-height: 1.2;
    }
    
    .game-subtitle {
        text-align: center;
        color: #bfdbfe;
        font-family: sans-serif;
        font-size: 1rem;
        margin-bottom: 3rem;
    }

    /* CARD CONTAINER */
    .main-card {
        background: rgba(30, 41, 59, 0.9);
        backdrop-filter: blur(12px);
        padding: 3rem;
        border-radius: 1.5rem;
        border: 1px solid #475569;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        text-align: center;
    }

    /* PREVIEW CIRCLE */
    .preview-container {
        width: 180px;
        height: 180px;
        border-radius: 50%;
        border: 4px solid #334155;
        background-color: #0f172a;
        overflow: hidden;
        margin: 0 auto 2rem auto;
        position: relative;
        box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .preview-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .pulse-ring {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        border-radius: 50%;
        border: 4px solid #facc15;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: .5; }
    }

    /* BUTTONS */
    div.stButton > button {
        width: 100%;
        background-color: #2563eb;
        color: white;
        border-radius: 0.75rem;
        border: none;
        border-bottom: 5px solid #1e40af;
        transition: all 0.1s;
        font-family: 'Press Start 2P', cursive;
        padding: 1rem 0;
        font-size: 1rem;
    }
    div.stButton > button:hover {
        background-color: #3b82f6;
        transform: translateY(-2px);
    }
    div.stButton > button:active {
        border-bottom: 0px solid transparent;
        transform: translateY(4px);
    }
    
    /* Green Start Button Override */
    div.stButton > button.start-btn {
        background-color: #22c55e !important;
        border-bottom-color: #15803d !important;
    }
    
    /* HIDE STREAMLIT CHROME */
    #MainMenu, header, footer {visibility: hidden;}
    section[data-testid="stFileUploader"] {
        background-color: rgba(15, 23, 42, 0.5);
        border: 2px dashed #475569;
        border-radius: 1rem;
        padding: 2rem;
    }
</style>
""", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Logic
# -----------------------------------------------------------------------------
def get_gemini_client():
    api_key = os.environ.get("API_KEY")
    if not api_key:
        st.error("API_KEY not found in environment variables.")
        st.stop()
    return genai.Client(api_key=api_key)

def generate_cartoon_avatar(image_bytes):
    client = get_gemini_client()
    prompt = "Transform this face into a 2D pixel art style video game character head. Make it cute, colorful, and suitable for a side-scrolling platformer. Isolate the head on a solid white background."
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash-image',
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                prompt
            ]
        )
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    return part.inline_data.data
        return None
    except Exception as e:
        st.error(f"Generation error: {e}")
        return None

def get_game_html(avatar_base64):
    # This embeds the exact logic from GameCanvas.tsx converted to vanilla JS
    return f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        body {{ margin: 0; overflow: hidden; background: #000; font-family: 'Press Start 2P', cursive; user-select: none; }}
        canvas {{ display: block; margin: 0 auto; border: 4px solid #334155; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.5); }}
        
        #ui {{ position: absolute; top: 20px; left: 20px; color: white; font-size: 20px; z-index: 10; text-shadow: 2px 2px 0 #000; }}
        #world-ui {{ position: absolute; top: 20px; right: 20px; color: white; font-size: 20px; z-index: 10; text-shadow: 2px 2px 0 #000; }}
        
        #overlay {{ 
            display: none; 
            position: absolute; 
            top: 50%; left: 50%; 
            transform: translate(-50%, -50%); 
            text-align: center; 
            background: rgba(30, 41, 59, 0.95);
            padding: 40px;
            border-radius: 20px;
            border: 2px solid #475569;
            color: white;
            box-shadow: 0 20px 50px rgba(0,0,0,0.8);
            min-width: 300px;
        }}
        
        h1 {{ margin: 0 0 20px 0; font-size: 30px; }}
        .victory {{ color: #4ade80; }}
        .gameover {{ color: #ef4444; }}
        
        button {{ 
            padding: 15px 30px; 
            font-family: 'Press Start 2P'; 
            cursor: pointer; 
            background: #2563eb; 
            color: white; 
            border: none;
            border-bottom: 5px solid #1e40af;
            border-radius: 8px;
            font-size: 16px;
            margin-top: 20px;
        }}
        button:hover {{ background: #3b82f6; transform: translateY(-2px); }}
        button:active {{ border-bottom: 0; transform: translateY(5px); margin-bottom: 5px; }}
    </style>
</head>
<body>
    <div id="ui">
        SCORE: <span id="scoreVal">0</span><br/>
        LIVES: <span id="livesVal">3</span>
    </div>
    <div id="world-ui">
        WORLD 1-<span id="levelVal">1</span>
    </div>

    <div id="overlay">
        <h1 id="title">GAME OVER</h1>
        <div style="font-size: 60px; margin-bottom: 20px;" id="emoji">💀</div>
        <div style="margin-bottom: 20px;">SCORE: <span id="finalScore" style="color: #facc15">0</span></div>
        <button onclick="resetGame()">TRY AGAIN</button>
    </div>

    <canvas id="gameCanvas" width="800" height="600"></canvas>

    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const overlay = document.getElementById('overlay');
        
        // Assets
        const avatarImg = new Image();
        avatarImg.src = "data:image/png;base64,{avatar_base64}";

        // Game Constants
        const GRAVITY = 0.5;
        const JUMP_FORCE = -14;
        const MOVE_SPEED = 5;
        const FRICTION = 0.8;
        const TERMINAL_VELOCITY = 12;
        const MAX_LEVEL = 3;
        
        let gameState = 'PLAYING'; 
        let score = 0;
        let lives = 3;
        let currentLevel = 1;
        let cameraX = 0;
        
        let player = {{ x: 50, y: 200, width: 40, height: 40, vx: 0, vy: 0, grounded: false, facingRight: true }};
        let platforms = [];
        let coins = [];
        let enemies = [];
        let keys = {{}};
        let finishLineX = 3000;

        // Level Generation
        function initLevel(lvl) {{
            platforms = []; coins = []; enemies = [];
            player.x = 50; player.y = 200; player.vx = 0; player.vy = 0; cameraX = 0;
            document.getElementById('levelVal').innerText = lvl;

            if (lvl === 1) {{
                finishLineX = 3000;
                for (let i = 0; i < 40; i++) {{
                    if (i !== 5 && i !== 12 && i !== 25) platforms.push({{ x: i * 100, y: 500, width: 100, height: 100, type: 'ground' }});
                }}
                platforms.push({{ x: 300, y: 350, width: 150, height: 40, type: 'brick' }});
                platforms.push({{ x: 600, y: 250, width: 40, height: 40, type: 'block' }});
                platforms.push({{ x: 640, y: 250, width: 40, height: 40, type: 'brick' }});
                platforms.push({{ x: 900, y: 350, width: 100, height: 40, type: 'brick' }});
                platforms.push({{ x: 1300, y: 300, width: 200, height: 40, type: 'brick' }});
                platforms.push({{ x: 1800, y: 440, width: 60, height: 60, type: 'pipe' }});
                platforms.push({{ x: 2200, y: 460, width: 40, height: 40, type: 'block' }});
                platforms.push({{ x: 3000, y: 460, width: 40, height: 40, type: 'block' }});

                [320, 360, 600, 1000, 1400].forEach((x, i) => coins.push({{ x, y: 200 + (i%2)*50, width: 20, height: 20, collected: false }}));
                enemies.push({{ x: 500, y: 460, width: 30, height: 30, vx: -2, type: 'goomba', dead: false }});
                enemies.push({{ x: 1000, y: 460, width: 30, height: 30, vx: -2, type: 'goomba', dead: false }});
            }} else if (lvl === 2) {{
                finishLineX = 3200;
                platforms.push({{ x: 0, y: 500, width: 300, height: 100, type: 'ground' }});
                platforms.push({{ x: 400, y: 400, width: 100, height: 40, type: 'brick' }});
                platforms.push({{ x: 600, y: 300, width: 100, height: 40, type: 'brick' }});
                platforms.push({{ x: 850, y: 400, width: 100, height: 40, type: 'brick' }});
                platforms.push({{ x: 1100, y: 500, width: 400, height: 40, type: 'ground' }});
                platforms.push({{ x: 1600, y: 350, width: 80, height: 40, type: 'block' }});
                platforms.push({{ x: 1800, y: 250, width: 80, height: 40, type: 'block' }});
                platforms.push({{ x: 1800, y: 550, width: 100, height: 40, type: 'brick' }});
                platforms.push({{ x: 2300, y: 450, width: 100, height: 40, type: 'brick' }});
                platforms.push({{ x: 3000, y: 500, width: 400, height: 100, type: 'ground' }});
                platforms.push({{ x: 3200, y: 460, width: 40, height: 40, type: 'block' }});
                
                coins.push({{ x: 640, y: 250, width: 20, height: 20, collected: false }});
                coins.push({{ x: 1830, y: 200, width: 20, height: 20, collected: false }});
                enemies.push({{ x: 1200, y: 460, width: 30, height: 30, vx: -3, type: 'goomba', dead: false }});
            }} else if (lvl === 3) {{
                finishLineX = 3500;
                platforms.push({{ x: 0, y: 500, width: 200, height: 100, type: 'ground' }});
                platforms.push({{ x: 300, y: 500, width: 60, height: 40, type: 'block' }});
                platforms.push({{ x: 450, y: 450, width: 60, height: 40, type: 'block' }});
                platforms.push({{ x: 600, y: 400, width: 60, height: 40, type: 'block' }});
                platforms.push({{ x: 950, y: 200, width: 40, height: 300, type: 'pipe' }});
                platforms.push({{ x: 1100, y: 500, width: 500, height: 40, type: 'ground' }});
                platforms.push({{ x: 1700, y: 400, width: 80, height: 40, type: 'brick' }});
                platforms.push({{ x: 2200, y: 550, width: 40, height: 40, type: 'block' }});
                platforms.push({{ x: 2900, y: 500, width: 600, height: 100, type: 'ground' }});
                platforms.push({{ x: 3500, y: 460, width: 40, height: 40, type: 'block' }});
                
                coins.push({{ x: 765, y: 300, width: 20, height: 20, collected: false }});
                enemies.push({{ x: 1200, y: 460, width: 30, height: 30, vx: -4, type: 'goomba', dead: false }});
            }}
        }}

        function resetGame() {{
            score = 0; lives = 3; currentLevel = 1; gameState = 'PLAYING';
            overlay.style.display = 'none';
            initLevel(1);
            loop();
        }}

        function showGameOver(win) {{
            gameState = 'GAMEOVER';
            overlay.style.display = 'block';
            document.getElementById('finalScore').innerText = score;
            const title = document.getElementById('title');
            const emoji = document.getElementById('emoji');
            
            if (win) {{
                title.innerText = "COURSE CLEAR!";
                title.className = "victory";
                emoji.innerText = "🏆";
            }} else {{
                title.innerText = "GAME OVER";
                title.className = "gameover";
                emoji.innerText = "💀";
            }}
        }}

        function colCheck(shapeA, shapeB) {{
            let vX = (shapeA.x + (shapeA.width / 2)) - (shapeB.x + (shapeB.width / 2));
            let vY = (shapeA.y + (shapeA.height / 2)) - (shapeB.y + (shapeB.height / 2));
            let hWidths = (shapeA.width / 2) + (shapeB.width / 2);
            let hHeights = (shapeA.height / 2) + (shapeB.height / 2);
            let colDir = null;
            if (Math.abs(vX) < hWidths && Math.abs(vY) < hHeights) {{
                let oX = hWidths - Math.abs(vX);
                let oY = hHeights - Math.abs(vY);
                if (oX >= oY) {{ if (vY > 0) {{ colDir = "t"; shapeA.y += oY; }} else {{ colDir = "b"; shapeA.y -= oY; }} }}
                else {{ if (vX > 0) {{ colDir = "l"; shapeA.x += oX; }} else {{ colDir = "r"; shapeA.x -= oX; }} }}
            }}
            return colDir;
        }}
        
        function checkOverlap(a, b) {{ return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }}

        // Controls
        window.addEventListener('keydown', e => keys[e.code] = true);
        window.addEventListener('keyup', e => keys[e.code] = false);

        function update() {{
            if (gameState !== 'PLAYING') return;
            
            // Movement
            if (keys['ArrowRight'] || keys['KeyD']) {{ if (player.vx < MOVE_SPEED) player.vx++; player.facingRight = true; }}
            if (keys['ArrowLeft'] || keys['KeyA']) {{ if (player.vx > -MOVE_SPEED) player.vx--; player.facingRight = false; }}
            if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && player.grounded) {{ player.vy = JUMP_FORCE; player.grounded = false; }}

            player.vx *= FRICTION; player.vy += GRAVITY; if (player.vy > TERMINAL_VELOCITY) player.vy = TERMINAL_VELOCITY;
            player.x += player.vx; player.y += player.vy; player.grounded = false;

            // Platforms
            platforms.forEach(p => {{ let dir = colCheck(player, p); if (dir === 'b') {{ player.grounded = true; player.vy = 0; }} else if (dir === 't') {{ player.vy *= -0.5; }} }});

            // Enemies
            enemies.forEach(e => {{
                if (e.dead) return;
                e.vy = (e.vy || 0) + GRAVITY; e.x += e.vx; e.y += e.vy;
                let eGrounded = false;
                platforms.forEach(p => {{ let dir = colCheck(e, p); if (dir === 'b') eGrounded = true; if (dir === 'l' || dir === 'r') e.vx *= -1; }});
                if(!eGrounded && e.y > 600) e.y = 500;
                
                if (checkOverlap(player, e)) {{
                    let hitFromAbove = player.vy > 0 && (player.y + player.height - player.vy) < e.y;
                    if (hitFromAbove) {{ e.dead = true; player.vy = -8; score += 100; }}
                    else {{ lives--; if (lives <= 0) showGameOver(false); else {{ player.x = 50; player.y = 200; player.vx = 0; player.vy = 0; cameraX = 0; }} }}
                }}
            }});

            // Coins
            coins.forEach(c => {{ if (!c.collected && checkOverlap(player, c)) {{ c.collected = true; score += 50; }} }});

            // Level End
            if (player.x > finishLineX) {{
                if (currentLevel < MAX_LEVEL) {{ currentLevel++; initLevel(currentLevel); }}
                else {{ showGameOver(true); }}
            }}

            // Pit
            if (player.y > 700) {{ lives--; if (lives <= 0) showGameOver(false); else {{ player.x = 50; player.y = 200; player.vx = 0; player.vy = 0; cameraX = 0; }} }}

            // Camera
            let targetCamX = player.x - 350;
            cameraX += (targetCamX - cameraX) * 0.1;
            if (cameraX < 0) cameraX = 0;
            
            document.getElementById('scoreVal').innerText = score;
            document.getElementById('livesVal').innerText = lives;
        }}

        function draw() {{
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(-cameraX, 0);

            // Sky
            if (currentLevel === 1) ctx.fillStyle = '#6b8cff'; else if (currentLevel === 2) ctx.fillStyle = '#4a6fa5'; else ctx.fillStyle = '#2d3748';
            ctx.fillRect(cameraX, 0, canvas.width, canvas.height);

            // Objects
            platforms.forEach(p => {{
                if (p.type === 'ground') ctx.fillStyle = '#5c9e60'; else if (p.type === 'brick') ctx.fillStyle = '#b85c3e'; else if (p.type === 'block') ctx.fillStyle = '#e8b756'; else ctx.fillStyle = '#28a828';
                ctx.fillRect(p.x, p.y, p.width, p.height); ctx.strokeRect(p.x, p.y, p.width, p.height);
            }});

            ctx.fillStyle = '#fff'; ctx.fillRect(finishLineX + 10, 100, 5, 360);
            ctx.fillStyle = 'red'; ctx.fillRect(finishLineX + 15, 100, 60, 40);

            ctx.fillStyle = '#ffd700'; coins.forEach(c => {{ if (!c.collected) {{ ctx.beginPath(); ctx.arc(c.x+10, c.y+10, 10, 0, Math.PI*2); ctx.fill(); ctx.stroke(); }} }});

            enemies.forEach(e => {{ if (!e.dead) {{ ctx.fillStyle = '#8b4513'; ctx.fillRect(e.x, e.y, e.width, e.height); ctx.fillStyle='white'; ctx.fillRect(e.x+5,e.y+5,8,8); ctx.fillRect(e.x+18,e.y+5,8,8); }} }});

            // Player
            let cx = player.x + 20; let cy = player.y + 22;
            let walk = Math.floor(Date.now()/100)%2; let move = Math.abs(player.vx)>0.5; let off = move ? (walk?3:-3) : 0;
            
            ctx.fillStyle = '#2563eb'; ctx.fillRect(cx-8+off, cy+12, 6, 8); ctx.fillRect(cx+2-off, cy+12, 6, 8); // Legs
            ctx.fillStyle = '#dc2626'; ctx.fillRect(cx-10, cy, 20, 12); // Shirt
            ctx.fillStyle = '#2563eb'; ctx.fillRect(cx-10, cy+6, 20, 6); ctx.fillRect(cx-8, cy, 4, 12); ctx.fillRect(cx+4, cy, 4, 12); // Overalls
            ctx.fillStyle = '#facc15'; ctx.fillRect(cx-7, cy+8, 2, 2); ctx.fillRect(cx+5, cy+8, 2, 2); // Buttons
            ctx.fillStyle = '#dc2626'; if(move) {{ ctx.fillRect(cx-14-off, cy+2, 4, 10); ctx.fillRect(cx+10+off, cy+2, 4, 10); }} else {{ ctx.fillRect(cx-14, cy+2, 4, 10); ctx.fillRect(cx+10, cy+2, 4, 10); }} // Arms

            // Head
            if (avatarImg.complete && avatarImg.src) {{
                let size = 36; let headY = player.y - 8;
                ctx.save(); ctx.beginPath(); ctx.arc(cx, headY + size/2, size/2, 0, Math.PI*2); ctx.clip();
                if (!player.facingRight) {{ ctx.translate(cx + size/2, headY); ctx.scale(-1, 1); ctx.drawImage(avatarImg, 0, 0, size, size); }}
                else {{ ctx.drawImage(avatarImg, cx - size/2, headY, size, size); }}
                ctx.restore();
            }} else {{
                ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(cx, player.y+10, 16, 0, Math.PI*2); ctx.fill();
            }}

            ctx.restore();
            requestAnimationFrame(draw);
        }}

        initLevel(1);
        setInterval(update, 1000/60);
        draw();
    </script>
</body>
</html>
    """

# -----------------------------------------------------------------------------
# MAIN APP UI
# -----------------------------------------------------------------------------

# Title Section
if st.session_state.step != 'PLAYING':
    st.markdown('<div class="game-title">TOON JUMP</div>', unsafe_allow_html=True)
    st.markdown('<div class="game-subtitle">Upload your face • Get Cartoonized • Play the Game</div>', unsafe_allow_html=True)

# Main Card
if st.session_state.step in ['MENU', 'READY']:
    
    st.markdown('<div class="main-card">', unsafe_allow_html=True)
    
    # 1. Preview Logic
    if st.session_state.avatar_b64:
        img_src = f"data:image/png;base64,{st.session_state.avatar_b64}"
        st.markdown(f"""
            <div class="preview-container">
                <img src="{img_src}" class="preview-img">
                <div class="pulse-ring"></div>
            </div>
        """, unsafe_allow_html=True)
    elif st.session_state.uploaded_file_id:
        # We can't easily display the bytes directly in CSS without converting to B64
        # But we can just use the placeholder until generated
        st.markdown("""
            <div class="preview-container">
                <div style="font-size: 3rem; opacity: 0.5;">📸</div>
            </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
            <div class="preview-container">
                <div style="font-size: 4rem; opacity: 0.2; color: white;">?</div>
            </div>
        """, unsafe_allow_html=True)

    # 2. Controls
    if st.session_state.step == 'MENU':
        uploaded_file = st.file_uploader("Upload Image", type=['jpg', 'jpeg', 'png'])
        
        if uploaded_file:
            # New upload detection
            if uploaded_file.file_id != st.session_state.uploaded_file_id:
                st.session_state.uploaded_file_id = uploaded_file.file_id
                st.session_state.avatar_b64 = None
                st.rerun()

            if st.button("GENERATE TOON"):
                with st.spinner("Gemini is painting your sprite..."):
                    bytes_data = uploaded_file.getvalue()
                    
                    # Resize to be safe
                    img = Image.open(io.BytesIO(bytes_data))
                    if img.width > 512:
                        ratio = 512 / float(img.width)
                        new_h = int(float(img.height) * ratio)
                        img = img.resize((512, new_h))
                    
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                        
                    buf = io.BytesIO()
                    img.save(buf, format='JPEG', quality=85)
                    
                    cartoon_bytes = generate_cartoon_avatar(buf.getvalue())
                    
                    if cartoon_bytes:
                        st.session_state.avatar_b64 = base64.b64encode(cartoon_bytes).decode('utf-8')
                        st.session_state.step = 'READY'
                        st.rerun()

    elif st.session_state.step == 'READY':
        # Start Game Button (styled green via CSS override)
        col1, col2 = st.columns([1, 1])
        with col1:
            if st.button("START GAME ▶"):
                st.session_state.step = 'PLAYING'
                st.rerun()
        with col2:
            if st.button("NEW PHOTO"):
                st.session_state.step = 'MENU'
                st.session_state.avatar_b64 = None
                st.session_state.uploaded_file_id = None
                st.rerun()

    st.markdown('</div>', unsafe_allow_html=True)

# Game Screen
if st.session_state.step == 'PLAYING':
    # Exit button at top
    if st.button("⬅ EXIT TO MENU", key="exit_btn"):
        st.session_state.step = 'MENU'
        st.rerun()
        
    game_html = get_game_html(st.session_state.avatar_b64)
    components.html(game_html, height=650, scrolling=False)

