export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { category } = req.body;
  
  if (!category) {
    return res.status(400).json({ error: 'Category is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        temperature: 1.0,
        messages: [{
          role: "user",
          content: `You are a clinical psychology case generator for educational purposes. Create a realistic and unique case presentation for ONE disorder. Randomly select from: ${category}

IMPORTANT - CREATE VARIETY:
- Use diverse names (vary gender, ethnicity, age)
- Vary what brings them to therapy (work, relationships, trauma, health, life transition)
- Vary symptom severity (mild, moderate, severe)
- Vary demographics (age 18-65, different occupations, living situations, cultures)
- Make each case feel different and realistic

REQUIREMENTS:
1. Create a fictional client with realistic demographics
2. Generate a presenting problem that brings them to therapy
3. Include complex symptom presentation with at least 2 symptoms that overlap with other diagnoses
4. Vary symptom severity and include duration information
5. Add cultural/contextual factors that might influence presentation
6. Include some protective factors and strengths
7. Make symptoms realistic - not textbook obvious

IMPORTANT: Do NOT reveal the diagnosis. Present only as the client would present themselves.

Format your response as JSON:
{
  "clientName": "First name only",
  "age": number,
  "occupation": "string",
  "presentingProblem": "What brings them to therapy today (2-3 sentences in first person)",
  "background": "Brief relevant background (family, culture, stressors)",
  "actualDiagnosis": "The correct DSM-5-TR diagnosis",
  "keySymptoms": ["list of symptoms they're experiencing"],
  "duration": "How long symptoms have been present",
  "redHerrings": ["symptoms that might suggest other diagnoses"]
}

Return ONLY the JSON, no other text.`
        }],
      })
    });

    const data = await response.json();
    const content = data.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const caseData = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ case: caseData });
    } else {
      throw new Error('Could not parse case data');
    }
  } catch (error) {
    console.error('Error generating case:', error);
    return res.status(500).json({ error: 'Failed to generate case' });
  }
}
