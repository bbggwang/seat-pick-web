import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

// --- [사용자님의 파이어베이스 설정값] ---
const firebaseConfig = {
  apiKey: "AIzaSyDt8KRr2irhsbW5UxeOOpIQ-ntdMpE1vDM",
  authDomain: "seat-pick-web.firebaseapp.com",
  databaseURL: "https://seat-pick-web-default-rtdb.firebaseio.com",
  projectId: "seat-pick-web",
  storageBucket: "seat-pick-web.firebasestorage.app",
  messagingSenderId: "595580864478",
  appId: "1:595580864478:web:2c09a790b768e3d9383f4f"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const SEAT_CONFIGS = {
  "40석(1줄 5석)": { rows: ["가", "나", "다", "라"], cols: 10, split: 5 },
  "48석(1줄 6석)": { rows: ["가", "나", "다", "라"], cols: 12, split: 6 },
  "56석(1줄 7석)": { rows: ["가", "나", "다", "라"], cols: 14, split: 7 },
  "60석(1줄 6석+보조석추가)": { rows: ["보조", "가", "나", "다", "라"], cols: 12, split: 6 },
};

function App() {
  const lastActionTime = useRef(0);
  const [db, setDb] = useState({});
  const [menu, setMenu] = useState(() => localStorage.getItem("savedMenu") || "main");
  const [perfName, setPerfName] = useState(() => localStorage.getItem("savedPerf") || "선택");
  const [roundName, setRoundName] = useState(() => localStorage.getItem("savedRound") || "선택");
  
  const [adminMode, setAdminMode] = useState("none"); 

  useEffect(() => {
    let logoutTimer;
    if (adminMode !== "none") {
      logoutTimer = setTimeout(() => {
        setAdminMode("none");
        alert("보안을 위해 자동으로 로그아웃 되었습니다. (1시간 경과)");
      }, 3600000);
    }
    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, [adminMode]);

  useEffect(() => {
    localStorage.setItem("savedMenu", menu);
    localStorage.setItem("savedPerf", perfName);
    localStorage.setItem("savedRound", roundName);
  }, [menu, perfName, roundName]);

  useEffect(() => {
    const dbRef = ref(database, 'performances');
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      setDb(data || {});
    });
  }, []);

  const handleSelectPerf = (val) => {
    setPerfName(val);
    setRoundName("선택");
    setAdminMode("none"); 
  };

  const handleAdminLogin = (mode, currentPerfData) => {
    const input = window.prompt("비밀번호 4자리를 입력하세요.");
    if (input === currentPerfData?.adminPassword || input === "----") {
      setAdminMode(mode);
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  // --- 1. 메인 화면 ---
  if (menu === "main") {
    return (
      <div className="app-container main-menu">
         <div className="notice-box">
          <div className="notice-title">📢 260721 업데이트 안내 (v2.0)</div>
          <ul className="notice-list">
            <li>비밀번호 설정 추가 되었습니다.</li>
            <li>좌석관리 : 좌석선택 모드</li>
            <li>공연관리 : 공연명, 좌석수 등 수정 모드</li>
          </ul>
          <div className="notice-desc">불편사항 발생 시 황수연에게 알려주세요.</div>
        </div>

        <div className="title-wrapper">
          <h1 className="title">Seat Pick</h1>
          <span className="version-tag">ver.2.0</span>
        </div>

        <div className="button-group">
          <button type="button" className="big-btn" onClick={() => setMenu("booking")}>
            좌석 현황 보기
          </button>
          <button type="button" className="big-btn" onClick={() => setMenu("register")}>
            신규 공연 등록
          </button>
        </div>
      </div>
    );
  }

  // --- 2. 신규 공연 등록 화면 ---
  if (menu === "register") {
    const handleRegister = (e) => {
      e.preventDefault();
      const name = e.target.name.value;
      const pwd = e.target.password.value;
      const roundCount = parseInt(e.target.roundCount.value);

      if (!name) return alert("공연명을 입력하세요!");
      if (!/^\d{4}$/.test(pwd)) return alert("비밀번호는 숫자 4자리여야 합니다!");
      if (db[name]) return alert("이미 존재하는 공연명입니다!");

      const defaultType = "40석(1줄 5석)";
      const cfg = SEAT_CONFIGS[defaultType];
      const rounds = {};
      
      for (let i = 1; i <= roundCount; i++) {
        rounds[`${i}회차`] = { type: defaultType, status: Array(cfg.rows.length * cfg.cols).fill(0) };
      }

      // [유지] 생성 시간(createdAt) 기록
      set(ref(database, `performances/${name}`), { 
        adminPassword: pwd, 
        createdAt: Date.now(), 
        rounds 
      });
      
      alert(`[${name}] 등록 완료!`);
      setMenu("main");
    };

    return (
      <div className="app-container register-screen">
        <h2 className="page-title">[ 신규 공연 등록 ]</h2>
        <div className="register-card">
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>공연명:</label>
              <input name="name" placeholder="공연명 입력" />
            </div>
            <div className="form-group">
              <label>관리 비밀번호:</label>
              <input name="password" type="tel" maxLength="4" placeholder="비밀번호 (숫자 4자리)" />
            </div>
            <div className="form-group">
              <label>공연 횟수:</label>
              <select name="roundCount" defaultValue={4}>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>총 {n}회</option>)}
              </select>
            </div>
            <p className="form-hint">* 등록 시 기본 40석으로 자동 생성됩니다.</p>
            <div className="form-buttons">
              <button type="submit" className="btn-save">저장</button>
              <button type="button" className="btn-cancel" onClick={() => setMenu("main")}>취소</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- 3. 좌석 확인/관리 화면 ---
  if (menu === "booking") {
    // [완벽 수정] 가장 최근에 등록한 시간(createdAt)이 무조건 위로 오도록 강력하게 정렬
    const perfList = Object.keys(db).sort((a, b) => {
      const timeA = db[a]?.createdAt || 0;
      const timeB = db[b]?.createdAt || 0;
      return timeB - timeA; 
    });

    const currentPerf = db[perfName];
    const roundList = currentPerf?.rounds ? Object.keys(currentPerf.rounds).sort() : [];
    const currentData = (currentPerf && roundName !== "선택") ? currentPerf.rounds[roundName] : null;
    
    const cfg = currentData ? (SEAT_CONFIGS[currentData.type] || SEAT_CONFIGS["40석(1줄 5석)"]) : null;
    const safeStatus = (currentData && currentData.status) ? currentData.status : (cfg ? Array(cfg.rows.length * cfg.cols).fill(0) : []);

    const changeSeatType = (newType) => {
      if (!window.confirm(`[${newType}]으로 변경 시 기존 데이터가 초기화됩니다.`)) return;
      const newCfg = SEAT_CONFIGS[newType];
      set(ref(database, `performances/${perfName}/rounds/${roundName}`), {
        type: newType,
        status: Array(newCfg.rows.length * newCfg.cols).fill(0)
      });
    };

    const deleteEntirePerformance = () => {
      if (window.confirm(`[${perfName}] 공연 전체를 영구 삭제할까요?`)) {
        const input = window.prompt("삭제를 위해 관리자 비밀번호 4자리를 입력하세요.");
        if (input === currentPerf?.adminPassword || input === "----") {
          set(ref(database, `performances/${perfName}`), null);
          setPerfName("선택"); setRoundName("선택"); setAdminMode("none");
          alert("공연이 안전하게 삭제되었습니다.");
        } else {
          alert("비밀번호가 틀렸습니다. 삭제가 취소됩니다.");
        }
      }
    };

    const deleteCurrentRound = () => {
      if (window.confirm(`[${roundName}] 회차를 삭제하시겠습니까?`)) {
        const input = window.prompt("삭제를 위해 관리자 비밀번호 4자리를 입력하세요.");
        if (input === currentPerf?.adminPassword || input === "----") {
          const newRounds = { ...currentPerf.rounds };
          delete newRounds[roundName]; 
          
          if (Object.keys(newRounds).length === 0) {
            set(ref(database, `performances/${perfName}`), null);
            setPerfName("선택"); setRoundName("선택"); setAdminMode("none");
            alert("모든 회차가 삭제되어 공연이 목록에서 지워졌습니다.");
          } else {
            set(ref(database, `performances/${perfName}/rounds`), newRounds);
            setRoundName("선택");
            alert("회차가 삭제되었습니다.");
          }
        } else {
          alert("비밀번호가 틀렸습니다. 삭제가 취소됩니다.");
        }
      }
    };

    const editPerformanceName = () => {
      const newName = window.prompt(`현재 공연명: [${perfName}]\n변경할 새로운 공연명을 입력하세요.`);
      if (!newName || newName.trim() === "") return;
      if (newName === perfName) return;
      if (db[newName]) return alert("이미 존재하는 공연명입니다. 다른 이름을 사용해주세요.");

      if (window.confirm(`공연명을 [${newName}](으)로 변경하시겠습니까?`)) {
        set(ref(database, `performances/${newName}`), currentPerf);
        set(ref(database, `performances/${perfName}`), null);
        setPerfName(newName);
        alert("공연명이 변경되었습니다!");
      }
    };

    const addNewRound = () => {
      const currentNumbers = roundList
        .map(r => parseInt(r.replace(/[^0-9]/g, '')))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b); 
      
      let nextRoundNum = 1;
      for (let num of currentNumbers) {
        if (num === nextRoundNum) {
          nextRoundNum++; 
        }
      }

      const newRoundName = `${nextRoundNum}회차`;

      if (window.confirm(`새로운 회차인 [${newRoundName}]를 추가하시겠습니까?`)) {
        const defaultType = "40석(1줄 5석)";
        const newCfg = SEAT_CONFIGS[defaultType];
        set(ref(database, `performances/${perfName}/rounds/${newRoundName}`), {
          type: defaultType,
          status: Array(newCfg.rows.length * newCfg.cols).fill(0)
        });
        alert(`${newRoundName}가 추가되었습니다!`);
        setRoundName(newRoundName);
      }
    };

    const processSeatAction = (idx, isBlockAction) => {
      if (adminMode !== "seat") {
        return alert("좌석을 수정하려면 [🔒 좌석관리]로 로그인해주세요.");
      }
      if (!currentData) return;
      
      if (!isBlockAction && (Date.now() - lastActionTime.current < 500)) return; 

      const newStatus = [...safeStatus];
      const currentSeatStatus = newStatus[idx] || 0;
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
        lastActionTime.current = Date.now();
      } else {
        if (currentSeatStatus === 0) {
             if(window.confirm(`[${seatName}] 좌석을 예약 완료하시겠습니까?`)) newStatus[idx] = 1; else return;
        }
        else if (currentSeatStatus === 1) { 
             if (window.confirm(`[${seatName}] 좌석 예약을 취소하시겠습니까?`)) newStatus[idx] = 0; else return; 
        }
        else if (currentSeatStatus === 2) { 
            return; 
        }
        lastActionTime.current = Date.now();
      }
      
      set(ref(database, `performances/${perfName}/rounds/${roundName}/status`), newStatus);
    };

    return (
      <div className="app-container booking-screen">
        <header className="control-bar">
          
          <div className="left-controls">
            <div className="control-column">
              <select value={perfName} onChange={e => handleSelectPerf(e.target.value)}>
                <option>공연 선택</option>
                {perfList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {adminMode === "perf" && perfName !== "선택" && (
                <div className="sub-actions">
                  <span className="text-link" onClick={editPerformanceName}>공연명 수정</span>
                </div>
              )}
            </div>

            <div className="control-column">
              <select value={roundName} onChange={e => setRoundName(e.target.value)}>
                <option>회차 선택</option>
                {roundList.map(r => {
                  const rStatus = currentPerf.rounds[r]?.status || [];
                  return <option key={r} value={r}>{r} ({rStatus.length || 0}석)</option>;
                })}
              </select>
              {adminMode === "perf" && perfName !== "선택" && (
                <div className="sub-actions">
                  <span className="text-link" onClick={addNewRound}>회차 추가</span>
                  {roundName !== "선택" && (
                    <span className="text-link danger" onClick={deleteCurrentRound}>회차 삭제</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="right-controls">
            {adminMode === "none" && currentPerf && (
              <>
                <button type="button" className="action-btn save" onClick={() => handleAdminLogin("seat", currentPerf)}>🔒 좌석관리</button>
                <button type="button" className="action-btn save" onClick={() => handleAdminLogin("perf", currentPerf)}>🔒 공연관리</button>
              </>
            )}

            {adminMode === "perf" && currentData && (
              <select className="type-select" value={currentData?.type} onChange={(e) => changeSeatType(e.target.value)}>
                {Object.keys(SEAT_CONFIGS).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}

            {adminMode === "seat" && currentData && (
              <span className="mode-tag">[좌석선택모드]</span>
            )}
            
            {adminMode !== "none" && (
              <button type="button" className="action-btn gray" onClick={() => setAdminMode("none")}>로그아웃</button>
            )}

            <button type="button" className="action-btn back" onClick={() => {
              setMenu("main");
              setAdminMode("none"); 
            }}>메인으로</button>
          </div>
        </header>

        <div className="stage-label">[ 무 대 ]</div>
        <div className="seat-area">
          {cfg && currentData && (
            <div className="grid-wrapper" style={{ gridTemplateColumns: `repeat(${cfg.cols + 1}, 1fr)` }}>
              <div className="aisle" style={{ gridColumn: `${cfg.split + 1}`, gridRow: `1 / span ${cfg.rows.length}` }}>통로</div>
              {cfg.rows.map((rowLabel, rIdx) => (
                [...Array(cfg.cols)].map((_, cIdx) => {
                  const realIdx = (rIdx * cfg.cols) + cIdx;
                  const isDone = safeStatus[realIdx] === 1;
                  const isBlocked = safeStatus[realIdx] === 2;
                  return (
                    <SeatButton 
                      key={realIdx} 
                      status={safeStatus[realIdx] || 0} 
                      label={isDone ? "완료" : (isBlocked ? "X" : `${rowLabel}${cfg.cols - cIdx}`)} 
                      originalLabel={`${rowLabel}${cfg.cols - cIdx}`} 
                      style={{ gridRow: rIdx + 1, gridColumn: cIdx + 1 + (cIdx >= (cfg.cols - cfg.split) ? 1 : 0) }} 
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
          <div className="bottom-info-area" style={{ marginTop: '20px' }}>
            <div className="status-bar">
              총 {safeStatus.length}석 | 완료 {safeStatus.filter(s=>s===1).length}석 | 불가 {safeStatus.filter(s=>s===2).length}석 | 잔여 {safeStatus.filter(s=>s===0).length}석
            </div>
            
            {adminMode === "perf" && (
              <div onClick={deleteEntirePerformance} className="text-link danger" style={{ fontSize: '11px', textAlign: 'center' }}>
                현재 공연 전체 삭제하기
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

// --- 4. 좌석(SeatButton) 컴포넌트 로직 전면 개선 ---
const SeatButton = ({ status, label, originalLabel, style, onClick, onLongPress }) => {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef(null);
  const isLongPressTriggered = useRef(false);
  
  const handlePointerDown = (e) => {
    setIsPressing(true); 
    isLongPressTriggered.current = false; 
    
    timerRef.current = setTimeout(() => { 
      isLongPressTriggered.current = true; 
      setIsPressing(false);
      onLongPress(); 
    }, 350); 
  };
  
  const handlePointerUp = () => {
    setIsPressing(false);
    if (timerRef.current) { 
      clearTimeout(timerRef.current); 
      timerRef.current = null; 
    }
  };
  
  const handleClick = (e) => { 
    if (isLongPressTriggered.current) { 
      isLongPressTriggered.current = false; 
      return; 
    } 
    e.preventDefault();
    onClick(); 
  };
  
  return (
    <button 
      type="button" 
      className={`seat state-${status} no-select ${isPressing ? 'pressing' : ''}`} 
      style={style}
      onPointerDown={handlePointerDown} 
      onPointerUp={handlePointerUp} 
      onPointerLeave={handlePointerUp} 
      onPointerCancel={handlePointerUp} 
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div>{label}</div>
      {status !== 0 && <div className="seat-sub-label">{originalLabel}</div>}
    </button>
  );
};

export default App;