import { useEffect, useState } from 'react';

/**
 * Custom hook to load images
 * Returns [image, status] where status is 'loading', 'loaded', or 'failed'
 */
function useImage(url) {
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!url) return;

    const img = new window.Image();

    img.onload = () => {
      setImage(img);
      setStatus('loaded');
    };

    img.onerror = () => {
      setStatus('failed');
    };

    img.src = url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return [image, status];
}

export default useImage;
