'use client'

import { useState, useEffect } from 'react'
import { useLiff } from '@/components/liff/LiffProvider'

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
  const { profile, isReady, error: liffError } = useLiff()
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

  // 1. 取得綁定的學生清單與偵測身份
  useEffect(() => {
    if (isReady && profile?.userId) {
      // 先查綁定狀態與身份
      fetch(`/api/line/bind/status?line_user_id=${profile.userId}`)
        .then(res => res.json())
        .then(result => {
          if (result.data?.is_bound) {
            const teacher = result.data.users.find((u: any) => u.role === 'teacher')
            if (teacher) {
              setUserRole('teacher')
              // 老師身分：抓取今日學生
              fetch(`/api/points/teacher/students?line_user_id=${profile.userId}`)
                .then(r => r.json())
                .then(sResult => {
                  if (sResult.data?.students) setTeacherStudents(sResult.data.students)
                  setIsLoading(false)
                })
            } else {
              setUserRole('family')
              // 家長身分：抓取綁定的小孩清單
              fetch(`/api/internal/users/bound-students?line_user_id=${profile.userId}`)
                .then(res => res.json())
                .then(childResult => {
                  if (childResult.data && childResult.data.length > 0) {
                    setBoundStudents(childResult.data)
                    setSelectedStudentId(childResult.data[0].user_id)
                  } else {
                    setIsLoading(false)
                  }
                })
            }
          } else {
            setIsNotBound(true)
            setIsLoading(false)
          }
        })
    } else if (isReady && !profile) {
      setIsNotBound(true)
      setIsLoading(false)
    }
  }, [isReady, profile])

  // 2. 當選擇的學生改變時，取得該學生的點數 (僅家長模式)
  useEffect(() => {
    if (userRole !== 'family' || !profile?.userId || !selectedStudentId) return
    
    setIsLoading(true)
    fetch(`/api/internal/users/points?line_user_id=${profile.userId}&user_id=${selectedStudentId}`)
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
          line_user_id: profile?.userId,
          target_user_id: student.user_id,
          target_line_user_id: student.line_user_id,
          target_name: student.name,
          amount: awardForm.amount,
          reason: awardForm.reason || '表現優異'
        })
      })
      const result = await res.json()
      if (result.data?.success) {
        alert(`已成功給予【${student.name}】 ${awardForm.amount} 點！`)
        setAwardForm({ studentId: '', amount: 10, reason: '' })
      } else {
        alert('給點失敗')
      }
    } catch {
      alert('網路錯誤')
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

  // ── 教師給點模式 ──
  if (userRole === 'teacher') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-8 rounded-b-[40px] shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">教師給點中心</h1>
            <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Teacher Mode</span>
          </div>
          <p className="text-indigo-100 text-xs opacity-90">為今日上課的學生發放獎勵點數</p>
        </header>

        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* 選擇學生清單 */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 mb-4 ml-1">今日學生</h3>
            {teacherStudents.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
                <span className="text-3xl block mb-2">😴</span>
                <p className="text-gray-400 text-sm">今天目前沒有排課紀錄</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {teacherStudents.map(s => (
                  <button
                    key={s.user_id}
                    onClick={() => setAwardForm({ ...awardForm, studentId: s.user_id })}
                    className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                      awardForm.studentId === s.user_id
                      ? 'bg-indigo-600 text-white shadow-lg scale-[1.02]'
                      : 'bg-white text-gray-800 border border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        awardForm.studentId === s.user_id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        👨‍🎓
                      </div>
                      <div>
                        <p className="font-bold">{s.name}</p>
                        <p className={`text-[10px] ${awardForm.studentId === s.user_id ? 'opacity-80' : 'text-gray-400'}`}>
                          {s.line_user_id ? '🟢 已綁定 LINE' : '⚪ 未綁定 LINE'}
                        </p>
                      </div>
                    </div>
                    {awardForm.studentId === s.user_id && <span className="text-xl">✅</span>}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 給點表單 */}
          {awardForm.studentId && (
            <section className="bg-white p-6 rounded-3xl shadow-xl border border-indigo-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-indigo-600 rounded-full" />
                發放點數獎勵
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">獎勵點數</label>
                  <div className="flex gap-2 mt-1">
                    {[5, 10, 20, 50].map(val => (
                      <button
                        key={val}
                        onClick={() => setAwardForm({ ...awardForm, amount: val })}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                          awardForm.amount === val ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">獎勵原因</label>
                  <input
                    type="text"
                    value={awardForm.reason}
                    onChange={e => setAwardForm({ ...awardForm, reason: e.target.value })}
                    placeholder="例如：課堂表現優異、準時完成作業"
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Balance Header */}
      <header className="bg-gradient-to-br from-amber-400 to-orange-500 text-white p-8 rounded-b-[40px] shadow-lg text-center relative overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        
        {/* 學生切換器放置於頂部 */}
        {boundStudents.length > 0 && (
          <div className="absolute top-6 right-6 z-10">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold border border-white/30 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300 appearance-none text-right pr-6 relative"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .5rem top 50%', backgroundSize: '.5rem auto' }}
            >
              {boundStudents.map(s => (
                <option key={s.user_id} value={s.user_id} className="text-gray-900">
                  {s.student_name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <p className="text-amber-100 text-sm font-medium mb-1 mt-2">目前可用點數</p>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-5xl font-black tracking-tight shadow-sm">
            {isLoading ? '...' : data?.balance.toLocaleString() || '0'}
          </span>
          <span className="text-xl font-bold mt-2">點</span>
        </div>
        <p className="text-xs text-amber-100 opacity-80">
          {boundStudents.find(s => s.user_id === selectedStudentId)?.student_name || profile?.displayName} 的專屬帳戶
        </p>
      </header>

      {/* Tabs */}
      <div className="flex px-4 mt-6 gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${
            activeTab === 'all' 
            ? 'bg-slate-800 text-white shadow-md' 
            : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          全部紀錄
        </button>
        <button
          onClick={() => setActiveTab('earn')}
          className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${
            activeTab === 'earn' 
            ? 'bg-amber-100 text-amber-700 shadow-md' 
            : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          獲得點數
        </button>
        <button
          onClick={() => setActiveTab('spend')}
          className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${
            activeTab === 'spend' 
            ? 'bg-blue-100 text-blue-700 shadow-md' 
            : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          兌換紀錄
        </button>
      </div>

      {/* History List */}
      <main className="flex-1 p-4 overflow-y-auto mt-2">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl h-16 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3 opacity-50">📝</span>
            <p className="text-gray-400 text-sm">目前沒有任何紀錄</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    item.type === 'earn' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {item.type === 'earn' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{item.reason}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.date}</p>
                  </div>
                </div>
                <div className={`font-black ${
                  item.type === 'earn' ? 'text-amber-500' : 'text-gray-800'
                }`}>
                  {item.type === 'earn' ? `+${item.amount}` : item.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
