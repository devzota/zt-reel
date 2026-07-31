import { useState, useEffect } from 'react';
import api from '../services/api';
import { useUIStore } from '../stores/uiStore';

/**
 * ZTTeam Reel Factory — Central page for managing reel rendering.
 * Shows list of all reels with status, progress, and actions.
 */
export default function ReelFactory() {
  const [reels, setReels] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPage, setFilterPage] = useState('');
  const [pages, setPages] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPosting, setIsPosting] = useState<Record<string, boolean>>({});
  const { ztteam_showToast, ztteam_showConfirm } = useUIStore();

  useEffect(() => {
    ztteam_loadReels();
    ztteam_loadPages();
  }, [filterStatus, filterPage, currentPage]);

  /** SSE Live Time Update */
  useEffect(() => {
    const sse = new EventSource(`/api/render/events`);
    sse.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        setReels(prevReels => prevReels.map(r => r.id === payload.id ? { ...r, ...payload } : r));
      } catch (err) {}
    };
    return () => sse.close();
  }, []);

  const ztteam_loadReels = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterPage) params.append('pageId', filterPage);
      params.append('page', String(currentPage));
      params.append('limit', '20');

      const res = await api.get(`render/list?${params.toString()}`);
      setReels(res.data.reels || []);
      setTotal(res.data.total || 0);
    } catch (error: any) {
      ztteam_showToast('Lỗi tải danh sách reel', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const ztteam_loadPages = async () => {
    try {
      const res = await api.get('facebook/pages');
      setPages(res.data || []);
    } catch { /** ignore */ }
  };

  const ztteam_retryReel = async (id: string) => {
    try {
      await api.post(`render/retry/${id}`);
      ztteam_showToast('Đã thêm lại vào hàng đợi render', 'success');
      ztteam_loadReels();
    } catch (error: any) {
      ztteam_showToast(error.response?.data?.message || 'Lỗi retry', 'error');
    }
  };

  const ztteam_deleteReel = async (id: string) => {
    const confirmed = await ztteam_showConfirm('Xác nhận xóa', 'Xóa reel này? Hành động không thể hoàn tác.');
    if (!confirmed) return;
    try {
      await api.post(`render/delete/${id}`);
      ztteam_showToast('Đã xóa reel', 'success');
      ztteam_loadReels();
    } catch (error: any) {
      ztteam_showToast(error.response?.data?.message || 'Lỗi xóa', 'error');
    }
  };

  const ztteam_getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      QUEUED: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Đang chờ' },
      RENDERING: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đang render' },
      COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Hoàn thành' },
      FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Lỗi' },
      POSTED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Đã đăng' },
    };
    const s = map[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    return <span className={`${s.bg} ${s.text} text-xs font-bold px-2.5 py-1 rounded-full`}>{s.label}</span>;
  };

  const ztteam_formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/** Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Reel Factory</h2>
          <p className="text-sm text-gray-500 mt-1">Quản lý dây chuyền render video Reel tự động</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full font-semibold">
            {total} reels
          </span>
        </div>
      </div>

      {/** Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600">Trạng thái:</span>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="bg-gray-100 border-2 border-transparent focus:outline-none focus:ring-0 focus:border-primary rounded-full px-4 py-2 text-sm appearance-none cursor-pointer"
          >
            <option value="">Tất cả</option>
            <option value="QUEUED">Đang chờ</option>
            <option value="RENDERING">Đang render</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="FAILED">Lỗi</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600">Fanpage:</span>
          <select
            value={filterPage}
            onChange={e => { setFilterPage(e.target.value); setCurrentPage(1); }}
            className="bg-gray-100 border-2 border-transparent focus:outline-none focus:ring-0 focus:border-primary rounded-full px-4 py-2 text-sm appearance-none cursor-pointer"
          >
            <option value="">Tất cả</option>
            {pages.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={ztteam_loadReels}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-semibold transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Làm mới
        </button>
      </div>

      {/** Reel List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="glass-card p-12 text-center">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
            <p className="text-gray-500 mt-3">Đang tải...</p>
          </div>
        ) : reels.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-gray-300">movie_filter</span>
            <p className="text-gray-500 mt-3 text-lg font-semibold">Chưa có Reel nào</p>
            <p className="text-gray-400 text-sm mt-1">Hãy vào cấu hình Fanpage để bật tự động tạo Reel, hoặc tạo thủ công từ bài viết.</p>
          </div>
        ) : (
          reels.map(reel => (
            <div key={reel.id} className="glass-card p-5 flex gap-5 items-start">
              {/** Thumbnail */}
              <div className="w-20 h-36 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200">
                {reel.thumbnail_url ? (
                  <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-gray-400">movie</span>
                  </div>
                )}
              </div>

              {/** Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="font-bold text-gray-900 truncate">{reel.wp_post_title || 'Untitled'}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-semibold">{reel.page?.name || 'Unknown Page'}</span>
                      <span className="mx-1.5">•</span>
                      {ztteam_formatDate(reel.created_at)}
                    </p>
                  </div>
                  {ztteam_getStatusBadge(reel.status)}
                </div>

                {/** Progress bar for RENDERING status */}
                {reel.status === 'RENDERING' && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-blue-600 font-semibold mb-1">
                      <span>Đang xử lý...</span>
                      <span>{reel.progress}%</span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${reel.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/** Error log for FAILED */}
                {reel.status === 'FAILED' && reel.error_log && (
                  <div className="mt-2 p-2.5 bg-red-50 rounded-lg text-xs text-red-600 font-mono truncate">
                    {reel.error_log}
                  </div>
                )}

                {/** AI Script preview */}
                {reel.ai_script && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2 italic">"{reel.ai_script}"</p>
                )}

                {/** Actions */}
                <div className="flex gap-2 mt-3">
                  {reel.status === 'POSTED' && reel.fb_post_id && (
                    <a
                      href={`https://www.facebook.com/${reel.page.fb_page_id}/videos/${reel.fb_post_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-full text-[11px] font-bold transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      Xem bài đăng
                    </a>
                  )}

                  {reel.status === 'COMPLETED' && reel.video_url && (
                    <>
                      <a
                        href={reel.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full text-[11px] font-bold transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">play_circle</span>
                        Xem video
                      </a>
                      <button
                        onClick={async () => {
                          if (isPosting[reel.id]) return;
                          try {
                            setIsPosting(prev => ({ ...prev, [reel.id]: true }));
                            await api.post(`render/post/${reel.id}`);
                            ztteam_showToast('Đã đăng bài lên Facebook thành công!', 'success');
                            ztteam_loadReels();
                          } catch (err: any) {
                            ztteam_showToast(err.response?.data?.message || err.response?.data?.error || 'Lỗi đăng bài', 'error');
                          } finally {
                            setIsPosting(prev => ({ ...prev, [reel.id]: false }));
                          }
                        }}
                        disabled={isPosting[reel.id]}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full text-[11px] font-bold transition-colors disabled:opacity-50"
                      >
                        {isPosting[reel.id] ? (
                          <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-[14px]">send</span>
                        )}
                        Đăng ngay
                      </button>
                    </>
                  )}
                  {reel.status === 'FAILED' && (
                    <button
                      onClick={() => ztteam_retryReel(reel.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-full text-xs font-bold transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      Thử lại
                    </button>
                  )}
                  <button
                    onClick={() => ztteam_deleteReel(reel.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-full text-xs font-bold transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/** Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            Trước
          </button>
          <span className="px-4 py-2 text-sm font-semibold text-gray-600">
            Trang {currentPage} / {Math.ceil(total / 20)}
          </span>
          <button
            disabled={currentPage >= Math.ceil(total / 20)}
            onClick={() => setCurrentPage(p => p + 1)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
