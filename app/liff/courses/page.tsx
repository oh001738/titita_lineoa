'use client'

import { useState, useEffect } from 'react'
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
  status: string
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
            const roles = Array.from(new Set(result.data.users.map((u: any) => u.role))) as string[]
            const isTeacher = roles.includes('teacher')
            const isFamily = roles.includes('family')
            setHasTeacherRole(isTeacher)

            if (isTeacher) {
              const teacher = result.data.users.find((u: any) => u.role === 'teacher')
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-xl text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">尚未綁定帳號</h2>
          <p className="text-gray-500 text-sm mb-6">請先完成帳號綁定，才能查看課程資料。</p>
          <a
            href={`/liff/bind`}
            className="block w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            立即綁定帳號
          </a>
        </div>
      </div>
    )
  }

  // 判斷是否為教師模式（影響 Header 顏色）
  const isTeacherMode = userRole === 'teacher'
  const headerTitle = isTeacherMode ? '我的授課課表' : `${profile?.displayName} 的專區`
  const headerSubtitle = isTeacherMode ? '顯示未來兩週的授課安排' : '顯示未來兩週的課程'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className={`${isTeacherMode ? 'bg-gradient-to-br from-indigo-600 to-violet-700' : 'bg-indigo-600'} text-white p-6 pb-8 rounded-b-3xl shadow-md`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {profile?.pictureUrl && (
              <img src={profile.pictureUrl} className="w-10 h-10 rounded-full border-2 border-indigo-300" alt="" />
            )}
            <div>
              <h1 className="text-lg font-bold">{headerTitle}</h1>
              <p className="text-indigo-200 text-xs">{headerSubtitle}</p>
            </div>
          </div>
          
          {/* 統一下拉選單 */}
          {renderRoleSelector()}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 -mt-4 relative z-10">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl h-24 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center shadow-sm border border-gray-100">
            <span className="text-4xl block mb-2">☕️</span>
            <p className="text-gray-600 font-medium">近兩週沒有安排課程</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map(course => {
              const isCompleted = course.status === 'completed'
              return (
                <div 
                  key={course.id} 
                  onClick={() => !isTeacherMode && !isCompleted && setSelectedCourse(course)}
                  className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transition-colors ${!isTeacherMode && !isCompleted ? 'cursor-pointer hover:border-indigo-300 active:scale-[0.98]' : ''} ${isCompleted ? 'opacity-70' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2">
                      <div className={`${isTeacherMode ? 'bg-violet-50 text-violet-700' : 'bg-indigo-50 text-indigo-700'} text-xs font-bold px-2 py-1 rounded`}>
                        {course.date}
                      </div>
                      {isCompleted && (
                        <div className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded">
                          已完課
                        </div>
                      )}
                      {course.isMakeup && (
                        <div className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">
                          補課
                        </div>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm font-medium">
                      {course.startTime} - {course.endTime}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">{course.name}</h3>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    {isTeacherMode ? (
                      <span className="flex items-center gap-1">📍 {course.room}</span>
                    ) : (
                      <>
                        <span className="flex items-center gap-1">👤 {course.teacher}</span>
                        <span className="flex items-center gap-1">📍 {course.room}</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal for Course Details & Leave Request (僅家長模式) */}
      {selectedCourse && !isTeacherMode && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl transform transition-all">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-gray-900">課程詳細資訊</h2>
              <button 
                onClick={() => setSelectedCourse(null)}
                className="bg-gray-100 text-gray-500 w-8 h-8 rounded-full flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                <p className="text-sm text-gray-500">課程名稱</p>
                <p className="font-bold text-lg text-indigo-900">{selectedCourse.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] text-gray-500 uppercase">日期</p>
                  <p className="font-bold text-gray-800">{selectedCourse.date}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] text-gray-500 uppercase">時間</p>
                  <p className="font-bold text-gray-800">{selectedCourse.startTime}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] text-gray-500 uppercase">老師</p>
                  <p className="font-bold text-gray-800">{selectedCourse.teacher}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] text-gray-500 uppercase">教室</p>
                  <p className="font-bold text-gray-800">{selectedCourse.room}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLeaveRequest}
              disabled={isSubmittingLeave}
              className="w-full bg-red-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingLeave ? '處理中...' : '申請請假'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
