import { useState, useEffect } from 'react';
import api from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { ztteam_decodeHtmlEntity } from '../utils/stringUtils';

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
        setReels(prevReels => {
          const exists = prevReels.find(r => r.id === payload.id);
          if (exists) return prevReels.map(r => r.id === payload.id ? { ...r, ...payload } : r);
          return [payload, ...prevReels];
        });
      } catch (err) {}
    };
    return () => sse.close();
  }, []);

  const ztteam_loadReels = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterPage) params.append('fbPageId', filterPage);
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
    const confirmed = await ztteam_showConfirm('Xác nhận xóa', 'Xóa reel này?');
    if (!confirmed) return;
    try {
      await api.post(`render/delete/${id}`);
      ztteam_showToast('Đã xóa reel', 'success');
      ztteam_loadReels();
    } catch (error: any) {
      ztteam_showToast(error.response?.data?.message || 'Lỗi xóa', 'error');
    }
  };

  const ztteam_getStatusIcon = (status: string) => {
    const map: Record<string, { icon: string; color: string; title: string }> = {
      QUEUED: { icon: 'hourglass_empty', color: 'text-amber-500 bg-amber-50', title: 'Đang chờ' },
      RENDERING: { icon: 'settings', color: 'text-blue-500 bg-blue-50 animate-spin', title: 'Đang render' },
      COMPLETED: { icon: 'check_circle', color: 'text-emerald-500 bg-emerald-50', title: 'Hoàn thành' },
      FAILED: { icon: 'error', color: 'text-red-500 bg-red-50', title: 'Lỗi' },
      POSTED: { icon: 'publish', color: 'text-purple-500 bg-purple-50', title: 'Đã đăng' },
    };
    const s = map[status] || { icon: 'help', color: 'text-gray-500 bg-gray-50', title: status };
    return (
      <div title={s.title} className={`w-8 h-8 rounded-full flex items-center justify-center ${s.color}`}>
        <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
      </div>
    );
  };

  const ztteam_formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary">movie_creation</span>
            AI Reel Factory
          </h3>
        </div>
      </div>

      <div className="glass-card p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600">Trạng thái:</span>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="bg-gray-100 border-2 border-transparent focus:outline-none focus:ring-0 focus:border-primary rounded-full px-4 py-2 text-sm appearance-none cursor-pointer font-medium"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="QUEUED">Đang chờ (Queued)</option>
            <option value="RENDERING">Đang render (Rendering)</option>
            <option value="COMPLETED">Hoàn thành (Completed)</option>
            <option value="POSTED">Đã đăng (Posted)</option>
            <option value="FAILED">Lỗi (Failed)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600">Fanpage:</span>
          <select
            value={filterPage}
            onChange={e => { setFilterPage(e.target.value); setCurrentPage(1); }}
            className="bg-gray-100 border-2 border-transparent focus:outline-none focus:ring-0 focus:border-primary rounded-full px-4 py-2 text-sm appearance-none cursor-pointer font-medium"
          >
            <option value="">Tất cả Fanpage</option>
            {pages.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={ztteam_loadReels}
          className="ml-auto flex items-center gap-1.5 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-sm font-bold transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Làm mới
        </button>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="glass-card p-16 text-center">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
          </div>
        ) : reels.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300">movie_filter</span>
            <p className="text-gray-500 mt-4 text-xl font-bold">Chưa có Reel nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {reels.map(reel => (
              <div key={reel.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                {/* Header Card (Action Bar) */}
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {ztteam_getStatusIcon(reel.status)}
                    {reel.wp_post_url && (
                      <a href={reel.wp_post_url} target="_blank" rel="noreferrer" title="Xem bài viết gốc" className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">link</span>
                      </a>
                    )}
                    {reel.status === 'POSTED' && reel.fb_post_id && reel.page?.fb_page_id && (
                      <a href={`https://www.facebook.com/${reel.page.fb_page_id}/videos/${reel.fb_post_id}`} target="_blank" rel="noreferrer" title="Xem bài đã đăng trên Fanpage" className="w-8 h-8 rounded-full bg-purple-100 hover:bg-purple-200 flex items-center justify-center text-purple-700 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      </a>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {reel.video_url === 'DELETED' && (
                      <span className="text-[11px] bg-red-50 text-red-600 px-2 py-1 rounded-md font-medium border border-red-100 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        Đã xóa theo cài đặt
                      </span>
                    )}
                    {reel.status === 'COMPLETED' && reel.video_url && reel.video_url !== 'DELETED' && (
                      <a href={reel.video_url} target="_blank" rel="noreferrer" title="Tải Video" className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                      </a>
                    )}
                    {reel.status === 'COMPLETED' && reel.page && (
                      <button
                        title="Đăng ngay lên Fanpage"
                        disabled={isPosting[reel.id]}
                        onClick={async () => {
                          const confirmed = await ztteam_showConfirm('Đăng ngay', 'Bạn muốn đăng video này lên Fanpage ngay bây giờ?');
                          if (!confirmed) return;
                          try {
                            setIsPosting(prev => ({ ...prev, [reel.id]: true }));
                            await api.post(`render/post/${reel.id}`);
                            ztteam_showToast('Đã đăng thành công', 'success');
                            ztteam_loadReels();
                          } catch (error: any) {
                            ztteam_showToast(error.response?.data?.message || 'Lỗi đăng bài', 'error');
                          } finally {
                            setIsPosting(prev => ({ ...prev, [reel.id]: false }));
                          }
                        }}
                        className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isPosting[reel.id] ? <span className="material-symbols-outlined text-[18px] animate-spin">sync</span> : <span className="material-symbols-outlined text-[18px]">publish</span>}
                      </button>
                    )}
                    {(reel.status === 'FAILED' || reel.status === 'COMPLETED') && (
                      <button title="Render lại Video" onClick={() => ztteam_retryReel(reel.id)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                      </button>
                    )}
                    <button title="Xóa" onClick={() => ztteam_deleteReel(reel.id)} className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>

                <div className="px-3 py-2 flex items-center gap-2.5">
                  <div className="w-9 h-9 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm overflow-hidden shadow-sm border border-gray-100">
                    {reel.page?.avatar ? (
                      <img src={reel.page.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      reel.page?.name?.charAt(0) || 'P'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[13px] text-gray-900 leading-tight" title={ztteam_decodeHtmlEntity(reel.wp_post_title) || 'Reel'}>
                      {ztteam_decodeHtmlEntity(reel.wp_post_title) || 'Reel AI'}
                    </p>
                    <p className="font-semibold text-[11px] text-gray-500 leading-tight truncate mt-0.5">
                      {reel.page ? reel.page.name : <span className="text-red-500">[Fanpage đã gỡ]</span>}
                    </p>
                    <div className="text-[10px] text-gray-500 flex flex-col mt-0.5 leading-tight">
                      <span className="truncate">Tạo: {ztteam_formatDate(reel.created_at)}</span>
                      <span className={`font-semibold truncate ${reel.status === 'POSTED' ? 'text-emerald-600' : (reel.scheduled_at ? 'text-primary' : 'text-amber-600')}`}>
                        {reel.status === 'POSTED' ? 'Đã đăng: ' : (reel.scheduled_at ? 'Tiếp theo: ' : '')} 
                        {reel.status === 'POSTED' && reel.posted_at ? ztteam_formatDate(reel.posted_at) : (reel.scheduled_at ? ztteam_formatDate(reel.scheduled_at) : 'Chưa cấu hình')}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* FB Caption */}
                {reel.final_caption ? (
                  <div className="px-3 pb-2 text-[12px] text-gray-800 whitespace-pre-wrap break-words leading-relaxed overflow-y-auto max-h-32 custom-scrollbar">
                    {reel.final_caption}
                  </div>
                ) : reel.ai_script ? (
                  <div className="px-3 pb-2 text-[12px] text-gray-500 italic whitespace-pre-wrap break-words">
                    Script: {reel.ai_script}
                  </div>
                ) : null}
                
                {/* FB Video Preview (Thumb) */}
                <div className="mt-auto relative aspect-[4/5] bg-black flex items-center justify-center border-y border-gray-100 overflow-hidden group">
                  {reel.status === 'RENDERING' ? (
                    <div className="flex flex-col items-center justify-center p-4">
                      <span className="material-symbols-outlined text-4xl text-blue-400 animate-spin mb-2">settings</span>
                      <div className="w-32 bg-gray-700 rounded-full h-1.5 mt-2">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${reel.progress}%` }}></div>
                      </div>
                      <p className="text-[10px] text-blue-400 font-bold mt-1">{reel.progress}%</p>
                    </div>
                  ) : reel.status === 'FAILED' ? (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <span className="material-symbols-outlined text-4xl text-red-500 mb-1">error</span>
                      <p className="text-[10px] text-red-400 line-clamp-3 px-2">{reel.error_log}</p>
                    </div>
                  ) : (
                    <>
                      {reel.thumbnail_url ? (
                        <img 
                          src={reel.thumbnail_url} 
                          alt="Reel thumb" 
                          className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent && !parent.querySelector('.broken-icon')) {
                               parent.insertAdjacentHTML('afterbegin', '<span class="material-symbols-outlined text-4xl text-gray-500 broken-icon">broken_image</span>');
                            }
                          }}
                        />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-gray-600">movie</span>
                      )}
                      {(reel.status === 'COMPLETED' || reel.status === 'POSTED') && (
                        reel.video_url !== 'DELETED' ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors cursor-pointer">
                            <a href={reel.video_url} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                              <span className="material-symbols-outlined text-primary text-2xl ml-1">play_arrow</span>
                            </a>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-2 text-center pointer-events-none">
                            <span className="material-symbols-outlined text-2xl mb-1 text-red-400">broken_image</span>
                            <span className="text-xs font-bold">Video đã bị xóa</span>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
                
                {/* FB Comment Preview */}
                {reel.final_comment && (
                  <div className="px-3 py-2 bg-gray-50 flex gap-2">
                    <div className="w-6 h-6 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-[10px] uppercase overflow-hidden border border-gray-200">
                      {reel.page?.avatar ? (
                        <img src={reel.page.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        reel.page?.name?.charAt(0) || 'P'
                      )}
                    </div>
                    <div className="bg-gray-200/60 rounded-2xl px-2.5 py-1.5 text-[11px] text-gray-800 flex-1">
                      <span className="font-bold block mb-0.5 truncate max-w-[150px]">{reel.page?.name || 'Fanpage'}</span>
                      <span className="whitespace-pre-wrap break-all line-clamp-3 leading-snug">{reel.final_comment}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex justify-center items-center gap-4 mt-8 glass-card py-3 px-5 mx-auto w-fit">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-slate-100 transition-colors font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="text-sm font-bold text-gray-700">Trang {currentPage} / {Math.ceil(total / 20)}</span>
            <button
              disabled={currentPage >= Math.ceil(total / 20)}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-slate-100 transition-colors font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
