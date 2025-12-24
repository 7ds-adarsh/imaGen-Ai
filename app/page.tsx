'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react";

interface GeneratedImage {
  id: string;
  prompt: string;
  image: string;
  timestamp: number;
  generationTime?: number;
  isFavorite?: boolean;
  _id?: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [dbImages, setDbImages] = useState<GeneratedImage[]>([]);
  const [loadingDbImages, setLoadingDbImages] = useState(false);
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);
  const [imageCache, setImageCache] = useState<Map<string, { image: string; timestamp: number }>>(new Map());
  const [requestQueue, setRequestQueue] = useState<{ prompt: string; resolve: (value: any) => void; reject: (reason?: any) => void }[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  let themeref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    // Load recent prompts from localStorage
    const savedPrompts = localStorage.getItem('recentPrompts');
    if (savedPrompts) {
      setRecentPrompts(JSON.parse(savedPrompts));
    }

    // Load image cache from localStorage
    const savedCache = localStorage.getItem('imageCache');
    if (savedCache) {
      try {
        const cacheData = JSON.parse(savedCache);
        const cacheMap = new Map();
        Object.entries(cacheData).forEach(([key, value]: [string, any]) => {
          // Check if cache is still valid (24 hours)
          if (Date.now() - value.timestamp < 24 * 60 * 60 * 1000) {
            cacheMap.set(key, value);
          }
        });
        setImageCache(cacheMap);
      } catch (error) {
        console.error('Failed to load image cache:', error);
      }
    }

    // Network status monitoring
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      themeref.current?.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      
    } else {
      themeref.current?.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Queue management function
  const processQueue = async () => {
    if (isProcessingQueue || requestQueue.length === 0) return;

    setIsProcessingQueue(true);
    const currentRequest = requestQueue[0];

    try {
      const result = await generateImageInternal(currentRequest.prompt);
      currentRequest.resolve(result);
    } catch (error) {
      currentRequest.reject(error);
    } finally {
      setRequestQueue(prev => prev.slice(1));
      setIsProcessingQueue(false);
      // Process next item in queue
      if (requestQueue.length > 1) {
        setTimeout(processQueue, 100);
      }
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) return;

    // Check cache first
    const cacheKey = prompt.trim().toLowerCase();
    const cachedImage = imageCache.get(cacheKey);
    if (cachedImage && Date.now() - cachedImage.timestamp < 24 * 60 * 60 * 1000) {
      setImage(cachedImage.image);
      setError(null);
      // Update recent prompts
      const updatedPrompts = [prompt.trim(), ...recentPrompts.filter(p => p !== prompt.trim())].slice(0, 10);
      setRecentPrompts(updatedPrompts);
      localStorage.setItem('recentPrompts', JSON.stringify(updatedPrompts));
      return;
    }

    // Add to queue if already processing
    if (isProcessingQueue) {
      return new Promise((resolve, reject) => {
        setRequestQueue(prev => [...prev, { prompt: prompt.trim(), resolve, reject }]);
      });
    }

    // Process immediately
    try {
      const result = await generateImageInternal(prompt.trim());
      return result;
    } catch (error) {
      throw error;
    }
  };

  const generateImageInternal = async (currentPrompt: string) => {
    setLoading(true);
    setError(null);
    setImage(null);
    setGenerationStartTime(Date.now());
    setProgress(0);
    setEstimatedTime('~10-15 seconds');
    setRetryCount(0);

    // Save prompt to recent prompts
    const updatedPrompts = [currentPrompt, ...recentPrompts.filter(p => p !== currentPrompt)].slice(0, 10);
    setRecentPrompts(updatedPrompts);
    localStorage.setItem('recentPrompts', JSON.stringify(updatedPrompts));

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 1000);

    const attemptGeneration = async (attempt: number = 1): Promise<any> => {
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: currentPrompt }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate image');
        }

        const generationTime = Date.now() - (generationStartTime || Date.now());
        const imageData = `data:${data.type || 'image/png'};base64,${data.image}`;

        // Cache the result
        const cacheKey = currentPrompt.toLowerCase();
        const newCache = new Map(imageCache);
        newCache.set(cacheKey, { image: imageData, timestamp: Date.now() });
        setImageCache(newCache);
        localStorage.setItem('imageCache', JSON.stringify(Object.fromEntries(newCache)));

        setImage(imageData);
        setProgress(100);

        // Add to history if saved to database
        if (data.savedImageId) {
          const newImage: GeneratedImage = {
            id: data.savedImageId,
            prompt: currentPrompt,
            image: imageData,
            timestamp: Date.now(),
            generationTime,
            isFavorite: false,
            _id: data.savedImageId,
          };
          setDbImages(prev => [newImage, ...prev]);
        }

        return { success: true, image: imageData };
      } catch (err) {
        const error = err as Error;
        console.error(`Generation attempt ${attempt} failed:`, error);

        // Retry logic with exponential backoff
        if (attempt < 3 && (
          error.message.includes('network') ||
          error.message.includes('timeout') ||
          error.message.includes('fetch') ||
          (error.message.includes('500') || error.message.includes('502') || error.message.includes('503') || error.message.includes('504'))
        )) {
          setRetryCount(attempt);
          setEstimatedTime(`Retrying... (${attempt}/3)`);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // 1s, 2s, 4s
          return attemptGeneration(attempt + 1);
        }

        throw error;
      }
    };

    try {
      const result = await attemptGeneration();
      return result;
    } catch (err) {
      const error = err as Error;
      let errorMessage = error.message;

      // Enhanced error handling
      if (networkStatus === 'offline') {
        errorMessage = 'You appear to be offline. Please check your internet connection and try again.';
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'API quota exceeded. Please try again later or consider upgrading your plan.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (retryCount > 0) {
        errorMessage = `Generation failed after ${retryCount + 1} attempts. ${error.message}`;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
      setGenerationStartTime(null);
      setProgress(0);
      setEstimatedTime(null);
      setRetryCount(0);
      clearInterval(progressInterval);
    }
  };

  const downloadImage = async () => {
    if (!image) return;
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-generated-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  const copyPrompt = async () => {
    if (!prompt.trim()) return;
    try {
      await navigator.clipboard.writeText(prompt.trim());
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  const clearForm = () => {
    setPrompt('');
    setImage(null);
    setError(null);
  };

  const loadFromHistory = (historyItem: GeneratedImage) => {
    setPrompt(historyItem.prompt);
    setImage(historyItem.image);
    setError(null);
  };

  const loadDbImages = async (favoritesOnly = false) => {
    setLoadingDbImages(true);
    try {
      const response = await fetch(`/api/images?favorites=${favoritesOnly}`);
      const data = await response.json();
      if (response.ok) {
        setDbImages(data.images.map((img: any) => ({
          id: img._id,
          prompt: img.prompt,
          image: `data:${img.contentType};base64,${img.imageData}`,
          timestamp: new Date(img.timestamp).getTime(),
          generationTime: img.generationTime,
          isFavorite: img.isFavorite,
          _id: img._id,
        })));
      }
    } catch (error) {
      console.error('Failed to load images from database:', error);
    } finally {
      setLoadingDbImages(false);
    }
  };

  const toggleFavorite = async (imageId: string) => {
    try {
      const response = await fetch('/api/images', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId, action: 'favorite' }),
      });

      if (response.ok) {
        const data = await response.json();
        setDbImages(prev =>
          prev.map(img =>
            img._id === imageId ? { ...img, isFavorite: data.isFavorite } : img
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const deleteDbImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/images?id=${imageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDbImages(prev => prev.filter(img => img._id !== imageId));
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        generateImage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [prompt]);

  // Process queue when items are added
  useEffect(() => {
    if (requestQueue.length > 0 && !isProcessingQueue) {
      processQueue();
    }
  }, [requestQueue, isProcessingQueue]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500/20 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-pink-500/20 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-blue-500/20 rounded-full animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-40 right-10 w-20 h-20 bg-indigo-500/20 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => {
            setShowFavorites(!showFavorites);
            if (!showFavorites) {
              loadDbImages(true);
            }
          }}
          className="p-3 rounded-full glass-effect hover:bg-white/20 transition-all duration-300 hover:scale-110 animate-fade-in"
          aria-label="Toggle favorites"
        >
          ❤️
        </button>
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) {
              loadDbImages(false);
            }
          }}
          className="p-3 rounded-full glass-effect hover:bg-white/20 transition-all duration-300 hover:scale-110 animate-fade-in"
          aria-label="Toggle history"
          style={{ animationDelay: '0.1s' }}
        >
          📚
        </button>
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full glass-effect hover:bg-white/20 transition-all duration-300 hover:scale-110 animate-fade-in"
          aria-label="Toggle theme"
          style={{ animationDelay: '0.2s' }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="max-w-4xl w-full flex gap-6">
        {/* Main Generator */}
        <div className="flex-1 max-w-md glass-effect rounded-2xl shadow-2xl p-8 animate-slide-up backdrop-blur-xl border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-2">
              Create Amazing Images
            </h1>
            <p className="text-white/80 text-sm">Powered by AI • Instant Generation</p>
          </div>

          <div className="mb-4">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter your prompt:
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate... (Ctrl+Enter to generate)"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-white placeholder-white/60 resize-none transition-all duration-300 backdrop-blur-sm"
              rows={3}
            />
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-white/70 mr-2">Categories:</span>
                {[
                  { label: "Landscape", prompt: "landscape, scenic view, nature" },
                  { label: "Portrait", prompt: "portrait, person, face" },
                  { label: "Abstract", prompt: "abstract art, geometric shapes" },
                  { label: "Animal", prompt: "animal, wildlife, creature" },
                  { label: "City", prompt: "urban cityscape, buildings" }
                ].map((category) => (
                  <button
                    key={category.label}
                    onClick={() => setPrompt(prev => prev ? `${prev}, ${category.prompt}` : category.prompt)}
                    className="px-3 py-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-white/70 mr-2">Suggestions:</span>
                {[
                  "A beautiful sunset over mountains",
                  "A futuristic city at night",
                  "A cute cartoon character",
                  "Abstract geometric art",
                  "A serene lake in autumn"
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setPrompt(suggestion)}
                    className="px-3 py-1 text-xs bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-300 hover:scale-105 backdrop-blur-sm border border-white/10"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              {recentPrompts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-white/70 mr-2">Recent:</span>
                  {recentPrompts.slice(0, 5).map((recentPrompt, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(recentPrompt)}
                      className="px-3 py-1 text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:from-green-600 hover:to-emerald-600 transition-all duration-300 hover:scale-105 shadow-lg truncate max-w-32"
                      title={recentPrompt}
                    >
                      {recentPrompt.length > 20 ? `${recentPrompt.substring(0, 20)}...` : recentPrompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={generateImage}
              disabled={loading || !prompt.trim()}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 shadow-xl font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </div>
              ) : (
                '✨ Generate Image'
              )}
            </button>
            <button
              onClick={copyPrompt}
              disabled={!prompt.trim()}
              className="p-3 bg-white/20 text-white rounded-xl hover:bg-white/30 disabled:opacity-50 transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/10"
              title="Copy prompt"
            >
              📋
            </button>
            <button
              onClick={clearForm}
              className="p-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/10"
              title="Clear form"
            >
              🗑️
            </button>
          </div>
          {loading && (
            <div className="mb-6 animate-fade-in">
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden backdrop-blur-sm border border-white/10">
                <div
                  className="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full transition-all duration-500 shadow-lg"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-sm text-white/80 mt-2 text-center font-medium">
                {estimatedTime}
                {requestQueue.length > 0 && (
                  <div className="text-xs text-white/60 mt-1">
                    {requestQueue.length} request{requestQueue.length > 1 ? 's' : ''} in queue
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl backdrop-blur-sm animate-fade-in">
              <div className="flex items-start gap-3">
                <span className="text-red-400 text-xl">
                  {networkStatus === 'offline' ? '📶' : '⚠️'}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-red-200">
                    {networkStatus === 'offline' ? 'Connection Lost' : 'Generation failed'}
                  </p>
                  <p className="text-sm mt-1 text-red-100">{error}</p>
                  <div className="flex gap-2 mt-3">
                    {networkStatus === 'online' && (
                      <button
                        onClick={() => generateImage()}
                        className="px-3 py-1 bg-red-600/50 hover:bg-red-600/70 text-red-200 text-sm rounded-lg transition-colors"
                      >
                        Retry
                      </button>
                    )}
                    <p className="text-xs text-red-300 self-center">
                      {networkStatus === 'offline'
                        ? 'Please check your internet connection.'
                        : 'Try rephrasing your prompt or try again.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {image && (
            <div className="mt-8 animate-slide-up">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  ✨ Generated Image:
                  {(() => {
                    const cacheKey = prompt.trim().toLowerCase();
                    const cachedImage = imageCache.get(cacheKey);
                    return cachedImage && Date.now() - cachedImage.timestamp < 24 * 60 * 60 * 1000 ? (
                      <span key="cached-badge" className="ml-2 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                        ⚡ Cached
                      </span>
                    ) : null;
                  })()}
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={downloadImage}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 hover:scale-105 shadow-lg font-medium"
                    title="Download image"
                  >
                    📥 Download
                  </button>
                  <button
                    onClick={() => navigator.share?.({ title: 'AI Generated Image', url: image })}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 hover:scale-105 shadow-lg font-medium"
                    title="Share image"
                  >
                    📤 Share
                  </button>
                </div>
              </div>
              <div className="relative">
                <img
                  src={image}
                  alt="Generated"
                  className="w-full rounded-2xl shadow-2xl border border-white/20 backdrop-blur-sm"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl pointer-events-none"></div>
              </div>
            </div>
          )}
        </div>

        {/* History/Favorites Sidebar */}
        {(showHistory || showFavorites) && (
          <div className="w-80 glass-effect rounded-2xl shadow-2xl p-6 animate-slide-up backdrop-blur-xl border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {showFavorites ? '❤️ Favorites' : '📚 History'} ({showFavorites ? dbImages.filter(img => img.isFavorite).length : dbImages.length})
              </h2>
              <div className="flex gap-3">
                {showHistory && (
                  <button
                    onClick={() => loadDbImages(false)}
                    className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/10"
                    disabled={loadingDbImages}
                  >
                    {loadingDbImages ? '⏳' : '↻'}
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowHistory(false);
                    setShowFavorites(false);
                  }}
                  className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/10"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loadingDbImages ? (
                <div className="text-center py-12 animate-fade-in">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                  <p className="text-white/70">Loading...</p>
                </div>
              ) : dbImages.length === 0 ? (
                <div className="text-center py-12 animate-fade-in">
                  <div className="text-5xl mb-4 animate-pulse-slow">{showFavorites ? '❤️' : '📚'}</div>
                  <p className="text-white/70 text-lg font-medium">
                    {showFavorites ? 'No favorite images yet' : 'No images in database'}
                  </p>
                  <p className="text-sm text-white/50 mt-2">
                    {showFavorites ? 'Mark images as favorites to see them here' : 'Generated images will be saved here'}
                  </p>
                </div>
              ) : (
                dbImages
                  .filter(img => !showFavorites || img.isFavorite)
                  .map((item) => (
                    <div key={item._id || item.id} className="bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/10 hover:border-white/20 animate-fade-in">
                      <img
                        src={item.image}
                        alt={item.prompt}
                        className="w-full h-28 object-cover rounded-lg mb-3 cursor-pointer hover:scale-105 transition-transform duration-300 shadow-lg"
                        onClick={() => loadFromHistory(item)}
                      />
                      <p className="text-sm text-white/90 mb-2 truncate font-medium" title={item.prompt}>
                        {item.prompt}
                      </p>
                      <div className="flex justify-between items-center text-xs text-white/70">
                        <span className="bg-white/20 px-2 py-1 rounded-full">{new Date(item.timestamp).toLocaleDateString()}</span>
                        {item.generationTime && <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded-full">{item.generationTime}ms</span>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleFavorite(item._id!)}
                            className={`p-1 rounded-lg transition-all duration-300 hover:scale-110 ${item.isFavorite ? 'text-red-400 bg-red-500/20' : 'text-white/60 hover:text-red-400 hover:bg-red-500/20'}`}
                            title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            ❤️
                          </button>
                          <button
                            onClick={() => loadFromHistory(item)}
                            className="p-1 text-blue-400 hover:text-blue-300 transition-all duration-300 hover:scale-110 hover:bg-blue-500/20 rounded-lg"
                            title="Load prompt"
                          >
                            ↻
                          </button>
                          <button
                            onClick={() => deleteDbImage(item._id!)}
                            className="p-1 text-red-400 hover:text-red-300 transition-all duration-300 hover:scale-110 hover:bg-red-500/20 rounded-lg"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
