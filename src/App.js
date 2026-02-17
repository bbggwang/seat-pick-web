import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// 좌석 설정
const SEAT_CONFIGS = {
  "40석": { rows: ["가", "나", "다", "라"], cols: 10, split: 5 },
  "48석": { rows: ["가", "나", "다", "라"], cols: 12, split: 6 },
  "56석": { rows: ["가", "나", "다", "라"], cols: 14, split: 7 },
  "60석": { rows: ["보조", "가", "나", "다", "라"], cols: 12, split: 6 },
};

function App() {
  const [db, setDb] = useState({});
  const [menu, setMenu] = useState("main");
  
  // 선택값 상태 관리
  const [perfName, setPerfName] = useState("선택");
  const [roundName, setRoundName] = useState("선택");

  // 초기 로딩
  useEffect(() => {
    const savedData = localStorage.getItem("seat_data_web");
    if (savedData) setDb(JSON.parse(savedData));

    const lastPerf = localStorage.getItem("last_perf");
    const lastRound = localStorage.getItem("last_round");
    
    if (lastPerf) setPerfName(lastPerf);
    if (lastPerf && lastRound) {
        setTimeout(() => setRoundName(lastRound), 50);
    }
  }, []);

  // 데이터 저장 함수
  const saveData = (newDb) => {
    setDb(newDb);
    localStorage.setItem("seat_data_web", JSON.stringify(newDb));
  };

  // 선택 변경 시 기억하기
  const handleSelectPerf = (val) => {
    setPerfName(val);
    setRoundName("선택");
    localStorage.setItem("last_perf", val); 
  };

  const handleSelectRound = (val) => {
    setRoundName(val);
    localStorage.setItem("last_round", val);
  };

  // --- 화면 1: 메인 메뉴 ---
  if (menu === "main") {
    return (
      <div className="app-container main-menu">
        <h1 className="title">Seat Pick <span className="lite">Lite</span></h1>
        <div className="button-group">
          <button className="big-btn" onClick={() => setMenu("register")}>공연 등록하기</button>
          
          <button className="big-btn" onClick={() => {
            setPerfName("선택");
            setRoundName("선택");
            setMenu("booking");
          }}>좌석 관리 / 지난 공연</button>
        </div>
      </div>
    );
  }

  // --- 화면 2: 공연 등록 ---
  if (menu === "register") {
    const handleRegister = (e) => {
      e.preventDefault();
      const form = e.target;
      const name = form.name.value;
      const round = form.round.value;
      const type = form.type.value;

      if (!name) return alert("이름을 입력하세요!");
      
      const newDb = { ...db };
      if (!newDb[name]) newDb[name] = {};
      
      if (newDb[name][round] && !window.confirm("이미 존재하는 회차입니다. 덮어쓸까요?")) return;

      const cfg = SEAT_CONFIGS[type];
      newDb[name][round] = {
        type: type,
        status: Array(cfg.rows.length * cfg.cols).fill(0)
      };

      saveData(newDb);
      
      alert("등록되었습니다.");
      setMenu("main"); 
    };

    return (
      <div className="app-container register-screen">
        <h2>[ 신규 공연 등록 ]</h2>
        <form onSubmit={handleRegister} className="register-form">
          
           {/* 기존 공연 불러오기 */}
           <div className="input-group">
            <label>기존 공연 불러오기 (선택):</label>
            <select onChange={(e) => {
              const input = document.getElementById("perf-name-input");
              if(input) input.value = e.target.value;
            }}>
              <option value="">-- 목록에서 선택 --</option>
              {Object.keys(db).sort().map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>공연 이름:</label>
            <input id="perf-name-input" name="name" placeholder="공연명 입력" autoComplete="off"/>
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

  // --- 화면 3: 좌석 관리 ---
  if (menu === "booking") {
    const perfList = Object.keys(db).reverse();
    const roundList = (perfName !== "선택" && db[perfName]) ? Object.keys(db[perfName]).sort() : [];
    
    const currentData = (perfName !== "선택" && roundName !== "선택") ? db[perfName][roundName] : null;
    const cfg = currentData ? SEAT_CONFIGS[currentData.type] : null;

    const processSeatAction = (idx, isBlockAction) => {
      if (!currentData) return;
      const newStatus = [...currentData.status];
      const st = currentData.status[idx];

      if (isBlockAction) { 
        // [수정 2] 꾹 누르기 로직 개선
        if (st === 2) {
            // 이미 X인 좌석을 꾹 누르면 경고창 띄우기
            if (window.confirm("좌석을 다시 활성화하시겠습니까?")) {
                newStatus[idx] = 0; // 풀기
            } else {
                return; // 취소
            }
        } else {
            // 일반 좌석은 바로 X 처리
            newStatus[idx] = 2;
        }
      } else {
        // 짧게 클릭 (기존 로직 동일)
        if (st === 0) newStatus[idx] = 1;
        else if (st === 1) {
          if (window.confirm("좌석을 취소하시겠습니까?")) newStatus[idx] = 0;
          else return;
        } else if (st === 2) {
          if (window.confirm("활성화하시겠습니까?")) newStatus[idx] = 0;
          else return;
        }
      }
      
      const newDb = { ...db }; newDb[perfName][roundName].status = newStatus;
      saveData(newDb);
    };

    return (
      <div className="app-container booking-screen">
        <header className="control-bar">
          <div className="left-controls">
            <select value={perfName} onChange={e => handleSelectPerf(e.target.value)}>
              <option>선택</option>
              {perfList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={roundName} onChange={e => handleSelectRound(e.target.value)}>
              <option>선택</option>
              {roundList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="right-controls">
            <button className="action-btn reset" onClick={() => {
              if (currentData && window.confirm("모두 비우시겠습니까?")) {
                const newDb = { ...db }; 
                newDb[perfName][roundName].status = new Array(currentData.status.length).fill(0);
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

        {/* 현황판 */}
        {currentData && (
            <div className="status-bar">
                <span className="stats-text">
                총 {currentData.status.length}석 | 
                완료 {currentData.status.filter(s=>s===1).length}석 | 
                불가 {currentData.status.filter(s=>s===2).length}석 | 
                잔여 {currentData.status.filter(s=>s===0).length}석
                </span>
            </div>
        )}
      </div>
    );
  }
}

// 아이패드용 꾹 누르기 버튼 컴포넌트
const SeatButton = ({ status, label, style, onClick, onLongPress }) => {
  const timerRef = useRef(null);
  const isLongPress = useRef(false);

  const startPress = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress(); 
    }, 500); 
  };

  const endPress = (e) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isLongPress.current) {
        onClick();
    }
  };

  const cancelPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <button 
      className={`seat state-${status} no-select`}
      style={style}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={(e) => { e.preventDefault(); endPress(e); }}
      onTouchMove={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
};

export default App;