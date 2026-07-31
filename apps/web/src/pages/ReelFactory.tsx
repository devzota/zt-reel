import { useState, useEffect } from 'react';
import api from '../services/api';
import { useUIStore } from '../stores/uiStore';

/**
 * ZTTeam Reel Factory – Central page for managing reel rendering.
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
    return <span className={`${s.bg} ${s.text} text-xs font-bold px-2.5 py-1 rounded-full border border-current shadow-sm`}>{s.label}</span>;
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
          <p className="text-gray-500 text-sm">Quản lý và theo dõi tiến trình tạo hàng loạt Video ngắn tự động.</p>
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
            <option value="">Tất cả</option>
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

      {/** Reel List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="glass-card p-16 text-center">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
            <p className="text-gray-500 mt-4 font-medium">Đang tải dữ liệu...</p>
          </div>
        ) : reels.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300">movie_filter</span>
            <p className="text-gray-500 mt-4 text-xl font-bold">Chưa có Reel nào</p>
            <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">Hãy vào cấu hình Fanpage để bật tự động tạo Reel, hoặc tạo thủ công từ bài viết.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {reels.map(reel => (
              <div key={reel.id} className="glass-card flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Header Information */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">TRẠNG THÁI HỆ THỐNG</span>
                    {ztteam_getStatusBadge(reel.status)}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nguồn bài viết</div>
                    <div className="text-sm font-bold text-gray-900 max-w-[200px] truncate" title={reel.wp_post_title}>{reel.wp_post_title || 'Untitled'}</div>
                  </div>
                </div>

                <div className="flex-1 p-5 flex flex-col md:flex-row gap-6">
                  
                  {/* Left Column: FB Preview */}
                  <div className="flex-1 max-w-sm mx-auto w-full">
                    {(reel.status === 'COMPLETED' || reel.status === 'POSTED') ? (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        {/* FB Post Header */}
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg uppercase shadow-sm">
                              {reel.page?.name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <p className="font-bold text-[15px] text-gray-900 leading-tight">{reel.page?.name || 'Fanpage'}</p>
                              <div className="flex items-center gap-1 text-[12px] text-gray-500 font-medium">
                                <span>{reel.status === 'POSTED' && reel.posted_at ? ztteam_formatDate(reel.posted_at) : reel.status === 'COMPLETED' && reel.scheduled_at ? ztteam_formatDate(reel.scheduled_at) : 'Vừa xong'}</span>
                                <span>•</span>
                                <span className="material-symbols-outlined text-[12px]">public</span>
                              </div>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-gray-400">more_horiz</span>
                        </div>
                        
                        {/* FB Caption */}
                        {reel.final_caption && (
                          <div className="px-4 pb-2 text-[14px] text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                            {reel.final_caption.length > 200 ? (
                              <>{reel.final_caption.substring(0, 200)}... <span className="text-gray-500 font-semibold cursor-pointer">Xem thêm</span></>
                            ) : reel.final_caption}
                          </div>
                        )}
                        
                        {/* FB Media (Reel) */}
                        <div className="relative aspect-[9/16] bg-black overflow-hidden flex items-center justify-center group">
                          {reel.thumbnail_url ? (
                            <img src={reel.thumbnail_url} alt="Reel thumbnail" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <div className="text-gray-600 flex flex-col items-center">
                              <span className="material-symbols-outlined text-5xl mb-2">video_library</span>
                              <span className="text-sm font-medium">Video Preview</span>
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                            <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg cursor-pointer transform group-hover:scale-110 transition-transform">
                              <span className="material-symbols-outlined text-3xl text-gray-900 ml-1">play_arrow</span>
                            </div>
                          </div>
                        </div>

                        {/* FB Actions */}
                        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between text-gray-500">
                          <div className="flex gap-4">
                            <span className="material-symbols-outlined text-[24px]">thumb_up</span>
                            <span className="material-symbols-outlined text-[24px]">chat_bubble_outline</span>
                            <span className="material-symbols-outlined text-[24px]">send</span>
                          </div>
                          <span className="material-symbols-outlined text-[24px]">bookmark_border</span>
                        </div>
                        
                        {/* FB Comments (if enabled) */}
                        {reel.final_comment && (
                          <div className="px-4 py-3 bg-gray-50">
                            <div className="text-xs font-bold text-gray-500 mb-2">Bình luận đầu tiên (Tự động chèn):</div>
                            <div className="flex gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex-shrink-0 flex items-center justify-center text-blue-600 font-bold text-[12px] uppercase">
                                {reel.page?.name?.charAt(0) || 'P'}
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-200/80 rounded-2xl px-3 py-2 text-[13px] text-gray-900 inline-block">
                                  <span className="font-bold block mb-0.5">{reel.page?.name || 'Fanpage'}</span>
                                  <span className="whitespace-pre-wrap break-all">{reel.final_comment}</span>
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1 ml-2 font-medium flex gap-3">
                                  <span>Thích</span>
                                  <span>Phản hồi</span>
                                  <span>Vừa xong</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col justify-center items-center p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                        {reel.status === 'RENDERING' ? (
                          <>
                            <span className="material-symbols-outlined text-5xl text-blue-400 animate-spin mb-4">settings</span>
                            <p className="font-bold text-blue-600 mb-2">Hệ thống đang sản xuất Video</p>
                            <div className="w-full bg-blue-100 rounded-full h-2.5 mt-2">
                              <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${reel.progress}%` }}></div>
                            </div>
                            <p className="text-xs text-blue-500 font-bold mt-2 text-right">{reel.progress}%</p>
                          </>
                        ) : reel.status === 'FAILED' ? (
                          <>
                            <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error</span>
                            <p className="font-bold text-red-600 mb-2">Lỗi kết xuất Video</p>
                            <p className="text-xs text-red-500 text-center font-mono bg-red-50 p-2 rounded w-full overflow-hidden text-ellipsis whitespace-nowrap">{reel.error_log || 'Unknown error'}</p>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-5xl text-amber-400 mb-4">hourglass_empty</span>
                            <p className="font-bold text-amber-600 mb-2">Đang nằm trong hàng đợi</p>
                            <p className="text-xs text-amber-500 text-center">Video sẽ sớm được render theo thứ tự.</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="w-full md:w-48 shrink-0 flex flex-col gap-3 justify-center">
                    {reel.status === 'POSTED' && reel.fb_post_id && (
                      <a
                        href={`https://www.facebook.com/${reel.page.fb_page_id}/videos/${reel.fb_post_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full text-sm font-bold transition-all border border-purple-200 shadow-sm"
                      >
                        <span className="material-symbols-outlined">open_in_new</span>
                        Xem trên Fanpage
                      </a>
                    )}

                    {reel.status === 'COMPLETED' && (
                      <>
                        {reel.video_url && (
                          <a
                            href={reel.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold transition-all border border-emerald-200 shadow-sm"
                          >
                            <span className="material-symbols-outlined">play_circle</span>
                            Tải / Xem MP4
                          </a>
                        )}
                        <button
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
                          disabled={isPosting[reel.id]}
                          className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-blue-700 text-white rounded-full text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                        >
                          {isPosting[reel.id] ? (
                            <span className="material-symbols-outlined animate-spin">sync</span>
                          ) : (
                            <span className="material-symbols-outlined">publish</span>
                          )}
                          Đăng ngay
                        </button>
                      </>
                    )}

                    {(reel.status === 'FAILED' || reel.status === 'COMPLETED') && (
                      <button
                        onClick={() => ztteam_retryReel(reel.id)}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-bold transition-all"
                      >
                        <span className="material-symbols-outlined">refresh</span>
                        Render lại
                      </button>
                    )}

                    <button
                      onClick={() => ztteam_deleteReel(reel.id)}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-full text-sm font-bold transition-all mt-auto"
                    >
                      <span className="material-symbols-outlined">delete</span>
                      Xóa Reel
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex justify-center items-center gap-4 mt-8 glass-card py-4 px-6 mx-auto w-fit">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-700 transition-colors font-bold"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="text-sm font-bold text-gray-700">Trang {currentPage} / {Math.ceil(total / 20)}</span>
            <button
              disabled={currentPage >= Math.ceil(total / 20)}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-700 transition-colors font-bold"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
