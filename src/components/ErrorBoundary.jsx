import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled application error in ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100/80 p-6 select-none">
          <div className="max-w-lg w-full bg-white border border-rose-200/80 rounded-3xl p-8 shadow-xl shadow-slate-200/60 text-center">
            <div className="w-16 h-16 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center justify-center mx-auto mb-5 text-rose-600 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-2">
              เกิดข้อผิดพลาดในการแสดงผล
            </h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              ขออภัย ระบบพบข้อผิดพลาดที่ไม่คาดคิด กรุณาลองรีเฟรชหน้าใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบหากปัญหายังคงอยู่
            </p>

            {this.state.error && (
              <div className="mb-6 text-left bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-auto max-h-40 border border-slate-800">
                <p className="text-rose-400 font-semibold mb-1">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-slate-400 text-[11px] whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                รีเฟรชหน้าใหม่ (Reload)
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-all active:scale-95 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                หน้าหลัก (Home)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
