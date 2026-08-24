'use client'

import { Activity } from 'lucide-react'

export default function FallbackSlide({ screenName }: { screenName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-black text-white">
      <div className="w-32 h-32 rounded-3xl overflow-hidden mb-8 shadow-2xl shadow-blue-500/20 animate-pulse border border-blue-500/30">
        <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
      </div>
      <h1 className="text-5xl font-bold mb-4 tracking-wider">Thoen Media TV</h1>
      <p className="text-2xl text-gray-400 mb-12">ระบบจอประชาสัมพันธ์โรงพยาบาล</p>
      
      {screenName && (
        <div className="absolute bottom-8 left-8 flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-3 animate-pulse"></div>
          <p className="text-xl text-gray-500 font-medium">จอ: {screenName}</p>
        </div>
      )}
      
      <div className="absolute bottom-8 right-8">
        <p className="text-gray-600 text-lg">รอรับสัญญาณข้อมูล...</p>
      </div>
    </div>
  )
}
