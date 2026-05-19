/**
 * Chat Controller for Groq AI integration
 */

const getMockResponse = (message) => {
    const msg = message.toLowerCase();
    
    // ─── Custom Medical Emergency Handlers ──────────────────
    
    // Category A: Cracked Skull / Severe Head Injuries
    if (msg.includes('skull') || (msg.includes('head') && msg.includes('bleed')) || msg.includes('brain')) {
        return "🚨 **EMERGENCY WARNING (HEAD INJURY):** If someone has a suspected cracked skull or severe head injury, please **call emergency services (such as 911) IMMEDIATELY!** Keep the person completely still with their head and shoulders slightly elevated. **Do NOT apply direct pressure directly onto a suspected skull fracture** as this can push bone fragments into the brain; instead, cover the wound gently with sterile dressing/clean cloth and apply pressure around the edges to control bleeding. Monitor their breathing closely.";
    }

    // Category B: Severe Bleeding / Wounds
    if (msg.includes('bleed') || msg.includes('bleeding') || msg.includes('cut') || msg.includes('wound') || msg.includes('slash')) {
        return "🚨 **EMERGENCY WARNING (SEVERE BLEEDING):** If someone is bleeding intensely, please **call emergency services (such as 911) IMMEDIATELY!** Help them lie down and elevate the bleeding limb above heart level if safe. **Apply firm, direct pressure** to the wound using a clean cloth, sterile pad, or hands until paramedics arrive. Do not remove any objects embedded in the wound.";
    }

    // Category C: Unconsciousness / Fainting / CPR
    if (msg.includes('unconscious') || msg.includes('passed out') || msg.includes('faint') || msg.includes('fainted') || msg.includes('breathing')) {
        return "🚨 **EMERGENCY WARNING (UNCONSCIOUSNESS):** If someone is unconscious or unresponsive, please **call emergency services (such as 911) IMMEDIATELY!** Check if they are breathing. If they are breathing, roll them onto their side in the recovery position to keep their airway clear. If they are not breathing, begin **CPR (cardiopulmonary resuscitation)** immediately if you are trained.";
    }

    // Category D: Heart Attack / Stroke
    if (msg.includes('heart attack') || msg.includes('chest pain') || msg.includes('stroke') || msg.includes('seizure')) {
        return "🚨 **EMERGENCY WARNING (HEART ATTACK / STROKE):** If someone is experiencing chest pain, difficulty breathing, sudden face/arm/speech weakness (stroke), or a seizure, please **call emergency services (such as 911) IMMEDIATELY!** Keep them calm, sit them down comfortably, and do not leave them unattended.";
    }

    // Category E: General Accidents / Emergency / Ambulance
    if (msg.includes('accident') || msg.includes('crash') || msg.includes('ambulance') || msg.includes('911') || msg.includes('emergency') || msg.includes('injury')) {
        return "🚨 **EMERGENCY WARNING:** If there is an active medical emergency or accident, please **call emergency services (such as 911) IMMEDIATELY!** Ensure the area is safe, keep the injured person completely still to avoid spinal damage, and wait for professional paramedics to arrive.";
    }

    if (msg.includes('elig') || msg.includes('can i donate') || msg.includes('weight') || msg.includes('age')) {
        return "To be eligible to donate blood, you must be between 18 and 65 years old, weigh at least 50 kg (110 lbs), and be in good health. Additionally, you must wait at least 60 days between donations.";
    }
    if (msg.includes('blood type') || msg.includes('compatibility') || msg.includes('universal') || msg.includes('o-') || msg.includes('ab+')) {
        return "Blood type O- is the universal donor, meaning it can be given to anyone. AB+ is the universal recipient and can receive blood from any type. Other types have specific compatibility rules (e.g., A+ can donate to A+ and AB+).";
    }
    if (msg.includes('how to use') || msg.includes('register') || msg.includes('login') || msg.includes('request') || msg.includes('platform')) {
        return "To use LifeLink, simply sign up or register as a donor or recipient. Once logged in, you can create new blood requests, track active requests, or find local blood donation events and donors.";
    }
    if (msg.includes('process') || msg.includes('happen') || msg.includes('before') || msg.includes('after')) {
        return "The donation process is simple: 1. Registration & brief health screening. 2. Donation (takes 8-10 mins). 3. Rest & refreshments (10-15 mins). Be sure to drink plenty of fluids and eat a light meal before donating!";
    }
    if (msg.includes('urgent') || msg.includes('need') || msg.includes('critical')) {
        return "Urgent blood requests are posted on the main portal. If you are eligible, please log in and check if there are any active requests matching your blood type. Your donation can save up to three lives!";
    }
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('help')) {
        return "Hello! I am the LifeLink Assistant. I can answer questions about blood donation eligibility, blood compatibility, the donation process, or how to navigate the platform. How can I help you?";
    }
    return "Thank you for reaching out! As a LifeLink Assistant, I can tell you that every blood donation is a life-saving act. Please let me know if you have questions about eligibility, blood types, or how to request blood.";
};

const chatWithGemini = async (req, res, next) => {
    try {
        const { message } = req.body;
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            console.log('[Chat] Groq API key not configured. Using high-fidelity local AI mock.');
            const reply = getMockResponse(message);
            return res.json({
                success: true,
                reply: reply
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
6. Emergency situations — If a user describes an active, life-threatening medical emergency (such as intense bleeding, a cracked skull, severe accidents, heart attacks, or unconsciousness), you must IMMEDIATELY instruct them to call emergency services (like 911 or their local emergency number) and provide urgent first aid advice (like applying direct pressure). Do NOT give generic blood donation information.

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
