// src/components/Board.jsx
import React, { useMemo } from 'react';

const RESOURCE_COLORS = { wood: '#2E7D32', sheep: '#8BC34A', wheat: '#FBC02D', brick: '#D84315', ore: '#546E7A', desert: '#D7CCC8' };

export default function Board({ boardHexes, buildings, roads, robberPos, isRobberMode, onBuildSettlement, onUpgradeCity, onBuildRoad, onMoveRobber, currentUser }) {
  const hexSize = 45;

  const getPixelCoordinates = (q, r) => ({
    x: hexSize * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    y: hexSize * ((3 / 2) * r)
  });

  const { vertices, edges } = useMemo(() => {
    const uniqueVertices = new Map();
    const uniqueEdges = new Map();

    boardHexes.forEach((hex) => {
      const { x: hexX, y: hexY } = getPixelCoordinates(hex.q, hex.r);
      const hexVertices = [];
      for (let i = 0; i < 6; i++) {
        const angle_rad = (Math.PI / 180) * (60 * i - 30);
        const vx = Math.round(hexX + hexSize * Math.cos(angle_rad)) || 0;
        const vy = Math.round(hexY + hexSize * Math.sin(angle_rad)) || 0;
        const key = `${vx},${vy}`;
        if (!uniqueVertices.has(key)) uniqueVertices.set(key, { x: vx, y: vy, key });
        hexVertices.push(uniqueVertices.get(key));
      }
      for (let i = 0; i < 6; i++) {
        const v1 = hexVertices[i], v2 = hexVertices[(i + 1) % 6];
        const edgeKey = [v1.key, v2.key].sort().join('::');
        if (!uniqueEdges.has(edgeKey)) uniqueEdges.set(edgeKey, { key: edgeKey, x1: v1.x, y1: v1.y, x2: v2.x, y2: v2.y });
      }
    });
    return { vertices: Array.from(uniqueVertices.values()), edges: Array.from(uniqueEdges.values()) };
  }, [boardHexes]);

  const handleVertexClick = (vertexKey) => {
    if (isRobberMode) return;
    if (buildings[vertexKey]) {
      if (buildings[vertexKey].owner === currentUser.id && buildings[vertexKey].type === 'settlement') {
        onUpgradeCity(vertexKey);
      } else {
        alert('이미 건물이 있습니다!');
      }
      return;
    }
    const clickedV = vertices.find(v => v.key === vertexKey);
    const isTooClose = Object.keys(buildings).some((bKey) => {
      const bV = vertices.find(v => v.key === bKey);
      return Math.hypot(clickedV.x - bV.x, clickedV.y - bV.y) < 50; 
    });
    if (isTooClose) return alert('거리 규칙 위반! 다른 건물과 인접한 곳에는 지을 수 없습니다.');
    onBuildSettlement(vertexKey);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* [수정됨] viewBox를 -240으로 좁혀서 화면에 맵이 더 크고 꽉 차게 렌더링되도록 수정 */}
      <svg width="100%" height="100%" viewBox="-240 -240 480 480" preserveAspectRatio="xMidYMid meet" style={{ touchAction: 'pinch-zoom' }}>
        <g>
          {boardHexes.map((hex) => {
            const { x, y } = getPixelCoordinates(hex.q, hex.r);
            const isRobberHere = robberPos === `${hex.q},${hex.r}`;
            const points = Array.from({length: 6}).map((_, i) => {
              const rad = (Math.PI / 180) * (60 * i - 30);
              return `${hexSize * Math.cos(rad)},${hexSize * Math.sin(rad)}`;
            }).join(' ');

            return (
              <g key={`${hex.q}-${hex.r}`} transform={`translate(${x}, ${y})`} 
                 onClick={() => isRobberMode && onMoveRobber(hex.q, hex.r)}
                 style={{ cursor: isRobberMode ? 'crosshair' : 'default' }}>
                <polygon points={points} fill={RESOURCE_COLORS[hex.resource]} stroke={isRobberMode ? '#FFF' : '#222'} strokeWidth={isRobberMode ? "4" : "2"} />
                {hex.number && !isRobberHere && (
                  <g><circle cx="0" cy="0" r="16" fill="#FFF" /><text x="0" y="5" textAnchor="middle" fill={(hex.number === 6 || hex.number === 8) ? '#D32F2F' : '#333'} fontWeight="900">{hex.number}</text></g>
                )}
                {isRobberHere && <circle cx="0" cy="0" r="18" fill="#111" stroke="#555" strokeWidth="2" />}
              </g>
            );
          })}
          {edges.map((edge) => (
            <line key={edge.key} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2}
                  stroke={roads[edge.key] ? roads[edge.key].color : "transparent"} strokeWidth="8"
                  style={{ cursor: 'pointer' }} onClick={() => !isRobberMode && onBuildRoad(edge.key)} />
          ))}
          {vertices.map((vertex) => {
            const b = buildings[vertex.key];
            if (b) {
              return (
                <g key={vertex.key} transform={`translate(${vertex.x}, ${vertex.y})`} onClick={() => handleVertexClick(vertex.key)} style={{cursor: 'pointer'}}>
                  {b.type === 'city' 
                    ? <polygon points="-12,8 12,8 12,-4 0,-12 -12,-4" fill={b.color} stroke="#FFF" strokeWidth="2" />
                    : <polygon points="-8,6 8,6 8,-2 0,-10 -8,-2" fill={b.color} stroke="#FFF" strokeWidth="2" />}
                </g>
              );
            }
            return <circle key={vertex.key} cx={vertex.x} cy={vertex.y} r="8" fill="transparent" stroke="#FFF" style={{ cursor: 'pointer' }} onClick={() => handleVertexClick(vertex.key)} />;
          })}
        </g>
      </svg>
    </div>
  );
}