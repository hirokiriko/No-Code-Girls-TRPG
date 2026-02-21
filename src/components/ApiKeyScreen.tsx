import { useState } from 'react';
import { KeyRound } from 'lucide-react';

interface ApiKeyScreenProps {
  onSubmit: (key: string) => void;
}

export function ApiKeyScreen({ onSubmit }: ApiKeyScreenProps) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError('API キーを入力してください');
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <div className="w-full h-screen bg-base flex items-center justify-center font-sans">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md mx-4 p-8 rounded-2xl border border-wisteria/20 bg-base/80 backdrop-blur-sm space-y-6"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-wisteria/10 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-wisteria" />
          </div>
          <h1 className="text-xl font-bold text-porcelain">No-Code Girls TRPG</h1>
          <p className="text-sm text-muted text-center leading-relaxed">
            プレイするには Gemini API キーが必要です。
            <br />
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-wisteria hover:text-gold transition-colors underline"
            >
              Google AI Studio
            </a>
            {' '}で無料で取得できます。
          </p>
        </div>

        <div className="space-y-2">
          <input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); setError(''); }}
            placeholder="AIza..."
            className="w-full px-4 py-3 rounded-lg bg-[#1a1525] border border-wisteria/20 text-porcelain placeholder:text-muted/50 focus:outline-none focus:border-wisteria/50 transition-colors"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-wisteria/20 hover:bg-wisteria/30 text-porcelain font-medium transition-colors border border-wisteria/30"
        >
          はじめる
        </button>

        <p className="text-xs text-muted/60 text-center">
          キーはブラウザのローカルストレージに保存され、外部には送信されません。
        </p>
      </form>
    </div>
  );
}
