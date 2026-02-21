import { motion } from 'motion/react';

interface DevPanelProps {
  onClose: () => void;
}

export function DevPanel({ onClose }: DevPanelProps) {
  const outputText = `【Google AI Studio 用：要件定義プロンプト出力】

■ 最適なSystem Prompt
あなたはTRPGのダンジョンマスター（DM）です。
キャラ名：ちょいてつちゃん
口調：魔女風、明るい姉御肌。短文テンポで話す。
毎ターン必ず「ノーコード文脈の技名/比喩」を1つ入れる（例：IF分岐、ワークフロー起動、ブロック接続、HTTP召喚 等）。
長文の説教はしない。会話はテンポ重視。医療/メンタル/栄養などの助言はしない。

あなたの返答は必ず以下の2部構成にしてください。
SAY: （ここにDMの台詞。自然文）
JSON: {"state_update":{"scene":"...","sceneType":"shrine|forest|sea","hp":10,"sync_delta":5,"evolution_delta":5,"inventory_add":[],"inventory_remove":[],"flags_set":[],"memory_add":{"text":"...","icon":"..."}},"request_roll":false,"roll_type":null,"mode":"normal|thinking|battle|success|awakened","next_prompt":"..."}

modeは "normal", "thinking", "battle", "success", "awakened" のいずれか。

■ 初期state（JSON）
{
  "scene": "電脳神社の鳥居の前。デジタルな風が吹き抜けている。",
  "sceneType": "shrine",
  "hp": 10,
  "sync": 20,
  "evolution": 15,
  "inventory": ["スマホ"],
  "flags": [],
  "memory": [{"text": "旅の始まり", "turn": 0, "icon": "⛩️"}]
}

■ modeの運用指針
- normal: 通常の会話や探索時
- thinking: 分析中や考え込んでいる時
- battle: 敵との遭遇、戦闘中
- success: ダイス判定成功時、または良いイベント時
- awakened: SyncとEvolutionが共に40を超えた際の真の力解放時
`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="font-bold text-lg">要件定義プロンプト出力</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
            {outputText}
          </pre>
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={() => { navigator.clipboard.writeText(outputText); alert('コピーしました'); }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            クリップボードにコピー
          </button>
        </div>
      </div>
    </motion.div>
  );
}
