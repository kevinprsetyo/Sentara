/**
 * Safari Compatibility Polyfills and Fixes
 */

// Deteksi Safari
export const isSafari = () => {
  const ua = navigator.userAgent;
  return (
    /^((?!chrome|android).)*safari/i.test(ua) ||
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform && /Mac|iP(ad|hone|od)/.test(navigator.platform))
  );
};

// Deteksi iOS
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// Fix untuk 100vh di Safari mobile
export const initViewportHeightFix = () => {
  if (typeof window === 'undefined') return;
  
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);
  
  return () => {
    window.removeEventListener('resize', setVH);
    window.removeEventListener('orientationchange', setVH);
  };
};

// Fix untuk input focus di iOS
export const fixIOSInput = () => {
  if (!isIOS()) return;
  
  document.addEventListener('touchstart', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      // Force focus untuk mencegah zoom
      e.target.focus();
    }
  }, { passive: true });
};

// Apply semua fixes untuk Safari
export const applySafariFixes = () => {
  if (typeof window === 'undefined') return;
  
  console.log('🔄 Applying Safari compatibility fixes...');
  
  // Apply viewport height fix
  initViewportHeightFix();
  
  // Apply iOS input fixes
  if (isIOS()) {
    fixIOSInput();
  }
  
  // Fix untuk backdrop-filter di Safari < 14
  if (isSafari() && !CSS.supports('backdrop-filter', 'blur(1px)')) {
    console.log('⚠️ Backdrop-filter not supported, applying fallback');
    document.querySelectorAll('.backdrop-blur-sm').forEach(el => {
      el.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    });
  }
  
  // Fix untuk sticky position di Safari lama
  if (isSafari() && !CSS.supports('position', 'sticky')) {
    console.log('⚠️ Sticky position not supported');
  }
  
  console.log('✅ Safari compatibility fixes applied');
};

// Utility untuk menambahkan class Safari-spesifik
export const addSafariClasses = () => {
  if (typeof document === 'undefined') return;
  
  if (isSafari()) {
    document.documentElement.classList.add('is-safari');
  }
  
  if (isIOS()) {
    document.documentElement.classList.add('is-ios');
  }
};