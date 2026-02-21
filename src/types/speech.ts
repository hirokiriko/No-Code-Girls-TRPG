export interface SpeechRecognitionResult {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionEvent {
  readonly results: { [index: number]: { [index: number]: SpeechRecognitionResult } };
}

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}
export {};
