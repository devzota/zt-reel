import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, CheckCircle2, Loader2, History, ExternalLink, PlayCircle } from 'lucide-react';
import api from '../services/api';
import { useUIStore } from '../stores/uiStore';

interface YoutubeMetadata {
  id: string;
  title: string;
  duration: number;
  width: number;
  height: number;
}

interface DownloadResult {
  filePath: string;
  url: string;
  metadata: YoutubeMetadata;
  downloadedAt?: string;
}

export default function YoutubeTest() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('Đang khởi tạo...');
  
  const { ztteam_showToast, ztteam_showConfirm } = useUIStore();
  
  /** History state */
  const [history, setHistory] = useState<DownloadResult[]>(() => {
    const saved = localStorage.getItem('yt_download_history');
    return saved ? JSON.parse(saved) : [];
  });

  /** Save history to local storage whenever it changes */
  useEffect(() => {
    localStorage.setItem('yt_download_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      let step = 0;
      const texts = [
        'Đang phân tích URL...',
        'Đang tìm kiếm luồng Video (H.264) tốt nhất...',
        'Đang tìm kiếm luồng Audio (AAC)...',
        'Đang tải xuống dữ liệu (có thể mất 1-2 phút)...',
        'Đang dùng FFmpeg để ghép nối và đóng gói MP4...',
        'Đang gọi FFprobe để xác minh codec...'
      ];
      setLoadingText(texts[0]);
      interval = setInterval(() => {
        step = Math.min(step + 1, texts.length - 1);
        setLoadingText(texts[step]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post('/media/youtube-test', { url: url.trim() });
      if (response.data.success) {
        const newResult = {
          ...response.data.data,
          downloadedAt: new Date().toISOString()
        };
        setResult(newResult);
        setHistory(prev => [newResult, ...prev]);
        setUrl('');
        ztteam_showToast('Tải video thành công!', 'success');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Lỗi không xác định khi tải video';
      setError(errorMsg);
      ztteam_showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    const confirmed = await ztteam_showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử tải video không?');
    if (confirmed) {
      setHistory([]);
      ztteam_showToast('Đã xóa lịch sử tải', 'success');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Kiểm thử tải Video Đa Nền Tảng</h2>
          <p className="text-slate-500 text-sm mt-1">Công cụ tải thử nghiệm để kiểm tra Codec và Định dạng (Hỗ trợ YouTube Shorts)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột chính: Tải & Kết quả */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <form onSubmit={handleDownload} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-1">
                  Đường dẫn Video (YouTube Shorts)
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Ví dụ: https://www.youtube.com/shorts/xxxxx"
                    className="flex-1 rounded-full bg-gray-100 border-2 border-transparent px-4 py-2.5 focus:outline-none focus:border-primary transition-colors text-slate-800"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={!url.trim() || loading}
                    className="bg-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Tải Video
                      </>
                    )}
                  </button>
                </div>
                
                {loading && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 animate-pulse">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <p className="text-sm font-medium text-slate-700">{loadingText}</p>
                    </div>
                    {/* Sửa lỗi thanh progress tràn ra ngoài bằng overflow-hidden */}
                    <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary h-1.5 rounded-full w-1/2 origin-left animate-[progress_1.5s_ease-in-out_infinite]" />
                    </div>
                  </div>
                )}
              </div>
            </form>

            {error && (
              <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">Lỗi tải video</h4>
                  <p className="text-sm mt-1 opacity-90">{error}</p>
                </div>
              </div>
            )}

            {result && (
              <div className="mt-6 glass-card border border-slate-200/60 overflow-hidden">
                <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-slate-800">Tải video thành công</h4>
                </div>
                
                <div className="p-5 flex flex-col md:flex-row gap-6">
                  {/* Cột thông tin */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tiêu đề</p>
                        <p className="font-semibold text-slate-800 leading-snug">{result.metadata.title}</p>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Video ID</p>
                          <p className="font-medium text-slate-700 text-sm">{result.metadata.id}</p>
                        </div>
                        <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Thời lượng</p>
                          <p className="font-medium text-slate-700 text-sm">{result.metadata.duration}s</p>
                        </div>
                        <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Kích thước</p>
                          <p className="font-medium text-slate-700 text-sm">{result.metadata.width}x{result.metadata.height}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Đường dẫn cục bộ</p>
                        <div className="bg-slate-100 text-slate-600 p-2.5 rounded-lg text-xs break-all font-mono border border-slate-200">
                          {result.filePath}
                        </div>
                      </div>
                    </div>
                    
                    <a 
                      href={api.defaults.baseURL?.replace('/api', '') + result.url} 
                      download 
                      target="_blank"
                      className="inline-flex items-center gap-2 bg-slate-800 text-white px-5 py-2 rounded-full font-medium hover:bg-slate-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Lưu file
                    </a>
                  </div>
                  
                  {/* Cột Video Preview */}
                  <div className="w-[200px] flex-shrink-0 mx-auto">
                    <div className="aspect-[9/16] bg-slate-900 rounded-xl overflow-hidden shadow-md">
                      <video 
                        src={api.defaults.baseURL?.replace('/api', '') + result.url} 
                        controls 
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cột Sidebar: Lịch sử */}
        <div className="lg:col-span-1">
          <div className="glass-card p-0 flex flex-col h-full max-h-[800px]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-2 text-slate-800">
                <History className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold">Lịch sử tải ({history.length})</h3>
              </div>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded-md transition-colors"
                >
                  Xóa
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-sm">Chưa có lịch sử tải video</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item, index) => (
                    <div key={index} className="p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group">
                      <div className="flex gap-3">
                        <div className="w-12 h-16 bg-slate-200 rounded-lg shrink-0 overflow-hidden relative shadow-inner">
                          <video src={api.defaults.baseURL?.replace('/api', '') + item.url} className="w-full h-full object-cover opacity-80" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayCircle className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate" title={item.metadata.title}>
                            {item.metadata.title || `Video ${item.metadata.id}`}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{item.metadata.id}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <a 
                              href={api.defaults.baseURL?.replace('/api', '') + item.url} 
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Mở
                            </a>
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.downloadedAt || '').toLocaleTimeString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Thêm style cho animation progress */}
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); width: 50%; }
          100% { transform: translateX(200%); width: 50%; }
        }
      `}</style>
    </div>
  );
}
