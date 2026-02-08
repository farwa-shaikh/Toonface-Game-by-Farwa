import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { generateCartoonAvatar } from './services/geminiService';
import { GameState } from './types';

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cartoonUrl, setCartoonUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [isVictory, setIsVictory] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelectedImage(ev.target?.result as string);
        setError(null);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;
    setLoading(true);
    setError(null);
    setGameState(GameState.GENERATING);

    try {
      const generated = await generateCartoonAvatar(selectedImage);
      setCartoonUrl(generated);
      setGameState(GameState.MENU); // Back to menu, but now ready to play
    } catch (err: any) {
        console.error(err);
      setError("Failed to generate cartoon. Please ensure your API key is valid and the image is clear.");
      setGameState(GameState.MENU);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    if (cartoonUrl) {
      setGameState(GameState.PLAYING);
    }
  };

  const handleGameOver = (score: number, win: boolean) => {
    setFinalScore(score);
    setIsVictory(win);
    setGameState(win ? GameState.VICTORY : GameState.GAME_OVER);
  };

  const handleBackToMenu = () => {
      setGameState(GameState.MENU);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
          <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-4xl z-10">
        
        {/* HEADER */}
        {gameState !== GameState.PLAYING && (
            <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] tracking-tighter">
                TOON JUMP
            </h1>
            <p className="text-blue-200 mt-2 text-sm md:text-base">Upload your face &bull; Get Cartoonized &bull; Play the Game</p>
            </div>
        )}

        {/* LOADING */}
        {gameState === GameState.GENERATING && (
          <div className="bg-slate-800 p-12 rounded-2xl shadow-2xl text-center border-2 border-slate-600 animate-pulse">
            <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl text-white font-bold mb-2">Generating Sprite...</h2>
            <p className="text-slate-400">The Gemini AI is painting your pixel avatar.</p>
          </div>
        )}

        {/* MENU / UPLOAD */}
        {gameState === GameState.MENU && (
          <div className="bg-slate-800/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-slate-600 flex flex-col md:flex-row gap-8 items-center">
            
            <div className="flex-1 w-full space-y-6">
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 border-dashed border-2 hover:border-blue-500 transition-colors cursor-pointer relative group">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                    />
                    <div className="text-center">
                        <div className="text-4xl mb-2">📸</div>
                        <p className="text-slate-300 font-bold group-hover:text-blue-400">Tap to Upload Photo</p>
                        <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-xs">
                        {error}
                    </div>
                )}
            </div>

            {/* PREVIEW SECTION */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="relative w-48 h-48 bg-slate-900 rounded-full border-4 border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
                    {cartoonUrl ? (
                         <img src={cartoonUrl} alt="Cartoon" className="w-full h-full object-cover" />
                    ) : selectedImage ? (
                        <img src={selectedImage} alt="Original" className="w-full h-full object-cover opacity-50 grayscale" />
                    ) : (
                        <span className="text-4xl opacity-20">?</span>
                    )}
                    
                    {cartoonUrl && (
                        <div className="absolute inset-0 ring-4 ring-yellow-400 rounded-full animate-pulse"></div>
                    )}
                </div>

                <div className="flex gap-4">
                    {!cartoonUrl ? (
                         <button 
                         onClick={handleGenerate}
                         disabled={!selectedImage || loading}
                         className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transform transition hover:scale-105 active:scale-95 ${
                             !selectedImage ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1'
                         }`}
                        >
                         GENERATE TOON
                        </button>
                    ) : (
                        <button 
                        onClick={handleStartGame}
                        className="px-8 py-3 rounded-xl font-bold text-white shadow-lg transform transition hover:scale-110 active:scale-95 bg-green-500 hover:bg-green-400 border-b-4 border-green-700 active:border-b-0 active:translate-y-1 animate-bounce"
                       >
                        START GAME ▶
                       </button>
                    )}
                </div>
            </div>
          </div>
        )}

        {/* GAME CANVAS */}
        {gameState === GameState.PLAYING && cartoonUrl && (
            <div className="flex justify-center">
                <GameCanvas 
                    avatarUrl={cartoonUrl} 
                    onGameOver={handleGameOver}
                    onBack={handleBackToMenu}
                />
            </div>
        )}

        {/* GAME OVER / VICTORY */}
        {(gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) && (
             <div className="bg-slate-800 p-12 rounded-2xl shadow-2xl text-center border-2 border-slate-600 max-w-md mx-auto">
                <h2 className={`text-4xl font-bold mb-4 ${gameState === GameState.VICTORY ? 'text-green-400' : 'text-red-500'}`}>
                    {gameState === GameState.VICTORY ? 'COURSE CLEAR!' : 'GAME OVER'}
                </h2>
                <div className="text-6xl mb-6">
                    {gameState === GameState.VICTORY ? '🏆' : '💀'}
                </div>
                <p className="text-white text-xl mb-8">Final Score: <span className="text-yellow-400">{finalScore}</span></p>
                
                <div className="flex flex-col gap-4">
                    <button 
                        onClick={handleStartGame}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
                    >
                        TRY AGAIN
                    </button>
                    <button 
                        onClick={() => {
                            setGameState(GameState.MENU);
                            setCartoonUrl(null);
                            setSelectedImage(null);
                        }}
                        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold border-b-4 border-slate-900 active:border-b-0 active:translate-y-1"
                    >
                        NEW PHOTO
                    </button>
                </div>
             </div>
        )}
      </div>

      <div className="fixed bottom-2 right-2 text-xs text-slate-500">
          Powered by Gemini 2.5 Flash Image & React
      </div>
    </div>
  );
}

export default App;