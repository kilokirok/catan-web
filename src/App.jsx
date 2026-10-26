// src/App.jsx
import React, { useState, useEffect } from 'react';
import Board from './components/Board';
import PlayerDashboard from './components/PlayerDashboard';
import Lobby from './components/Lobby';
import { generateBoardWithResources } from './utils/hexMath';
import { ref, onValue, update, get, set, remove } from 'firebase/database';
import { db } from './firebase';

export default function App() {
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [rooms, setRooms] = useState({});

  const [players, setPlayers] = useState({});
  const [gameState, setGameState] = useState('waiting');
  const [turnOrder, setTurnOrder] = useState([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [setupAction, setSetupAction] = useState('settlement');
  const [lastPlacedSetupSettlement, setLastPlacedSetupSettlement] = useState(null);

  const [boardHexes, setBoardHexes] = useState([]);
  const [buildings, setBuildings] = useState({});
  const [roads, setRoads] = useState({});
  const [dice, setDice] = useState([1, 1]);
  const [robberPos, setRobberPos] = useState('0,0');
  const [isRobberMode, setIsRobberMode] = useState(false);
  const [hasRolledThisTurn, setHasRolledThisTurn] = useState(false);
  
  const [devCards, setDevCards] = useState({ knight: 0, vp: 0 });
  const [tradeProposal, setTradeProposal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const myResources = (currentUser && players[currentUser.id]?.resources) || { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

  useEffect(() => {
    const roomsRef = ref(db, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const now = Date.now();
      const twentyMins = 20 * 60 * 1000;
      
      Object.keys(data).forEach(rId => {
        if (data[rId].lastUpdatedAt && (now - data[rId].lastUpdatedAt > twentyMins)) {
          remove(ref(db, `rooms/${rId}`));
          delete data[rId];
        }
      });
      setRooms(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentRoomId) return;
    const roomRef = ref(db, `rooms/${currentRoomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val() || {};
      if (data.boardHexes) setBoardHexes(data.boardHexes);
      setBuildings(data.buildings || {});
      setRoads(data.roads || {});
      if (data.dice) setDice(data.dice);
      setPlayers(data.players || {});
      if (data.gameState) setGameState(data.gameState);
      setTurnOrder(data.turnOrder || []);
      if (data.setupAction) setSetupAction(data.setupAction);
      if (data.robberPos) setRobberPos(data.robberPos);
      setHasRolledThisTurn(data.hasRolledThisTurn || false);
      setTradeProposal(data.tradeProposal || null);
      setCurrentTurnIndex(data.currentTurnIndex || 0);
    });
    return () => unsubscribe();
  }, [currentRoomId]);

  const touchRoom = () => {
    if(currentRoomId) update(ref(db, `rooms/${currentRoomId}`), { lastUpdatedAt: Date.now() });
  };

  const updateMyResources = (newRes) => {
    update(ref(db, `rooms/${currentRoomId}/players/${currentUser.id}`), { resources: newRes });
  };

  const handleCreateRoom = ({ user, roomName }) => {
    const newRoomId = `room_${Date.now()}`;
    const initialBoard = generateBoardWithResources();
    const initialUser = { ...user, resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } };
    set(ref(db, `rooms/${newRoomId}`), {
      roomName, boardHexes: initialBoard, buildings: {}, roads: {}, players: { [user.id]: initialUser }, dice: [1, 1],
      gameState: 'waiting', turnOrder: [], currentTurnIndex: 0, setupAction: 'settlement', robberPos: '0,0', hasRolledThisTurn: false, tradeProposal: null,
      lastUpdatedAt: Date.now()
    });
    setCurrentUser(initialUser);
    setCurrentRoomId(newRoomId);
  };

  const handleJoinRoom = (roomId, user) => {
    const initialUser = { ...user, resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } };
    update(ref(db, `rooms/${roomId}/players`), { [user.id]: initialUser });
    update(ref(db, `rooms/${roomId}`), { lastUpdatedAt: Date.now() });
    setCurrentUser(initialUser);
    setCurrentRoomId(roomId);
  };

  const handleStartGame = () => {
    const playerIds = Object.keys(players);
    if (playerIds.length < 1) return alert('플레이어가 필요합니다.');
    const setupTurns = [...playerIds, ...[...playerIds].reverse()];
    update(ref(db, `rooms/${currentRoomId}`), { gameState: 'setup', turnOrder: setupTurns, currentTurnIndex: 0, setupAction: 'settlement', lastUpdatedAt: Date.now() });
  };

  const isMyTurn = turnOrder[currentTurnIndex] === currentUser?.id;

  const handleEndTurn = () => {
    if (!isMyTurn || isRobberMode || gameState === 'setup') return;
    const nextIndex = (currentTurnIndex + 1) % turnOrder.length;
    update(ref(db, `rooms/${currentRoomId}`), { currentTurnIndex: nextIndex, hasRolledThisTurn: false, lastUpdatedAt: Date.now() });
  };

  const handleRollDice = (d1, d2) => {
    if (!isMyTurn || gameState === 'setup' || hasRolledThisTurn) return;
    const total = d1 + d2;
    update(ref(db, `rooms/${currentRoomId}`), { dice: [d1, d2], hasRolledThisTurn: true, lastUpdatedAt: Date.now() });

    if (total === 7) {
      setIsRobberMode(true);
      const updatedPlayers = JSON.parse(JSON.stringify(players));
      let dropped = false;
      Object.values(updatedPlayers).forEach(p => {
        const resCount = Object.values(p.resources).reduce((a, b) => a + b, 0);
        if (resCount >= 8) {
          dropped = true;
          Object.keys(p.resources).forEach(k => p.resources[k] = Math.floor(p.resources[k] / 2));
        }
      });
      if (dropped) {
        update(ref(db, `rooms/${currentRoomId}/players`), updatedPlayers);
        alert('주사위 7 도둑 등장! 자원이 절반으로 줄었습니다.');
      } else {
        alert('주사위 7 도둑 등장! 도둑을 이동시키세요.');
      }
      return;
    }

    const updatedPlayers = JSON.parse(JSON.stringify(players));
    let resourcesDistributed = false;

    boardHexes.forEach(hex => {
      if (hex.number === total && hex.resource !== 'desert' && robberPos !== `${hex.q},${hex.r}`) {
        const hx = 45 * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
        const hy = 45 * ((3 / 2) * hex.r);
        Object.keys(buildings).forEach(vKey => {
          const [vx, vy] = vKey.split(',').map(Number);
          if (Math.hypot(hx - vx, hy - vy) < 50) {
            const ownerId = buildings[vKey].owner;
            if (updatedPlayers[ownerId]) {
              updatedPlayers[ownerId].resources[hex.resource] += buildings[vKey].type === 'city' ? 2 : 1;
              resourcesDistributed = true;
            }
          }
        });
      }
    });
    if (resourcesDistributed) update(ref(db, `rooms/${currentRoomId}/players`), updatedPlayers);
  };

  const handleMoveRobber = (q, r) => {
    if (!isMyTurn || !isRobberMode) return;
    update(ref(db, `rooms/${currentRoomId}`), { robberPos: `${q},${r}`, lastUpdatedAt: Date.now() });
    setIsRobberMode(false);
  };

  const handleBuildSettlement = (vertexKey) => {
    if (!isMyTurn || isRobberMode) return;
    
    if (gameState !== 'setup') {
      const hasConnectedRoad = Object.keys(roads).some(rKey => {
        const [rV1, rV2] = rKey.split('::');
        return roads[rKey].owner === currentUser.id && (rV1 === vertexKey || rV2 === vertexKey);
      });
      if (!hasConnectedRoad) return alert('자신의 도로와 연결된 곳에만 마을을 지을 수 있습니다!');
    }

    if (gameState === 'setup') {
      if (setupAction !== 'settlement') return alert('도로를 지을 차례입니다!');
      setLastPlacedSetupSettlement(vertexKey);
      update(ref(db, `rooms/${currentRoomId}/buildings`), { [vertexKey]: { owner: currentUser.id, type: 'settlement', color: currentUser.color }});
      
      const pCount = Object.keys(players).length;
      if (currentTurnIndex >= pCount) {
        const [vx, vy] = vertexKey.split(',').map(Number);
        const newRes = { ...myResources };
        boardHexes.forEach(hex => {
          if (hex.resource !== 'desert') {
            const hx = 45 * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
            const hy = 45 * ((3 / 2) * hex.r);
            if (Math.hypot(hx - vx, hy - vy) < 50) newRes[hex.resource] += 1;
          }
        });
        updateMyResources(newRes);
      }
      update(ref(db, `rooms/${currentRoomId}`), { setupAction: 'road', lastUpdatedAt: Date.now() });
      return;
    }

    if (myResources.wood >= 1 && myResources.brick >= 1 && myResources.wheat >= 1 && myResources.sheep >= 1) {
      updateMyResources({ ...myResources, wood: myResources.wood-1, brick: myResources.brick-1, wheat: myResources.wheat-1, sheep: myResources.sheep-1 });
      update(ref(db, `rooms/${currentRoomId}/buildings`), { [vertexKey]: { owner: currentUser.id, type: 'settlement', color: currentUser.color }});
      touchRoom();
    } else alert('자원이 부족합니다!');
  };

  const handleBuildRoad = (edgeKey) => {
    if (!isMyTurn || isRobberMode) return;
    const [v1, v2] = edgeKey.split('::');

    if (gameState === 'setup') {
      if (setupAction !== 'road') return alert('마을을 지을 차례입니다!');
      
      // [수정됨] 셋업 단계에서 방금 지은 마을이 아니더라도, 내 소유의 마을/도시 중 한 곳과 닿아있다면 허용하도록 유연하게 개선
      const isConnectedToMyAnyBuilding = Object.keys(buildings).some(bKey => {
        const b = buildings[bKey];
        return b.owner === currentUser.id && (bKey === v1 || bKey === v2);
      });

      if (v1 !== lastPlacedSetupSettlement && v2 !== lastPlacedSetupSettlement && !isConnectedToMyAnyBuilding) {
        return alert('내 마을과 바로 연결된 곳에 도로를 지어야 합니다!');
      }

      update(ref(db, `rooms/${currentRoomId}/roads`), { [edgeKey]: { owner: currentUser.id, color: currentUser.color }});
      
      const nextIndex = currentTurnIndex + 1;
      if (nextIndex >= turnOrder.length) {
        const pIds = Object.keys(players);
        update(ref(db, `rooms/${currentRoomId}`), { gameState: 'playing', turnOrder: pIds, currentTurnIndex: 0, lastUpdatedAt: Date.now() });
      } else {
        update(ref(db, `rooms/${currentRoomId}`), { currentTurnIndex: nextIndex, setupAction: 'settlement', lastUpdatedAt: Date.now() });
      }
      return;
    }

    const isConnectedToMyBuilding = buildings[v1]?.owner === currentUser.id || buildings[v2]?.owner === currentUser.id;
    const isConnectedToMyRoad = Object.keys(roads).some(rKey => {
      if (rKey === edgeKey || roads[rKey].owner !== currentUser.id) return false;
      const [rV1, rV2] = rKey.split('::');
      return rV1 === v1 || rV1 === v2 || rV2 === v1 || rV2 === v2;
    });

    if (!isConnectedToMyBuilding && !isConnectedToMyRoad) return alert('자신의 마을, 도시 또는 도로와 연결된 곳에만 도로를 지을 수 있습니다!');

    if (myResources.wood >= 1 && myResources.brick >= 1) {
      updateMyResources({ ...myResources, wood: myResources.wood-1, brick: myResources.brick-1 });
      update(ref(db, `rooms/${currentRoomId}/roads`), { [edgeKey]: { owner: currentUser.id, color: currentUser.color }});
      touchRoom();
    } else alert('자원이 부족합니다!');
  };

  const handleUpgradeCity = (vertexKey) => {
    if (!isMyTurn || isRobberMode || gameState === 'setup') return;
    if (myResources.ore >= 3 && myResources.wheat >= 2) {
      updateMyResources({ ...myResources, ore: myResources.ore-3, wheat: myResources.wheat-2 });
      update(ref(db, `rooms/${currentRoomId}/buildings/${vertexKey}`), { type: 'city' });
      touchRoom();
    } else alert('자원이 부족합니다! (철 3, 밀 2)');
  };

  const handleBankTrade = (giveRes, takeRes) => {
    if (!isMyTurn || isRobberMode || gameState === 'setup') return;
    if (myResources[giveRes] >= 4) {
      updateMyResources({ ...myResources, [giveRes]: myResources[giveRes]-4, [takeRes]: myResources[takeRes]+1 });
      touchRoom();
    } else alert('자원이 부족합니다!');
  };

  const handleProposeTrade = (targetId, giveRes, giveAmt, getRes, getAmt) => {
    if (!isMyTurn || isRobberMode || gameState === 'setup') return;
    if (myResources[giveRes] < giveAmt) return alert('자원이 부족합니다!');
    const proposal = { senderId: currentUser.id, targetId, give: { res: giveRes, amt: giveAmt }, get: { res: getRes, amt: getAmt } };
    update(ref(db, `rooms/${currentRoomId}`), { tradeProposal: proposal, lastUpdatedAt: Date.now() });
  };

  const handleAcceptTrade = () => {
    if (!tradeProposal) return;
    const { senderId, targetId, give, get: getInfo } = tradeProposal;
    const sender = players[senderId];
    const target = players[targetId];
    if (!sender || !target) return;
    
    if (target.resources[getInfo.res] < getInfo.amt) return alert('자원이 부족하여 수락할 수 없습니다.');
    if (sender.resources[give.res] < give.amt) return alert('제안자의 자원이 부족해 취소되었습니다.');

    const newSenderRes = { ...sender.resources, [give.res]: sender.resources[give.res] - give.amt, [getInfo.res]: (sender.resources[getInfo.res] || 0) + getInfo.amt };
    const newTargetRes = { ...target.resources, [getInfo.res]: target.resources[getInfo.res] - getInfo.amt, [give.res]: (target.resources[give.res] || 0) + give.amt };

    update(ref(db, `rooms/${currentRoomId}/players/${senderId}`), { resources: newSenderRes });
    update(ref(db, `rooms/${currentRoomId}/players/${targetId}`), { resources: newTargetRes });
    update(ref(db, `rooms/${currentRoomId}`), { tradeProposal: null, lastUpdatedAt: Date.now() });
  };

  const handleRejectTrade = () => {
    update(ref(db, `rooms/${currentRoomId}`), { tradeProposal: null });
  };

  const handleBuyDevCard = () => {
    if (!isMyTurn || isRobberMode || gameState === 'setup') return;
    if (myResources.ore >= 1 && myResources.wheat >= 1 && myResources.sheep >= 1) {
      updateMyResources({ ...myResources, ore: myResources.ore-1, wheat: myResources.wheat-1, sheep: myResources.sheep-1 });
      if (Math.random() < 0.7) {
        setDevCards(prev => ({ ...prev, knight: prev.knight + 1 }));
        alert('⚔️ 기사 카드를 뽑았습니다!');
      } else {
        setDevCards(prev => ({ ...prev, vp: prev.vp + 1 }));
        alert('🏆 승점 카드 획득! (+1점)');
      }
      touchRoom();
    } else alert('자원이 부족합니다!');
  };

  const handlePlayKnight = () => {
    if (!isMyTurn || isRobberMode || gameState === 'setup') return;
    if (devCards.knight > 0) {
      setDevCards(prev => ({ ...prev, knight: prev.knight - 1 }));
      setIsRobberMode(true);
      alert('기사 카드 사용! 도둑을 이동시키세요.');
      touchRoom();
    }
  };

  let victoryPoints = devCards.vp;
  if (currentUser) {
    Object.values(buildings).forEach(b => {
      if (b.owner === currentUser.id) victoryPoints += (b.type === 'city' ? 2 : 1);
    });
  }

  if (victoryPoints >= 10 && gameState === 'playing') {
    update(ref(db, `rooms/${currentRoomId}`), { gameState: 'finished', winner: currentUser.name, lastUpdatedAt: Date.now() });
  }

  if (isLoading) return <div style={{ color: 'white', padding: '50px' }}>로딩 중...</div>;
  if (!currentUser || !currentRoomId) return <Lobby rooms={rooms} onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;

  if (gameState === 'waiting') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#1a1a1a', color: 'white' }}>
        <h2>방 대기실</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>{Object.values(players).map(p => <li key={p.id} style={{ color: p.color, fontSize: '18px', margin: '5px 0' }}>{p.name} {p.id === currentUser.id && '(나)'}</li>)}</ul>
        <button onClick={handleStartGame} style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}>게임 시작</button>
      </div>
    );
  }

  if (gameState === 'finished') {
    return <div style={{ display: 'flex', height: '100vh', backgroundColor: '#1a1a1a', color: '#FBC02D', justifyContent: 'center', alignItems: 'center', fontSize: '36px' }}>🎉 게임 종료! 승리자: {rooms[currentRoomId]?.winner} 🎉</div>;
  }

  const activePlayer = players[turnOrder[currentTurnIndex]];

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1a1a1a', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', paddingTop: '70px', paddingBottom: '90px', boxSizing: 'border-box' }}>
        <Board 
          boardHexes={boardHexes} buildings={buildings} roads={roads} robberPos={robberPos} isRobberMode={isRobberMode} currentUser={currentUser}
          onBuildSettlement={handleBuildSettlement} onUpgradeCity={handleUpgradeCity} onBuildRoad={handleBuildRoad} onMoveRobber={handleMoveRobber} 
        />
      </div>
      <PlayerDashboard 
        currentUser={currentUser} activePlayer={activePlayer} isMyTurn={isMyTurn} isRobberMode={isRobberMode} gameState={gameState} setupAction={setupAction}
        dice={dice} onRollDice={handleRollDice} onEndTurn={handleEndTurn} resources={myResources} onBankTrade={handleBankTrade}
        devCards={devCards} onBuyDevCard={handleBuyDevCard} onPlayKnight={handlePlayKnight} victoryPoints={victoryPoints}
        players={players} tradeProposal={tradeProposal} onProposeTrade={handleProposeTrade} onAcceptTrade={handleAcceptTrade} onRejectTrade={handleRejectTrade}
        hasRolledThisTurn={hasRolledThisTurn}
      />
    </div>
  );
}