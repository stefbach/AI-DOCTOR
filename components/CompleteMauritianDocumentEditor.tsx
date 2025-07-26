import React, { useState } from 'react';

// Version ultra-simplifiée pour debug
const CompleteMauritianDocumentEditor: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  console.log('🔍 Component loading...');

  const testApiCall = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('🚀 Testing API call...');

      const response = await fetch('/api/generate-consultation-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData: {
            firstName: "Test",
            lastName: "Patient",
            age: 30
          },
          clinicalData: {
            chiefComplaint: "Test symptom"
          },
          questionsData: {
            responses: {}
          },
          diagnosisData: {
            diagnosis: {
              primary: {
                condition: "Test diagnosis",
                confidence: 75
              }
            }
          }
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API Success Response:', data);
      setSuccess(true);

    } catch (error) {
      console.error('💥 Full Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧪 TIBOK IA DOCTOR - Debug Mode</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Status du composant</h2>
        <p>✅ Composant chargé avec succès</p>
        <p>📅 Date: {new Date().toLocaleString()}</p>
      </div>

      {error && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#ffebee', 
          border: '1px solid #f44336', 
          borderRadius: '8px',
          color: '#c62828'
        }}>
          <h3>❌ Erreur détectée:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{error}</pre>
        </div>
      )}

      {success && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#e8f5e8', 
          border: '1px solid #4caf50', 
          borderRadius: '8px',
          color: '#2e7d32'
        }}>
          <h3>✅ API fonctionne correctement!</h3>
          <p>L'API répond normalement. Le problème vient d'ailleurs.</p>
        </div>
      )}

      <button
        onClick={testApiCall}
        disabled={isGenerating}
        style={{
          padding: '15px 30px',
          fontSize: '16px',
          backgroundColor: isGenerating ? '#ccc' : '#2196f3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isGenerating ? 'not-allowed' : 'pointer'
        }}
      >
        {isGenerating ? '🔄 Test en cours...' : '🧪 Tester l\'API'}
      </button>

      <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <h3>📋 Instructions de debug:</h3>
        <ol>
          <li><strong>Ouvrez la console</strong> (F12 → Console)</li>
          <li><strong>Rechargez la page</strong></li>
          <li><strong>Cliquez sur "Tester l'API"</strong></li>
          <li><strong>Copiez TOUS les messages</strong> de la console</li>
          <li><strong>Envoyez-moi les erreurs</strong> pour diagnostic précis</li>
        </ol>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
        <h3>🔍 Informations système:</h3>
        <p><strong>User Agent:</strong> {navigator.userAgent}</p>
        <p><strong>URL actuelle:</strong> {window.location.href}</p>
        <p><strong>Timestamp:</strong> {Date.now()}</p>
      </div>
    </div>
  );
};

export default CompleteMauritianDocumentEditor;
