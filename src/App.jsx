import React, { useState, useRef, useEffect } from 'react';
import { Send, FileDown, RefreshCw, CheckCircle, AlertCircle, Award } from 'lucide-react';

const DISORDER_CATEGORIES = {
  mood: {
    name: "Mood Disorders",
    disorders: "Major Depressive Disorder, Persistent Depressive Disorder (Dysthymia), Bipolar I Disorder, Bipolar II Disorder, Cyclothymic Disorder"
  },
  trauma: {
    name: "Trauma and Stressor-Related Disorders",
    disorders: "Posttraumatic Stress Disorder (PTSD), Acute Stress Disorder, Adjustment Disorders, Reactive Attachment Disorder"
  },
  anxiety: {
    name: "Anxiety Disorders",
    disorders: "Generalized Anxiety Disorder, Panic Disorder, Social Anxiety Disorder (Social Phobia), Specific Phobia, Agoraphobia"
  },
  ocd: {
    name: "Obsessive-Compulsive and Related Disorders",
    disorders: "Obsessive-Compulsive Disorder, Body Dysmorphic Disorder, Hoarding Disorder, Trichotillomania, Excoriation Disorder"
  },
  eating: {
    name: "Feeding and Eating Disorders",
    disorders: "Anorexia Nervosa, Bulimia Nervosa, Binge-Eating Disorder, Avoidant/Restrictive Food Intake Disorder (ARFID), Pica"
  },
  substance: {
    name: "Substance-Related and Addictive Disorders",
    disorders: "Alcohol Use Disorder, Cannabis Use Disorder, Stimulant Use Disorder, Opioid Use Disorder, Gambling Disorder"
  },
  psychotic: {
    name: "Schizophrenia Spectrum and Other Psychotic Disorders",
    disorders: "Schizophrenia, Schizoaffective Disorder, Brief Psychotic Disorder, Delusional Disorder, Schizophreniform Disorder"
  },
  personality: {
    name: "Personality Disorders",
    disorders: "Borderline Personality Disorder, Narcissistic Personality Disorder, Avoidant Personality Disorder, Antisocial Personality Disorder, Dependent Personality Disorder"
  },
  childhood: {
    name: "Neurodevelopmental and Disruptive Disorders",
    disorders: "Attention-Deficit/Hyperactivity Disorder (ADHD), Autism Spectrum Disorder, Oppositional Defiant Disorder, Conduct Disorder, Tourette's Disorder"
  }
};

