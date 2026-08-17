import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useUIStore } from '../stores/uiStore';

export default function SystemSettingsPage() {
  const { ztteam_showToast } = useUIStore();
  const [settings, setSettings] = useState({
    openai_api_key: '',
    deepseek_api_key: '',
    gemini_api_key: '',
    active_ai_provider: 'openai',
    remotion_license: '',
    max_concurrent_jobs: '2',
    video_retention_days: '7',
    telegram_bot_token: '',
    telegram_chat_id: '',
    youtube_cookies: ''
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

  const handleTestTelegram = async () => {
    if (!settings.telegram_bot_token || !settings.telegram_chat_id) {
      ztteam_showToast('Vui lòng nhập Token và Chat ID trước khi Test', 'error');
      return;
    }
    try {
      const res = await api.post('telegram/test', {
        token: settings.telegram_bot_token,
        chatId: settings.telegram_chat_id
      });
      if (res.data.success) {
        ztteam_showToast('Đã gửi tin nhắn test thành công! Hãy kiểm tra Telegram.', 'success');
      } else {
        ztteam_showToast(`Lỗi: ${res.data.message}`, 'error');
      }
    } catch (e: any) {
      ztteam_showToast('Lỗi kết nối API Test', 'error');
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
        <h3 className="text-lg font-bold text-gray-900 border-b border-slate-100 pb-2 mb-4">Cấu hình AI Tạo Kịch Bản</h3>
        
        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-sm font-bold text-gray-700 mb-2">AI Xử Lý Chính</label>
          <select 
            name="active_ai_provider"
            value={settings.active_ai_provider || 'openai'} 
            onChange={handleChange as any}
            className="w-full bg-white border-2 border-slate-200 focus:border-primary rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 focus:ring-0 outline-none"
          >
            <option value="openai">OpenAI (GPT-4o-mini)</option>
            <option value="deepseek">Deepseek (deepseek-chat)</option>
            <option value="gemini">Google Gemini (gemini-1.5-flash)</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">Chọn hệ thống AI sẽ được sử dụng để tự động sinh nội dung video.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">OpenAI API Key</label>
            <input 
              type="password" 
              name="openai_api_key"
              value={settings.openai_api_key} 
              onChange={handleChange}
              className={`w-full bg-slate-50 border-2 focus:border-primary rounded-xl px-4 py-2 text-sm focus:ring-0 outline-none transition-colors ${settings.active_ai_provider === 'openai' ? 'border-primary/50 bg-blue-50/30' : 'border-transparent'}`}
              placeholder="sk-..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Deepseek API Key</label>
            <input 
              type="password" 
              name="deepseek_api_key"
              value={settings.deepseek_api_key} 
              onChange={handleChange}
              className={`w-full bg-slate-50 border-2 focus:border-primary rounded-xl px-4 py-2 text-sm focus:ring-0 outline-none transition-colors ${settings.active_ai_provider === 'deepseek' ? 'border-primary/50 bg-blue-50/30' : 'border-transparent'}`}
              placeholder="sk-..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Google Gemini API Key</label>
            <input 
              type="password" 
              name="gemini_api_key"
              value={settings.gemini_api_key} 
              onChange={handleChange}
              className={`w-full bg-slate-50 border-2 focus:border-primary rounded-xl px-4 py-2 text-sm focus:ring-0 outline-none transition-colors ${settings.active_ai_provider === 'gemini' ? 'border-primary/50 bg-blue-50/30' : 'border-transparent'}`}
              placeholder="AIza..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Revid API Key (Giọng Đọc Linh / CapCut)</label>
            <input 
              type="password" 
              name="revid_api_key"
              value={(settings as any).revid_api_key || ''} 
              onChange={handleChange}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-primary rounded-xl px-4 py-2 text-sm focus:ring-0 outline-none transition-colors"
              placeholder="sk_Ci024Gx0..."
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 border-b border-slate-100 pb-2 mb-4">Kết nối Dịch vụ Báo chí</h3>
        <div className="space-y-4">
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

      <div className="glass-card p-6 border-l-4 border-l-blue-500">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
          <h3 className="text-lg font-bold text-gray-900">Thông báo qua Telegram (Tùy chọn)</h3>
          <button 
            onClick={handleTestTelegram}
            className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-bold rounded-full transition-colors"
          >
            Gửi tin nhắn Test
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Hệ thống sẽ tự động nhắn tin cho bạn nếu có bất kỳ tác vụ nào (Render/Auto Đăng/Crawl) bị lỗi.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Bot Token</label>
            <input 
              type="password" 
              name="telegram_bot_token"
              value={settings.telegram_bot_token || ''} 
              onChange={handleChange}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl px-4 py-2 text-sm focus:ring-0 outline-none"
              placeholder="Ví dụ: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Chat ID (hoặc Group ID)</label>
            <input 
              type="text" 
              name="telegram_chat_id"
              value={settings.telegram_chat_id || ''} 
              onChange={handleChange}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl px-4 py-2 text-sm focus:ring-0 outline-none"
              placeholder="Ví dụ: 123456789 hoặc -100123456789"
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500">cookie</span>
          Cấu hình YouTube Cookies (Bypass Bot VPS 100%)
        </h3>
        <p className="text-xs text-slate-600 mb-3 leading-relaxed">
          YouTube bắt xác minh Bot (Sign in to confirm you are not a bot) khi gọi API từ IP VPS. Dán nội dung <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono text-[11px]">cookies.txt</code> vào ô dưới đây để hệ thống tự động xác thực danh tính và tải video mượt 100%.
        </p>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mb-4 text-xs space-y-1 text-amber-900">
          <p className="font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">lightbulb</span>
            Hướng dẫn lấy cookies.txt cực nhanh trong 3 bước:
          </p>
          <ol className="list-decimal pl-5 space-y-0.5">
            <li>Cài tiện ích mở rộng Chrome/Edge: <a href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc" target="_blank" rel="noreferrer" className="font-bold underline text-blue-600">Get cookies.txt LOCALLY</a>.</li>
            <li>Truy cập <a href="https://www.youtube.com" target="_blank" rel="noreferrer" className="font-bold underline text-blue-600">youtube.com</a> ➔ Click vào biểu tượng Tiện ích vừa cài ➔ Chọn Copy/Export Cookies.</li>
            <li>Dán toàn bộ văn bản vừa copy vào ô dưới đây và bấm <strong>Lưu cài đặt</strong>.</li>
          </ol>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung văn bản Cookies (Netscape format / cookies.txt)</label>
          <textarea
            name="youtube_cookies"
            rows={5}
            value={settings.youtube_cookies || ''}
            onChange={handleChange as any}
            className="w-full bg-slate-50 border-2 border-transparent focus:border-amber-500 rounded-xl p-3 text-xs font-mono focus:ring-0 outline-none text-slate-800"
            placeholder={"# Netscape HTTP Cookie File\n.youtube.com TRUE / FALSE 1786968000 VISITOR_INFO1_LIVE xxx\n.youtube.com TRUE / FALSE 1786968000 LOGIN_INFO xxx"}
          />
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
