// sprite.js — Blip's pixel body.
// 16x16 frames drawn crisp at integer scale. Never smoothed, never blurred.
// legend: . transparent | o outline | b body | h highlight | e eye | m mouth | c cheek

export const FRAMES = {
  // resting shape
  normal: [
    "................",
    "................",
    ".....oooooo.....",
    "....obbbbbbo....",
    "...obhbbbbbbo...",
    "..obhbbbbbbbbo..",
    "..obbeebbeebbo..",
    "..obbeebbeebbo..",
    "..obbbbbbbbbbo..",
    "..obcbbmmbbcbo..",
    "..obbbbbbbbbbo..",
    "...obbbbbbbbo...",
    "....oooooooo....",
    "....oo....oo....",
    "................",
    "................",
  ],

  // eyes shut for a beat
  blink: [
    "................",
    "................",
    ".....oooooo.....",
    "....obbbbbbo....",
    "...obhbbbbbbo...",
    "..obhbbbbbbbbo..",
    "..obbbbbbbbbbo..",
    "..obbeebbeebbo..",
    "..obbbbbbbbbbo..",
    "..obcbbmmbbcbo..",
    "..obbbbbbbbbbo..",
    "...obbbbbbbbo...",
    "....oooooooo....",
    "....oo....oo....",
    "................",
    "................",
  ],

  // big breath in — round and full
  inhale: [
    "................",
    ".....oooooo.....",
    "...oobbbbbboo...",
    "..obbbbbbbbbbo..",
    ".obhbbbbbbbbbbo.",
    ".obhbbbbbbbbbbo.",
    ".obbeebbbbeebbo.",
    ".obbeebbbbeebbo.",
    ".obbbbbbbbbbbbo.",
    ".obcbbbmmbbbcbo.",
    ".obbbbbbbbbbbbo.",
    "..obbbbbbbbbbo..",
    "...oooooooooo...",
    "....oo....oo....",
    "................",
    "................",
  ],

  // breath out — settled and low
  exhale: [
    "................",
    "................",
    "................",
    "................",
    ".....oooooo.....",
    "...oobbbbbboo...",
    "..obbbbbbbbbbo..",
    "..obeebbbbeebo..",
    ".obbeebbbbeebbo.",
    ".obbbbbbbbbbbbo.",
    ".obcbbbmmbbbcbo.",
    ".obbbbbbbbbbbbo.",
    "..oobbbbbbbboo..",
    "...oooooooooo...",
    "....oo....oo....",
    "................",
  ],

  // knowing sideways look
  glance: [
    "................",
    "................",
    ".....oooooo.....",
    "....obbbbbbo....",
    "...obhbbbbbbo...",
    "..obhbbbbbbbbo..",
    "..obbbbbbbbbbo..",
    "..obeebbeebbbo..",
    "..obbbbbbbbbbo..",
    "..obcbbmmbbcbo..",
    "..obbbbbbbbbbo..",
    "...obbbbbbbbo...",
    "....oooooooo....",
    "....oo....oo....",
    "................",
    "................",
  ],

  // mid-hop joy — arc eyes, open smile, feet splayed
  happy: [
    "................",
    ".....oooooo.....",
    "....obbbbbbo....",
    "...obhbbbbbbo...",
    "..obhbbbbbbbbo..",
    "..obeebbbbeebo..",
    "..obbeebbeebbo..",
    "..obbbbbbbbbbo..",
    "..obcbmmmmbcbo..",
    "..obbbbmmbbbbo..",
    "..obbbbbbbbbbo..",
    "...obbbbbbbbo...",
    "....oooooooo....",
    "...oo......oo...",
    "................",
    "................",
  ],
};

export function drawFrame(ctx, frame, x, y, scale, palette) {
  for (let r = 0; r < 16; r++) {
    const row = frame[r];
    for (let c = 0; c < 16; c++) {
      const color = palette[row[c]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
    }
  }
}
