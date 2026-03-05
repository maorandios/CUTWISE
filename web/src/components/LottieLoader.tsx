import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';

interface LottieLoaderProps {
  message?: string;
  size?: number;
}

export const LottieLoader = ({ message, size = 200 }: LottieLoaderProps) => {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    // Load animation data from public folder
    fetch('/animations/Loading.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Error loading animation:', error));
  }, []);

  if (!animationData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 flex flex-col items-center shadow-lg">
        <Lottie 
          animationData={animationData}
          loop={true}
          style={{ width: size, height: size }}
        />
        {message && (
          <p className="text-center mt-4 text-gray-700 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};
