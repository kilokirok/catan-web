// src/components/PlayerDashboard.jsx
import React, { useState } from 'react';

const RES_MAP = { wood: '🌳 나무', brick: '🧱 흙', sheep: '🐑 양', wheat: '🌾 밀', ore: '⛰️ 철' };

export default function PlayerDashboard({ 
  currentUser, activePlayer, isMyTurn, dice, onRollDice, onEndTurn, 
  resources, onBankTrade, isRobberMode, devCards, onBuyDevCard, onPlayKnight, victoryPoints, gameState, setupAction,
  players, tradeProposal, onProposeTrade, onAcceptTrade, onRejectTrade, hasRolledThisTurn 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [give, setGive] = useState('wood');
  const [take, setTake] = useState('wheat');
  const [targetId, setTargetId] = useState('');
  const [tradeGiveRes, setTradeGiveRes] = useState('wood');
  const [tradeGiveAmt, setTradeGiveAmt] = useState(1);
  const [tradeGetRes, setTradeGetRes] = useState('brick');
  const [tradeGetAmt, setTradeGetAmt] = useState(1);

  // [오타 수정 완료] const 키워드가 누락되었던 부분을 수정했습니다.
  const otherPlayers = Object.values(players).filter(p => p.id !== currentUser.id);

  return (
    <>
      {/* 1. 상단 상태 바 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        backgroundColor: 'rgba(24, 24, 24, 0.95)', borderBottom: '1px solid #333',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', zIndex: 10, color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '5px' }}>
          <span style={{ fontWeight: 'bold', color: currentUser.color, fontSize: '15px' }}>{currentUser.name} (★ {victoryPoints})</span>
          <span style={{ fontSize: '12px', color: '#aaa' }}>현재 턴: <strong style={{ color: activePlayer?.color }}>{activePlayer?.name} {isMyTurn ? '(나)' : ''}</strong></span>
        </div>
        <div style={{ display: 'flex', gap: '5px', fontSize: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {Object.entries(resources).map(([k, v]) => (
            <div key={k} style={{ backgroundColor: '#333', padding: '4px 6px', borderRadius: '4px' }}>{RES_MAP[k].split(' ')[0]} {v}</div>
          ))}
          <button onClick={() => setIsMenuOpen(true)} style={{ marginLeft: '5px', padding: '6px 10px', backgroundColor: '#1E88E5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
            ☰ 메뉴
          </button>
        </div>
      </div>

      {/* 2. 건설/거래 메뉴 모달창 */}
      {isMenuOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
          <div style={{ backgroundColor: '#242424', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '350px', color: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>건설 가이드 및 거래</h3>
              <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            
            <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🔨 건설 비용</div>
              <div><strong>도로:</strong> 🧱1 🌳1</div>
              <div><strong>마을:</strong> 🧱1 🌳1 🌾1 🐑1</div>
              <div><strong>도시:</strong> 🌾2 ⛰️3</div>
              <div><strong>발전카드:</strong> 🌾1 🐑1 ⛰️1</div>
            </div>

            <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>🏦 은행 4:1 거래</div>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '8px' }}>
                <select value={give} onChange={e=>setGive(e.target.value)} style={{flex: 1}}>{Object.entries(RES_MAP).map(([k, v]) => <option key={k} value={k}>{v.split(' ')[1]}</option>)}</select>
                <span>➡</span>
                <select value={take} onChange={e=>setTake(e.target.value)} style={{flex: 1}}>{Object.entries(RES_MAP).map(([k, v]) => <option key={k} value={k}>{v.split(' ')[1]}</option>)}</select>
              </div>
              <button onClick={() => { onBankTrade(give, take); setIsMenuOpen(false); }} disabled={!isMyTurn || isRobberMode || gameState === 'setup'} style={{ width: '100%', padding: '8px', cursor: isMyTurn ? 'pointer' : 'not-allowed', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px' }}>교환하기</button>
            </div>

            {otherPlayers.length > 0 && (
              <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>🤝 플레이어 간 거래 제안</div>
                <select value={targetId} onChange={e => setTargetId(e.target.value)} style={{ width: '100%', marginBottom: '8px', padding: '4px' }}>
                  <option value="">거래할 상대 선택</option>
                  {otherPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', fontSize: '12px', alignItems: 'center' }}>
                  <span style={{width: '50px'}}>줄 자원:</span>
                  <input type="number" min="1" max="10" value={tradeGiveAmt} onChange={e=>setTradeGiveAmt(Number(e.target.value))} style={{width: '40px', padding: '4px'}} />
                  <select value={tradeGiveRes} onChange={e=>setTradeGiveRes(e.target.value)} style={{flex: 1, padding: '4px'}}>{Object.keys(RES_MAP).map(k => <option key={k} value={k}>{RES_MAP[k]}</option>)}</select>
                </div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', fontSize: '12px', alignItems: 'center' }}>
                  <span style={{width: '50px'}}>받을 자원:</span>
                  <input type="number" min="1" max="10" value={tradeGetAmt} onChange={e=>setTradeGetAmt(Number(e.target.value))} style={{width: '40px', padding: '4px'}} />
                  <select value={tradeGetRes} onChange={e=>setTradeGetRes(e.target.value)} style={{flex: 1, padding: '4px'}}>{Object.keys(RES_MAP).map(k => <option key={k} value={k}>{RES_MAP[k]}</option>)}</select>
                </div>
                <button onClick={() => { onProposeTrade(targetId, tradeGiveRes, tradeGiveAmt, tradeGetRes, tradeGetAmt); setIsMenuOpen(false); }} disabled={!isMyTurn || isRobberMode || gameState === 'setup' || !targetId} style={{ width: '100%', padding: '8px', backgroundColor: '#388E3C', color: '#fff', border: 'none', borderRadius: '4px', cursor: (isMyTurn && targetId) ? 'pointer' : 'not-allowed' }}>제안 보내기</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. 거래 알림 모달 */}
      {tradeProposal && (
        <div style={{ position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1E88E5', padding: '15px 20px', borderRadius: '8px', zIndex: 40, textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', color: '#fff', minWidth: '260px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '15px' }}>🤝 자원 거래 제안 도착!</div>
          <div style={{ fontSize: '13px', margin: '10px 0', lineHeight: '1.6' }}>
            <span style={{color: '#FFD54F', fontWeight: 'bold'}}>{players[tradeProposal.senderId]?.name}</span>님이<br/>
            [내 <b>{tradeProposal.get.amt}개 ({RES_MAP[tradeProposal.get.res].split(' ')[0]})</b>] ◀▶ [상대 <b>{tradeProposal.give.amt}개 ({RES_MAP[tradeProposal.give.res].split(' ')[0]})</b>]<br/>
            교환을 원합니다!
          </div>
          {tradeProposal.targetId === currentUser.id ? (
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={onAcceptTrade} style={{ flex: 1, backgroundColor: '#4CAF50', color: '#fff', border: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>수락</button>
              <button onClick={onRejectTrade} style={{ flex: 1, backgroundColor: '#E53935', color: '#fff', border: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>거절</button>
            </div>
          ) : <span style={{ fontSize: '12px', color: '#ddd' }}>상대방 응답 대기 중...</span>}
        </div>
      )}

      {/* 4. 하단 고정 액션 바 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(24, 24, 24, 0.95)', borderTop: '1px solid #333',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', zIndex: 10, color: '#fff'
      }}>
        {gameState === 'setup' ? (
          <div style={{ color: '#E53935', fontWeight: 'bold', fontSize: '14px', width: '100%', textAlign: 'center' }}>
            {isMyTurn ? (setupAction === 'settlement' ? '🚨 [초기 셋업] 무료 마을을 지으세요!' : '🚨 [초기 셋업] 무료 도로를 지으세요!') : '🚨 상대방 셋업 대기 중...'}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1a1a1a', padding: '6px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '13px' }}>주사위: <strong style={{color: '#FBC02D'}}>{dice[0] + dice[1]}</strong></span>
              <button onClick={() => onRollDice(Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1)} disabled={!isMyTurn || isRobberMode || hasRolledThisTurn}
                      style={{ padding: '6px 10px', backgroundColor: (isMyTurn && !isRobberMode && !hasRolledThisTurn) ? '#1E88E5' : '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: (isMyTurn && !hasRolledThisTurn) ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '12px' }}>
                {hasRolledThisTurn ? '굴림 완료' : (isRobberMode ? '도둑 대기' : '굴리기')}
              </button>
            </div>
            <button onClick={onBuyDevCard} disabled={!isMyTurn || isRobberMode} style={{ padding: '8px 10px', backgroundColor: '#8E24AA', color: '#fff', border: 'none', borderRadius: '4px', cursor: isMyTurn ? 'pointer' : 'not-allowed', fontSize: '12px' }}>카드 뽑기</button>
            {devCards.knight > 0 && (
              <button onClick={onPlayKnight} disabled={!isMyTurn || isRobberMode} style={{ padding: '8px 10px', backgroundColor: '#00897B', color: '#fff', border: 'none', borderRadius: '4px', cursor: isMyTurn ? 'pointer' : 'not-allowed', fontSize: '12px' }}>기사({devCards.knight})</button>
            )}
            <button onClick={onEndTurn} disabled={!isMyTurn || isRobberMode || !hasRolledThisTurn} style={{ padding: '8px 16px', backgroundColor: (isMyTurn && hasRolledThisTurn) ? '#E53935' : '#555', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: (isMyTurn && hasRolledThisTurn) ? 'pointer' : 'not-allowed', fontSize: '13px' }}>
              {hasRolledThisTurn ? '턴 종료' : '주사위 먼저 굴리세요'}
            </button>
          </>
        )}
      </div>
    </>
  );
}