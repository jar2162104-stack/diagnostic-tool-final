export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientCase, diagnosis, transcript } = req.body;
  
  if (!clientCase || !diagnosis || !transcript) {
    return res.status(400).json({ error: 'Missing required fields' });
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
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: `You are a clinical supervisor providing feedback and grades on a student's diagnostic assessment.

ACTUAL CASE DETAILS:
- Correct Diagnosis: ${clientCase.actualDiagnosis}
- Key Symptoms: ${clientCase.keySymptoms.join(', ')}
- Duration: ${clientCase.duration}
- Client Background: ${clientCase.background}

STUDENT'S DIAGNOSTIC FORMULATION:
- Primary Diagnosis: ${diagnosis.primaryDiagnosis}
- Differential Diagnoses Considered: ${diagnosis.differentialDiagnoses || 'None provided'}
- DSM-5-TR Criteria Cited: ${diagnosis.dsmCriteria || 'None provided'}
- Treatment Plan: ${diagnosis.treatmentPlan}

INTERVIEW CONDUCTED:
${transcript}

GRADING RUBRIC (50 points total):

1. INTERVIEW THOROUGHNESS (8 points)
- 8: Excellent: 7+ substantive questions covering all key areas
- 6: Good: 5-6 substantive questions covering most key areas
- 4: Satisfactory: 4-5 questions covering some key areas
- 2: Needs Improvement: 3 or fewer questions, significant gaps
- 0: Insufficient: Minimal questioning

2. DIAGNOSTIC ACCURACY (12 points)
- 12: Excellent: Correct primary diagnosis with appropriate specifiers
- 9: Good: Correct diagnosis category, minor errors in specifiers
- 6: Satisfactory: Related diagnosis (correct disorder family)
- 3: Needs Improvement: Incorrect diagnosis but in related category
- 0: Insufficient: Completely incorrect or missing

3. DSM-5-TR CRITERIA APPLICATION (12 points)
- 12: Excellent: Accurately identifies all relevant criteria with specific evidence
- 9: Good: Identifies most criteria with supporting evidence
- 6: Satisfactory: Identifies some criteria, missing key elements
- 3: Needs Improvement: Vague criteria citation
- 0: Insufficient: No criteria cited or completely inaccurate

4. DIFFERENTIAL DIAGNOSIS & CLINICAL REASONING (12 points)
- 12: Excellent: Identifies appropriate alternatives with clear ruling-out rationale
- 9: Good: Considers relevant alternatives with reasonable process
- 6: Satisfactory: Mentions some alternatives but limited rationale
- 3: Needs Improvement: Minimal consideration of alternatives
- 0: Insufficient: No differential diagnosis provided

5. TREATMENT PLAN APPROPRIATENESS (6 points)
- 6: Excellent: Evidence-based plan appropriate for diagnosis with specifics
- 4: Good: Appropriate recommendations, generally evidence-based
- 3: Satisfactory: Basic appropriate recommendations lacking specificity
- 2: Needs Improvement: Vague or partially inappropriate
- 0: Insufficient: Inappropriate or missing

INSTRUCTIONS:
First, provide your detailed feedback in narrative form covering:
1. Diagnostic accuracy evaluation
2. Interview quality assessment
3. DSM-5-TR criteria application review
4. Differential diagnosis commentary
5. Treatment plan appropriateness
6. Overall clinical reasoning
7. Specific learning points for improvement

Then, at the end, provide grades in this EXACT format:

===== RUBRIC GRADES =====
Interview Thoroughness: [score]/8 - [brief justification]
Diagnostic Accuracy: [score]/12 - [brief justification]
DSM-5-TR Criteria Application: [score]/12 - [brief justification]
Differential Diagnosis & Clinical Reasoning: [score]/12 - [brief justification]
Treatment Plan Appropriateness: [score]/6 - [brief justification]

TOTAL SCORE: [sum]/50

===== END GRADES =====

Be fair, constructive, and educational. Provide specific examples from their work.`
        }],
      })
    });

    const data = await response.json();
    const fullFeedback = data.content[0].text;
    
    // Parse grades from feedback
    const gradesMatch = fullFeedback.match(/===== RUBRIC GRADES =====([\s\S]*?)===== END GRADES =====/);
    let parsedGrades = null;
    
    if (gradesMatch) {
      const gradesText = gradesMatch[1];
      const parseGrade = (text, criterion, maxPoints) => {
        const regex = new RegExp(`${criterion}:\\s*(\\d+)/${maxPoints}`);
        const match = text.match(regex);
        return match ? parseInt(match[1]) : 0;
      };

      parsedGrades = {
        interviewThoroughness: parseGrade(gradesText, 'Interview Thoroughness', 8),
        diagnosticAccuracy: parseGrade(gradesText, 'Diagnostic Accuracy', 12),
        dsmCriteriaApplication: parseGrade(gradesText, 'DSM-5-TR Criteria Application', 12),
        differentialDiagnosis: parseGrade(gradesText, 'Differential Diagnosis & Clinical Reasoning', 12),
        treatmentPlanAppropriateness: parseGrade(gradesText, 'Treatment Plan Appropriateness', 6)
      };

      parsedGrades.total = Object.values(parsedGrades).reduce((sum, val) => sum + val, 0);
    }
    
    return res.status(200).json({ 
      feedback: fullFeedback,
      grades: parsedGrades
    });
  } catch (error) {
    console.error('Error grading:', error);
    return res.status(500).json({ error: 'Failed to generate feedback' });
  }
}
