const SCHOOL_NAME = process.env.NEXT_PUBLIC_SCHOOL_NAME || '音樂補習班'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-5xl mb-4">🎵</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{SCHOOL_NAME} LINE OA 系統</h1>
        <p className="text-gray-500 mb-6">請透過 LINE 官方帳號使用本系統的功能</p>

        <div className="text-xs text-gray-300">
          <code>/api/line/webhook</code>
        </div>
      </div>
    </div>
  )
}
