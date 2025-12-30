# 📱 Voice Dictation Workflow - Mobile Integration Guide

## 🎯 Overview

This guide provides complete integration instructions for using the voice dictation workflow API from mobile applications (iOS, Android, React Native, Flutter).

The `/api/voice-dictation-workflow` endpoint is **fully mobile-compatible** and designed to handle audio recordings from mobile devices.

---

## 📋 Table of Contents

1. [Mobile Compatibility](#mobile-compatibility)
2. [React Native Integration](#react-native-integration)
3. [Native iOS Integration](#native-ios-integration)
4. [Native Android Integration](#native-android-integration)
5. [Flutter Integration](#flutter-integration)
6. [Audio Recording Best Practices](#audio-recording-best-practices)
7. [Error Handling](#error-handling)
8. [Optimization for Mobile Networks](#optimization-for-mobile-networks)

---

## ✅ Mobile Compatibility

### Supported Audio Formats
- **MP3** (recommended for mobile - good compression)
- **M4A** (iOS native format)
- **WAV** (high quality, larger file size)
- **WebM** (Android Chrome)
- **OGG** (Android native)

### Supported Languages
- **French** (primary)
- **English** (secondary)
- Auto-detection enabled

### Network Requirements
- **Minimum**: 3G connection
- **Recommended**: 4G/LTE or WiFi
- **Estimated bandwidth**: 100-500 KB/s depending on audio quality

### Processing Time
- **Average**: 60-90 seconds
- **Maximum**: 180 seconds (3 minutes)

---

## 📱 React Native Integration

### 1. Install Required Dependencies

```bash
npm install react-native-audio-recorder-player
npm install @react-native-community/netinfo
npm install react-native-fs
```

### 2. Complete Mobile Component

```jsx
// VoiceDictationRecorder.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import NetInfo from '@react-native-community/netinfo';
import RNFS from 'react-native-fs';

const audioRecorderPlayer = new AudioRecorderPlayer();

export default function VoiceDictationRecorder({ doctorInfo, onReportGenerated }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00');
  const [audioPath, setAudioPath] = useState('');
  const [networkType, setNetworkType] = useState('');

  // Check network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkType(state.type);
      if (!state.isConnected) {
        Alert.alert('No Internet', 'Please check your internet connection');
      }
    });
    return () => unsubscribe();
  }, []);

  // Request microphone permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);

        if (
          grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          return true;
        } else {
          Alert.alert('Permissions Denied', 'Microphone permission is required');
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Start recording
  const startRecording = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const path = Platform.select({
        ios: `${RNFS.DocumentDirectoryPath}/dictation_${Date.now()}.m4a`,
        android: `${RNFS.CachesDirectoryPath}/dictation_${Date.now()}.mp3`,
      });

      const audioSet = {
        AudioEncoderAndroid: 'aac',
        AudioSourceAndroid: 'mic',
        AVEncoderAudioQualityKeyIOS: 'medium',
        AVNumberOfChannelsKeyIOS: 1,
        AVFormatIDKeyIOS: 'mpeg4AAC',
        OutputFormatAndroid: 'mpeg_4',
      };

      await audioRecorderPlayer.startRecorder(path, audioSet);
      
      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordTime(
          audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)).substr(0, 5)
        );
      });

      setIsRecording(true);
      setAudioPath(path);
      console.log('Recording started:', path);
    } catch (error) {
      console.error('Start recording error:', error);
      Alert.alert('Recording Error', error.message);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsRecording(false);
      console.log('Recording stopped:', result);
      
      // Automatically process after recording stops
      await processAudioDictation(result);
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  // Upload and process audio
  const processAudioDictation = async (filePath) => {
    setIsProcessing(true);

    try {
      // Check file exists
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('Audio file not found');
      }

      // Get file info
      const fileInfo = await RNFS.stat(filePath);
      console.log('File size:', fileInfo.size, 'bytes');

      if (fileInfo.size === 0) {
        throw new Error('Audio file is empty');
      }

      // Read file as base64
      const fileData = await RNFS.readFile(filePath, 'base64');
      
      // Create FormData
      const formData = new FormData();
      
      // Add audio file
      formData.append('audioFile', {
        uri: Platform.OS === 'ios' ? filePath.replace('file://', '') : `file://${filePath}`,
        type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mpeg',
        name: filePath.split('/').pop(),
      });

      // Add doctor info
      formData.append('doctorInfo', JSON.stringify(doctorInfo));

      // API endpoint
      const API_URL = 'https://your-domain.com/api/voice-dictation-workflow';
      
      console.log('Uploading to:', API_URL);
      console.log('File path:', filePath);

      // Upload with progress tracking
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      console.log('Processing completed:', result);

      if (result.success) {
        Alert.alert(
          'Success',
          'Medical report generated successfully',
          [
            {
              text: 'View Report',
              onPress: () => onReportGenerated(result.finalReport)
            }
          ]
        );
      } else {
        throw new Error(result.error || 'Unknown error');
      }

      // Clean up audio file
      await RNFS.unlink(filePath);

    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert(
        'Processing Error',
        error.message || 'Failed to process audio dictation'
      );
    } finally {
      setIsProcessing(false);
      setRecordTime('00:00');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎤 Medical Dictation</Text>
      
      {/* Network Status */}
      <View style={styles.networkStatus}>
        <Text style={styles.networkText}>
          Network: {networkType === 'wifi' ? '📶 WiFi' : 
                    networkType === 'cellular' ? '📱 Mobile Data' : '❌ Offline'}
        </Text>
      </View>

      {/* Recording Time */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordTime}>{recordTime}</Text>
        </View>
      )}

      {/* Record Button */}
      <TouchableOpacity
        style={[
          styles.recordButton,
          isRecording && styles.recordButtonActive,
          isProcessing && styles.recordButtonDisabled
        ]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        <Text style={styles.recordButtonText}>
          {isProcessing ? '⏳' : isRecording ? '⏹️ Stop' : '🎤 Start Recording'}
        </Text>
      </TouchableOpacity>

      {/* Processing Indicator */}
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.processingText}>
            Processing dictation...
            {'\n'}This may take 60-90 seconds
          </Text>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📋 Instructions:</Text>
        <Text style={styles.instructionsText}>
          1. Tap "Start Recording" to begin{'\n'}
          2. Speak clearly about the consultation{'\n'}
          3. Include patient age, symptoms, vital signs{'\n'}
          4. Mention any prescriptions or tests{'\n'}
          5. Tap "Stop" when finished{'\n'}
          6. Wait for automatic processing
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  networkStatus: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  networkText: {
    fontSize: 14,
    color: '#1976D2',
    textAlign: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF0000',
    marginRight: 10,
  },
  recordTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF0000',
  },
  recordButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recordButtonActive: {
    backgroundColor: '#FF3B30',
  },
  recordButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  processingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  processingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  instructions: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
```

### 3. Usage Example

```jsx
// In your consultation screen
import VoiceDictationRecorder from './components/VoiceDictationRecorder';

function ConsultationScreen() {
  const doctorInfo = {
    fullName: "Dr. Jean Dupont",
    qualifications: "MBBS, MD",
    specialty: "General Medicine",
    medicalCouncilNumber: "MC12345"
  };

  const handleReportGenerated = (report) => {
    console.log('Generated report:', report);
    // Navigate to report view screen
    navigation.navigate('ReportView', { report });
  };

  return (
    <VoiceDictationRecorder
      doctorInfo={doctorInfo}
      onReportGenerated={handleReportGenerated}
    />
  );
}
```

---

## 🍎 Native iOS Integration (Swift)

### 1. iOS Implementation

```swift
import UIKit
import AVFoundation

class VoiceDictationViewController: UIViewController {
    
    // MARK: - Properties
    var audioRecorder: AVAudioRecorder?
    var audioURL: URL?
    let doctorInfo: [String: Any] = [
        "fullName": "Dr. Jean Dupont",
        "qualifications": "MBBS, MD",
        "specialty": "General Medicine",
        "medicalCouncilNumber": "MC12345"
    ]
    
    // MARK: - UI Elements
    @IBOutlet weak var recordButton: UIButton!
    @IBOutlet weak var statusLabel: UILabel!
    @IBOutlet weak var progressView: UIProgressView!
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupAudioRecording()
    }
    
    // MARK: - Audio Recording Setup
    func setupAudioRecording() {
        let audioSession = AVAudioSession.sharedInstance()
        
        do {
            try audioSession.setCategory(.playAndRecord, mode: .default)
            try audioSession.setActive(true)
            
            // Request microphone permission
            audioSession.requestRecordPermission { allowed in
                DispatchQueue.main.async {
                    if !allowed {
                        self.showAlert(title: "Permission Denied", 
                                     message: "Microphone access is required")
                    }
                }
            }
        } catch {
            print("Audio session error: \(error)")
        }
    }
    
    // MARK: - Recording Actions
    @IBAction func recordButtonTapped(_ sender: UIButton) {
        if audioRecorder?.isRecording == true {
            stopRecording()
        } else {
            startRecording()
        }
    }
    
    func startRecording() {
        // Create unique filename
        let timestamp = Int(Date().timeIntervalSince1970)
        let filename = "dictation_\(timestamp).m4a"
        audioURL = getDocumentsDirectory().appendingPathComponent(filename)
        
        // Audio settings
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue
        ]
        
        do {
            audioRecorder = try AVAudioRecorder(url: audioURL!, settings: settings)
            audioRecorder?.record()
            
            recordButton.setTitle("⏹️ Stop Recording", for: .normal)
            recordButton.backgroundColor = .systemRed
            statusLabel.text = "🎤 Recording..."
            
        } catch {
            print("Recording error: \(error)")
            showAlert(title: "Error", message: "Failed to start recording")
        }
    }
    
    func stopRecording() {
        audioRecorder?.stop()
        audioRecorder = nil
        
        recordButton.setTitle("🎤 Start Recording", for: .normal)
        recordButton.backgroundColor = .systemBlue
        statusLabel.text = "Processing..."
        
        // Upload audio
        if let url = audioURL {
            uploadAudioDictation(audioURL: url)
        }
    }
    
    // MARK: - Upload Audio
    func uploadAudioDictation(audioURL: URL) {
        guard let apiURL = URL(string: "https://your-domain.com/api/voice-dictation-workflow") else {
            return
        }
        
        var request = URLRequest(url: apiURL)
        request.httpMethod = "POST"
        
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // Add audio file
        if let audioData = try? Data(contentsOf: audioURL) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"audioFile\"; filename=\"\(audioURL.lastPathComponent)\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: audio/m4a\r\n\r\n".data(using: .utf8)!)
            body.append(audioData)
            body.append("\r\n".data(using: .utf8)!)
        }
        
        // Add doctor info
        if let doctorJSON = try? JSONSerialization.data(withJSONObject: doctorInfo) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"doctorInfo\"\r\n\r\n".data(using: .utf8)!)
            body.append(doctorJSON)
            body.append("\r\n".data(using: .utf8)!)
        }
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        
        // Show progress
        progressView.isHidden = false
        progressView.progress = 0.0
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                self.progressView.isHidden = true
                
                if let error = error {
                    self.showAlert(title: "Error", message: error.localizedDescription)
                    return
                }
                
                guard let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let success = json["success"] as? Bool,
                      success else {
                    self.showAlert(title: "Error", message: "Failed to process dictation")
                    return
                }
                
                // Success - show report
                self.statusLabel.text = "✅ Report Generated"
                if let finalReport = json["finalReport"] as? [String: Any] {
                    self.showReport(report: finalReport)
                }
                
                // Clean up audio file
                try? FileManager.default.removeItem(at: audioURL)
            }
        }
        
        task.resume()
        
        // Update progress (approximate)
        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { timer in
            if self.progressView.progress < 0.9 {
                self.progressView.progress += 0.05
            } else {
                timer.invalidate()
            }
        }
    }
    
    // MARK: - Helper Methods
    func getDocumentsDirectory() -> URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
    
    func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    func showReport(report: [String: Any]) {
        // Navigate to report view controller
        let reportVC = ReportViewController()
        reportVC.report = report
        navigationController?.pushViewController(reportVC, animated: true)
    }
}
```

---

## 🤖 Native Android Integration (Kotlin)

### 1. Android Implementation

```kotlin
// VoiceDictationActivity.kt
import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Bundle
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import org.json.JSONObject
import java.io.File
import java.io.IOException

