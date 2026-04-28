'use client'

import { useState, useEffect } from 'react'
import { useLiff } from '@/components/liff/LiffProvider'

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
  const { profile, isReady, error: liffError } = useLiff()
  const [boundStudents, setBoundStudents] = useState<BoundStudent[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)

  // 1. 取得綁定的學生清單
  useEffect(() => {
    if (isReady && profile?.userId) {
      fetch(`/api/internal/users/bound-students?line_user_id=${profile.userId}`)
        .then(res => res.json())
        .then(result => {
          if (result.data && result.data.length > 0) {
            setBoundStudents(result.data)
            setSelectedStudentId(result.data[0].user_id) // 預設選第一個
          } else {
            setIsLoading(false)
          }
        })
    } else if (isReady && !profile) {
      setIsLoading(false)
    }
  }, [isReady, profile])

  // 2. 當選擇的學生改變時，取得該學生的課表
  useEffect(() => {
    if (!profile?.userId || !selectedStudentId) return
    
    setIsLoading(true)
    fetch(`/api/internal/users/courses?line_user_id=${profile.userId}&user_id=${selectedStudentId}`)
      .then(res => res.json())
      .then(result => {
        if (result.data) {
          setCourses(result.data)
        }
      })
      .finally(() => setIsLoading(false))
  }, [profile?.userId, selectedStudentId])


  const handleLeaveRequest = async () => {
    if (!selectedCourse || !profile) return

    const confirmLeave = window.confirm(`您確定要請假【${selectedCourse.date} ${selectedCourse.name}】嗎？\n請注意，請假後若需補課請洽行政中心。`)
    if (!confirmLeave) return

    setIsSubmittingLeave(true)
    try {
      const res = await fetch('/api/internal/users/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_user_id: profile.userId,
          course_id: selectedCourse.id,
          reason: '家長透過 LINE 請假'
        })
      })
      const data = await res.json()
      
      if (data.error) {
        alert(`請假失敗: ${data.error}`)
      } else {
        alert('請假手續已完成！')
        setSelectedCourse(null)
        setCourses(courses.filter(c => c.id !== selectedCourse.id))
      }
    } catch (err) {
      alert('網路錯誤，請稍後再試')
    } finally {
      setIsSubmittingLeave(false)
    }
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">正在載入您的課表...</p>
      </div>
    )
  }

  if (liffError) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="bg-red-50 p-6 rounded-2xl text-center w-full max-w-sm">
          <p className="text-red-600 font-bold mb-2">無法讀取資料</p>
          <p className="text-xs text-red-500">{liffError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-6 pb-8 rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {profile?.pictureUrl && (
              <img src={profile.pictureUrl} className="w-10 h-10 rounded-full border-2 border-indigo-300" alt="" />
            )}
            <div>
              <h1 className="text-lg font-bold">{profile?.displayName} 的專區</h1>
              <p className="text-indigo-200 text-xs">顯示未來兩週的課程</p>
            </div>
          </div>
          
          {/* 學生切換器 */}
          {boundStudents.length > 0 && (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-indigo-700/50 text-white text-sm font-bold border border-indigo-500 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none text-right pr-8 relative"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
            >
              {boundStudents.map(s => (
                <option key={s.user_id} value={s.user_id} className="text-gray-900">
                  {s.student_name}
                </option>
              ))}
            </select>
          )}
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
            {courses.map(course => (
              <div 
                key={course.id} 
                onClick={() => setSelectedCourse(course)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-300 transition-colors active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded">
                    {course.date}
                  </div>
                  <div className="text-gray-400 text-sm font-medium">
                    {course.startTime} - {course.endTime}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800">{course.name}</h3>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">👤 {course.teacher}</span>
                  <span className="flex items-center gap-1">📍 {course.room}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal for Course Details & Leave Request */}
      {selectedCourse && (
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
              className="w-full bg-red-50 text-red-600 border border-red-200 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 active:bg-red-200 transition-colors disabled:opacity-50"
            >
              {isSubmittingLeave ? (
                <span className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                '⚠️ 申請請假'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
