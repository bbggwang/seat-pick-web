import React, { useState, useEffect } from 'react';
import './App.css';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

// -----------------------------------------------------
// [주의] 아까 메모해둔 Firebase 설정값을 여기에 다시 붙여넣어주세요!
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

  // 실시간 데이터 불러오기
  useEffect(() => {
    const dbRef = ref(database, 'performances');
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setDb(data);
    });
  }, []);

  const saveData = (newDb) => {
// 이제 내 기기가 아니라 서버(Firebase)에 저장합니다.
    set(ref(database, 'performances'), newDb);
  };

  const handleSelectPerf = (e) => {
    setPerfName(e.target.value);
    setRoundName("선택");
    e.target.blur(); // [수정] 선택 후 포커스 해제 (드롭박스 버그 해결)
  };

  const handleSelectRound = (e) => {
    setRoundName(e.target.value);
    e.target.blur(); // [수정] 선택 후 포커스 해제
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
            <label>기존 공연 불러오기:</label>
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

    // [핵심 수정] 클릭 시 무조건 팝업 띄우기 로직
    const processSeatAction = (idx) => {
      if (!currentData) return;
      const newStatus = [...currentData.status];
      const currentSeatStatus = newStatus[idx];
      
      let message = "";
      let nextStatus = 0;

      if (currentSeatStatus === 0) {
          message = "이 좌석을 '예약 완료' 하시겠습니까?";
          nextStatus = 1;
      } else if (currentSeatStatus === 1) {
          message = "예약을 '취소' 하시겠습니까?";
          nextStatus = 0;
      } else if (currentSeatStatus === 2) {
          message = "이 좌석을 다시 '판매 가능'하게 바꾸시겠습니까?";
          nextStatus = 0;
      }

      // 확인 팝업 (취소 누르면 아무 일도 안 일어남)
      if (window.confirm(message)) {
          newStatus[idx] = nextStatus;
          const newDb = { ...db };
          newDb[perfName][roundName].status = newStatus;
          saveData(newDb);
      }
    };

    return (
      <div className="app-container booking-screen">
        <header className="control-bar">
          <div className="left-controls">
            <select value={perfName} onChange={handleSelectPerf}>
              <option>선택</option>
              {perfList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={roundName} onChange={handleSelectRound}>
              <option>선택</option>
              {roundList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="right-controls">
            <button className="action-btn reset" onClick={() => {
              if (currentData && window.confirm("정말 모든 좌석을 초기화하시겠습니까?")) {
                const newDb = { ...db }; newDb[perfName][roundName].status.fill(0);
                saveData(newDb);
              }
            }}>초기화</button>
            <button className="action-btn delete" onClick={() => {
              if (currentData && window.confirm("이 회차를 완전히 삭제하시겠습니까?")) {
                const newDb = { ...db }; delete newDb[perfName][roundName];
                if (Object.keys(newDb[perfName]).length === 0) delete newDb[perfName];
                saveData(newDb); setPerfName("선택"); setRoundName("선택");
              }
            }}>회차삭제</button>
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
                      onClick={() => processSeatAction(realIdx)} // 짧게 누르면: 기존 팝업
                      onLongPress={() => processSeatAction(realIdx, 'long')} // 꾹 누르면: X표시 (액션 구분)
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
            총 {currentData.status.length}석 | 완료 {currentData.status.filter(s=>s===1).length}석 | 잔여 {currentData.status.filter(s=>s===0).length}석
          </div>
        )}
      </div>
    );
  }
}
// 꾹 누르기(Long Press)와 모션을 처리하는 전용 버튼 부품
const SeatButton = ({ status, label, style, onClick, onLongPress }) => {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = React.useRef(null); // 타이머 저장소
  const isLongPressed = React.useRef(false); // 꾹 눌렀는지 체크

  // 누르기 시작 (마우스/터치 공통)
  const startPress = () => {
    setIsPressing(true); // CSS 애니메이션 시작 (작아짐)
    isLongPressed.current = false;
    
    // 0.5초 뒤에 '꾹 누르기'로 인정
    timerRef.current = setTimeout(() => {
      isLongPressed.current = true;
      if (onLongPress) onLongPress(); // 롱프레스 동작 실행
      setIsPressing(false); // 애니메이션 끝
    }, 500); 
  };

  // 손 뗌 (마우스/터치 공통)
  const endPress = () => {
    clearTimeout(timerRef.current); // 타이머 취소
    setIsPressing(false); // 애니메이션 복구
    
    // 꾹 누른 게 아니었으면 '일반 클릭'으로 처리
    if (!isLongPressed.current && onClick) {
      onClick();
    }
  };

  return (
    <button
      className={`seat state-${status} no-select ${isPressing ? 'pressing' : ''}`}
      style={style}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={(e) => {
        // 모바일 스크롤 방지 및 터치 종료 처리
        // e.preventDefault(); // 스크롤이 필요하면 이 줄은 지우세요
        endPress();
      }}
    >
      {label}
    </button>
  );
};
// App 컴포넌트 안의 processSeatAction 함수 수정
const processSeatAction = (idx, actionType) => {
  if (!currentData) return;
  const newStatus = [...currentData.status];
  const currentSeatStatus = newStatus[idx];

  // 1. 꾹 눌렀을 때 (X 표시 토글)
  if (actionType === 'long') {
      if (window.confirm("이 좌석을 '판매 불가(X)'로 지정하시겠습니까?")) {
         // 이미 X면 풀고, 아니면 X로
         newStatus[idx] = (currentSeatStatus === 2) ? 0 : 2; 
      }
  } 
  // 2. 그냥 짧게 클릭했을 때 (기존 팝업 로직)
  else {
      let message = "";
      let nextStatus = 0;
      
      if (currentSeatStatus === 0) {
          message = "이 좌석을 '예약 완료' 하시겠습니까?";
          nextStatus = 1;
      } else if (currentSeatStatus === 1) {
          message = "예약을 '취소' 하시겠습니까?";
          nextStatus = 0;
      } else if (currentSeatStatus === 2) {
          // X표시된 걸 클릭하면 안내만
          return alert("꾹 눌러서 X 표시를 해제하세요!"); 
      }
      
      if (window.confirm(message)) {
          newStatus[idx] = nextStatus;
      } else {
          return; // 취소하면 저장 안 함
      }
  }

  // 변경사항 저장
  const newDb = { ...db };
  newDb[perfName][roundName].status = newStatus;
  saveData(newDb);
};
export default App;