class VoiceDictationActivity : AppCompatActivity() {

    private lateinit var recordButton: Button
    private lateinit var statusText: TextView
    private lateinit var progressBar: ProgressBar
    
    private var mediaRecorder: MediaRecorder? = null
    private var audioFile: File? = null
    private var isRecording = false
    
    private val RECORD_AUDIO_PERMISSION_CODE = 101
    
    // Doctor information
    private val doctorInfo = JSONObject().apply {
        put("fullName", "Dr. Jean Dupont")
        put("qualifications", "MBBS, MD")
        put("specialty", "General Medicine")
        put("medicalCouncilNumber", "MC12345")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_voice_dictation)
        
        recordButton = findViewById(R.id.recordButton)
        statusText = findViewById(R.id.statusText)
        progressBar = findViewById(R.id.progressBar)
        
        recordButton.setOnClickListener {
            if (isRecording) {
                stopRecording()
            } else {
                checkPermissionAndStartRecording()
            }
        }
    }

    // Check and request permissions
    private fun checkPermissionAndStartRecording() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                RECORD_AUDIO_PERMISSION_CODE
            )
        } else {
            startRecording()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == RECORD_AUDIO_PERMISSION_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startRecording()
            } else {
                Toast.makeText(this, "Microphone permission required", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // Start recording
    private fun startRecording() {
        try {
            // Create audio file
            val timestamp = System.currentTimeMillis()
            audioFile = File(cacheDir, "dictation_$timestamp.mp3")
            
            // Initialize MediaRecorder
            mediaRecorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setAudioEncodingBitRate(128000)
                setOutputFile(audioFile?.absolutePath)
                prepare()
                start()
            }
            
            isRecording = true
            recordButton.text = "⏹️ Stop Recording"
            recordButton.setBackgroundColor(resources.getColor(android.R.color.holo_red_dark, null))
            statusText.text = "🎤 Recording..."
            
        } catch (e: IOException) {
            e.printStackTrace()
            Toast.makeText(this, "Recording failed: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    // Stop recording
    private fun stopRecording() {
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            
            isRecording = false
            recordButton.text = "🎤 Start Recording"
            recordButton.setBackgroundColor(resources.getColor(android.R.color.holo_blue_dark, null))
            statusText.text = "Processing dictation..."
            
            // Upload audio
            audioFile?.let { uploadAudioDictation(it) }
            
        } catch (e: RuntimeException) {
            e.printStackTrace()
            Toast.makeText(this, "Stop recording failed", Toast.LENGTH_SHORT).show()
        }
    }

    // Upload audio dictation
    private fun uploadAudioDictation(file: File) {
        progressBar.visibility = ProgressBar.VISIBLE
        
        val client = OkHttpClient()
        
        // Create multipart request
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "audioFile",
                file.name,
                file.asRequestBody("audio/mpeg".toMediaType())
            )
            .addFormDataPart("doctorInfo", doctorInfo.toString())
            .build()
        
        val request = Request.Builder()
            .url("https://your-domain.com/api/voice-dictation-workflow")
            .post(requestBody)
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                runOnUiThread {
                    progressBar.visibility = ProgressBar.GONE
                    statusText.text = "❌ Upload failed"
                    Toast.makeText(
                        this@VoiceDictationActivity,
                        "Error: ${e.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }

            override fun onResponse(call: Call, response: Response) {
                val responseBody = response.body?.string()
                
                runOnUiThread {
                    progressBar.visibility = ProgressBar.GONE
                    
                    if (response.isSuccessful && responseBody != null) {
                        try {
                            val json = JSONObject(responseBody)
                            val success = json.getBoolean("success")
                            
                            if (success) {
                                statusText.text = "✅ Report Generated"
                                val finalReport = json.getJSONObject("finalReport")
                                
                                // Show report
                                showReport(finalReport)
                                
                                // Clean up audio file
                                file.delete()
                            } else {
                                val error = json.optString("error", "Unknown error")
                                statusText.text = "❌ Error: $error"
                                Toast.makeText(
                                    this@VoiceDictationActivity,
                                    error,
                                    Toast.LENGTH_LONG
                                ).show()
                            }
                        } catch (e: Exception) {
                            e.printStackTrace()
                            statusText.text = "❌ Parse error"
                        }
                    } else {
                        statusText.text = "❌ Server error: ${response.code}"
                        Toast.makeText(
                            this@VoiceDictationActivity,
                            "Server error: ${response.code}",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
        })
    }

    private fun showReport(report: JSONObject) {
        // Navigate to report activity
        // TODO: Implement report view
        Toast.makeText(this, "Report generated successfully!", Toast.LENGTH_LONG).show()
    }

    override fun onDestroy() {
        super.onDestroy()
        mediaRecorder?.release()
    }
}
```

### 2. Android Layout (activity_voice_dictation.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:gravity="center">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="🎤 Medical Dictation"
        android:textSize="24sp"
        android:textStyle="bold"
        android:layout_marginBottom="32dp"/>

    <TextView
        android:id="@+id/statusText"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Ready to record"
        android:textSize="16sp"
        android:layout_marginBottom="16dp"/>

    <ProgressBar
        android:id="@+id/progressBar"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:visibility="gone"
        android:layout_marginBottom="16dp"/>

    <Button
        android:id="@+id/recordButton"
        android:layout_width="200dp"
        android:layout_height="200dp"
        android:text="🎤 Start Recording"
        android:textSize="18sp"
        android:background="@drawable/circle_button"
        android:elevation="4dp"/>

    <TextView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="📋 Instructions:\n\n1. Tap button to start recording\n2. Speak about the consultation\n3. Include patient details and symptoms\n4. Tap again to stop and process"
        android:layout_marginTop="32dp"
        android:padding="16dp"
        android:background="#F0F0F0"
        android:textSize="14sp"/>

</LinearLayout>
```

---

## 🦋 Flutter Integration

### 1. Flutter Dependencies

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  record: ^5.0.0
  http: ^1.1.0
  path_provider: ^2.1.0
  permission_handler: ^11.0.0
  connectivity_plus: ^5.0.0
```

### 2. Flutter Implementation

```dart
// voice_dictation_screen.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:record/record.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:convert';

class VoiceDictationScreen extends StatefulWidget {
  @override
  _VoiceDictationScreenState createState() => _VoiceDictationScreenState();
}

class _VoiceDictationScreenState extends State<VoiceDictationScreen> {
  final _audioRecorder = AudioRecorder();
  
  bool _isRecording = false;
  bool _isProcessing = false;
  String _statusText = 'Ready to record';
  String? _audioPath;
  
  final Map<String, dynamic> _doctorInfo = {
    'fullName': 'Dr. Jean Dupont',
    'qualifications': 'MBBS, MD',
    'specialty': 'General Medicine',
    'medicalCouncilNumber': 'MC12345'
  };

  @override
  void initState() {
    super.initState();
    _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    final status = await Permission.microphone.request();
    if (status != PermissionStatus.granted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Microphone permission is required'))
      );
    }
  }

  Future<void> _startRecording() async {
    try {
      if (await _audioRecorder.hasPermission()) {
        final dir = await getTemporaryDirectory();
        final timestamp = DateTime.now().millisecondsSinceEpoch;
        _audioPath = '${dir.path}/dictation_$timestamp.m4a';
        
        await _audioRecorder.start(
          const RecordConfig(encoder: AudioEncoder.aacLc),
          path: _audioPath!,
        );
        
        setState(() {
          _isRecording = true;
          _statusText = '🎤 Recording...';
        });
      }
    } catch (e) {
      print('Start recording error: $e');
      _showError('Failed to start recording');
    }
  }

  Future<void> _stopRecording() async {
    try {
      final path = await _audioRecorder.stop();
      
      setState(() {
        _isRecording = false;
        _statusText = 'Processing...';
      });
      
      if (path != null) {
        await _uploadAudioDictation(path);
      }
    } catch (e) {
      print('Stop recording error: $e');
      _showError('Failed to stop recording');
    }
  }

  Future<void> _uploadAudioDictation(String filePath) async {
    setState(() {
      _isProcessing = true;
    });

    try {
      final file = File(filePath);
      if (!await file.exists()) {
        throw Exception('Audio file not found');
      }

      final uri = Uri.parse('https://your-domain.com/api/voice-dictation-workflow');
      final request = http.MultipartRequest('POST', uri);
      
      // Add audio file
      request.files.add(
        await http.MultipartFile.fromPath(
          'audioFile',
          filePath,
          filename: filePath.split('/').last,
        )
      );
      
      // Add doctor info
      request.fields['doctorInfo'] = jsonEncode(_doctorInfo);
      
      // Send request
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        if (data['success'] == true) {
          setState(() {
            _statusText = '✅ Report Generated';
          });
          
          _showSuccess();
          
          // Navigate to report view
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ReportViewScreen(report: data['finalReport']),
            ),
          );
        } else {
          throw Exception(data['error'] ?? 'Unknown error');
        }
      } else {
        throw Exception('Server error: ${response.statusCode}');
      }
      
      // Clean up audio file
      await file.delete();
      
    } catch (e) {
      print('Upload error: $e');
      _showError(e.toString());
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Error: $message'),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _showSuccess() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Medical report generated successfully!'),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('🎤 Medical Dictation'),
      ),
      body: Center(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _statusText,
                style: TextStyle(fontSize: 18),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 40),
              
              // Record Button
              GestureDetector(
                onTap: _isProcessing ? null : (_isRecording ? _stopRecording : _startRecording),
                child: Container(
                  width: 200,
                  height: 200,
                  decoration: BoxDecoration(
                    color: _isProcessing 
                        ? Colors.grey 
                        : (_isRecording ? Colors.red : Colors.blue),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black26,
                        blurRadius: 10,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Center(
                    child: _isProcessing
                        ? CircularProgressIndicator(color: Colors.white)
                        : Text(
                            _isRecording ? '⏹️\nStop' : '🎤\nStart',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),
              ),
              
              SizedBox(height: 60),
              
              // Instructions
              Container(
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '📋 Instructions:',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 10),
                    Text(
                      '1. Tap the button to start recording\n'
                      '2. Speak clearly about the consultation\n'
                      '3. Include patient details and symptoms\n'
                      '4. Tap again to stop and process\n'
                      '5. Wait for automatic report generation',
                      style: TextStyle(fontSize: 14),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _audioRecorder.dispose();
    super.dispose();
  }
}
```

---

## 🎙️ Audio Recording Best Practices

### Quality Settings

**Recommended for Mobile:**
- **Sample Rate**: 16kHz - 44.1kHz
- **Bit Rate**: 64kbps - 128kbps
- **Channels**: Mono (1 channel)
- **Format**: AAC (M4A) or MP3

### File Size Optimization

| Duration | Quality | Format | Estimated Size |
|----------|---------|--------|----------------|
| 1 min    | Medium  | MP3    | ~500 KB        |
| 2 min    | Medium  | MP3    | ~1 MB          |
| 5 min    | Medium  | MP3    | ~2.5 MB        |
| 1 min    | High    | M4A    | ~750 KB        |
| 2 min    | High    | M4A    | ~1.5 MB        |

### Recording Tips

✅ **DO:**
- Record in quiet environment
- Hold phone 15-20cm from mouth
- Speak clearly and at normal pace
- Pause briefly between sentences
- Test microphone before important recording

❌ **DON'T:**
- Record in noisy environments
- Speak too fast or too slow
- Use Bluetooth headset (may have lag)
- Record while moving
- Let battery drop below 20%

---

## ⚠️ Error Handling

### Common Errors and Solutions

#### 1. Permission Denied
```javascript
// React Native
if (error.message.includes('permission')) {
  Alert.alert(
    'Permission Required',
    'Please enable microphone access in Settings',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() }
    ]
  );
}
```

#### 2. Network Timeout
```javascript
const uploadWithRetry = async (audioFile, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadAudio(audioFile);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
};
```

#### 3. Large File Size
```javascript
// Compress audio before upload
import { AudioUtils } from 'react-native-audio-toolkit';

const compressAudio = async (filePath) => {
  return await AudioUtils.compress({
    source: filePath,
    quality: 'medium', // low, medium, high
    bitrate: 64000,
    sampleRate: 16000
  });
};
```

---

## 📡 Optimization for Mobile Networks

### Progress Tracking

```javascript
// React Native with progress
const uploadWithProgress = async (audioFile, onProgress) => {
  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.response));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    
    const formData = new FormData();
    formData.append('audioFile', {
      uri: audioFile.uri,
      type: 'audio/mpeg',
      name: 'dictation.mp3'
    });
    
    xhr.open('POST', API_URL);
    xhr.send(formData);
  });
};
```

### Network Type Detection

```javascript
import NetInfo from '@react-native-community/netinfo';

