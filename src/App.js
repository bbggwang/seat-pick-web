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

    // [수정] 꾹 누르기 팝업 추가 & X 상태 클릭 무시 로직 적용
    const processSeatAction = (idx, isBlockAction) => {
      if (!currentData) return;
      const newStatus = [...currentData.status];
      const currentSeatStatus = newStatus[idx];

      if (isBlockAction) {
        // [X모드] 꾹 눌렀을 때
        if (currentSeatStatus === 2) {
          // 이미 X인 경우 -> 해제할지 물어봄
          if (window.confirm("좌석을 다시 활성화하시겠습니까?")) newStatus[idx] = 0;
          else return;
        } else { 
          // [수정] X로 만들 때도 팝업 띄움
          if (window.confirm("이 좌석을 '판매 불가(X)'로 지정하시겠습니까?")) newStatus[idx] = 2;
          else return;
        }
      } else {
        // [일반모드] 짧게 클릭했을 때
        if (currentSeatStatus === 0) {
             if(window.confirm("이 좌석을 예약하시겠습니까?")) newStatus[idx] = 1; else return;
        }
        else if (currentSeatStatus === 1) { 
             if (window.confirm("좌석을 취소하시겠습니까?")) newStatus[idx] = 0; else return; 
        }
        else if (currentSeatStatus === 2) { 
            // [수정] X 상태에서는 클릭해도 아무 반응 없음 (팝업 X)
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

// [유지] 스크롤 및 터치 충돌 방지 로직이 포함된 안전한 버튼
const SeatButton = ({ status, label, style, onClick, onLongPress }) => {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef(null);
  const ignoreClick = useRef(false);

  const startPress = () => { 
      setIsPressing(true); 
      ignoreClick.current = false;
      timerRef.current = setTimeout(() => { 
          onLongPress(); // 꾹 누르기 실행
          ignoreClick.current = true; // 이후 클릭 무시하도록 깃발 세움
          setIsPressing(false); 
      }, 500); 
  };

  const endPress = () => { 
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } 
      setIsPressing(false); 
  };

  const handleClick = (e) => {
      // 깃발이 세워져 있다면(꾹 누르기 실행됨) -> 팝업 무시
      if (ignoreClick.current) {
          ignoreClick.current = false;
          return;
      }
      onClick(); // 아니면 정상 팝업
  };

  return ( 
      <button 
          className={`seat state-${status} no-select ${isPressing ? 'pressing' : ''}`}
          style={style} 
          onMouseDown={startPress} 
          onTouchStart={startPress}
          onMouseUp={endPress} 
          onMouseLeave={endPress}
          onTouchEnd={endPress} 
          onClick={handleClick}
          onContextMenu={(e) => e.preventDefault()} 
      > 
          {label} 
      </button> 
  );
};

export default App;