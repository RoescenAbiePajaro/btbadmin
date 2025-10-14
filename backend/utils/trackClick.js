export const trackClick = async (button, page) => {
  try {
    // ✅ FIXED: Use environment variable for API URL
    const API_URL = process.env.REACT_APP_BACKEND_URL;
    
    await fetch(`${API_URL}/api/clicks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ button, page }),
    });
  } catch (error) {
    console.error("Tracking failed:", error);
  }
};