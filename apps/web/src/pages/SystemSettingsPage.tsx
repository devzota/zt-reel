import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useUIStore } from '../stores/uiStore';

export default function SystemSettingsPage() {
  const { ztteam_showToast } = useUIStore();
  const [settings, setSettings] = useState({
    openai_api_key: '',
    remotion_license: '',
    max_concurrent_jobs: '2',
    video_retention_days: '7'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('settings');
        setSettings(prev => ({ ...prev, ...res.data }));
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.put('settings', settings);
      ztteam_showToast('Đã lưu cấu hình thành công!', 'success');
    } catch (e) {
      ztteam_showToast('Lỗi khi lưu cấu hình', 'error');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (isLoading) return <div className="p-8">Đang tải...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cài đặt Hệ thống</h2>
          <p className="text-sm text-gray-500 mt-1">Quản lý các thông số cốt lõi và API Keys</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="px-6 py-2 bg-primary text-white font-bold rounded-full hover:bg-blue-600 disabled:opacity-50"
        >
          {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 border-b border-slate-100 pb-2 mb-4">Kết nối API bên thứ 3</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">OpenAI API Key</label>
            <input 
              type="password" 
              name="openai_api_key"
              value={settings.openai_api_key} 
              onChange={handleChange}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-primary rounded-xl px-4 py-2 text-sm focus:ring-0 outline-none"
              placeholder="sk-..."
            />
            <p className="text-xs text-gray-500 mt-1">Dùng để tạo kịch bản tự động cho Reels.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Remotion License Key</label>
            <input 
              type="password" 
              name="remotion_license"
              value={settings.remotion_license} 
              onChange={handleChange}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-primary rounded-xl px-4 py-2 text-sm focus:ring-0 outline-none"
              placeholder="Nhập license key để xóa watermark..."
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 border-b border-slate-100 pb-2 mb-4">Tài nguyên Server</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Số luồng Render tối đa (Concurrent Jobs)</label>
            <input 
              type="number" 
              name="max_concurrent_jobs"
              value={settings.max_concurrent_jobs} 
              onChange={handleChange}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-primary rounded-xl px-4 py-2 text-sm focus:ring-0 outline-none"
              min="1" max="10"
            />
            <p className="text-xs text-gray-500 mt-1">Giới hạn số lượng video render cùng lúc để tránh quá tải.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Thời gian lưu file MP4 (ngày)</label>
            <input 
              type="number" 
              name="video_retention_days"
              value={settings.video_retention_days} 
              onChange={handleChange}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-primary rounded-xl px-4 py-2 text-sm focus:ring-0 outline-none"
              min="1" max="30"
            />
            <p className="text-xs text-gray-500 mt-1">Hệ thống sẽ tự động xóa file mp4 cũ để giải phóng ổ cứng.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
