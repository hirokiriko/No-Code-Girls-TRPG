# 背景画像アセット

シーン別の背景画像を格納します。`src/constants/index.ts` の `SCENE_BACKGROUNDS` で参照されています。

## 命名規則

- **shibuya/** … 渋谷シーン用: `shibuya_01.png`, `shibuya_02.png`, …
- **shibuya_stream/** … 渋谷ストリームシーン用: `shibuya_stream_01.png`, `shibuya_stream_02.png`, …

新しい画像を追加する場合は、上記の連番形式でリネームし、`SCENE_BACKGROUNDS` にファイル名を追加してください。
