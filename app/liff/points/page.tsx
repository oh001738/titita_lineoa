'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLiff } from '@/components/liff/LiffProvider'
import { useToast } from '@/components/liff/Toast'

interface PointHistory {
  id: string
  type: 'earn' | 'spend'
  amount: number
  date: string
  reason: string
}

interface PointsData {
  balance: number
  history: PointHistory[]
}

interface BoundStudent {
  user_id: string
  student_name: string
}

export default function PointsPage() {
  const { profile, idToken, isReady, error: liffError } = useLiff()
  const { showToast } = useToast()
  const [boundStudents, setBoundStudents] = useState<BoundStudent[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  
  const [data, setData] = useState<PointsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'earn' | 'spend'>('all')
  
  // 教師專用 State
  const [userRole, setUserRole] = useState<'family' | 'teacher' | null>(null)
  const [teacherStudents, setTeacherStudents] = useState<any[]>([])
  const [isAwarding, setIsAwarding] = useState(false)
  const [awardForm, setAwardForm] = useState({ studentId: '', amount: 10, reason: '' })
  const [isNotBound, setIsNotBound] = useState(false)
  const [hasTeacherRole, setHasTeacherRole] = useState(false)

  // 滾動偵測：Header 縮小
  const [isScrolled, setIsScrolled] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  const handleScroll = useCallback(() => {
    if (mainRef.current) {
      setIsScrolled(mainRef.current.scrollTop > 80)
    }
  }, [])

  // 統一下拉選單的值：'teacher' 代表教師模式，其他值代表學生 user_id
  const selectorValue = userRole === 'teacher' ? 'teacher' : selectedStudentId

  const handleSelectorChange = (value: string) => {
    if (value === 'teacher') {
      setUserRole('teacher')
    } else {
      setUserRole('family')
      setSelectedStudentId(value)
    }
  }

  // 1. 初始化：偵測身份並預先載入所有資料
  useEffect(() => {
    if (isReady && idToken) {
      fetch(`/api/line/status?id_token=${idToken}`)
        .then(res => res.json())
        .then(async (result) => {
          if (result.data?.users && result.data.users.length > 0) {
            const isTeacher = result.data.users.some((u: any) => u.is_teacher)
            const isFamily = result.data.users.some((u: any) => u.role === 'family')
            setHasTeacherRole(isTeacher)

            // 並行載入所有資料，讓切換時不用等待
            const promises: Promise<void>[] = []

            if (isTeacher) {
              promises.push(
                fetch(`/api/points/teacher/students?id_token=${idToken}`)
                  .then(r => r.json())
                  .then(sResult => {
                    if (sResult.data?.students) setTeacherStudents(sResult.data.students)
                  })
              )
            }

            if (isFamily) {
              promises.push(
                fetch(`/api/internal/users/bound-students?id_token=${idToken}`)
                  .then(res => res.json())
                  .then(childResult => {
                    if (childResult.data && childResult.data.length > 0) {
                      setBoundStudents(childResult.data)
                      // 如果不是教師優先，就預設選第一個學生
                      if (!isTeacher) {
                        setSelectedStudentId(childResult.data[0].user_id)
                      } else {
                        setSelectedStudentId(childResult.data[0].user_id)
                      }
                    }
                  })
              )
            }

            await Promise.all(promises)

            // 預設模式：有教師身分就先進教師模式
            if (isTeacher) {
              setUserRole('teacher')
            } else if (isFamily) {
              setUserRole('family')
            }
            setIsLoading(false)
          } else {
            setIsNotBound(true)
            setIsLoading(false)
          }
        })
    } else if (isReady && !profile) {
      setIsNotBound(true)
      setIsLoading(false)
    }
  }, [isReady, idToken])

  // 2. 當選擇的學生改變時，取得該學生的點數 (僅家長模式)
  useEffect(() => {
    if (userRole !== 'family' || !idToken || !selectedStudentId) return
    
    setIsLoading(true)
    fetch(`/api/internal/users/points?id_token=${idToken}&user_id=${selectedStudentId}`)
      .then(res => res.json())
      .then(result => {
        if (result.data) {
          setData(result.data)
        }
      })
      .finally(() => setIsLoading(false))
  }, [profile?.userId, selectedStudentId, userRole])

  // 教師給點動作
  const handleAward = async () => {
    if (!awardForm.studentId || !awardForm.amount) return
    setIsAwarding(true)
    try {
      const student = teacherStudents.find(s => s.user_id === awardForm.studentId)
      const res = await fetch('/api/points/teacher/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: idToken,
          target_user_id: student.user_id,
          target_line_user_id: student.line_user_id,
          target_name: student.name,
          amount: awardForm.amount,
          reason: awardForm.reason || '表現優異'
        })
      })
      const result = await res.json()
      if (result.data?.success) {
        showToast(`已成功給予【${student.name}】 ${awardForm.amount} 點！`, 'success')
        setAwardForm({ studentId: '', amount: 10, reason: '' })
      } else {
        showToast('給點失敗', 'error')
      }
    } catch {
      showToast('網路錯誤', 'error')
    } finally {
      setIsAwarding(false)
    }
  }


  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">正在讀取您的點數...</p>
      </div>
    )
  }

  if (liffError || isNotBound) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-xl text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">尚未綁定帳號</h2>
          <p className="text-gray-500 text-sm mb-6">請先完成帳號綁定，才能查看點數資料。</p>
          <a
            href={`/liff/bind`}
            className="block w-full bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors"
          >
            立即綁定帳號
          </a>
        </div>
      </div>
    )
  }

  const filteredHistory = data?.history.filter(h => {
    if (activeTab === 'all') return true
    return h.type === activeTab
  }) || []

  // ── 統一下拉選單元件（教師+學生） ──
  const renderRoleSelector = (theme: 'indigo' | 'amber') => {
    // 只有當同時有教師身分+學生時才顯示下拉選單
    if (!hasTeacherRole && boundStudents.length <= 1) return null
    if (!hasTeacherRole && boundStudents.length > 1) {
      // 純家長，多小孩 → 只顯示學生切換
      return (
        <select
          value={selectedStudentId}
          onChange={(e) => handleSelectorChange(e.target.value)}
          className={`bg-white/20 backdrop-blur-sm text-white text-xs font-bold border border-white/30 rounded-xl px-3 py-1.5 focus:outline-none appearance-none pr-7 ${
            theme === 'amber' ? 'focus:ring-2 focus:ring-amber-300' : 'focus:ring-2 focus:ring-indigo-300'
          }`}
          style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .5rem top 50%', backgroundSize: '.5rem auto' }}
        >
          {boundStudents.map(s => (
            <option key={s.user_id} value={s.user_id} className="text-gray-900">
              {s.student_name}
            </option>
          ))}
        </select>
      )
    }

    // 有教師身分 → 顯示完整選單（教師模式 + 學生）
    return (
      <select
        value={selectorValue}
        onChange={(e) => handleSelectorChange(e.target.value)}
        className={`bg-white/20 backdrop-blur-sm text-white text-xs font-bold border border-white/30 rounded-xl px-3 py-1.5 focus:outline-none appearance-none pr-7 ${
          theme === 'amber' ? 'focus:ring-2 focus:ring-amber-300' : 'focus:ring-2 focus:ring-indigo-300'
        }`}
        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .5rem top 50%', backgroundSize: '.5rem auto' }}
      >
        <option value="teacher" className="text-gray-900">👨‍🏫 教師給點</option>
        {boundStudents.length > 0 && (
          <optgroup label="── 學生點數 ──">
            {boundStudents.map(s => (
              <option key={s.user_id} value={s.user_id} className="text-gray-900">
                👨‍🎓 {s.student_name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    )
  }

  // ── 教師給點模式 ──
  if (userRole === 'teacher') {
    return (
      <div className="h-screen bg-slate-50 font-nunito flex flex-col overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
          .font-nunito { font-family: 'Nunito', sans-serif; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          @keyframes fade-in {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
          }
           @keyframes wave-bg { 0% { background-position-x: 0; } 100% { background-position-x: 1000px; } }
          @keyframes float-up { 0% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-15px) rotate(5deg); } 100% { transform: translateY(0) rotate(0deg); } }
          .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
          .animate-wave { animation: wave-bg 15s linear infinite; }
          .animate-float-up { animation: float-up 3s ease-in-out infinite; }
        `}} />

        {/* ── Single Adaptive Header ── */}
        <header className={`fixed top-0 left-0 right-0 z-30 overflow-hidden bg-[#FF9966] transition-all duration-300 ease-in-out ${
          isScrolled ? 'shadow-md' : 'rounded-b-[40px] shadow-sm'
        }`}>
          <div className={`flex items-center justify-between relative z-20 transition-all duration-300 ease-in-out ${
            isScrolled ? 'px-4 pt-3 pb-3' : 'px-5 pt-8 pb-0'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`border-white/40 bg-white/20 text-white flex items-center justify-center transition-all duration-300 ease-in-out ${
                isScrolled ? 'w-8 h-8 rounded-xl border-2 text-sm' : 'w-14 h-14 rounded-[20px] border-4 shadow-sm text-2xl'
              }`}>✨</div>
              <div>
                <h1 className={`font-black text-white drop-shadow-sm tracking-wide transition-all duration-300 ease-in-out ${
                  isScrolled ? 'text-sm' : 'text-2xl'
                }`}>教師給點中心</h1>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isScrolled ? 'max-h-0 opacity-0' : 'max-h-[24px] opacity-100 mt-1'
                }`}>
                  <p className="text-[11px] font-bold text-white/90 tracking-wide bg-black/10 inline-block px-2 py-0.5 rounded-lg">為今日上課的學生發放獎勵點數</p>
                </div>
              </div>
            </div>
            {renderRoleSelector('indigo')}
          </div>

          {/* Wave + floating deco */}
          <div className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
            isScrolled ? 'max-h-0 opacity-0' : 'max-h-[70px] opacity-100'
          }`}>
            <div className="h-16 relative">
              <div
                className="absolute bottom-0 left-0 w-full h-[60px] z-0 animate-wave"
                style={{
                  background: `url('data:image/svg+xml;utf8,<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><path fill="%23F8FAFC" d="M0,50 C300,100 700,0 1000,50 L1000,100 L0,100 Z"></path></svg>') repeat-x`,
                  backgroundSize: '1000px 100px'
                }}
              />
              <div className="absolute top-4 right-[40px] text-3xl text-[#FFDF6F] opacity-90 animate-float-up pointer-events-none drop-shadow-md">✨</div>
            </div>
          </div>
        </header>

        {/* Spacer for fixed header */}
        <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${isScrolled ? 'h-14' : 'h-[154px]'}`} aria-hidden />

        <main ref={mainRef} onScroll={handleScroll} className="flex-1 px-5 pb-8 overflow-y-auto no-scrollbar">
          {/* 選擇學生清單 */}
          <section>
            <h3 className="text-sm font-black text-slate-400 mb-4 ml-1 tracking-widest">今日學生</h3>
            {teacherStudents.length === 0 ? (
              <div className="bg-white rounded-[28px] p-8 text-center border-2 border-slate-200 shadow-sm">
                <span className="text-5xl block mb-4">😴</span>
                <p className="text-gray-500 font-bold text-lg">今天目前沒有排課紀錄</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {teacherStudents.map(s => (
                  <button
                    key={s.user_id}
                    onClick={() => setAwardForm({ ...awardForm, studentId: s.user_id })}
                    className={`flex items-center justify-between p-4 rounded-[20px] transition-all border-2 ${
                      awardForm.studentId === s.user_id
                      ? 'bg-[#66CCCC]/10 border-[#66CCCC] shadow-[0_4px_10px_rgba(102,204,204,0.2)] scale-[1.02]'
                      : 'bg-white text-gray-800 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center font-bold text-2xl shadow-sm ${
                        awardForm.studentId === s.user_id ? 'bg-[#66CCCC] text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        👨‍🎓
                      </div>
                      <div>
                        <p className={`font-black text-[17px] ${awardForm.studentId === s.user_id ? 'text-[#4EA6A6]' : 'text-slate-700'}`}>{s.name}</p>
                        <p className={`text-[11px] font-bold tracking-widest mt-0.5 ${awardForm.studentId === s.user_id ? 'text-[#66CCCC]' : 'text-slate-400'}`}>點擊選擇</p>
                      </div>
                    </div>
                    {awardForm.studentId === s.user_id && (
                      <div className="w-8 h-8 bg-[#66CCCC] rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">✓</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 給點表單 */}
          {awardForm.studentId && (
            <section className="mt-8 animate-fade-in">
              <h3 className="text-sm font-black text-slate-400 mb-4 ml-1 tracking-widest">發送獎勵</h3>
              <div className="bg-white rounded-[28px] p-6 shadow-sm border-2 border-slate-200">
                <div className="mb-5">
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 mb-2">點數數量</label>
                  <div className="flex items-center justify-center gap-4 bg-slate-50 p-4 rounded-[20px] border-2 border-slate-100">
                    <button 
                      onClick={() => setAwardForm({ ...awardForm, amount: Math.max(1, awardForm.amount - 1) })}
                      className="w-12 h-12 rounded-[14px] bg-white border-2 border-slate-200 flex items-center justify-center text-xl font-black text-slate-500 active:scale-95"
                    >-</button>
                    <div className="text-4xl font-black text-[#FF9966] w-20 text-center">{awardForm.amount}</div>
                    <button 
                      onClick={() => setAwardForm({ ...awardForm, amount: awardForm.amount + 1 })}
                      className="w-12 h-12 rounded-[14px] bg-[#FF9966] text-white flex items-center justify-center text-xl font-black shadow-[0_4px_0_#D95433] active:translate-y-[4px] active:shadow-none transition-all"
                    >+</button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 mb-2">獎勵原因 (給家長看)</label>
                  <input 
                    type="text"
                    value={awardForm.reason}
                    onChange={e => setAwardForm({ ...awardForm, reason: e.target.value })}
                    placeholder="例如：上課認真、完成作業"
                    className="w-full px-5 py-4 border-2 border-slate-200 rounded-[20px] font-bold focus:outline-none focus:border-[#66CCCC] focus:bg-[#66CCCC]/5 transition-colors text-slate-700"
                  />
                </div>

                <button
                  onClick={handleAward}
                  disabled={isAwarding}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 disabled:opacity-50 transition-all mt-2"
                >
                  {isAwarding ? '正在發送獎勵...' : '確認發放獎勵'}
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    )
  }

  // ── 家長點數模式 (原本的內容) ──
  return (
    <div className="h-screen bg-slate-50 font-nunito flex flex-col overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        .font-nunito { font-family: 'Nunito', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes wave-bg { 0% { background-position-x: 0; } 100% { background-position-x: 1000px; } }
        @keyframes float-up { 0% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-15px) rotate(5deg); } 100% { transform: translateY(0) rotate(0deg); } }
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-wave { animation: wave-bg 15s linear infinite; }
        .animate-float-up { animation: float-up 3s ease-in-out infinite; }
      `}} />

      {/* ── Single Adaptive Header ── */}
      <header className={`fixed top-0 left-0 right-0 z-30 overflow-hidden bg-[#FFDF6F] transition-all duration-300 ease-in-out ${
        isScrolled ? 'shadow-md' : 'rounded-b-[40px] shadow-sm'
      }`}>
        {/* Compact row (visible when scrolled) */}
        <div className={`flex items-center justify-between px-4 overflow-hidden transition-all duration-300 ease-in-out ${
          isScrolled ? 'py-3 max-h-[60px] opacity-100' : 'py-0 max-h-0 opacity-0'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-[#F56E4A] drop-shadow-sm">{data?.balance.toLocaleString() || '0'} 點</span>
            <span className="text-xs font-bold text-[#F56E4A]/70">
              {boundStudents.find(s => s.user_id === selectedStudentId)?.student_name || '學生'}
            </span>
          </div>
          {renderRoleSelector('amber')}
        </div>

        {/* Full balance (visible when not scrolled) */}
        <div className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
          isScrolled ? 'max-h-0 opacity-0' : 'max-h-[200px] opacity-100'
        }`}>
          <div className="px-5 pt-4 pb-0 relative">
            <div className="absolute top-3 right-5 z-20">{renderRoleSelector('amber')}</div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-[60px] font-black text-white tracking-tight drop-shadow-md leading-none">
                  {isLoading ? '...' : data?.balance.toLocaleString() || '0'}
                </span>
                <span className="text-xl font-black text-white mt-4 drop-shadow-sm">點</span>
              </div>
              <p
                key={isLoading ? 'loading' : 'ready'}
                className="text-[11px] font-bold text-[#F56E4A]/90 tracking-wide bg-[#F56E4A]/10 inline-block px-3 py-1 rounded-xl min-w-[120px] animate-fade-in"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-1">
                    <span className="w-16 h-3 bg-[#F56E4A]/20 animate-pulse rounded-full" />
                    <span>的專區</span>
                  </span>
                ) : (
                  `${boundStudents.find(s => s.user_id === selectedStudentId)?.student_name || '學生'} 的專區`
                )}
              </p>
            </div>
          </div>
          <div className="h-16 relative">
            <div
              className="absolute bottom-0 left-0 w-full h-[60px] z-0 animate-wave"
              style={{
                background: `url('data:image/svg+xml;utf8,<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><path fill="%23F8FAFC" d="M0,50 C300,100 700,0 1000,50 L1000,100 L0,100 Z"></path></svg>') repeat-x`,
                backgroundSize: '1000px 100px'
              }}
            />
            <div className="absolute top-4 left-[30px] text-3xl text-[#FE7A7B] opacity-90 animate-float-up pointer-events-none drop-shadow-md">✨</div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${isScrolled ? 'h-14' : 'h-[166px]'}`} aria-hidden />

      {/* Tabs & Content — 載入完成後才顯示 */}
      {!isLoading && (
        <div className="animate-fade-in flex flex-col flex-1 overflow-hidden">
          <div className="sticky top-0 z-20 flex px-5 mt-4 gap-3 bg-slate-50/90 backdrop-blur-md py-3">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-3 rounded-[16px] text-[13px] font-black transition-all border-2 ${
                activeTab === 'all' 
                ? 'bg-slate-800 text-white border-slate-800 shadow-[0_4px_0_#0f172a]' 
                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
              }`}
            >
              全部紀錄
            </button>
            <button
              onClick={() => setActiveTab('earn')}
              className={`flex-1 py-3 rounded-[16px] text-[13px] font-black transition-all border-2 ${
                activeTab === 'earn' 
                ? 'bg-[#FFF0E5] text-[#FF9966] border-[#FF9966]' 
                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
              }`}
            >
              獲得點數
            </button>
            <button
              onClick={() => setActiveTab('spend')}
              className={`flex-1 py-3 rounded-[16px] text-[13px] font-black transition-all border-2 ${
                activeTab === 'spend' 
                ? 'bg-[#E5F5F5] text-[#66CCCC] border-[#66CCCC]' 
                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
              }`}
            >
              兌換紀錄
            </button>
          </div>

          {/* History List */}
          <main ref={mainRef} onScroll={handleScroll} className="flex-1 px-5 pb-8 overflow-y-auto no-scrollbar mt-2">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-[28px] border-2 border-slate-200 shadow-sm mt-4">
                <span className="text-5xl block mb-4">🎈</span>
                <p className="text-gray-500 font-bold text-lg">目前沒有任何紀錄</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] border-2 border-[#E2E8F0] flex items-center justify-between transition-all hover:border-slate-300">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center font-black text-xl shadow-sm ${
                        item.type === 'earn' ? 'bg-[#FF9966] text-white' : 'bg-[#66CCCC] text-white'
                      }`}>
                        {item.type === 'earn' ? '+' : '-'}
                      </div>
                      <div>
                        <p className="text-[15px] font-black text-slate-800 tracking-wide">{item.reason}</p>
                        <p className="text-[11px] font-bold tracking-widest text-slate-400 mt-1">{item.date}</p>
                      </div>
                    </div>
                    <div className={`font-black text-xl ${
                      item.type === 'earn' ? 'text-[#FF9966]' : 'text-[#66CCCC]'
                    }`}>
                      {item.type === 'earn' ? `+${item.amount}` : item.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
