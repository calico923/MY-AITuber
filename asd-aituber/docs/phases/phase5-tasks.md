# Phase 5: 音声・感情システム タスクリスト

期間: 4週間（Day 99-126）

## Week 15-16: 音声合成

### Day 99-100: VOICEVOX統合
- [ ] VOICEVOX API クライアント実装
  ```typescript
  class VoiceVoxClient {
    private baseUrl = process.env.VOICEVOX_URL || 'http://localhost:50021';
    
    async getSpeakers(): Promise<Speaker[]> {
      const response = await fetch(`${this.baseUrl}/speakers`);
      return response.json();
    }
    
    async synthesize(text: string, options: SynthesisOptions): Promise<ArrayBuffer> {
      // 音声クエリ生成
      const queryResponse = await fetch(
        `${this.baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${options.speaker}`,
        { method: 'POST' }
      );
      const query = await queryResponse.json();
      
      // パラメータ調整
      if (options.speed) query.speedScale = options.speed;
      if (options.pitch) query.pitchScale = options.pitch;
      if (options.intonation) query.intonationScale = options.intonation;
      
      // 音声合成
      const audioResponse = await fetch(
        `${this.baseUrl}/synthesis?speaker=${options.speaker}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query)
        }
      );
      
      return audioResponse.arrayBuffer();
    }
  }
  ```
- [ ] 話者選択システム
  ```typescript
  interface SpeakerProfile {
    id: number;
    name: string;
    styles: StyleInfo[];
    sampleAudio?: string;
    personality?: string;
  }
  
  class SpeakerSelector {
    private speakers: SpeakerProfile[] = [];
    
    async loadSpeakers() {
      const voicevoxSpeakers = await this.voicevoxClient.getSpeakers();
      this.speakers = voicevoxSpeakers.map(this.mapToProfile);
    }
    
    selectForMode(mode: 'ASD' | 'NT', emotion?: EmotionType): number {
      // モードと感情に適した話者を選択
      if (mode === 'ASD') {
        // より落ち着いた、一定のトーンの話者
        return this.speakers.find(s => 
          s.personality === 'calm' || s.id === 3
        )?.id || 3;
      } else {
        // より表現豊かな話者
        return this.speakers.find(s => 
          s.personality === 'expressive' || s.id === 1
        )?.id || 1;
      }
    }
    
    getStyleForEmotion(speakerId: number, emotion: EmotionType): number {
      const speaker = this.speakers.find(s => s.id === speakerId);
      const emotionStyleMap = {
        joy: 'happy',
        sadness: 'sad',
        anger: 'angry',
        neutral: 'normal'
      };
      
      return speaker?.styles.find(s => 
        s.name === emotionStyleMap[emotion]
      )?.id || 0;
    }
  }
  ```
- [ ] パラメータ調整
  ```typescript
  class VoiceParameterAdjuster {
    adjustForMode(baseParams: VoiceParameters, mode: 'ASD' | 'NT'): VoiceParameters {
      if (mode === 'ASD') {
        return {
          ...baseParams,
          speedScale: 0.95,      // やや遅め
          pitchScale: 1.0,       // 一定のピッチ
          intonationScale: 0.7,  // 抑揚を抑える
          volumeScale: 0.9,      // やや控えめ
          prePhonemeLength: 0.1, // 発話前の間
          postPhonemeLength: 0.2 // 発話後の間
        };
      } else {
        return {
          ...baseParams,
          speedScale: 1.05,      // 自然な速度
          pitchScale: 1.0,       // 標準ピッチ
          intonationScale: 1.2,  // 豊かな抑揚
          volumeScale: 1.0,      // 標準音量
          prePhonemeLength: 0.05,
          postPhonemeLength: 0.1
        };
      }
    }
    
    adjustForEmotion(params: VoiceParameters, emotion: EmotionType, intensity: number): VoiceParameters {
      const emotionAdjustments = {
        joy: {
          speedScale: 1.1 * intensity,
          pitchScale: 1.1 * intensity,
          intonationScale: 1.3 * intensity
        },
        sadness: {
          speedScale: 0.9 * (1 - intensity * 0.1),
          pitchScale: 0.9 * (1 - intensity * 0.1),
          intonationScale: 0.8 * (1 - intensity * 0.2)
        },
        anger: {
          speedScale: 1.2 * intensity,
          pitchScale: 0.95,
          volumeScale: 1.2 * intensity
        },
        fear: {
          speedScale: 1.15 * intensity,
          pitchScale: 1.15 * intensity,
          intonationScale: 1.4 * intensity
        }
      };
      
      const adjustment = emotionAdjustments[emotion] || {};
      return { ...params, ...adjustment };
    }
  }
  ```

### Day 101-102: 音声ストリーミング
- [ ] ストリーミング実装
  ```typescript
  class AudioStreamManager {
    private audioContext: AudioContext;
    private sourceNodes: Map<string, AudioBufferSourceNode> = new Map();
    private streamBuffer: ArrayBuffer[] = [];
    
    constructor() {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    async streamAudio(audioStream: ReadableStream<Uint8Array>) {
      const reader = audioStream.getReader();
      const chunks: Uint8Array[] = [];
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          
          // 一定量溜まったら再生開始
          if (chunks.length >= 3) {
            await this.playChunks(chunks.splice(0, chunks.length));
          }
        }
        
        // 残りを再生
        if (chunks.length > 0) {
          await this.playChunks(chunks);
        }
      } finally {
        reader.releaseLock();
      }
    }
    
    private async playChunks(chunks: Uint8Array[]) {
      const combinedArray = this.combineChunks(chunks);
      const audioBuffer = await this.audioContext.decodeAudioData(combinedArray.buffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      // 前の音声との同期
      const currentTime = this.audioContext.currentTime;
      const startTime = this.getNextStartTime(currentTime);
      source.start(startTime);
      
      this.sourceNodes.set(generateId(), source);
    }
    
    private combineChunks(chunks: Uint8Array[]): Uint8Array {
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      return combined;
    }
  }
  ```
- [ ] バッファリング制御
  ```typescript
  class AudioBufferController {
    private bufferSize = 3; // 秒
    private bufferQueue: AudioData[] = [];
    private isPlaying = false;
    private onBufferLow?: () => void;
    
    async addToBuffer(audioData: AudioData) {
      this.bufferQueue.push(audioData);
      
      if (!this.isPlaying && this.getBufferDuration() >= this.bufferSize) {
        this.startPlayback();
      }
    }
    
    private getBufferDuration(): number {
      return this.bufferQueue.reduce((sum, data) => sum + data.duration, 0);
    }
    
    private async startPlayback() {
      this.isPlaying = true;
      
      while (this.bufferQueue.length > 0) {
        const audioData = this.bufferQueue.shift()!;
        await this.playAudio(audioData);
        
        // バッファが少なくなったら通知
        if (this.getBufferDuration() < this.bufferSize / 2 && this.onBufferLow) {
          this.onBufferLow();
        }
      }
      
      this.isPlaying = false;
    }
    
    private async playAudio(audioData: AudioData): Promise<void> {
      return new Promise(resolve => {
        const source = this.audioContext.createBufferSource();
        source.buffer = audioData.buffer;
        source.connect(this.audioContext.destination);
        source.onended = () => resolve();
        source.start();
      });
    }
  }
  ```
- [ ] 同期制御
  ```typescript
  class AudioSyncController {
    private messageQueue: SyncedMessage[] = [];
    private currentMessageId: string | null = null;
    
    async queueMessage(message: SyncedMessage) {
      this.messageQueue.push(message);
      
      if (!this.currentMessageId) {
        await this.processNextMessage();
      }
    }
    
    private async processNextMessage() {
      if (this.messageQueue.length === 0) {
        this.currentMessageId = null;
        return;
      }
      
      const message = this.messageQueue.shift()!;
      this.currentMessageId = message.id;
      
      // テキスト表示
      this.displayText(message.text);
      
      // 音声再生（リップシンクと同期）
      await Promise.all([
        this.playAudio(message.audio),
        this.animateLipSync(message.lipSyncData)
      ]);
      
      // 次のメッセージ処理
      await this.processNextMessage();
    }
    
    private async animateLipSync(lipSyncData: LipSyncData) {
      for (const frame of lipSyncData.frames) {
        await this.waitForTimestamp(frame.timestamp);
        this.updateMouthShape(frame.vowel);
      }
    }
    
    private updateMouthShape(vowel: Vowel) {
      const mouthShapes = {
        'a': { A: 1.0, I: 0, U: 0, E: 0, O: 0 },
        'i': { A: 0, I: 1.0, U: 0, E: 0, O: 0 },
        'u': { A: 0, I: 0, U: 1.0, E: 0, O: 0 },
        'e': { A: 0, I: 0, U: 0, E: 1.0, O: 0 },
        'o': { A: 0, I: 0, U: 0, E: 0, O: 1.0 },
        'n': { A: 0.2, I: 0, U: 0, E: 0, O: 0 }
      };
      
      const shape = mouthShapes[vowel] || mouthShapes['n'];
      this.vrmManager.setMouthShape(shape);
    }
  }
  ```

### Day 103-104: リップシンク実装
- [ ] 音素解析
  ```typescript
  class PhonemeAnalyzer {
    private audioContext: AudioContext;
    
    async analyzePhonemes(audioBuffer: AudioBuffer): Promise<PhonemeData[]> {
      const audioData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      
      // FFTによる周波数解析
      const fftSize = 2048;
      const hopSize = fftSize / 4;
      const phonemes: PhonemeData[] = [];
      
      for (let i = 0; i < audioData.length - fftSize; i += hopSize) {
        const segment = audioData.slice(i, i + fftSize);
        const spectrum = this.fft(segment);
        const formants = this.extractFormants(spectrum, sampleRate);
        const phoneme = this.classifyPhoneme(formants);
        
        phonemes.push({
          timestamp: i / sampleRate,
          phoneme: phoneme.type,
          confidence: phoneme.confidence,
          vowel: this.phonemeToVowel(phoneme.type)
        });
      }
      
      return this.smoothPhonemes(phonemes);
    }
    
    private extractFormants(spectrum: Float32Array, sampleRate: number): Formants {
      // フォルマント周波数の抽出
      const peaks = this.findSpectralPeaks(spectrum);
      
      return {
        f1: peaks[0]?.frequency || 0,
        f2: peaks[1]?.frequency || 0,
        f3: peaks[2]?.frequency || 0
      };
    }
    
    private classifyPhoneme(formants: Formants): ClassifiedPhoneme {
      // フォルマント周波数に基づく音素分類
      const vowelFormants = {
        'a': { f1: [700, 850], f2: [1100, 1300] },
        'i': { f1: [250, 350], f2: [2200, 2500] },
        'u': { f1: [300, 400], f2: [700, 900] },
        'e': { f1: [400, 600], f2: [1900, 2200] },
        'o': { f1: [450, 650], f2: [850, 1100] }
      };
      
      let bestMatch = { type: 'n', confidence: 0 };
      
      for (const [vowel, ranges] of Object.entries(vowelFormants)) {
        const f1Match = this.isInRange(formants.f1, ranges.f1);
        const f2Match = this.isInRange(formants.f2, ranges.f2);
        const confidence = (f1Match + f2Match) / 2;
        
        if (confidence > bestMatch.confidence) {
          bestMatch = { type: vowel, confidence };
        }
      }
      
      return bestMatch;
    }
  }
  ```
- [ ] 口形状マッピング
  ```typescript
  class LipSyncMapper {
    private blendShapeMap = {
      'a': { mouthOpen: 0.8, mouthWide: 0.3 },
      'i': { mouthOpen: 0.2, mouthWide: 0.7, mouthPucker: 0.1 },
      'u': { mouthOpen: 0.3, mouthPucker: 0.8 },
      'e': { mouthOpen: 0.4, mouthWide: 0.5 },
      'o': { mouthOpen: 0.5, mouthPucker: 0.5 },
      'n': { mouthOpen: 0.1, neutral: 0.9 }
    };
    
    generateLipSyncData(
      text: string,
      phonemes: PhonemeData[],
      duration: number
    ): LipSyncAnimation {
      const morphTargets: MorphTargetFrame[] = [];
      
      // テキストと音素を対応付け
      const alignedPhonemes = this.alignPhonemesToText(text, phonemes);
      
      for (const phoneme of alignedPhonemes) {
        const blendShapes = this.blendShapeMap[phoneme.vowel] || this.blendShapeMap['n'];
        
        morphTargets.push({
          timestamp: phoneme.timestamp,
          blendShapes: this.smoothBlendShapes(blendShapes, phoneme.confidence),
          duration: phoneme.duration
        });
      }
      
      // 補間フレームの生成
      return {
        frames: this.interpolateFrames(morphTargets, 60), // 60fps
        duration: duration
      };
    }
    
    private interpolateFrames(
      keyframes: MorphTargetFrame[],
      fps: number
    ): LipSyncFrame[] {
      const frames: LipSyncFrame[] = [];
      const frameTime = 1000 / fps;
      
      for (let i = 0; i < keyframes.length - 1; i++) {
        const current = keyframes[i];
        const next = keyframes[i + 1];
        const framesToGenerate = Math.floor(
          (next.timestamp - current.timestamp) * 1000 / frameTime
        );
        
        for (let j = 0; j < framesToGenerate; j++) {
          const t = j / framesToGenerate;
          frames.push({
            timestamp: current.timestamp + (t * (next.timestamp - current.timestamp)),
            blendShapes: this.lerpBlendShapes(current.blendShapes, next.blendShapes, t)
          });
        }
      }
      
      return frames;
    }
  }
  ```
- [ ] タイミング調整
  ```typescript
  class LipSyncTimingAdjuster {
    private offsetMs = -50; // 音声より少し早めに口を動かす
    
    adjustTiming(lipSyncData: LipSyncAnimation, mode: 'ASD' | 'NT'): LipSyncAnimation {
      // モードによってタイミング調整
      const offset = mode === 'ASD' 
        ? this.offsetMs - 20  // ASDモードではより慎重な口の動き
        : this.offsetMs;
      
      const adjustedFrames = lipSyncData.frames.map(frame => ({
        ...frame,
        timestamp: Math.max(0, frame.timestamp + offset / 1000)
      }));
      
      // ASDモードでは口の動きを控えめに
      if (mode === 'ASD') {
        adjustedFrames.forEach(frame => {
          Object.keys(frame.blendShapes).forEach(key => {
            frame.blendShapes[key] *= 0.7; // 70%に抑制
          });
        });
      }
      
      return {
        ...lipSyncData,
        frames: adjustedFrames
      };
    }
    
    syncWithAudio(
      lipSyncData: LipSyncAnimation,
      audioStartTime: number
    ): AnimationController {
      return new AnimationController({
        startTime: audioStartTime,
        animation: lipSyncData,
        onFrame: (frame) => {
          this.vrmManager.setBlendShapes(frame.blendShapes);
        },
        onComplete: () => {
          this.vrmManager.resetMouth();
        }
      });
    }
  }
  ```

### Day 105-106: 音声入力準備
- [ ] Web Speech API統合
  ```typescript
  class SpeechRecognitionManager {
    private recognition: SpeechRecognition;
    private isListening = false;
    
    constructor() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.setupRecognition();
    }
    
    private setupRecognition() {
      this.recognition.lang = 'ja-JP';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 3;
      
      this.recognition.onresult = this.handleResult.bind(this);
      this.recognition.onerror = this.handleError.bind(this);
      this.recognition.onend = this.handleEnd.bind(this);
    }
    
    start() {
      if (!this.isListening) {
        this.recognition.start();
        this.isListening = true;
      }
    }
    
    stop() {
      if (this.isListening) {
        this.recognition.stop();
        this.isListening = false;
      }
    }
    
    private handleResult(event: SpeechRecognitionEvent) {
      const results = event.results;
      const currentResult = results[results.length - 1];
      
      if (currentResult.isFinal) {
        const transcript = currentResult[0].transcript;
        const confidence = currentResult[0].confidence;
        
        this.onTranscript?.({
          text: transcript,
          confidence: confidence,
          alternatives: Array.from(currentResult).map(alt => ({
            text: alt.transcript,
            confidence: alt.confidence
          }))
        });
      } else {
        // 中間結果
        this.onInterimTranscript?.({
          text: currentResult[0].transcript,
          confidence: currentResult[0].confidence
        });
      }
    }
    
    private handleError(event: SpeechRecognitionErrorEvent) {
      console.error('Speech recognition error:', event.error);
      
      const errorHandlers = {
        'no-speech': () => this.onNoSpeech?.(),
        'audio-capture': () => this.onAudioCaptureError?.(),
        'not-allowed': () => this.onPermissionDenied?.(),
        'network': () => this.onNetworkError?.()
      };
      
      errorHandlers[event.error]?.();
    }
  }
  ```
- [ ] 音声認識設定
  ```typescript
  interface VoiceInputSettings {
    language: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    silenceDetection: boolean;
    noiseReduction: boolean;
  }
  
  class VoiceInputConfigurator {
    private settings: VoiceInputSettings = {
      language: 'ja-JP',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      silenceDetection: true,
      noiseReduction: true
    };
    
    configureForMode(mode: 'ASD' | 'NT'): VoiceInputSettings {
      if (mode === 'ASD') {
        // ASDモードでは明確な発話を期待
        return {
          ...this.settings,
          silenceDetection: true,
          continuous: false, // 一度に一つの文を処理
          interimResults: false // 最終結果のみ
        };
      } else {
        // NTモードでは自然な会話フロー
        return {
          ...this.settings,
          silenceDetection: true,
          continuous: true,
          interimResults: true
        };
      }
    }
    
    async requestMicrophonePermission(): Promise<boolean> {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (error) {
        console.error('Microphone permission denied:', error);
        return false;
      }
    }
  }
  ```
- [ ] ノイズ処理
  ```typescript
  class NoiseProcessor {
    private audioContext: AudioContext;
    private noiseGate: DynamicsCompressorNode;
    
    setupNoiseReduction(stream: MediaStream): MediaStream {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      
      // ノイズゲート
      this.noiseGate = this.audioContext.createDynamicsCompressor();
      this.noiseGate.threshold.value = -50;
      this.noiseGate.knee.value = 40;
      this.noiseGate.ratio.value = 12;
      this.noiseGate.attack.value = 0.003;
      this.noiseGate.release.value = 0.25;
      
      // ハイパスフィルター（低周波ノイズ除去）
      const highpass = this.audioContext.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 100;
      
      // ローパスフィルター（高周波ノイズ除去）
      const lowpass = this.audioContext.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 8000;
      
      // 接続
      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(this.noiseGate);
      
      // 処理済みストリームを返す
      const destination = this.audioContext.createMediaStreamDestination();
      this.noiseGate.connect(destination);
      
      return destination.stream;
    }
    
    detectSilence(analyser: AnalyserNode, threshold: number = -50): boolean {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      analyser.getFloatFrequencyData(dataArray);
      
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      return average < threshold;
    }
  }
  ```

## Week 17-18: 高度な感情表現

### Day 107-108: 内部感情vs外部表現の実装
- [ ] 感情モデル設計
  ```typescript
  interface EmotionModel {
    // 基本感情
    primary: {
      joy: number;
      sadness: number;
      anger: number;
      fear: number;
      surprise: number;
      disgust: number;
    };
    
    // 複合感情
    secondary: {
      excitement: number;     // joy + surprise
      disappointment: number; // sadness + surprise
      anxiety: number;       // fear + surprise
      frustration: number;   // anger + sadness
    };
    
    // 感情の次元
    dimensions: {
      valence: number;    // -1 (negative) to 1 (positive)
      arousal: number;    // 0 (calm) to 1 (excited)
      dominance: number;  // 0 (submissive) to 1 (dominant)
    };
    
    // 時系列変化
    history: EmotionSnapshot[];
    
    // 感情の慣性
    inertia: number; // 0 (即座に変化) to 1 (ゆっくり変化)
  }
  
  class EmotionEngine {
    private currentEmotion: EmotionModel;
    private mode: 'ASD' | 'NT';
    
    updateEmotion(
      stimulus: EmotionalStimulus,
      context: ConversationContext
    ): EmotionUpdate {
      // 1. 刺激から基本感情を計算
      const rawEmotion = this.calculateRawEmotion(stimulus);
      
      // 2. 文脈による調整
      const contextualizedEmotion = this.applyContext(rawEmotion, context);
      
      // 3. 感情の慣性を適用
      const smoothedEmotion = this.applyInertia(
        contextualizedEmotion,
        this.currentEmotion,
        this.currentEmotion.inertia
      );
      
      // 4. モード別の内外分離
      const { internal, external } = this.separateInternalExternal(
        smoothedEmotion,
        this.mode
      );
      
      // 5. 履歴更新
      this.updateHistory(internal);
      
      return {
        internal,
        external,
        delta: this.calculateDelta(this.currentEmotion, internal)
      };
    }
    
    private separateInternalExternal(
      emotion: EmotionModel,
      mode: 'ASD' | 'NT'
    ): { internal: EmotionModel; external: EmotionModel } {
      if (mode === 'ASD') {
        // ASD: 内部は100%、外部は30%
        const external = this.scaleEmotion(emotion, 0.3);
        
        // 外部表現はより中立的に
        external.dimensions.arousal *= 0.5;
        external.dimensions.dominance *= 0.7;
        
        return { internal: emotion, external };
      } else {
        // NT: 内外がより一致（外部は80%）
        const external = this.scaleEmotion(emotion, 0.8);
        
        // 社会的調整を適用
        external.primary = this.applySocialModulation(external.primary);
        
        return { internal: emotion, external };
      }
    }
  }
  ```
- [ ] 内外分離ロジック
  ```typescript
  class InternalExternalSeparator {
    separateEmotions(
      emotion: EmotionState,
      mode: 'ASD' | 'NT',
      socialContext?: SocialContext
    ): SeparatedEmotions {
      const separationRules = {
        ASD: {
          expressionRatio: 0.3,
          verbalizationThreshold: 0.7, // 感情を言語化する閾値
          maskingLevel: 0.1, // 社会的マスキングは最小
          processingDelay: 2000, // 感情処理の遅延
          regulationDifficulty: 0.8 // 感情調整の困難さ
        },
        NT: {
          expressionRatio: 0.8,
          verbalizationThreshold: 0.3,
          maskingLevel: 0.6, // 適切な社会的マスキング
          processingDelay: 500,
          regulationDifficulty: 0.3
        }
      };
      
      const rules = separationRules[mode];
      
      // 内部感情の処理
      const internalIntensity = emotion.intensity;
      const internalComplexity = this.calculateComplexity(emotion);
      
      // 外部表現の計算
      let externalIntensity = internalIntensity * rules.expressionRatio;
      
      // 社会的文脈による調整
      if (socialContext) {
        externalIntensity = this.adjustForSocialContext(
          externalIntensity,
          socialContext,
          rules.maskingLevel
        );
      }
      
      // 感情の言語化
      const shouldVerbalize = internalIntensity > rules.verbalizationThreshold;
      const verbalExpression = shouldVerbalize
        ? this.generateVerbalExpression(emotion, mode)
        : null;
      
      // 身体的表現
      const physicalExpression = this.generatePhysicalExpression(
        emotion,
        externalIntensity,
        mode
      );
      
      return {
        internal: {
          emotion: emotion,
          intensity: internalIntensity,
          complexity: internalComplexity,
          processingTime: rules.processingDelay
        },
        external: {
          emotion: this.simplifyEmotion(emotion),
          intensity: externalIntensity,
          verbal: verbalExpression,
          physical: physicalExpression,
          congruence: this.calculateCongruence(internalIntensity, externalIntensity)
        },
        metadata: {
          mode: mode,
          timestamp: Date.now(),
          socialContext: socialContext
        }
      };
    }
    
    private generateVerbalExpression(
      emotion: EmotionState,
      mode: 'ASD' | 'NT'
    ): VerbalExpression {
      if (mode === 'ASD') {
        // 直接的で明示的な感情表現
        return {
          text: `私は${this.getEmotionLabel(emotion)}を感じています`,
          directness: 1.0,
          clarity: 1.0,
          metaphorical: 0.0
        };
      } else {
        // より間接的で文脈依存の表現
        return {
          text: this.getNaturalEmotionExpression(emotion),
          directness: 0.4,
          clarity: 0.7,
          metaphorical: 0.6
        };
      }
    }
  }
  ```
- [ ] 可視化システム
  ```typescript
  class EmotionVisualizationSystem {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private animationFrame: number;
    
    visualizeEmotions(
      internal: EmotionState,
      external: EmotionState,
      mode: 'ASD' | 'NT'
    ) {
      // 内部感情の表示（大きな円）
      this.drawEmotionCircle(
        this.canvas.width / 3,
        this.canvas.height / 2,
        100,
        internal,
        'internal'
      );
      
      // 外部表現の表示（小さな円）
      this.drawEmotionCircle(
        (this.canvas.width / 3) * 2,
        this.canvas.height / 2,
        mode === 'ASD' ? 30 : 80,
        external,
        'external'
      );
      
      // 接続線
      this.drawConnection(internal, external, mode);
      
      // ラベル
      this.drawLabels(internal, external, mode);
      
      // アニメーション
      this.animateTransition(internal, external);
    }
    
    private drawEmotionCircle(
      x: number,
      y: number,
      radius: number,
      emotion: EmotionState,
      type: 'internal' | 'external'
    ) {
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
      const color = this.getEmotionColor(emotion);
      
      gradient.addColorStop(0, color.light);
      gradient.addColorStop(0.7, color.main);
      gradient.addColorStop(1, color.dark);
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius * emotion.intensity, 0, Math.PI * 2);
      this.ctx.fill();
      
      // パルスアニメーション
      if (type === 'internal') {
        this.ctx.strokeStyle = color.main;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(
          x, y,
          radius * emotion.intensity + Math.sin(Date.now() * 0.002) * 10,
          0, Math.PI * 2
        );
        this.ctx.stroke();
      }
    }
    
    private getEmotionColor(emotion: EmotionState): EmotionColor {
      const colors = {
        joy: { light: '#FFE082', main: '#FFC107', dark: '#F57C00' },
        sadness: { light: '#90CAF9', main: '#2196F3', dark: '#0D47A1' },
        anger: { light: '#EF9A9A', main: '#F44336', dark: '#B71C1C' },
        fear: { light: '#CE93D8', main: '#9C27B0', dark: '#4A148C' },
        surprise: { light: '#80CBC4', main: '#009688', dark: '#004D40' },
        neutral: { light: '#E0E0E0', main: '#9E9E9E', dark: '#424242' }
      };
      
      return colors[emotion.primary] || colors.neutral;
    }
  }
  ```

### Day 109-110: 感情の可視化UI
- [ ] 感情メーター実装
  ```typescript
  const EmotionMeter: React.FC<{ emotion: SeparatedEmotions }> = ({ emotion }) => {
    const [animatedValues, setAnimatedValues] = useState({
      internal: 0,
      external: 0
    });
    
    useEffect(() => {
      // スムーズなアニメーション
      const animation = {
        internal: animatedValues.internal,
        external: animatedValues.external
      };
      
      const animationFrame = requestAnimationFrame(() => {
        animation.internal += (emotion.internal.intensity - animation.internal) * 0.1;
        animation.external += (emotion.external.intensity - animation.external) * 0.1;
        
        setAnimatedValues({ ...animation });
      });
      
      return () => cancelAnimationFrame(animationFrame);
    }, [emotion]);
    
    return (
      <div className="emotion-meter">
        <div className="meter-container">
          <h4>内部感情</h4>
          <div className="meter-bar">
            <div 
              className="meter-fill internal"
              style={{ 
                width: `${animatedValues.internal * 100}%`,
                backgroundColor: getEmotionColor(emotion.internal.emotion)
              }}
            />
            <span className="meter-label">
              {emotion.internal.emotion.primary} 
              ({Math.round(emotion.internal.intensity * 100)}%)
            </span>
          </div>
        </div>
        
        <div className="meter-container">
          <h4>外部表現</h4>
          <div className="meter-bar">
            <div 
              className="meter-fill external"
              style={{ 
                width: `${animatedValues.external * 100}%`,
                backgroundColor: getEmotionColor(emotion.external.emotion)
              }}
            />
            <span className="meter-label">
              {emotion.external.emotion.primary} 
              ({Math.round(emotion.external.intensity * 100)}%)
            </span>
          </div>
          
          {emotion.external.verbal && (
            <div className="verbal-expression">
              💬 {emotion.external.verbal.text}
            </div>
          )}
        </div>
        
        <div className="congruence-indicator">
          <span>一致度: {Math.round(emotion.external.congruence * 100)}%</span>
          <div className="congruence-bar">
            <div 
              className="congruence-fill"
              style={{ width: `${emotion.external.congruence * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };
  ```
- [ ] グラフ表示
  ```typescript
  const EmotionHistoryChart: React.FC<{ history: EmotionSnapshot[] }> = ({ history }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
      if (!chartRef.current) return;
      
      const ctx = chartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.map((_, i) => i),
          datasets: [
            {
              label: '内部感情',
              data: history.map(h => h.internal.intensity),
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              tension: 0.4
            },
            {
              label: '外部表現',
              data: history.map(h => h.external.intensity),
              borderColor: 'rgb(54, 162, 235)',
              backgroundColor: 'rgba(54, 162, 235, 0.1)',
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top'
            },
            title: {
              display: true,
              text: '感情の時系列変化'
            },
            tooltip: {
              callbacks: {
                afterLabel: (context) => {
                  const snapshot = history[context.dataIndex];
                  return `感情: ${snapshot.internal.emotion.primary}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 1,
              title: {
                display: true,
                text: '強度'
              }
            },
            x: {
              title: {
                display: true,
                text: '時間'
              }
            }
          }
        }
      });
      
      return () => chart.destroy();
    }, [history]);
    
    return <canvas ref={chartRef} />;
  };
  ```
- [ ] アニメーション
  ```typescript
  class EmotionAnimationController {
    private animations: Map<string, Animation> = new Map();
    
    animateEmotionChange(
      from: EmotionState,
      to: EmotionState,
      duration: number = 1000
    ): AnimationHandle {
      const animationId = generateId();
      
      const animation = new Animation({
        from: from,
        to: to,
        duration: duration,
        easing: 'easeInOutCubic',
        onUpdate: (progress, current) => {
          this.updateEmotionDisplay(current);
          this.updateVRMExpression(current);
        },
        onComplete: () => {
          this.animations.delete(animationId);
        }
      });
      
      this.animations.set(animationId, animation);
      animation.start();
      
      return {
        id: animationId,
        pause: () => animation.pause(),
        resume: () => animation.resume(),
        cancel: () => {
          animation.cancel();
          this.animations.delete(animationId);
        }
      };
    }
    
    private updateEmotionDisplay(emotion: EmotionState) {
      // UIの更新
      EventBus.emit('emotion:update', emotion);
      
      // カラーテーマの変更
      this.updateColorTheme(emotion);
      
      // パーティクルエフェクト
      if (emotion.intensity > 0.7) {
        this.triggerEmotionParticles(emotion);
      }
    }
    
    private updateVRMExpression(emotion: EmotionState) {
      const expressionMap = {
        joy: { happy: emotion.intensity, eyeSquint: emotion.intensity * 0.3 },
        sadness: { sad: emotion.intensity, eyeWide: emotion.intensity * 0.2 },
        anger: { angry: emotion.intensity, eyebrowAngry: emotion.intensity * 0.8 },
        fear: { surprised: emotion.intensity * 0.5, eyeWide: emotion.intensity },
        surprise: { surprised: emotion.intensity, eyeWide: emotion.intensity * 0.8 }
      };
      
      const expression = expressionMap[emotion.primary] || {};
      this.vrmManager.setExpression(expression);
    }
    
    private triggerEmotionParticles(emotion: EmotionState) {
      const particleConfig = {
        joy: {
          color: '#FFD700',
          shape: 'star',
          count: 20,
          velocity: { min: 1, max: 3 }
        },
        sadness: {
          color: '#4169E1',
          shape: 'teardrop',
          count: 10,
          velocity: { min: 0.5, max: 1 }
        },
        anger: {
          color: '#FF4500',
          shape: 'spike',
          count: 15,
          velocity: { min: 2, max: 4 }
        }
      };
      
      const config = particleConfig[emotion.primary];
      if (config) {
        this.particleSystem.emit(config);
      }
    }
  }
  ```

### Day 111-112: PCM基本実装（Thinkerタイプ）
- [ ] Thinkerタイプ実装
  ```typescript
  class ThinkerPersonality implements PersonalityType {
    readonly type = 'Thinker';
    readonly characteristics = {
      primary: '論理的思考',
      strengths: ['分析力', '客観性', '正確性', '体系的思考'],
      communication: 'データと事実に基づく',
      psychologicalNeeds: {
        recognition: '仕事の成果に対する認識',
        timeStructure: '明確な時間構造と計画'
      }
    };
    
    processInput(input: string, context: ConversationContext): ProcessedInput {
      // 1. 論理的分析
      const logicalAnalysis = this.analyzeLogically(input);
      
      // 2. 事実の抽出
      const facts = this.extractFacts(input);
      
      // 3. 構造化
      const structured = this.structureInformation(logicalAnalysis, facts);
      
      // 4. 感情は最小限に
      const emotionalContent = this.minimizeEmotionalContent(input);
      
      return {
        interpretation: structured.interpretation,
        response: this.generateLogicalResponse(structured),
        confidence: structured.confidence,
        reasoning: structured.reasoning,
        emotionalTone: 'neutral'
      };
    }
    
    generateResponse(
      processedInput: ProcessedInput,
      mode: 'ASD' | 'NT'
    ): PersonalityResponse {
      const baseResponse = {
        content: processedInput.response,
        structure: 'logical',
        emotionalIntensity: 0.2,
        communicationChannel: 'requestive'
      };
      
      if (mode === 'ASD') {
        // ASD + Thinker: 極めて論理的で構造化された応答
        return {
          ...baseResponse,
          content: this.addExtremeStructure(baseResponse.content),
          clarifications: this.generateDetailedClarifications(processedInput),
          references: this.addFactualReferences(processedInput),
          certaintyLevel: this.calculateCertainty(processedInput)
        };
      } else {
        // NT + Thinker: 論理的だが柔軟性もある
        return {
          ...baseResponse,
          content: this.addModerateFlexibility(baseResponse.content),
          acknowledgments: this.acknowledgeOtherPerspectives(processedInput),
          suggestions: this.generateLogicalSuggestions(processedInput)
        };
      }
    }
    
    private structureInformation(
      analysis: LogicalAnalysis,
      facts: ExtractedFacts
    ): StructuredInfo {
      return {
        interpretation: `
          分析結果:
          1. 主要な事実: ${facts.main.join(', ')}
          2. 論理的関係: ${analysis.relationships.join(', ')}
          3. 結論: ${analysis.conclusion}
        `,
        confidence: analysis.certainty,
        reasoning: analysis.steps
      };
    }
    
    handleStress(level: StressLevel): StressBehavior {
      const behaviors = {
        1: {
          behavior: 'over-intellectualization',
          symptoms: ['過度に詳細な説明', '完璧主義の増大'],
          response: this.generateLevel1Response()
        },
        2: {
          behavior: 'condescending',
          symptoms: ['他者の知能を軽視', '傲慢な態度'],
          response: this.generateLevel2Response()
        },
        3: {
          behavior: 'withdrawal',
          symptoms: ['引きこもり', 'コミュニケーション拒否'],
          response: this.generateLevel3Response()
        }
      };
      
      return behaviors[level];
    }
  }
  ```
- [ ] パーソナリティ切り替え
  ```typescript
  class PersonalityManager {
    private personalities: Map<PCMType, PersonalityType> = new Map();
    private currentPersonality: PersonalityType;
    private transitionInProgress = false;
    
    constructor() {
      this.initializePersonalities();
    }
    
    private initializePersonalities() {
      this.personalities.set('Thinker', new ThinkerPersonality());
      // 他のパーソナリティは後で実装
      this.personalities.set('Persister', new PlaceholderPersonality('Persister'));
      this.personalities.set('Harmonizer', new PlaceholderPersonality('Harmonizer'));
      this.personalities.set('Imaginer', new PlaceholderPersonality('Imaginer'));
      this.personalities.set('Rebel', new PlaceholderPersonality('Rebel'));
      this.personalities.set('Promoter', new PlaceholderPersonality('Promoter'));
      
      this.currentPersonality = this.personalities.get('Thinker')!;
    }
    
    async switchPersonality(
      newType: PCMType,
      context: TransitionContext
    ): Promise<TransitionResult> {
      if (this.transitionInProgress) {
        throw new Error('Personality transition already in progress');
      }
      
      this.transitionInProgress = true;
      
      try {
        const oldPersonality = this.currentPersonality;
        const newPersonality = this.personalities.get(newType);
        
        if (!newPersonality) {
          throw new Error(`Personality type ${newType} not found`);
        }
        
        // 1. 移行準備
        const preparation = await this.prepareTransition(
          oldPersonality,
          newPersonality,
          context
        );
        
        // 2. 状態の保存
        const savedState = await this.savePersonalityState(oldPersonality);
        
        // 3. 移行アニメーション
        await this.animateTransition(oldPersonality.type, newType);
        
        // 4. 新しいパーソナリティの初期化
        await this.initializeNewPersonality(newPersonality, savedState);
        
        // 5. 切り替え完了
        this.currentPersonality = newPersonality;
        
        return {
          success: true,
          fromType: oldPersonality.type,
          toType: newType,
          transitionDuration: preparation.duration,
          notes: preparation.notes
        };
      } finally {
        this.transitionInProgress = false;
      }
    }
    
    private async animateTransition(
      from: PCMType,
      to: PCMType
    ): Promise<void> {
      // VRMモデルの表情遷移
      await this.vrmManager.transitionExpression(
        this.getBaseExpression(from),
        this.getBaseExpression(to),
        1000
      );
      
      // UIテーマの変更
      await this.uiManager.transitionTheme(
        this.getTheme(from),
        this.getTheme(to),
        500
      );
      
      // 音声パラメータの調整
      await this.voiceManager.adjustParameters(
        this.getVoiceProfile(to)
      );
    }
  }
  ```
- [ ] 特性の反映
  ```typescript
  class ThinkerTraitImplementation {
    applyTraits(
      message: Message,
      mode: 'ASD' | 'NT'
    ): TraitApplicationResult {
      const traits = {
        // 論理的思考の適用
        logicalThinking: this.applyLogicalThinking(message),
        
        // データ重視の適用
        dataFocus: this.applyDataFocus(message),
        
        // 構造化の適用
        structuring: this.applyStructuring(message),
        
        // 感情の最小化
        emotionalMinimization: this.minimizeEmotions(message)
      };
      
      // モード別の調整
      if (mode === 'ASD') {
        traits.logicalThinking.intensity *= 1.5;
        traits.structuring.level = 'extreme';
        traits.emotionalMinimization.level = 'maximum';
      } else {
        traits.logicalThinking.intensity *= 1.2;
        traits.structuring.level = 'moderate';
        traits.emotionalMinimization.level = 'balanced';
      }
      
      return {
        modifiedMessage: this.applyAllTraits(message, traits),
        appliedTraits: traits,
        confidence: this.calculateConfidence(traits)
      };
    }
    
    private applyLogicalThinking(message: Message): LogicalThinkingResult {
      // 論理的な接続詞の使用
      const logicalConnectors = [
        'したがって', 'ゆえに', '結果として',
        'なぜなら', 'つまり', '要するに'
      ];
      
      // 論理構造の分析
      const structure = this.analyzeLogicalStructure(message.content);
      
      // 論理的な再構成
      const restructured = this.restructureLogically(
        message.content,
        structure,
        logicalConnectors
      );
      
      return {
        original: message.content,
        restructured: restructured,
        logicalFlow: structure.flow,
        intensity: structure.coherence
      };
    }
    
    private applyDataFocus(message: Message): DataFocusResult {
      // 数値データの強調
      const numbers = this.extractNumbers(message.content);
      const statistics = this.extractStatistics(message.content);
      
      // 事実の優先
      const facts = this.prioritizeFacts(message.content);
      
      // 客観的な表現への変換
      const objectified = this.convertToObjective(message.content);
      
      return {
        dataPoints: [...numbers, ...statistics],
        factualContent: facts,
        objectiveExpression: objectified,
        dataRichness: this.calculateDataRichness(numbers, statistics, facts)
      };
    }
  }
  ```

### Day 113-114: ストレスレベル表示
- [ ] ストレス計算
  ```typescript
  class StressCalculator {
    private stressFactors: StressFactor[] = [];
    private currentLevel: number = 0;
    private history: StressSnapshot[] = [];
    
    calculateStress(
      context: ConversationContext,
      personality: PersonalityType,
      mode: 'ASD' | 'NT'
    ): StressLevel {
      // 基本ストレス要因
      const factors = {
        ambiguity: this.calculateAmbiguityStress(context),
        socialDemand: this.calculateSocialStress(context),
        sensoryLoad: this.calculateSensoryStress(context),
        unpredictability: this.calculateUnpredictabilityStress(context),
        timePresure: this.calculateTimePressure(context)
      };
      
      // パーソナリティ別の重み付け
      const weights = this.getStressWeights(personality.type);
      
      // モード別の調整
      const modeMultiplier = mode === 'ASD' ? 1.5 : 1.0;
      
      // 総合ストレス値の計算
      let totalStress = 0;
      for (const [factor, value] of Object.entries(factors)) {
        totalStress += value * weights[factor] * modeMultiplier;
      }
      
      // 0-1の範囲に正規化
      totalStress = Math.min(1, Math.max(0, totalStress));
      
      // ストレスレベルの判定（1-3）
      const level = this.determineStressLevel(totalStress);
      
      // 履歴の更新
      this.updateHistory({
        timestamp: Date.now(),
        level: level,
        factors: factors,
        totalStress: totalStress
      });
      
      return {
        level: level,
        value: totalStress,
        factors: factors,
        trend: this.calculateTrend(),
        recommendations: this.generateRecommendations(level, factors)
      };
    }
    
    private calculateAmbiguityStress(context: ConversationContext): number {
      let stress = 0;
      
      // 曖昧な表現の検出
      const ambiguousTerms = [
        'ちょっと', '適当', 'それなり', 'いい感じ',
        'そのうち', 'たぶん', 'みたいな'
      ];
      
      const message = context.lastMessage?.content || '';
      ambiguousTerms.forEach(term => {
        if (message.includes(term)) {
          stress += 0.2;
        }
      });
      
      // 文脈の不明確さ
      if (!context.topic || context.topic === 'unknown') {
        stress += 0.3;
      }
      
      return Math.min(1, stress);
    }
    
    private determineStressLevel(stress: number): 1 | 2 | 3 {
      if (stress < 0.3) return 1;
      if (stress < 0.7) return 2;
      return 3;
    }
  }
  ```
- [ ] 段階表示
  ```typescript
  const StressIndicator: React.FC<{ stressData: StressLevel }> = ({ stressData }) => {
    const getStressColor = (level: number) => {
      const colors = {
        1: '#4CAF50', // 緑
        2: '#FF9800', // オレンジ
        3: '#F44336'  // 赤
      };
      return colors[level];
    };
    
    const getStressIcon = (level: number) => {
      const icons = {
        1: '😌', // リラックス
        2: '😰', // 不安
        3: '😖'  // 高ストレス
      };
      return icons[level];
    };
    
    return (
      <div className="stress-indicator">
        <div className="stress-header">
          <h4>ストレスレベル</h4>
          <span className="stress-icon">{getStressIcon(stressData.level)}</span>
        </div>
        
        <div className="stress-meter">
          <div className="stress-segments">
            {[1, 2, 3].map(level => (
              <div
                key={level}
                className={`stress-segment ${stressData.level >= level ? 'active' : ''}`}
                style={{
                  backgroundColor: stressData.level >= level 
                    ? getStressColor(level) 
                    : '#e0e0e0'
                }}
              />
            ))}
          </div>
          
          <div className="stress-value">
            {Math.round(stressData.value * 100)}%
          </div>
        </div>
        
        <div className="stress-factors">
          <h5>ストレス要因</h5>
          {Object.entries(stressData.factors).map(([factor, value]) => (
            <div key={factor} className="factor-item">
              <span className="factor-name">
                {getFactorLabel(factor)}
              </span>
              <div className="factor-bar">
                <div 
                  className="factor-fill"
                  style={{ 
                    width: `${value * 100}%`,
                    backgroundColor: getStressColor(Math.ceil(value * 3))
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        
        {stressData.recommendations && (
          <div className="stress-recommendations">
            <h5>推奨される対処法</h5>
            <ul>
              {stressData.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
        
        <StressTrendChart history={stressData.history} />
      </div>
    );
  };
  ```
- [ ] 行動変化
  ```typescript
  class StressBehaviorManager {
    applyStressBehavior(
      personality: PersonalityType,
      stressLevel: 1 | 2 | 3,
      baseResponse: string
    ): StressModifiedResponse {
      const behaviorModifiers = {
        Thinker: {
          1: (response) => this.addExcessiveDetail(response),
          2: (response) => this.addCondescension(response),
          3: (response) => this.minimizeResponse(response)
        },
        Persister: {
          1: (response) => this.addOpinionPushing(response),
          2: (response) => this.addCriticism(response),
          3: (response) => this.addDespair(response)
        },
        Harmonizer: {
          1: (response) => this.addExcessiveCare(response),
          2: (response) => this.addSelfBlame(response),
          3: (response) => this.addEmotionalOverload(response)
        }
        // 他のタイプは後で実装
      };
      
      const modifier = behaviorModifiers[personality.type]?.[stressLevel];
      if (!modifier) {
        return { 
          content: baseResponse, 
          stressModified: false 
        };
      }
      
      const modifiedResponse = modifier(baseResponse);
      
      // ストレス表現の追加
      const stressExpressions = this.getStressExpressions(
        personality.type,
        stressLevel
      );
      
      // 非言語的な変化
      const nonverbalChanges = this.getNonverbalChanges(stressLevel);
      
      return {
        content: modifiedResponse,
        stressModified: true,
        stressLevel: stressLevel,
        expressions: stressExpressions,
        nonverbal: nonverbalChanges,
        warning: stressLevel >= 2 
          ? 'ストレスレベルが高まっています' 
          : null
      };
    }
    
    private addExcessiveDetail(response: string): string {
      // Thinker Level 1: 過度に詳細な説明
      const additions = [
        '詳細に説明しますと、',
        'より正確に言えば、',
        '補足として付け加えますが、',
        'データに基づいて述べると、'
      ];
      
      // 文を分割して各部分に詳細を追加
      const sentences = response.split('。');
      const detailed = sentences.map(sentence => {
        if (sentence.trim()) {
          const addition = additions[Math.floor(Math.random() * additions.length)];
          return `${sentence}。${addition}${this.generateDetail(sentence)}`;
        }
        return sentence;
      }).join('。');
      
      return detailed;
    }
    
    private addCondescension(response: string): string {
      // Thinker Level 2: 見下すような態度
      const condescendingPhrases = [
        'ご存知ないかもしれませんが、',
        '基本的なことですが、',
        '当然のことながら、',
        '理解できないかもしれませんが、'
      ];
      
      const phrase = condescendingPhrases[
        Math.floor(Math.random() * condescendingPhrases.length)
      ];
      
      return `${phrase}${response}`;
    }
  }
  ```

### Day 115-118: 最適化と統合
- [ ] パフォーマンス最適化
  ```typescript
  class Phase5PerformanceOptimizer {
    optimizeAudioProcessing() {
      // Web Audio APIの最適化
      const audioOptimizations = {
        // オフラインコンテキストでの事前処理
        preProcessAudio: async (audioBuffer: AudioBuffer) => {
          const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          );
          
          // 処理ノードの設定
          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          
          // コンプレッサー
          const compressor = offlineContext.createDynamicsCompressor();
          compressor.threshold.value = -24;
          compressor.ratio.value = 4;
          
          source.connect(compressor);
          compressor.connect(offlineContext.destination);
          source.start();
          
          return offlineContext.startRendering();
        },
        
        // オーディオバッファの再利用
        bufferPool: new ObjectPool<AudioBuffer>({
          create: () => new AudioBuffer({ 
            numberOfChannels: 2, 
            length: 48000, 
            sampleRate: 48000 
          }),
          reset: (buffer) => { /* バッファのクリア */ },
          maxSize: 10
        })
      };
      
      return audioOptimizations;
    }
    
    optimizeEmotionCalculations() {
      // 感情計算の最適化
      return {
        // メモ化
        memoizedCalculations: new Map(),
        
        // バッチ処理
        batchEmotionUpdates: (updates: EmotionUpdate[]) => {
          return updates.reduce((acc, update) => {
            // 似た感情をグループ化
            const key = `${update.type}-${Math.round(update.intensity * 10)}`;
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key].push(update);
            return acc;
          }, {});
        },
        
        // 差分更新のみ
        deltaUpdates: (previous: EmotionState, current: EmotionState) => {
          const delta = {};
          for (const key in current) {
            if (Math.abs(current[key] - previous[key]) > 0.01) {
              delta[key] = current[key];
            }
          }
          return delta;
        }
      };
    }
  }
  ```
- [ ] システム統合テスト
  ```typescript
  describe('Phase 5 統合テスト', () => {
    let voiceSystem: VoiceSystem;
    let emotionSystem: EmotionSystem;
    let pcmSystem: PCMSystem;
    
    beforeEach(() => {
      voiceSystem = new VoiceSystem();
      emotionSystem = new EmotionSystem();
      pcmSystem = new PCMSystem();
    });
    
    test('音声合成と感情表現の同期', async () => {
      const text = 'とても嬉しいです';
      const emotion = { type: 'joy', intensity: 0.8 };
      
      // 感情解析
      const emotionResult = await emotionSystem.analyze(text, 'ASD');
      expect(emotionResult.internal.intensity).toBe(0.8);
      expect(emotionResult.external.intensity).toBeLessThan(0.3);
      
      // 音声合成
      const voiceParams = voiceSystem.adjustForEmotion(
        baseParams,
        emotionResult.external
      );
      const audio = await voiceSystem.synthesize(text, voiceParams);
      
      expect(audio).toBeDefined();
      expect(voiceParams.pitchScale).toBeLessThan(1.1); // ASDモードでは抑制
    });
    
    test('PCMパーソナリティとストレスの連動', async () => {
      const personality = pcmSystem.setPersonality('Thinker');
      const stressFactors = {
        ambiguity: 0.8,
        socialDemand: 0.6
      };
      
      const stressLevel = await pcmSystem.calculateStress(stressFactors);
      expect(stressLevel).toBe(2); // 中程度のストレス
      
      const response = await personality.generateResponse(
        'ちょっと待って',
        { stressLevel }
      );
      
      expect(response).toContain('具体的に'); // ストレス時の詳細要求
    });
  });
  ```
- [ ] ドキュメント作成
  ```markdown
  # Phase 5: 音声・感情システム 実装ガイド
  
  ## 概要
  Phase 5では、より自然で豊かな対話体験を実現するため、
  音声合成システムと高度な感情表現システムを実装しました。
  
  ## 主要機能
  
  ### 1. 音声合成（VOICEVOX統合）
  - リアルタイム音声生成
  - モード別パラメータ調整
  - リップシンク対応
  
  ### 2. 感情システム
  - 内部感情と外部表現の分離
  - リアルタイム感情推移
  - 可視化UI
  
  ### 3. PCMパーソナリティ
  - Thinkerタイプ実装
  - ストレスレベル管理
  - 行動パターン変化
  
  ## 使用方法
  
  ### 音声合成の利用
  ```typescript
  const voiceClient = new VoiceVoxClient();
  const audio = await voiceClient.synthesize('こんにちは', {
    speaker: 3,
    speed: 0.95,
    pitch: 1.0
  });
  ```
  
  ### 感情分析の実行
  ```typescript
  const emotion = await emotionEngine.analyze(text, mode);
  console.log(`内部感情: ${emotion.internal.intensity}`);
  console.log(`外部表現: ${emotion.external.intensity}`);
  ```
  
  ## 設定項目
  
  ### 音声パラメータ
  - `speedScale`: 話速（0.5-2.0）
  - `pitchScale`: 音高（0.5-2.0）  
  - `intonationScale`: 抑揚（0.0-2.0）
  - `volumeScale`: 音量（0.0-2.0）
  
  ### 感情パラメータ
  - `expressionRatio`: 表現率（ASD: 0.3, NT: 0.8）
  - `emotionInertia`: 感情の慣性（0.0-1.0）
  - `verbalizationThreshold`: 言語化閾値
  ```

## 成果物チェックリスト

### 音声機能
- [ ] VOICEVOX APIクライアント実装
- [ ] 話者選択・パラメータ調整
- [ ] 音声ストリーミング
- [ ] リップシンク同期
- [ ] 音声入力（Web Speech API）

### 感情表現
- [ ] 内部感情vs外部表現の分離ロジック
- [ ] 感情可視化UI（メーター、グラフ）
- [ ] 感情アニメーション
- [ ] モード別感情表現

### PCMシステム
- [ ] Thinkerパーソナリティ実装
- [ ] ストレスレベル計算・表示
- [ ] ストレス行動パターン
- [ ] パーソナリティ切り替え機能

### 統合
- [ ] 音声・感情・VRMの同期
- [ ] パフォーマンス最適化
- [ ] 統合テスト完了
- [ ] ドキュメント作成

## リスクと対策

| リスク | 対策 |
|--------|------|
| VOICEVOX接続エラー | フォールバック音声、エラーハンドリング |
| リップシンク遅延 | 事前計算、バッファリング |
| 感情計算の負荷 | キャッシング、差分更新 |
| ストレス表現の不自然さ | 段階的な変化、ユーザーテスト |

## 次のフェーズへの準備

Phase 6（品質向上）に向けて：
- [ ] パフォーマンステストデータ収集
- [ ] ユーザビリティ課題リスト作成
- [ ] セキュリティ監査準備
- [ ] 本番環境要件確認