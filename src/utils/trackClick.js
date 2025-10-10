export const trackClick = async (button, page) => {
    try {
      await fetch("http://localhost:5000/api/clicks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ button, page }),
      });
    } catch (error) {
      console.error("Tracking failed:", error);
    }
  };
  