export default function DiagnosticTool() {
  const [stage, setStage] = useState('category'); // category, instructions, interview, diagnosis, feedback
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [clientCase, setClientCase] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState({
    primaryDiagnosis: '',
    differentialDiagnoses: '',
    dsmCriteria: '',
    treatmentPlan: ''
  });
  const [feedback, setFeedback] = useState(null);
  const [grades, setGrades] = useState(null);
  const [sessionId] = useState(() => `DIAG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);

  const RUBRIC = {
    interviewThoroughness: {
      name: "Interview Thoroughness",
      maxPoints: 8,
      criteria: {
        8: "Excellent: 7+ substantive questions covering all key areas. Questions are open-ended and clinically appropriate.",
        6: "Good: 5-6 substantive questions covering most key areas. Generally appropriate clinical interviewing.",
        4: "Satisfactory: 4-5 questions covering some key areas. Some important areas missed.",
        2: "Needs Improvement: 3 or fewer questions, significant gaps in assessment areas.",
        0: "Insufficient: Minimal questioning, unable to gather adequate diagnostic information."
      }
    },
    diagnosticAccuracy: {
      name: "Diagnostic Accuracy",
      maxPoints: 12,
      criteria: {
        12: "Excellent: Correct primary diagnosis with appropriate specifiers.",
        9: "Good: Correct diagnosis category, minor errors in specifiers.",
        6: "Satisfactory: Related diagnosis (correct disorder family but wrong specific diagnosis).",
        3: "Needs Improvement: Incorrect diagnosis but in related category.",
        0: "Insufficient: Completely incorrect or missing diagnosis."
      }
    },
    dsmCriteriaApplication: {
      name: "DSM-5-TR Criteria Application",
      maxPoints: 12,
      criteria: {
        12: "Excellent: Accurately identifies all relevant criteria with specific evidence from interview. Demonstrates thorough understanding of diagnostic requirements.",
        9: "Good: Identifies most criteria with supporting evidence. Minor omissions or inaccuracies.",
        6: "Satisfactory: Identifies some criteria but missing key elements or insufficient evidence.",
        3: "Needs Improvement: Vague criteria citation, missing most specific requirements.",
        0: "Insufficient: No criteria cited or completely inaccurate criteria application."
      }
    },
    differentialDiagnosis: {
      name: "Differential Diagnosis & Clinical Reasoning",
      maxPoints: 12,
      criteria: {
        12: "Excellent: Identifies appropriate alternative diagnoses with clear ruling-out rationale. Shows sophisticated clinical reasoning.",
        9: "Good: Considers relevant alternatives with reasonable ruling-out process.",
        6: "Satisfactory: Mentions some alternatives but limited ruling-out rationale.",
        3: "Needs Improvement: Minimal consideration of alternatives or poor reasoning.",
        0: "Insufficient: No differential diagnosis provided or irrelevant alternatives."
      }
    },
    treatmentPlanAppropriateness: {
      name: "Treatment Plan Appropriateness",
      maxPoints: 6,
      criteria: {
        6: "Excellent: Evidence-based treatment plan appropriate for the diagnosis. Includes specific therapy modalities, considers medication, addresses safety/functioning.",
        4: "Good: Appropriate treatment recommendations, generally evidence-based, minor gaps.",
        3: "Satisfactory: Basic appropriate recommendations but lacking specificity or evidence base.",
        2: "Needs: Vague or partially inappropriate recommendations.",
        0: "Insufficient: Inappropriate treatment plan or missing entirely."
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callAPI = async (endpoint, body) => {
    const response = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    return response.json();
  };

  const generateCase = async () => {
    setLoading(true);
    try {
      const data = await callAPI('generate-case', {
        category: DISORDER_CATEGORIES[selectedCategory].disorders
      });
      
      setClientCase(data.case);
      
      const initialMessage = {
        role: 'assistant',
        content: `Hello, my name is ${data.case.clientName}. ${data.case.presentingProblem}`
      };
      
      setMessages([initialMessage]);
      setStage('interview');
    } catch (error) {
      console.error('Error generating case:', error);
      alert('Error generating case. Please try again.');
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const data = await callAPI('chat', {
        clientCase: clientCase,
        messages: messages,
        newMessage: inputMessage
      });
      
      const assistantMessage = {
        role: 'assistant',
        content: data.response
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, I seem to be having trouble responding right now.' 
      }]);
    }
    setLoading(false);
  };

  const submitDiagnosis = async () => {
    if (!diagnosis.primaryDiagnosis.trim() || !diagnosis.treatmentPlan.trim()) {
      alert('Please complete all required fields (Primary Diagnosis and Treatment Plan).');
      return;
    }

    setLoading(true);
    setStage('feedback');

    try {
      const interviewTranscript = messages.map(msg => 
        `${msg.role === 'user' ? 'Student' : clientCase.clientName}: ${msg.content}`
      ).join('\n\n');

      const data = await callAPI('grade', {
        clientCase: clientCase,
        diagnosis: diagnosis,
        transcript: interviewTranscript
      });
      
      setFeedback(data.feedback);
      setGrades(data.grades);
    } catch (error) {
      console.error('Error getting feedback:', error);
      setFeedback('Error generating feedback. Please try again.');
    }
    setLoading(false);
  };

  const exportResults = () => {
    const transcript = messages.map(msg => 
      `${msg.role === 'user' ? 'Student' : clientCase.clientName}: ${msg.content}`
    ).join('\n\n');

    const gradesSection = grades ? `
===== AUTOMATED RUBRIC GRADES =====
Interview Thoroughness: ${grades.interviewThoroughness}/8
Diagnostic Accuracy: ${grades.diagnosticAccuracy}/12
DSM-5-TR Criteria Application: ${grades.dsmCriteriaApplication}/12
Differential Diagnosis & Clinical Reasoning: ${grades.differentialDiagnosis}/12
Treatment Plan Appropriateness: ${grades.treatmentPlanAppropriateness}/6

TOTAL SCORE: ${grades.total}/50

NOTE TO INSTRUCTOR: These are AI-generated scores for initial review.
Please verify and adjust as needed in Canvas SpeedGrader.
=====================================
` : '';

    const exportContent = `DIAGNOSTIC TRAINING - SUBMISSION
Category: ${DISORDER_CATEGORIES[selectedCategory].name}
Session ID: ${sessionId}
Date: ${new Date().toLocaleString()}
Student Name: [Enter your name]

${gradesSection}

===== CASE INFORMATION =====
Client: ${clientCase.clientName}, Age ${clientCase.age}, ${clientCase.occupation}
Presenting Problem: ${clientCase.presentingProblem}

===== INTERVIEW TRANSCRIPT =====
${transcript}

===== STUDENT'S DIAGNOSTIC FORMULATION =====

Primary Diagnosis: ${diagnosis.primaryDiagnosis}

Differential Diagnoses Considered:
${diagnosis.differentialDiagnoses || 'None provided'}

DSM-5-TR Criteria Evidence:
${diagnosis.dsmCriteria || 'None provided'}

Treatment Plan:
${diagnosis.treatmentPlan}

===== CLINICAL SUPERVISOR FEEDBACK =====
${feedback}

===== VERIFICATION =====
Session ID: ${sessionId}
Completed: ${new Date().toLocaleString()}

===== STUDENT REFLECTION (Complete before submission) =====
[Write 1-2 paragraphs reflecting on:
1. What questions helped you most in forming your diagnosis?
2. What would you do differently in a real clinical setting?
3. What surprised you about the feedback?]`;

    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Diagnostic_Training_${sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetTool = () => {
    setStage('category');
    setSelectedCategory(null);
    setClientCase(null);
    setMessages([]);
    setInputMessage('');
    setDiagnosis({
      primaryDiagnosis: '',
      differentialDiagnoses: '',
      dsmCriteria: '',
      treatmentPlan: ''
    });
    setFeedback(null);
    setGrades(null);
  };

  const getLetterGrade = (score) => {
    if (score >= 45) return 'A';
    if (score >= 40) return 'B';
    if (score >= 35) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">
            Diagnostic Training Tool
          </h1>
          <p className="text-gray-600">
            Interactive clinical case simulation for PSY 266: Abnormal Psychology
          </p>
          {sessionId && stage !== 'category' && stage !== 'instructions' && (
            <p className="text-sm text-gray-500 mt-2">Session ID: {sessionId}</p>
          )}
        </div>

        {/* Category Selection Stage */}
        {stage === 'category' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Select Disorder Category</h2>
            
            <p className="text-gray-600 mb-6">
              Choose which category of disorders you'd like to practice diagnosing:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(DISORDER_CATEGORIES).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedCategory(key);
                    setStage('instructions');
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 rounded-lg p-4 text-left transition-all"
                >
                  <h3 className="font-semibold text-indigo-900 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-600">{category.disorders.split(',').length} disorder types</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Instructions Stage */}
        {stage === 'instructions' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Instructions</h2>
              <button
                onClick={() => setStage('category')}
                className="text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                ← Change Category
              </button>
            </div>

            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-6">
              <p className="font-semibold text-indigo-900">
                Selected Category: {DISORDER_CATEGORIES[selectedCategory].name}
              </p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Learning Objectives:</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Apply DSM-5-TR diagnostic criteria</li>
                  <li>Conduct effective clinical interviewing</li>
                  <li>Develop differential diagnoses</li>
                  <li>Create evidence-based treatment plans</li>
                </ul>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                <h3 className="font-semibold text-amber-900 mb-2">How This Works:</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li><strong>Generate Case:</strong> A unique client case will be created</li>
                  <li><strong>Interview Client:</strong> Ask questions to gather diagnostic information (minimum 5-7 questions)</li>
                  <li><strong>Formulate Diagnosis:</strong> Provide your diagnostic assessment with DSM-5-TR criteria</li>
                  <li><strong>Receive Feedback:</strong> Get detailed clinical supervisor feedback and automated rubric scores</li>
                  <li><strong>Export Results:</strong> Download complete session with grades for Canvas submission</li>
                </ol>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
                <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <Award size={18} />
                  Grading (50 points total):
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li><strong>Interview Thoroughness (8 pts):</strong> Quality and comprehensiveness of questions</li>
                  <li><strong>Diagnostic Accuracy (12 pts):</strong> Correctness of primary diagnosis</li>
                  <li><strong>DSM-5-TR Criteria (12 pts):</strong> Application of diagnostic criteria with evidence</li>
                  <li><strong>Differential Diagnosis (12 pts):</strong> Clinical reasoning and ruling-out process</li>
                  <li><strong>Treatment Plan (6 pts):</strong> Evidence-based and appropriate recommendations</li>
                </ul>
                <p className="text-sm text-purple-800 mt-2 italic">
                  Note: Grading emphasizes diagnostic accuracy and clinical reasoning skills.
                </p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4">
                <h3 className="font-semibold text-green-900 mb-2">Tips for Success:</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Review DSM-5-TR criteria before starting</li>
                  <li>Ask about symptom duration, severity, and functional impairment</li>
                  <li>Explore differential diagnoses carefully</li>
                  <li>Consider ruling out medical causes and substance use</li>
                  <li>Be thorough - each case is unique!</li>
                </ul>
              </div>
            </div>

            <button
              onClick={generateCase}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating Case...
                </>
              ) : (
                <>
                  <RefreshCw size={20} />
                  Generate Unique Client Case
                </>
              )}
            </button>
          </div>
        )}

        {/* Interview Stage */}
        {stage === 'interview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Clinical Interview</h2>
                  <p className="text-gray-600">Client: {clientCase.clientName}, Age {clientCase.age}</p>
                  <p className="text-sm text-indigo-600">Category: {DISORDER_CATEGORIES[selectedCategory].name}</p>
                </div>
                <button
                  onClick={() => setStage('diagnosis')}
                  className="bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={18} />
                  Ready to Diagnose
                </button>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Tip:</strong> Ask open-ended questions about presenting symptoms, onset/duration, severity, 
                  functional impairment, and relevant history. Aim for 5-7 substantive questions minimum.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto mb-4 space-y-3">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm font-semibold mb-1">
                        {msg.role === 'user' ? 'You' : clientCase.clientName}
                      </p>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 border border-gray-200 px-4 py-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                        <span className="text-sm">{clientCase.clientName} is typing...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your question..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !inputMessage.trim()}
                  className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Diagnosis Stage */}
        {stage === 'diagnosis' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Diagnostic Formulation</h2>
              <button
                onClick={() => setStage('interview')}
                className="text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                ← Back to Interview
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Primary Diagnosis <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={diagnosis.primaryDiagnosis}
                  onChange={(e) => setDiagnosis({...diagnosis, primaryDiagnosis: e.target.value})}
                  placeholder="e.g., Major Depressive Disorder, Single Episode, Moderate"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Differential Diagnoses Considered
                </label>
                <textarea
                  value={diagnosis.differentialDiagnoses}
                  onChange={(e) => setDiagnosis({...diagnosis, differentialDiagnoses: e.target.value})}
                  placeholder="What other diagnoses did you consider and why did you rule them out?"
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  DSM-5-TR Criteria Evidence
                </label>
                <textarea
                  value={diagnosis.dsmCriteria}
                  onChange={(e) => setDiagnosis({...diagnosis, dsmCriteria: e.target.value})}
                  placeholder="List specific DSM-5-TR criteria and evidence from the interview that supports your diagnosis"
                  rows="5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Treatment Plan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={diagnosis.treatmentPlan}
                  onChange={(e) => setDiagnosis({...diagnosis, treatmentPlan: e.target.value})}
                  placeholder="Provide evidence-based treatment recommendations (e.g., specific therapy modalities, medication considerations, lifestyle interventions)"
                  rows="5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={submitDiagnosis}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating Feedback & Grades...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Submit for Feedback & Grading
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Feedback Stage */}
        {stage === 'feedback' && feedback && (
          <div className="space-y-4">
            {/* Grades Summary Card */}
            {grades && (
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Award className="text-purple-600" size={28} />
                    Your Grades
                  </h2>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-purple-600">{grades.total}</div>
                    <div className="text-sm text-gray-600">out of 50</div>
                    <div className="text-2xl font-bold text-gray-700 mt-1">
                      Grade: {getLetterGrade(grades.total)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm font-semibold text-blue-900 mb-1">Interview Thoroughness</div>
                    <div className="text-2xl font-bold text-blue-700">{grades.interviewThoroughness}/8</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm font-semibold text-green-900 mb-1">Diagnostic Accuracy</div>
                    <div className="text-2xl font-bold text-green-700">{grades.diagnosticAccuracy}/12</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm font-semibold text-yellow-900 mb-1">DSM-5-TR Criteria</div>
                    <div className="text-2xl font-bold text-yellow-700">{grades.dsmCriteriaApplication}/12</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm font-semibold text-orange-900 mb-1">Differential Diagnosis</div>
                    <div className="text-2xl font-bold text-orange-700">{grades.differentialDiagnosis}/12</div>
                  </div>
                  <div className="bg-pink-50 p-4 rounded-lg md:col-span-2">
                    <div className="text-sm font-semibold text-pink-900 mb-1">Treatment Plan</div>
                    <div className="text-2xl font-bold text-pink-700">{grades.treatmentPlanAppropriateness}/6</div>
                  </div>
                </div>

                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-sm">
                  <p className="text-amber-900">
                    <strong>Note for Students:</strong> These are AI-generated scores to help you understand your performance. 
                    Your instructor will review and may adjust grades in Canvas SpeedGrader.
                  </p>
                </div>
              </div>
            )}

            {/* Detailed Feedback */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Clinical Supervisor Feedback</h2>
              
              <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Actual Diagnosis:</strong> {clientCase.actualDiagnosis}
                </p>
              </div>

              <div className="prose max-w-none bg-gray-50 p-6 rounded-lg mb-6 whitespace-pre-wrap">
                {feedback}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={exportResults}
                  className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FileDown size={20} />
                  Export Session with Grades
                </button>
                <button
                  onClick={resetTool}
                  className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={20} />
                  Start New Case
                </button>
              </div>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <AlertCircle size={18} />
                Canvas Submission Instructions
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>Click "Export Session with Grades" above</li>
                <li>Open the downloaded file and add your name at the top</li>
                <li>Complete the reflection section at the bottom of the file</li>
                <li>Submit the complete file to Canvas</li>
                <li>Your instructor will review the AI-generated grades and finalize your score</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
