export const getDeviceIcon = (deviceType) => {
  if (!deviceType) return '❓';
  
  switch (deviceType.toLowerCase()) {
    case 'mobile': return '📱';
    case 'tablet': return '📟';
    case 'laptop': return '💻';
    case 'desktop': return '🖥️';
    default: return '❓';
  }
};

export const getOSIcon = (os) => {
  if (!os || os === 'Unknown') return '💻';
  
  const osLower = os.toLowerCase();
  if (osLower.includes('android')) return '🤖';
  if (osLower.includes('ios')) return '📱';
  if (osLower.includes('windows')) return '🪟';
  if (osLower.includes('macos') || osLower.includes('mac os')) return '🍎';
  if (osLower.includes('linux') || osLower.includes('ubuntu')) return '🐧';
  return '💻';
};

export const formatOSName = (os) => {
  if (!os || os === 'Unknown') return 'Unknown OS';
  return os;
};