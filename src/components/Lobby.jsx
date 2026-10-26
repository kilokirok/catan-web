// src/components/Lobby.jsx
import React, { useState } from 'react';

const COLORS = [
  { id: 'red', hex: '#E53935', name: '빨강' },
  { id: 'blue', hex: '#1E88E5', name: '파랑' },
  { id: 'white', hex: '#F5F5F5', name: '하양' },
  { id: 'orange', hex: '#FB8C00', name: '주황' }
];

export default function Lobby({ rooms, onCreateRoom, onJoinRoom }) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [roomTitle, setRoomTitle] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return alert('닉네임을 입력해주세요!');
    if (!roomTitle.trim()) return alert('방 이름을 입력해주세요!');
    onCreateRoom({ user: { id: `user_${Date.now()}`, name, color: selectedColor.hex }, roomName: roomTitle });
  };

  const handleJoin = (roomId) => {
    if (!name.trim()) return alert('닉네임을 입력해주세요!');
    
    const targetRoom = rooms[roomId];
    const isColorTaken = Object.values(targetRoom.players || {}).some(p => p.color === selectedColor.hex);
    if (isColorTaken) {
      return alert('해당 방에서 이미 사용 중인 색상입니다. 다른 색상을 선택해주세요.');
    }
    
    onJoinRoom(roomId, { id: `user_${Date.now()}`, name, color: selectedColor.hex });
  };

  // [수정됨] 대기 중인 방만 필터링하여 보여줍니다.
  const availableRooms = Object.entries(rooms).filter(([rId, rData]) => rData.gameState === 'waiting');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#1a1a1a', color: 'white', padding: '20px', boxSizing: 'border-box' }}>
      <h1 style={{ color: '#FBC02D', fontSize: '36px', marginBottom: '20px' }}>카탄 온라인</h1>
      <div style={{ backgroundColor: '#242424', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxSizing: 'border-box', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>플레이어 설정</h3>
        <input type="text" placeholder="닉네임 입력" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '16px', marginBottom: '15px', borderRadius: '6px', border: 'none', boxSizing: 'border-box' }} />
        <div style={{ fontSize: '14px', marginBottom: '8px' }}>색상 선택</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {COLORS.map(c => (
            <button key={c.id} onClick={() => setSelectedColor(c)} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: c.hex, border: selectedColor.id === c.id ? '3px solid #FBC02D' : '2px solid transparent', cursor: 'pointer' }} />
          ))}
        </div>
      </div>
      <div style={{ backgroundColor: '#242424', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>게임 방 만들기</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
          <input type="text" placeholder="방 제목 입력" value={roomTitle} onChange={(e) => setRoomTitle(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none' }} />
          <button onClick={handleCreate} style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>방 생성</button>
        </div>
        <h3 style={{ margin: '0 0 10px 0' }}>참여 가능한 방 목록 (대기 중)</h3>
        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {availableRooms.length === 0 ? <div style={{ color: '#888', fontSize: '14px', textAlign: 'center', padding: '15px' }}>입장 가능한 대기 방이 없습니다.</div> : (
            availableRooms.map(([rId, rData]) => (
              <div key={rId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#1a1a1a', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{rData.roomName || '제목 없는 방'}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{Object.keys(rData.players || {}).length}명 대기 중</div>
                </div>
                <button onClick={() => handleJoin(rId)} style={{ padding: '6px 14px', backgroundColor: '#1E88E5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>입장</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}