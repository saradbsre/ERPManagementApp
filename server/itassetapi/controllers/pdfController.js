const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

exports.extractPdfData = async (req, res) => {
  try {
    const { pdfText, base64Data } = req.body;

    if (!GEMINI_API_KEY) {
      return res.status(400).json({
        error: "Gemini API key not configured on server"
      });
    }

    if (!pdfText && !base64Data) {
      return res.status(400).json({
        error: "No PDF text or base64 data provided"
      });
    }

    const prompt = `You are a document data extraction expert. Extract the following information from the document.

Return ONLY a valid JSON object with these exact fields (use null if not found):
{
  "productName": "the product or service name",
  "billingAddress": "the complete billing address",
  "cost": the total amount as a number (without currency symbol),
  "currency": "currency code (USD, AED, EUR, etc.)"
}

Important:
- If cost is not a number, try to extract just the numeric value
- If currency is unclear, use null
- Extract exactly as found in the document
- Return ONLY the JSON object, no markdown, no extra text

${pdfText ? `Document text:\n${pdfText.substring(0, 3000)}` : ''}`;

    const requestBody = base64Data
      ? {
          contents: [
            {
              parts: [
                {
                  text: prompt
                },
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: base64Data
                  }
                }
              ]
            }
          ]
        }
      : {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        };

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const extractedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let data = {};
    try {
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      data = {
        productName: null,
        billingAddress: null,
        cost: null,
        currency: null
      };
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error("PDF extraction error:", error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.error?.message || error.message || "Failed to extract PDF data"
    });
  }
};

