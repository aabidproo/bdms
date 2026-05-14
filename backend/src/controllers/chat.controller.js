/**
 * Chat Controller for Gemini AI integration
 */

const chatWithGemini = async (req, res, next) => {
    try {
        const { message } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ 
                success: false, 
                message: 'Gemini API key not configured on server.' 
            });
        }

        // We try a list of models to ensure compatibility
        const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];
        let lastError = null;

        for (const model of models) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ 
                                text: `You are LifeLink Assistant, a helpful AI chatbot for the LifeLink Blood Donation Management System (BDMS). You help users with:
1. Blood donation eligibility — donors must be 18-65 years old, weigh at least 50kg, be in good health, and wait 60 days between donations
2. Blood types — explain compatibility (O- is universal donor, AB+ is universal recipient, etc.)
3. The donation process — what happens before, during and after donation
4. How to use the LifeLink platform — registration, login, requesting blood, checking inventory
5. Urgent blood needs — encourage donation for critical blood types
6. Post-donation care — rest, hydration, avoid heavy lifting for 24 hours

Keep responses short (2-4 sentences max), friendly, and medically accurate. If asked something outside blood donation or the platform, politely redirect. Always encourage blood donation as a life-saving act. \n\nUser Message: ${message}` 
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 400
                        }
                    })
                });

                const result = await response.json();
                
                if (response.ok && result.candidates && result.candidates[0]?.content?.parts[0]) {
                    return res.json({
                        success: true,
                        reply: result.candidates[0].content.parts[0].text
                    });
                } else {
                    lastError = result.error?.message || 'Model failure';
                    continue;
                }
            } catch (err) {
                lastError = err.message;
                continue;
            }
        }

        res.status(502).json({ 
            success: false, 
            message: 'All Gemini models failed to respond.',
            error: lastError
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    chatWithGemini
};
