/**
 * Chat Controller for Groq AI integration
 */

const chatWithGemini = async (req, res, next) => {
    try {
        const { message } = req.body;
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ 
                success: false, 
                message: 'Groq API key not configured on server.' 
            });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are LifeLink Assistant, a helpful AI chatbot for the LifeLink Blood Donation Management System (BDMS). You help users with:
1. Blood donation eligibility — donors must be 18-65 years old, weigh at least 50kg, be in good health, and wait 60 days between donations
2. Blood types — explain compatibility (O- is universal donor, AB+ is universal recipient, etc.)
3. The donation process — what happens before, during and after donation
4. How to use the LifeLink platform — registration, login, requesting blood, checking inventory
5. Urgent blood needs — encourage donation for critical blood types

Keep responses short (2-3 sentences max), friendly, and medically accurate. Always encourage blood donation as a life-saving act.`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        const result = await response.json();

        if (response.ok && result.choices && result.choices[0]?.message?.content) {
            console.log('[Chat] Success with Groq (Llama 3.3)');
            return res.json({
                success: true,
                reply: result.choices[0].message.content
            });
        } else {
            console.error('[Chat] Groq Error:', result);
            throw new Error(result.error?.message || 'Failed to get response from Groq');
        }

    } catch (error) {
        console.error('[Chat] Exception:', error.message);
        res.status(502).json({ 
            success: false, 
            message: 'The AI assistant is currently unavailable.',
            error: error.message
        });
    }
};

module.exports = {
    chatWithGemini
};