const checkNetworkAndUpload = async (audioFile) => {
  const state = await NetInfo.fetch();
  
  if (!state.isConnected) {
    throw new Error('No internet connection');
  }
  
  if (state.type === 'cellular' && state.details.cellularGeneration === '2g') {
    Alert.alert(
      'Slow Connection',
      'You are on 2G. Upload may take longer. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => uploadAudio(audioFile) }
      ]
    );
  } else {
    await uploadAudio(audioFile);
  }
};
```

---

## ✅ Testing Checklist

### Pre-Deployment

- [ ] Test on real devices (iOS and Android)
- [ ] Test with various audio lengths (30s, 1min, 2min, 5min)
- [ ] Test on different network types (WiFi, 4G, 3G)
- [ ] Test permission handling
- [ ] Test error scenarios (no internet, server error)
- [ ] Test background/foreground transitions
- [ ] Test with noisy audio
- [ ] Test with multiple languages (French/English)
- [ ] Test file cleanup after upload
- [ ] Test concurrent recordings (shouldn't be possible)

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Recording latency | < 500ms | Time to start recording |
| Upload time (1min audio) | < 10s on WiFi | Actual upload duration |
| Processing time | 60-90s | API processing duration |
| Memory usage | < 50MB | During recording |
| Battery impact | < 5% per recording | For 2min recording |

---

## 📞 Support

For mobile integration issues:
- **API Documentation**: See `VOICE_DICTATION_WORKFLOW_DOCUMENTATION.md`
- **Backend Issues**: Check server logs
- **Audio Quality**: Adjust recording settings
- **Network Issues**: Implement retry logic

---

## 🔄 Future Enhancements

Planned mobile features:
- [ ] Real-time transcription preview
- [ ] Offline recording with queue
- [ ] Push notifications when report ready
- [ ] Voice activity detection (auto-stop)
- [ ] Multi-language UI
- [ ] Bluetooth microphone support
- [ ] Background recording support
- [ ] Audio editing before upload

---

**Mobile Integration Complete** ✅
