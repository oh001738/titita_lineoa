export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-5xl mb-4">🎵</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">音樂補習班 LINE OA 系統</h1>
        <p className="text-gray-500 mb-6">測試環境已就緒</p>
        
        <div className="space-y-4">
          <a 
            href="/liff/bind" 
            className="block w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            開啟 LIFF 綁定頁面 (測試)
          </a>
          
          <div className="p-4 bg-amber-50 rounded-lg text-left">
            <p className="text-xs font-bold text-amber-800 mb-2 uppercase">測試資料 (Mock Mode)</p>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• 家長電話：<code className="bg-amber-100 px-1">0912345678</code></li>
              <li>• 教師電話：<code className="bg-amber-100 px-1">0922333444</code></li>
            </ul>
          </div>
          
          <div className="text-xs text-gray-400">
            Webhook 端點: <br/>
            <code className="bg-gray-100 px-1">/api/line/webhook</code>
          </div>
        </div>
      </div>
    </div>
  );
}
