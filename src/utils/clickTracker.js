import axios from 'axios';

class ClickTracker {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.isOnline = false;
    this.checkConnection();
  }

  async checkConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/test`, { timeout: 5000 });
      this.isOnline = response.status === 200;
    } catch (error) {
      this.isOnline = false;
    }
  }

  async getDeviceInfo() {
    try {
      // Get basic device info that's available in the browser
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      const language = navigator.language;
      const screenInfo = {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
      };

      // Get public IP (this requires an external service)
      let publicIp = 'Unavailable';
      try {
        const response = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
        publicIp = response.data.ip;
      } catch (e) {
        console.log('Could not get public IP:', e.message);
      }

      // Detect device type
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent.toLowerCase());
      const isDesktop = !isMobile && !isTablet;

      return {
        userAgent,
        platform,
        language,
        screen: screenInfo,
        publicIp,
        deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
        isMobile,
        isTablet,
        isDesktop,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return { error: error.message };
    }
  }

  async trackClick(button, page) {
    try {
      const deviceInfo = await this.getDeviceInfo();
      
      if (!this.isOnline) {
        console.warn('Offline mode: Click not tracked -', { button, page, deviceInfo });
        return false;
      }

      const response = await axios.post(
        `${this.baseUrl}/api/clicks`,
        {
          button,
          page,
          device: deviceInfo
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 seconds timeout
        }
      );

      if (response.status === 201) {
        console.log(`✅ Click tracked: ${button} on ${page}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error tracking click:', error);
      this.isOnline = false;
      return false;
    }
  }
}

// Create a singleton instance
export const clickTracker = new ClickTracker(process.env.REACT_APP_API_URL || '');

export default clickTracker;
