import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useZTTeamFacebookStore } from '../stores/facebookStore';

export default function YoutubeSources() {
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { ztteam_showToast, ztteam_showConfirm } = useUIStore();
  const { pages, ztteam_fetchPagesFromDB } = useZTTeamFacebookStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTestRenderModalOpen, setIsTestRenderModalOpen] = useState(false);
  const [testRenderUrl, setTestRenderUrl] = useState('');
  
  const [formData, setFormData] = useState({ id: '', name: '', source_type: 'CHANNEL', url: '' });

  const fetchSources = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/youtube-sources');
      setSources(res.data?.data || []);
    } catch (e: any) {
      ztteam_showToast('Lỗi tải danh sách nguồn YouTube', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
    ztteam_fetchPagesFromDB();
  }, []);

  const openModal = (source?: any) => {
    if (source) {
      setFormData({ id: source.id, name: source.name, source_type: source.source_type, url: source.url });
    } else {
      setFormData({ id: '', name: '', source_type: 'CHANNEL', url: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/youtube-sources/${formData.id}`, formData);
        ztteam_showToast('Cập nhật thành công', 'success');
      } else {
        await api.post('/youtube-sources', formData);
        ztteam_showToast('Thêm mới thành công', 'success');
      }
      setIsModalOpen(false);
      fetchSources();
    } catch (e: any) {
      ztteam_showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (await ztteam_showConfirm('Xác nhận', 'Bạn có chắc chắn xóa nguồn này?')) {
      try {
        await api.delete(`/youtube-sources/${id}`);
        ztteam_showToast('Xóa thành công', 'success');
        fetchSources();
      } catch (e: any) {
        ztteam_showToast('Có lỗi xảy ra khi xóa', 'error');
      }
    }
  };

  const handleTestCrawl = async () => {
    try {
      setIsLoading(true);
      const res = await api.post('/youtube-sources/test-crawl');
      ztteam_showToast(res.data.message || 'Đã gửi lệnh Crawler', 'success');
    } catch (e: any) {
      ztteam_showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTestRenderModal = () => {
    if (pages.length === 0) {
      ztteam_showToast('Vui lòng thêm Fanpage trước khi test', 'error');
      return;
    }
    setTestRenderUrl('');
    setIsTestRenderModalOpen(true);
  };

  const handleSubmitTestRender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pages.length === 0) return;
    
    /** Mặc định lấy Fanpage đầu tiên */
    const pageId = pages[0].id; 

    if (!testRenderUrl) {
      ztteam_showToast('Vui lòng nhập đường dẫn', 'error');
      return;
    }

    try {
      setIsTestRenderModalOpen(false);
      setIsLoading(true);
      const res = await api.post('/youtube-sources/test-render-url', {
        pageId: pageId,
        url: testRenderUrl
      });
      if (res.data.success) {
        ztteam_showToast(res.data.message || 'Đã thêm vào hàng đợi', 'success');
      } else {
        ztteam_showToast(res.data.message || 'Có lỗi xảy ra', 'error');
      }
    } catch (e: any) {
      ztteam_showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    const confirmed = await ztteam_showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử và video YouTube đang chờ xử lý (lỗi)?');
    if (!confirmed) return;
    try {
      setIsLoading(true);
      const res = await api.post('/youtube-sources/clear-history');
      ztteam_showToast(res.data.message || 'Đã dọn dẹp sạch sẽ', 'success');
      fetchSources();
    } catch (e: any) {
      ztteam_showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[28px] text-red-500">public</span>
            Nguồn Mạng Xã Hội
          </h2>
          <p className="text-slate-500 text-sm mt-1">Quản lý các Kênh và Link để tải tự động (Hỗ trợ YouTube...)</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleOpenTestRenderModal} className="px-5 py-2.5 bg-blue-50 text-blue-600 font-bold rounded-full hover:bg-blue-100 transition-colors flex items-center gap-2 shadow-sm border border-blue-200" title="Test Render 1 URL">
            <span className="material-symbols-outlined text-[20px]">play_circle</span>
            Tạo Từ Link
          </button>
          <button onClick={handleClearHistory} className="px-5 py-2.5 bg-red-50 text-red-600 font-bold rounded-full hover:bg-red-100 transition-colors flex items-center gap-2 shadow-sm border border-red-200" title="Xóa lịch sử & Reel kẹt">
            <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
            Dọn Dẹp
          </button>
          <button onClick={handleTestCrawl} className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-full hover:bg-amber-600 transition-colors flex items-center gap-2 shadow-md">
            <span className="material-symbols-outlined text-[20px]">bolt</span>
            Chạy Crawler (Test)
          </button>
          <button onClick={fetchSources} className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center justify-center" title="Làm mới">
            <span className={`material-symbols-outlined text-[20px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
          <button onClick={() => openModal()} className="px-5 py-2.5 bg-primary text-white font-bold rounded-full hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-md">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Thêm Nguồn Mới
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span></div>
        ) : sources.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <span className="material-symbols-outlined text-[48px] text-slate-300 mb-3 mx-auto block">video_library</span>
            <p className="font-medium text-lg text-slate-700">Chưa có Nguồn YouTube nào</p>
            <p className="text-sm mt-1 mb-4">Hãy thêm một Kênh hoặc danh sách Link để bắt đầu quét tự động.</p>
            <button onClick={() => openModal()} className="mt-2 bg-primary text-white px-6 py-3 rounded-full font-bold hover:bg-blue-600 transition-colors shadow-md inline-flex items-center gap-2 mx-auto">
              <span className="material-symbols-outlined text-[20px]">add</span>
              Thêm nguồn đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase w-1/4">Tên Nguồn</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase w-32">Loại</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase">URL / Links</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sources.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-800">{s.name}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.source_type === 'CHANNEL' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {s.source_type === 'CHANNEL' ? <span className="material-symbols-outlined text-[14px]">smart_display</span> : <span className="material-symbols-outlined text-[14px]">link</span>}
                        {s.source_type}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="max-w-md truncate text-slate-600 text-sm" title={s.url}>
                        {s.url}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button 
                        onClick={() => openModal(s)}
                        className="w-10 h-10 rounded-full inline-flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        title="Sửa"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(s.id)}
                        className="w-10 h-10 rounded-full inline-flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        title="Xóa"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{formData.id ? 'Sửa Nguồn YouTube' : 'Thêm Nguồn Mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên Gợi Nhớ (Ví dụ: Kênh Hài Kịch)</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-full bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white px-4 py-2.5 outline-none transition-colors" placeholder="Nhập tên nguồn..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại Nguồn</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="source_type" checked={formData.source_type === 'CHANNEL'} onChange={() => setFormData({ ...formData, source_type: 'CHANNEL', url: '' })} className="text-primary focus:ring-primary h-4 w-4" />
                    <span className="text-sm font-medium text-slate-700">Kênh (Channel)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="source_type" checked={formData.source_type === 'LINKS'} onChange={() => setFormData({ ...formData, source_type: 'LINKS', url: '' })} className="text-primary focus:ring-primary h-4 w-4" />
                    <span className="text-sm font-medium text-slate-700">Danh sách Link (Links)</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {formData.source_type === 'CHANNEL' ? 'Đường dẫn Kênh (vd: https://youtube.com/@xxx)' : 'Danh sách link Shorts (mỗi link 1 dòng hoặc cách nhau bằng dấu phẩy)'}
                </label>
                {formData.source_type === 'CHANNEL' ? (
                  <input required type="text" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} className="w-full rounded-full bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white px-4 py-2.5 outline-none transition-colors" placeholder="https://youtube.com/@..." />
                ) : (
                  <textarea required value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} className="w-full rounded-xl bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white px-4 py-3 outline-none transition-colors h-32 resize-none" placeholder="https://www.youtube.com/shorts/xxx&#10;https://www.youtube.com/shorts/yyy" />
                )}
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-full font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">Hủy</button>
                <button type="submit" className="px-5 py-2.5 rounded-full font-medium bg-primary text-white hover:bg-blue-600 transition-colors shadow-md">
                  {formData.id ? 'Lưu Thay Đổi' : 'Thêm Nguồn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTestRenderModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">Tạo Video Từ Link</h3>
              <button onClick={() => setIsTestRenderModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmitTestRender} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Đường dẫn Video/Shorts</label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-3 rounded-full bg-slate-100 border-2 border-transparent focus:bg-white focus:border-primary focus:ring-0 transition-all text-slate-700 font-medium"
                  placeholder="https://youtube..."
                  value={testRenderUrl}
                  onChange={(e) => setTestRenderUrl(e.target.value)}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsTestRenderModalOpen(false)} className="flex-1 px-6 py-3 bg-red-50 text-red-600 font-bold rounded-full hover:bg-red-100 transition-colors">
                  Hủy
                </button>
                <button type="submit" className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-full hover:bg-blue-600 transition-colors shadow-md shadow-primary/20">
                  Tạo Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
