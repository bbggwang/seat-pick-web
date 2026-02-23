import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

// --- [여기에 아까 복사한 firebaseConfig를 붙여넣으세요] ---
const firebaseConfig = {
  apiKey: "AIzaSyDt8KRr2irhsbW5UxeOOpIQ-ntdMpE1vDM",
  authDomain: "seat-pick-web.firebaseapp.com",
  databaseURL: "https://seat-pick-web-default-rtdb.firebaseio.com",
  projectId: "seat-pick-web",
  storageBucket: "seat-pick-web.firebasestorage.app",
  messagingSenderId: "595580864478",
  appId: "1:595580864478:web:2c09a790b768e3d9383f4f"
};
// -----------------------------------------------------

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const SEAT_CONFIGS = {
  "40석(1줄 5석)": { rows: ["가", "나", "다", "라"], cols: 10, split: 5 },
  "48석(1줄 6석)": { rows: ["가", "나", "다", "라"], cols: 12, split: 6 },
  "56석(1줄 7석)": { rows: ["가", "나", "다", "라"], cols: 14, split: 7 },
  "60석(1줄 6석+보조석추가)": { rows: ["보조", "가", "나", "다", "라"], cols: 12, split: 6 },
};

function App() {
  // 🛡️ [추가] 롱프레스 시간을 기억할 전역 방패 (버튼이 지워져도 이 기억은 남습니다)
  const lastLongPressTime = useRef(0);
  
  // [수정 1] "혹시 수첩에 적어둔 거 있어?" 하고 확인하고 시작하기
  const [db, setDb] = useState({});
  
  // 새로고침 해도 기억하도록 localStorage에서 먼저 찾아보고, 없으면 기본값 사용
  const [menu, setMenu] = useState(() => localStorage.getItem("savedMenu") || "main");
  const [perfName, setPerfName] = useState(() => localStorage.getItem("savedPerf") || "선택");
  const [roundName, setRoundName] = useState(() => localStorage.getItem("savedRound") || "선택");

  // [수정 2] 값이 바뀔 때마다 수첩(localStorage)에 받아 적기
  useEffect(() => {
    localStorage.setItem("savedMenu", menu);
    localStorage.setItem("savedPerf", perfName);
    localStorage.setItem("savedRound", roundName);
  }, [menu, perfName, roundName]);

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
          }}>좌석 관리</button>
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
      
      // [강력 수정] 1차 확인 후 2차 확인까지 진행하는 철벽 로직
      if (newDb[name] && newDb[name][round]) {
        // 1차 경고
        const firstCheck = window.confirm(`이미 [${name}]의 [${round}] 데이터가 존재합니다.\n덮어쓸까요?`);
        
        if (firstCheck) {
          // 2차 경고 (정말? 한 번 더!)
          const secondCheck = window.confirm("정말? 좌석이 모두 초기화되어 복구할 수 없습니다.");
          
          if (!secondCheck) return; // 2차에서 취소하면 중단
        } else {
          return; // 1차에서 취소하면 중단
        }
      }
    
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
            <label>등록된 공연 목록 (선택):</label>
            <select onChange={(e) => {
                document.getElementById("perf-name-input").value = e.target.value;
                e.target.blur();
            }}>
              <option value="">-- 목록에서 선택 --</option>
              {Object.keys(db).sort().map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>신규 등록:</label>
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
            <select name="type" defaultValue="48석(1줄 6석)">
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
    // [핵심] 변수 계산하기 전에 '문지기'가 먼저 검사해야 에러가 안 납니다!
    // 1. 데이터가 아직 도착 안 했으면 "로딩중" 띄우고 여기서 멈춤 (변수 계산 X)
    if (!db || Object.keys(db).length === 0) {
      return (
        <div className="app-container">
          <div className="loading-box">데이터를 불러오는 중입니다...</div>
        </div>
      );
    }
    // css 안쓰고 색상바꾸는 코드
    // if (!db || Object.keys(db).length === 0) {
    //   return (
    //     <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    //       {/* 글씨 크기를 줄이고(18px), 색상을 부드러운 회색(#888)으로 조절했습니다 */}
    //       <span style={{ fontSize: '18px', color: '#888', fontWeight: 'normal' }}>
    //         데이터를 불러오는 중입니다...
    //       </span>
    //     </div>
    //   );
    // }
   
    
    // 2. 데이터는 왔는데, 수첩에 적힌 공연이 삭제됐거나 없으면? -> 메인으로 안전하게 이동
    if (perfName !== "선택" && (!db[perfName] || (roundName !== "선택" && !db[perfName][roundName]))) {
      setMenu("main");
      setPerfName("선택");
      setRoundName("선택");
      return null; // 깜빡임 방지
    }

    // [여기서부터 변수 계산 시작] - 이제 데이터가 있는 게 확실하니 에러가 안 납니다.
    const perfList = Object.keys(db).reverse();
    const roundList = (perfName !== "선택" && db[perfName]) ? Object.keys(db[perfName]).sort() : [];
    const currentData = (perfName !== "선택" && roundName !== "선택") ? db[perfName][roundName] : null;
    const cfg = currentData ? SEAT_CONFIGS[currentData.type] : null;

    const processSeatAction = (idx, isBlockAction) => {
      if (!currentData) return;

      // 🛡️ [시간 방패 추가] 롱프레스 시 시간 기록, 클릭 시 유령 클릭 차단
      if (isBlockAction) {
        lastLongPressTime.current = Date.now();
      } else {
        const timeSinceLongPress = Date.now() - lastLongPressTime.current;
        if (timeSinceLongPress < 500) return; // 0.5초 내 뒷북 클릭 차단
      }

      const newStatus = [...currentData.status];
      const currentSeatStatus = newStatus[idx];

      // 좌석 이름 계산
      const rIdx = Math.floor(idx / cfg.cols);
      const cIdx = idx % cfg.cols;
      const seatName = `${cfg.rows[rIdx]}${cfg.cols - cIdx}`;

      if (isBlockAction) {
        if (currentSeatStatus === 2) {
          if (window.confirm(`[${seatName}] 좌석을 다시 활성화하시겠습니까?`)) newStatus[idx] = 0;
          else return;
        } else { 
          if (window.confirm(`[${seatName}] 좌석을 [선택불가]로 지정하시겠습니까?`)) newStatus[idx] = 2;
          else return;
        }
      } else {
        if (currentSeatStatus === 0) {
             if(window.confirm(`[${seatName}] 좌석을 선택하시겠습니까?`)) newStatus[idx] = 1; else return;
        }
        else if (currentSeatStatus === 1) { 
             if (window.confirm(`[${seatName}] 좌석을 취소하시겠습니까?`)) newStatus[idx] = 0; else return; 
        }
        else if (currentSeatStatus === 2) { 
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
          <select 
            value={perfName} 
            className={perfName === "공연 선택" || perfName === "선택" ? "not-selected" : "selected"}
            onChange={e => { handleSelectPerf(e.target.value); e.target.blur(); }}
          >
            <option>공연 선택</option>
            {perfList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            value={roundName} 
            className={roundName === "회차 선택" || roundName === "선택" ? "not-selected" : "selected"}
            onChange={e => { setRoundName(e.target.value); e.target.blur(); }}
          >
            <option>회차 선택</option>
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
                  
                  const originalName = `${rowLabel}${seatNum}`;

                  return (
                    <SeatButton 
                      key={realIdx} 
                      status={status} 
                      label={status === 1 ? "완료" : (status === 2 ? "X" : originalName)} 
                      originalLabel={originalName} 
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

const SeatButton = ({ status, label, originalLabel, style, onClick, onLongPress }) => {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef(null);
  const isLongPressActive = useRef(false);

  const startPress = (e) => {
    setIsPressing(true);
    isLongPressActive.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      onLongPress();
      setIsPressing(false);
    }, 500);
  };

  const endPress = (e) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
    if (isLongPressActive.current && e.cancelable) {
      e.preventDefault(); 
    }
  };

  const handleClick = (e) => {
    if (isLongPressActive.current) {
      isLongPressActive.current = false;
      return;
    }
    onClick();
  };

  return (
    <button
      className={`seat state-${status} no-select ${isPressing ? 'pressing' : ''}`}
      style={style}
      onMouseDown={startPress} onTouchStart={startPress}
      onMouseUp={endPress} onMouseLeave={endPress} onTouchEnd={endPress}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div>{label}</div>
      {status !== 0 && <div className="seat-sub-label">{originalLabel}</div>}
    </button>
  );
};

export default App;