// src/utils/hexMath.js

export function axialToCube(hex) {
  return { q: hex.q, r: hex.r, s: -hex.q - hex.r };
}

export function getHexDistance(hexA, hexB) {
  const aCube = axialToCube(hexA);
  const bCube = axialToCube(hexB);
  return Math.max(Math.abs(aCube.q - bCube.q), Math.abs(aCube.r - bCube.r), Math.abs(aCube.s - bCube.s));
}

export function generateBoardHexes() {
  const hexes = [];
  const mapRadius = 2;
  for (let q = -mapRadius; q <= mapRadius; q++) {
    const r1 = Math.max(-mapRadius, -q - mapRadius);
    const r2 = Math.min(mapRadius, -q + mapRadius);
    for (let r = r1; r <= r2; r++) hexes.push({ q, r });
  }
  return hexes;
}

const RESOURCES_POOL = ['wood', 'wood', 'wood', 'wood', 'sheep', 'sheep', 'sheep', 'sheep', 'wheat', 'wheat', 'wheat', 'wheat', 'brick', 'brick', 'brick', 'ore', 'ore', 'ore'];
const NUMBERS_POOL = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 중복 배치를 최소화하는 맵 생성 알고리즘
export function generateBoardWithResources() {
  const hexes = generateBoardHexes();
  let bestBoard = null;
  let minConflicts = 999;

  for (let attempt = 0; attempt < 50; attempt++) {
    const sRes = shuffle(RESOURCES_POOL);
    const sNum = shuffle(NUMBERS_POOL);
    let conflicts = 0;
    
    const tempBoard = hexes.map((hex) => {
      if (hex.q === 0 && hex.r === 0) return { ...hex, resource: 'desert', number: null };
      return { ...hex, resource: sRes.pop(), number: sNum.pop() };
    });

    tempBoard.forEach(h1 => {
      tempBoard.forEach(h2 => {
        if (h1 !== h2 && getHexDistance(h1, h2) === 1) {
          if (h1.resource === h2.resource && h1.resource !== 'desert') conflicts += 1;
          if ((h1.number === 6 || h1.number === 8) && (h2.number === 6 || h2.number === 8)) conflicts += 10; // 6, 8 겹침 강력 페널티
        }
      });
    });

    if (conflicts < minConflicts) {
      minConflicts = conflicts;
      bestBoard = tempBoard;
    }
    if (conflicts === 0) break;
  }
  return bestBoard;
}