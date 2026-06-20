'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLiff } from '@/components/liff/LiffProvider'
import { useToast } from '@/components/liff/Toast'
import { useConfirm } from '@/components/liff/ConfirmDialog'

interface Course {
  id: string
  name: string
  date: string
  startTime: string
  endTime: string
  teacher: string
  room: string
  status?: string
  isMakeup?: boolean
}

interface BoundStudent {
  user_id: string
  student_name: string
}

export default function CoursesPage() {
  const { profile, idToken, isReady, error: liffError } = useLiff()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [boundStudents, setBoundStudents] = useState<BoundStudent[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)
  const [isNotBound, setIsNotBound] = useState(false)

  // 教師模式
  const [userRole, setUserRole] = useState<'family' | 'teacher' | null>(null)
  const [hasTeacherRole, setHasTeacherRole] = useState(false)
  const [teacherId, setTeacherId] = useState<string>('')

  // 教師出勤點名（只記缺席）
  const [attendanceCourse, setAttendanceCourse] = useState<Course | null>(null)
  const [roster, setRoster] = useState<{ id: string; name: string }[]>([])
  const [absentIds, setAbsentIds] = useState<string[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  // 滾動偵測：Header 縮小
  const [isScrolled, setIsScrolled] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  const handleScroll = useCallback(() => {
    if (mainRef.current) {
      setIsScrolled(mainRef.current.scrollTop > 80)
    }
  }, [])

  // 統一下拉選單的值
  const selectorValue = userRole === 'teacher' ? 'teacher' : selectedStudentId

  const handleSelectorChange = (value: string) => {
    if (value === 'teacher') {
      setUserRole('teacher')
    } else {
      setUserRole('family')
      setSelectedStudentId(value)
    }
  }

  // 1. 初始化：偵測身份並預先載入資料
  useEffect(() => {
    if (isReady && idToken) {
      fetch(`/api/line/status?id_token=${idToken}`)
        .then(res => res.json())
        .then(async (result) => {
          if (result.data?.users && result.data.users.length > 0) {
            const isTeacher = result.data.users.some((u: any) => u.is_teacher)
            const isFamily = result.data.users.some((u: any) => u.role === 'family')
            setHasTeacherRole(isTeacher)

            if (isTeacher) {
              const teacher = result.data.users.find((u: any) => u.is_teacher)
              if (teacher) setTeacherId(teacher._id)
            }

            if (isFamily) {
              try {
                const childRes = await fetch(`/api/internal/users/bound-students?id_token=${idToken}`)
                const childResult = await childRes.json()
                if (childResult.data && childResult.data.length > 0) {
                  setBoundStudents(childResult.data)
                  setSelectedStudentId(childResult.data[0].user_id)
                }
              } catch {}
            }

            // 預設模式
            if (isTeacher) {
              setUserRole('teacher')
            } else if (isFamily) {
              setUserRole('family')
            }

            // 如果只有教師且沒有家長身分，直接結束載入
            if (isTeacher && !isFamily) {
              // 會由下面的 useEffect 根據 userRole 自動觸發課表載入
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
  }, [isReady, idToken])

  // 2. 當身分或選擇的學生改變時，取得對應的課表
  useEffect(() => {
    if (!idToken || !userRole) return

    if (userRole === 'teacher' && teacherId) {
      setIsLoading(true)
      fetch(`/api/internal/users/courses?id_token=${idToken}&user_id=${teacherId}`)
        .then(res => res.json())
        .then(result => {
          if (result.data) {
            setCourses(result.data)
          }
        })
        .finally(() => setIsLoading(false))
    } else if (userRole === 'family' && selectedStudentId) {
      setIsLoading(true)
      fetch(`/api/internal/users/courses?id_token=${idToken}&user_id=${selectedStudentId}`)
        .then(res => res.json())
        .then(result => {
          if (result.data) {
            setCourses(result.data)
          }
        })
        .finally(() => setIsLoading(false))
    }
  }, [idToken, userRole, teacherId, selectedStudentId])


  const handleLeaveRequest = async () => {
    if (!selectedCourse || !profile) return

    const isConfirmed = await confirm({
      title: '確定申請請假？',
      message: `您確定要請假【${selectedCourse.date} ${selectedCourse.name}】嗎？\n請注意，請假後若需補課請洽行政中心。`,
      confirmText: '確定請假',
      cancelText: '取消',
      type: 'danger'
    })

    if (!isConfirmed) return

    setIsSubmittingLeave(true)
    try {
      const res = await fetch('/api/internal/users/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: idToken,
          user_id: selectedStudentId,
          course_id: selectedCourse.id,
          reason: '家長透過 LINE 請假'
        })
      })
      const data = await res.json()
      
      if (data.error) {
        showToast(`請假失敗: ${data.error}`, 'error')
      } else {
        showToast('請假手續已完成！', 'success')
        setSelectedCourse(null)
        setCourses(courses.filter(c => c.id !== selectedCourse.id))
      }
    } catch (err) {
      showToast('網路錯誤，請稍後再試', 'error')
    } finally {
      setIsSubmittingLeave(false)
    }
  }

  // 教師：開啟某堂課的出勤點名（載入 roster + 目前缺席）
  const openAttendance = async (course: Course) => {
    setAttendanceCourse(course)
    setRoster([])
    setAbsentIds([])
    setAttendanceLoading(true)
    try {
      const res = await fetch(
        `/api/internal/lessons/${course.id}/attendance?id_token=${idToken}&teacher_user_id=${teacherId}`
      )
      const { data, error } = await res.json()
      if (error) {
        showToast(error, 'error')
        setAttendanceCourse(null)
        return
      }
      setRoster(data?.roster ?? [])
      setAbsentIds(data?.absent_student_ids ?? [])
    } catch {
      showToast('載入名單失敗', 'error')
      setAttendanceCourse(null)
    } finally {
      setAttendanceLoading(false)
    }
  }

  // 教師：切換某學生出席／缺席（樂觀更新 + PATCH，失敗還原）
  const toggleAbsent = async (studentId: string) => {
    if (!attendanceCourse) return
    const prev = absentIds
    const next = prev.includes(studentId)
      ? prev.filter((x) => x !== studentId)
      : [...prev, studentId]
    setAbsentIds(next)
    try {
      const res = await fetch(
        `/api/internal/lessons/${attendanceCourse.id}/attendance?id_token=${idToken}&teacher_user_id=${teacherId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ absent_student_ids: next }),
        }
      )
      const { error } = await res.json()
      if (error) {
        showToast(error, 'error')
        setAbsentIds(prev)
      }
    } catch {
      showToast('儲存失敗', 'error')
      setAbsentIds(prev)
    }
  }

  // ── 統一下拉選單元件 ──
  const renderRoleSelector = () => {
    if (!hasTeacherRole && boundStudents.length <= 1) return null

    if (!hasTeacherRole && boundStudents.length > 1) {
      // 純家長，多小孩 → 只顯示學生切換
      return (
        <select
          value={selectedStudentId}
          onChange={(e) => handleSelectorChange(e.target.value)}
          className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold border border-white/30 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none pr-7"
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

    // 有教師身分 → 顯示完整選單
    return (
      <select
        value={selectorValue}
        onChange={(e) => handleSelectorChange(e.target.value)}
        className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold border border-white/30 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none pr-7"
        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .5rem top 50%', backgroundSize: '.5rem auto' }}
      >
        <option value="teacher" className="text-gray-900">👨‍🏫 我的授課</option>
        {boundStudents.length > 0 && (
          <optgroup label="── 學生課表 ──">
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

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">正在載入您的課表...</p>
      </div>
    )
  }

  if (liffError || isNotBound) {
    return (
      <div className="min-h-screen bg-slate-50 font-nunito flex flex-col items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-sm border-2 border-slate-200 text-center">
          <div className="text-6xl mb-6">🔗</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2 tracking-wide">尚未綁定帳號</h2>
          <p className="text-gray-500 text-sm mb-8 font-bold">請先完成帳號綁定，才能查看課程資料。</p>
          <a
            href={`/liff/bind`}
            className="block w-full bg-[#66CCCC] text-white py-4 rounded-2xl font-black text-lg shadow-[0_4px_0_#4EA6A6] hover:translate-y-[2px] hover:shadow-[0_2px_0_#4EA6A6] active:translate-y-[4px] active:shadow-none transition-all"
          >
            立即前往綁定
          </a>
        </div>
      </div>
    )
  }

  // 判斷是否為教師模式（影響 Header 顏色）
  const isTeacherMode = userRole === 'teacher'
  
  // 決定標題名稱：如果是家長模式，在資料讀取完成前不顯示名稱，避免閃爍
  const studentName = boundStudents.find(s => s.user_id === selectedStudentId)?.student_name
  const displayName = isLoading ? '...' : (studentName || '學生')
  
  const headerTitle = isTeacherMode ? '我的授課課表' : `${displayName} 的專區`
  const headerSubtitle = isTeacherMode ? '未來兩週的授課安排' : '隨時掌握學習進度'
  const headerBgColor = isTeacherMode ? 'bg-[#99D8B9]' : 'bg-[#66CCCC]'
  const waveSvgFill = '%23F8FAFC' // slate-50

  return (
    <div className="h-screen bg-slate-50 font-nunito flex flex-col overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        .font-nunito { font-family: 'Nunito', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes wave-bg {
            0% { background-position-x: 0; }
            100% { background-position-x: 1000px; }
        }
        @keyframes float-up {
            0%, 100% { transform: translateY(0) rotate(-4deg) scale(1); }
            50% { transform: translateY(-10px) rotate(6deg) scale(1.05); }
        }
        @keyframes float-up-alt {
            0%, 100% { transform: translateY(0) rotate(4deg) scale(0.95); }
            50% { transform: translateY(-12px) rotate(-4deg) scale(1.05); }
        }
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-wave { animation: wave-bg 15s linear infinite; }
        .animate-float-up { animation: float-up 3.5s ease-in-out infinite; }
        .animate-float-up-alt { animation: float-up-alt 4s ease-in-out infinite; }
      `}} />

      {/* ── Single Adaptive Header: expands ↔ compacts on scroll ── */}
      <header className={`fixed top-0 left-0 right-0 z-30 overflow-hidden transition-all duration-300 ease-in-out ${headerBgColor} ${
        isScrolled ? 'shadow-md' : 'rounded-b-[40px] shadow-sm'
      }`}>
        <div className={`flex items-center justify-between relative z-20 transition-all duration-300 ease-in-out ${
          isScrolled ? 'px-4 pt-3 pb-3' : 'px-5 pt-8 pb-0'
        }`}>
          <div className="flex items-center gap-3">
            {profile?.pictureUrl ? (
              <img
                src={profile.pictureUrl}
                className={`object-cover border-white/40 transition-all duration-300 ease-in-out ${
                  isScrolled ? 'w-8 h-8 rounded-xl border-2' : 'w-14 h-14 rounded-[20px] border-4 shadow-sm'
                }`}
                alt=""
              />
            ) : (
              <div className={`border-white/40 bg-white/20 text-white flex items-center justify-center transition-all duration-300 ease-in-out ${
                isScrolled ? 'w-8 h-8 rounded-xl border-2 text-sm' : 'w-14 h-14 rounded-[20px] border-4 shadow-sm text-2xl'
              }`}>👦</div>
            )}
            <div className="overflow-hidden">
              <h1
                key={isLoading ? 'loading' : 'ready'}
                className={`font-black text-white drop-shadow-sm transition-all duration-300 ease-in-out ${
                  isScrolled ? 'text-sm' : 'text-2xl animate-fade-in'
                }`}
              >
                {isTeacherMode ? (
                  '我的授課課表'
                ) : isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-24 h-7 bg-white/30 animate-pulse rounded-lg inline-block" />
                    <span>的專區</span>
                  </span>
                ) : (
                  `${studentName || '學生'} 的專區`
                )}
              </h1>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isScrolled ? 'max-h-0 opacity-0' : 'max-h-[28px] opacity-100 mt-1'
              }`}>
                <p className="text-[11px] font-bold text-white/90 tracking-wide bg-black/10 inline-block px-2 py-0.5 rounded-lg">{headerSubtitle}</p>
              </div>
            </div>
          </div>
          {renderRoleSelector()}
        </div>

        {/* Wave + floating deco */}
        <div className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
          isScrolled ? 'max-h-0 opacity-0' : 'max-h-[70px] opacity-100'
        }`}>
          <div className="h-16 relative">
            <div
              className="absolute bottom-0 left-0 w-full h-[60px] z-0 animate-wave"
              style={{
                background: `url('data:image/svg+xml;utf8,<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><path fill="${waveSvgFill}" d="M0,50 C300,100 700,0 1000,50 L1000,100 L0,100 Z"></path></svg>') repeat-x`,
                backgroundSize: '1000px 100px'
              }}
            />
            <div className="absolute top-4 right-[80px] text-3xl text-[#FFDF6F] opacity-90 animate-float-up pointer-events-none drop-shadow-md">♫</div>
            <div className="absolute top-8 right-[40px] text-2xl text-[#FFDF6F] opacity-70 animate-float-up-alt pointer-events-none drop-shadow-md" style={{ animationDelay: '0.5s' }}>♩</div>
          </div>
        </div>
      </header>

      {/* Spacer: compensates for fixed header height */}
      <div
        className={`flex-shrink-0 transition-all duration-300 ease-in-out ${isScrolled ? 'h-14' : 'h-[154px]'}`}
        aria-hidden
      />

      {/* Main Content */}
      <main ref={mainRef} onScroll={handleScroll} className="flex-1 overflow-y-auto no-scrollbar px-5 pb-8">
        {isLoading ? null : (
          <div className="animate-fade-in">
            {courses.length === 0 ? (
              <div className="bg-white p-8 rounded-[28px] text-center shadow-sm border-2 border-slate-200 mt-4">
                <span className="text-5xl block mb-4">🎈</span>
                <p className="text-gray-500 font-bold text-lg">近兩週沒有安排課程喔！</p>
              </div>
        ) : (
          <div className="space-y-4">
            {courses.map(course => {
              const isCompleted = course.status === 'completed'
              return (
                <div
                  key={course.id}
                  onClick={() => {
                    if (isTeacherMode) { if (!isCompleted) openAttendance(course) }
                    else if (!isCompleted) setSelectedCourse(course)
                  }}
                  className={`bg-white p-5 rounded-[24px] shadow-[0_4px_10px_rgba(0,0,0,0.03)] border-2 ${!isCompleted ? (isTeacherMode ? 'border-[#E2E8F0] cursor-pointer hover:border-[#99D8B9] active:scale-[0.98] active:border-[#99D8B9]' : 'border-[#E2E8F0] cursor-pointer hover:border-[#66CCCC] active:scale-[0.98] active:border-[#66CCCC]') : 'border-slate-100'} transition-all ${isCompleted ? 'opacity-70 bg-slate-50 grayscale-[0.2]' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2 flex-wrap">
                      <div className="bg-slate-800 text-white text-[11px] font-black tracking-wider px-3 py-1 rounded-xl shadow-[0_2px_0_#0f172a]">
                        {course.date}
                      </div>
                      {isCompleted && (
                        <div className="bg-slate-200 text-slate-500 text-[11px] font-black tracking-wider px-3 py-1 rounded-xl">
                          已完課
                        </div>
                      )}
                      {course.isMakeup && (
                        <div className="bg-[#99D8B9] text-[#1e4d35] text-[11px] font-black tracking-wider px-3 py-1 rounded-xl shadow-[0_2px_0_#2B7A54]">
                          補課
                        </div>
                      )}
                    </div>
                    <div className={`font-black tracking-wide ${isTeacherMode ? 'text-[#99D8B9]' : 'text-[#66CCCC]'}`}>
                      {course.startTime} - {course.endTime}
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mt-1">{course.name}</h3>
                  <div className="flex justify-between items-center gap-4 mt-3 text-[13px] font-bold text-slate-400">
                    {isTeacherMode ? (
                      <>
                        <span className="flex items-center gap-1"><span className="text-lg">📍</span> {course.room}</span>
                        {!isCompleted && (
                          <span className="text-[#1e4d35] bg-[#99D8B9]/30 px-2.5 py-1 rounded-xl text-[12px] font-black">點此點名 ›</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1"><span className="text-lg">👤</span> {course.teacher}</span>
                        <span className="flex items-center gap-1"><span className="text-lg">📍</span> {course.room}</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
          </div>
        )}
      </main>

      {/* Modal for Course Details & Leave Request (僅家長模式) */}
      {selectedCourse && !isTeacherMode && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl transform transition-all border-4 border-white">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-black text-gray-800">課程詳細資訊</h2>
              <button 
                onClick={() => setSelectedCourse(null)}
                className="bg-slate-100 text-slate-500 w-10 h-10 rounded-[14px] flex items-center justify-center font-black active:scale-95 transition-transform"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 mb-8">
              <div className="bg-[#66CCCC]/10 border-2 border-[#66CCCC]/20 p-5 rounded-[24px]">
                <p className="text-[11px] font-black tracking-widest text-[#66CCCC] uppercase mb-1">課程名稱</p>
                <p className="font-black text-xl text-gray-800">{selectedCourse.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border-2 border-slate-100 p-4 rounded-[20px]">
                  <p className="text-[11px] font-black tracking-widest text-slate-400 uppercase mb-1">日期</p>
                  <p className="font-black text-gray-800">{selectedCourse.date}</p>
                </div>
                <div className="bg-slate-50 border-2 border-slate-100 p-4 rounded-[20px]">
                  <p className="text-[11px] font-black tracking-widest text-slate-400 uppercase mb-1">時間</p>
                  <p className="font-black text-gray-800">{selectedCourse.startTime}</p>
                </div>
                <div className="bg-slate-50 border-2 border-slate-100 p-4 rounded-[20px]">
                  <p className="text-[11px] font-black tracking-widest text-slate-400 uppercase mb-1">老師</p>
                  <p className="font-black text-gray-800">{selectedCourse.teacher}</p>
                </div>
                <div className="bg-slate-50 border-2 border-slate-100 p-4 rounded-[20px]">
                  <p className="text-[11px] font-black tracking-widest text-slate-400 uppercase mb-1">教室</p>
                  <p className="font-black text-gray-800">{selectedCourse.room}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLeaveRequest}
              disabled={isSubmittingLeave}
              className="w-full bg-[#FFDF6F] text-[#F56E4A] py-4 rounded-2xl font-black text-lg shadow-[0_4px_0_#E5C864] hover:translate-y-[2px] hover:shadow-[0_2px_0_#E5C864] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[0_4px_0_#E5C864]"
            >
              {isSubmittingLeave ? '處理中...' : '申請請假'}
            </button>
          </div>
        </div>
      )}

      {/* Modal：教師出勤點名（只記缺席） */}
      {attendanceCourse && isTeacherMode && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl border-4 border-white max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-black text-gray-800">出勤點名</h2>
                <p className="text-[13px] font-bold text-slate-400 mt-0.5">{attendanceCourse.date} · {attendanceCourse.name}</p>
              </div>
              <button
                onClick={() => setAttendanceCourse(null)}
                className="bg-slate-100 text-slate-500 w-10 h-10 rounded-[14px] flex items-center justify-center font-black active:scale-95 transition-transform flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-slate-500">點學生標記未到</p>
              {absentIds.length > 0 && (
                <p className="text-[13px] font-black text-[#FE7A7B]">缺席 {absentIds.length} 人</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar -mx-1 px-1">
              {attendanceLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-7 h-7 border-4 border-[#99D8B9]/40 border-t-[#99D8B9] rounded-full animate-spin" />
                </div>
              ) : roster.length === 0 ? (
                <p className="text-center text-slate-400 font-bold py-10">這堂課沒有選課學生</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {roster.map((stu) => {
                    const isAbsent = absentIds.includes(stu.id)
                    return (
                      <button
                        key={stu.id}
                        onClick={() => toggleAbsent(stu.id)}
                        className={`px-4 py-2.5 rounded-2xl font-black text-sm border-2 transition-all active:scale-95 ${
                          isAbsent
                            ? 'bg-[#FE7A7B]/10 border-[#FE7A7B] text-[#FE7A7B] line-through'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {isAbsent ? '✕ ' : ''}{stu.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 font-bold text-center mt-4">預設全部到齊，只需標記未到的學生</p>
          </div>
        </div>
      )}
    </div>
  )
}
