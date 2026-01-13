export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientCase, messages, newMessage } = req.body;
  
  if (!clientCase || !newMessage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const conversationHistory = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are roleplaying as a client named ${clientCase.clientName} seeking mental health treatment. 

YOUR CHARACTER DETAILS:
- Age: ${clientCase.age}
- Occupation: ${clientCase.occupation}
- Background: ${clientCase.background}
- Actual diagnosis: ${clientCase.actualDiagnosis}
- Key symptoms: ${clientCase.keySymptoms.join(', ')}
- Duration: ${clientCase.duration}
- Red herrings: ${clientCase.redHerrings.join(', ')}

INSTRUCTIONS:
1. Stay completely in character as this client
2. Answer questions naturally and realistically - not clinically
3. Reveal information gradually based on what you're asked
4. Show emotions appropriate to your condition
5. Include realistic details about daily life impact
6. Don't use clinical terminology unless the client would naturally know it
7. Be honest but not overly forthcoming - make the student work for information
8. Include both symptoms and some normal experiences
9. Show insight or lack thereof as appropriate to the condition
10. If asked about something not in your character details, improvise realistically

Remember: You're a real person struggling with mental health, not a textbook case.`,
        messages: [...conversationHistory, { role: 'user', content: newMessage }],
      })
    });

    const data = await response.json();
    return res.status(200).json({ response: data.content[0].text });
  } catch (error) {
    console.error('Error in chat:', error);
    return res.status(500).json({ error: 'Failed to get response' });
  }
}
