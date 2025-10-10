// src/services/SpellCheckerService.js
import axios from "axios";

const API_KEY = process.env.REACT_APP_EDEN_AI_API_KEY;

const spellCheck = async (text) => {
  try {
    const options = {
      method: "POST",
      url: "https://api.edenai.run/v2/text/spell_check",
      headers: {
        authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        providers: "microsoft,openai",
        text: text,
        language: "en",
      },
    };

    const response = await axios.request(options);
    const suggestions = [];
    if (response.data.microsoft?.items) {
      suggestions.push(
        ...response.data.microsoft.items.map((item) => ({
          original: item.text,
          suggestion: item.suggestions[0]?.suggestion || item.text,
          offset: item.offset,
        }))
      );
    }
    if (response.data.openai?.items) {
      suggestions.push(
        ...response.data.openai.items.map((item) => ({
          original: item.text,
          suggestion: item.suggestions[0]?.suggestion || item.text,
          offset: item.offset,
        }))
      );
    }
    return { suggestions, correctedText: response.data.microsoft?.corrected_text || text };
  } catch (error) {
    console.error("Spell check error:", error);
    return { suggestions: [], error: error.response?.status === 429 ? "Rate limit exceeded. Please try again later." : "Spell check failed." };
  }
};

export default { spellCheck };