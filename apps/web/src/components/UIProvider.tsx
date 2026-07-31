import React from 'react';
import { useUIStore } from '../stores/uiStore';

export default function UIProvider() {
  const { toasts, confirmState, ztteam_removeToast } = useUIStore();

  return (
    <>
      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-full shadow-lg min-w-[320px] max-w-[420px] animate-[slideIn_0.3s_ease-out] backdrop-blur-md
              ${toast.type === 'success' ? 'bg-emerald-50/95 text-emerald-700 border border-emerald-200' :
                toast.type === 'error' ? 'bg-red-50/95 text-red-700 border border-red-200' :
                'bg-white/95 text-gray-700 border border-slate-200'}`}
          >
            <span className="material-symbols-outlined shrink-0 text-[20px]" data-icon={toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}>
              {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
            </span>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => ztteam_removeToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]" data-icon="close">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[28px]" data-icon="warning">warning</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmState.title}</h3>
              {confirmState.message && <p className="text-sm text-gray-500">{confirmState.message}</p>}
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={confirmState.onCancel}
                className="px-6 py-2.5 rounded-full text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmState.onConfirm}
                className="px-6 py-2.5 rounded-full text-sm font-bold bg-red-600 text-white hover:bg-red-700 shadow-sm transition-all"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
