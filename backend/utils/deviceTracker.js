//backend/utils/deviceTracker.js
import { UAParser } from 'ua-parser-js';
class DeviceTracker {
  constructor() {
    this.parser = new UAParser();
    this.deviceId = this.generateDeviceId();
    this.sessionId = this.generateSessionId();
  }

  generateDeviceId() {
    // Try to get existing device ID from localStorage
    let deviceId = localStorage.getItem('deviceId');
    
    if (!deviceId) {
      // Generate new device ID based on available information
      const components = [
        this.parser.getBrowser().name,
        this.parser.getOS().name,
        this.parser.getDevice().type,
        navigator.language,
        navigator.userAgent,
        screen.width,
        screen.height,
        new Date().getTime()
      ].filter(Boolean).join('|');
      
      deviceId = btoa(components).substring(0, 32);
      localStorage.setItem('deviceId', deviceId);
    }
    
    return deviceId;
  }

  generateSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    
    return sessionId;
  }

  collectDeviceInfo() {
    const ua = this.parser.getResult();
    
    // Get connection information
    const connection = navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    } : {
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0
    };

    return {
      deviceId: this.deviceId,
      sessionId: this.sessionId,
      browser: ua.browser,
      os: ua.os,
      device: ua.device,
      engine: ua.engine,
      cpu: ua.cpu,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth
      },
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      connection: connection,
      capabilities: {
        cookies: navigator.cookieEnabled,
        javascript: true,
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage,
        touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        webGL: this.detectWebGL()
      }
    };
  }

  detectWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  async trackClick(button, page, coordinates = null) {
    const deviceInfo = this.collectDeviceInfo();
    
    const clickData = {
      button,
      page,
      coordinates: coordinates || { x: 0, y: 0 },
      sessionId: this.sessionId,
      referrer: document.referrer,
      url: window.location.href,
      ...deviceInfo
    };

    try {
      const response = await fetch('http://localhost:3001/api/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clickData)
      });

      if (!response.ok) {
        console.warn('Failed to track click:', await response.text());
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error tracking click:', error);
      // You might want to queue failed requests for retry
    }
  }

  // Method to attach click listeners automatically
  autoTrack(buttonSelectors = [], pageName = null) {
    const page = pageName || document.title;
    
    buttonSelectors.forEach(selector => {
      document.addEventListener('click', (event) => {
        const element = event.target.closest(selector);
        if (element) {
          const buttonText = element.textContent?.trim() || 
                            element.getAttribute('aria-label') || 
                            element.id || 
                            selector;
          
          const coordinates = {
            x: event.clientX,
            y: event.clientY
          };
          
          this.trackClick(buttonText, page, coordinates);
        }
      });
    });
  }
}

// Create singleton instance
const deviceTracker = new DeviceTracker();

export default deviceTracker;