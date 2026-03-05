import { useState, useEffect, useRef } from 'react';
import Lottie from 'lottie-react';

interface LottieLoaderProps {
  message?: string;
  size?: number;
  animationPath?: string;
  width?: number;
  height?: number;
  overlay?: boolean;
}

// Cache for preloaded animations
const animationCache = new Map<string, any>();

export const LottieLoader = ({ 
  message, 
  size = 200, 
  animationPath = '/animations/Loading.json',
  width,
  height,
  overlay = true
}: LottieLoaderProps) => {
  const [animationData, setAnimationData] = useState<any>(animationCache.get(animationPath) || null);
  const lottieRef = useRef<any>(null);

  useEffect(() => {
    // If already cached, use it immediately
    if (animationCache.has(animationPath)) {
      setAnimationData(animationCache.get(animationPath));
      return;
    }

    // Load animation data from public folder
    fetch(animationPath)
      .then(response => response.json())
      .then(data => {
        animationCache.set(animationPath, data);
        setAnimationData(data);
      })
      .catch(error => console.error('Error loading animation:', error));
  }, [animationPath]);

  // Force play when animation data is loaded
  useEffect(() => {
    if (animationData && lottieRef.current) {
      lottieRef.current.play();
    }
  }, [animationData]);

  if (!animationData) {
    return null;
  }

  const animationWidth = width || size;
  const animationHeight = height || size;

  // If overlay is false, just return the animation without the wrapper
  if (!overlay) {
    return (
      <>
        <Lottie 
          lottieRef={lottieRef}
          animationData={animationData}
          loop={true}
          autoplay={true}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid slice'
          }}
          style={{ width: animationWidth, height: animationHeight }}
        />
        {message && (
          <p className="text-center mt-4 text-gray-700 font-medium">{message}</p>
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 flex flex-col items-center shadow-lg">
        <Lottie 
          lottieRef={lottieRef}
          animationData={animationData}
          loop={true}
          autoplay={true}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid slice'
          }}
          style={{ width: animationWidth, height: animationHeight }}
        />
        {message && (
          <p className="text-center mt-4 text-gray-700 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};
