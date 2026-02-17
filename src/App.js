import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

// --- [여기에 아까 복사한 firebaseConfig를 붙여넣으세요] ---
const firebaseConfig = {
  apiKey: "아이피에이키...",
  authDomain: "프로젝트아이디.firebaseapp.com",
  databaseURL: "https://프로젝트아이디.firebaseio.com",
  projectId: "프로젝트아이디",
  storageBucket: "프로젝트아이디.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
// -----------------------------------------------------

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const SEAT_CONFIGS = {
  "40석": { rows: ["가", "나", "다", "라"], cols: 10, split: 5 },
  "48석": { rows: ["가", "나", "다", "라"], cols: 12, split: 6 },
  "56석": { rows: ["가", "나", "다", "라"], cols: 14, split: 7 },
  "60석": { rows: ["보조", "가", "나", "다", "라"], cols: 12, split: 6 },
};

function App() {
  const [db, setDb] = useState({});
  const [menu, setMenu] = useState("main");
  const [perfName, setPerfName] = useState("선택");
  const [roundName, setRoundName] = useState("선택");

  useEffect(() => {
    const dbRef = ref(database, 'performances');
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setDb(data);
    });
  }, []);

  const saveData = (newDb) => {
    set(ref(database, 'performances'), newDb);
  };

  const handleSelectPerf = (val) => {
    setPerfName(val);
    setRoundName("선택");
  };

  if (menu === "main") {
    return (
      <div className="app-container main-menu">
        <h1 className="title">Seat Pick <span className="lite">Lite</span></h1>
        <div className="button-group">
          <button className="big-btn" onClick={() => setMenu("register")}>공연 등록하기</button>
          <button className="big-btn" onClick={() => {
            setPerfName("선택"); setRoundName("선택"); setMenu("booking");
          }}>좌석 관리 / 지난 공연</button>
        </div>
      </div>
    );
  }

  if (menu === "register") {
    const handleRegister = (e) => {
      e.preventDefault();
      const name = e.target.name.value;
      const round = e.target.round.value;
      const type = e.target.type.value;
      if (!name) return alert("이름을 입력하세요!");
      const newDb = { ...db };
      if (!newDb[name]) newDb[name] = {};
      const cfg = SEAT_CONFIGS[type];
      newDb[name][round] = { type: type, status: Array(cfg.rows.length * cfg.cols).fill(0) };
      saveData(newDb);
      alert("서버에 등록되었습니다.");
      setMenu("main");
    };

    return (
      <div className="app-container register-screen">
        <h2>[ 신규 공연 등록 ]</h2>
        <form onSubmit={handleRegister} className="register-form">
          <div className="input-group">
            <label>기존 공연 불러오기 (선택):</label>
            <select onChange={(e) => {
                document.getElementById("perf-name-input").value = e.target.value;
                e.target.blur();
            }}>
              <option value="">-- 목록에서 선택 --</option>
              {Object.keys(db).sort().map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>공연 이름:</label>
            <input id="perf-name-input" name="name" placeholder="공연명 입력" />
          </div>
          <div className="input-group">
            <label>회차 선택:</label>
            <select name="round">
              <option>1회차</option><option>2회차</option><option>3회차</option><option>4회차</option>
            </select>
          </div>
          <div className="input-group">
            <label>좌석 타입:</label>
            <select name="type" defaultValue="48석">
              {Object.keys(SEAT_CONFIGS).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="btn-row">
            <button type="submit" className="action-btn save">저장</button>
            <button type="button" className="action-btn back" onClick={() => setMenu("main")}>취소</button>
          </div>
        </form>
      </div>
    );
  }

  if (menu === "booking") {
    const perfList = Object.keys(db).reverse();
    const roundList = (perfName !== "선택" && db[perfName]) ? Object.keys(db[perfName]).sort() : [];
    const currentData = (perfName !== "선택" && roundName !== "선택") ? db[perfName][roundName] : null;
    const cfg = currentData ? SEAT_CONFIGS[currentData.type] : null;

    const processSeatAction = (idx, isBlockAction) => {
      if (!currentData) return;
      const newStatus = [...currentData.status];
      if (isBlockAction) {
        // [X모드] 꾹 눌렀을 때
        if (newStatus[idx] === 2) {
          if (window.confirm("좌석을 다시 활성화하시겠습니까?")) newStatus[idx] = 0;
          else return;
        } else { newStatus[idx] = 2; }
      } else {
        // [일반모드] 그냥 클릭했을 때
        const st = newStatus[idx];
        if (st === 0) {
             if(window.confirm("이 좌석을 예약하시겠습니까?")) newStatus[idx] = 1; else return;
        }
        else if (st === 1) { if (window.confirm("좌석을 취소하시겠습니까?")) newStatus[idx] = 0; else return; }
        else if (st === 2) { 
            alert("이 좌석은 판매 불가(X) 상태입니다. 해제하려면 꾹 눌러주세요."); 
            return; 
        }
      }
      const newDb = { ...db }; newDb[perfName][roundName].status = newStatus;
      saveData(newDb);
    };

    return (
      <div className="app-container booking-screen">
        <header className="control-bar">
          <div className="left-controls">
            <select value={perfName} onChange={e => { handleSelectPerf(e.target.value); e.target.blur(); }}>
              <option>선택</option>
              {perfList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={roundName} onChange={e => { setRoundName(e.target.value); e.target.blur(); }}>
              <option>선택</option>
              {roundList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="right-controls">
            <button className="action-btn reset" onClick={() => {
              if (currentData && window.confirm("모두 비우시겠습니까?")) {
                const newDb = { ...db }; newDb[perfName][roundName].status.fill(0);
                saveData(newDb);
              }
            }}>좌석 초기화</button>
            <button className="action-btn delete" onClick={() => {
              if (currentData && window.confirm("회차를 삭제하시겠습니까?")) {
                const newDb = { ...db }; delete newDb[perfName][roundName];
                if (Object.keys(newDb[perfName]).length === 0) delete newDb[perfName];
                saveData(newDb); setPerfName("선택"); setRoundName("선택");
              }
            }}>회차 삭제</button>
            <button className="action-btn back" onClick={() => setMenu("main")}>메인으로</button>
          </div>
        </header>
        <div className="stage-label">[ 무 대 ]</div>
        <div className="seat-area">
          {cfg && (
            <div className="grid-wrapper" style={{ gridTemplateColumns: `repeat(${cfg.cols + 1}, 1fr)` }}>
              <div className="aisle" style={{ gridColumn: `${cfg.split + 1}`, gridRow: `1 / span ${cfg.rows.length}` }}>통로</div>
              {cfg.rows.map((rowLabel, rIdx) => (
                [...Array(cfg.cols)].map((_, cIdx) => {
                  const seatNum = cfg.cols - cIdx;
                  const realIdx = (rIdx * cfg.cols) + cIdx;
                  const status = currentData.status[realIdx];
                  const colPos = cIdx + 1 + (cIdx >= (cfg.cols - cfg.split) ? 1 : 0);
                  return (
                    <SeatButton 
                      key={realIdx} 
                      status={status} 
                      label={status === 1 ? "완료" : (status === 2 ? "X" : `${rowLabel}${seatNum}`)} 
                      style={{ gridRow: rIdx + 1, gridColumn: colPos }} 
                      onClick={() => processSeatAction(realIdx, false)} 
                      onLongPress={() => processSeatAction(realIdx, true)} 
                    />
                  );
                })
              ))}
            </div>
          )}
        </div>
        <div className="entrance-label">[ 출 입 구 ]</div>
        {currentData && (
          <div className="status-bar">
            총 {currentData.status.length}석 | 완료 {currentData.status.filter(s=>s===1).length}석 | 불가 {currentData.status.filter(s=>s===2).length}석 | 잔여 {currentData.status.filter(s=>s===0).length}석
          </div>
        )}
      </div>
    );
  }
}

// [수정 완료] 스크롤 시 팝업 뜨는 문제 완벽 해결 버전
const SeatButton = ({ status, label, style, onClick, onLongPress }) => {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef(null);
  const isLongPressTriggered = useRef(false); // 꾹 누르기가 실행됐는지 체크

  // 눌렀을 때 (타이머 시작)
  const startPress = () => { 
      setIsPressing(true); // 작아지는 모션
      isLongPressTriggered.current = false; 
      timerRef.current = setTimeout(() => { 
          isLongPressTriggered.current = true; // 꾹 누르기 상태로 변경
          onLongPress(); // X표시 기능 실행
          setIsPressing(false); // 모션 복구
      }, 500); 
  };

  // 손 뗐을 때 (타이머 취소)
  const endPress = () => { 
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } 
      setIsPressing(false); 
  };

  // [핵심] 브라우저가 '클릭'이라고 인정한 경우에만 팝업 실행
  // (스크롤 하다가 떼면 브라우저가 알아서 onClick을 실행 안 함)
  const handleClick = () => {
      // 만약 방금 꾹 누르기가 실행됐다면, 클릭(팝업)은 무시
      if (isLongPressTriggered.current) {
          isLongPressTriggered.current = false;
          return;
      }
      onClick(); // 짧은 터치일 때만 팝업 띄움
  };

  return ( 
      <button 
          className={`seat state-${status} no-select ${isPressing ? 'pressing' : ''}`} 
          style={style} 
          // 터치/클릭 시작 감지
          onMouseDown={startPress} 
          onTouchStart={startPress}
          
          // 터치/클릭 끝남 감지 (모션 및 타이머 취소용)
          onMouseUp={endPress} 
          onMouseLeave={endPress}
          onTouchEnd={endPress} 
          
          // [중요] 실제 팝업 로직은 여기로 이동 (스크롤 간섭 해결)
          onClick={handleClick}
          
          onContextMenu={(e) => e.preventDefault()} 
      > 
          {label} 
      </button> 
  );
};

export default App;