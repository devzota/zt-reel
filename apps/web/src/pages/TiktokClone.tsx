import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useUIStore } from '../stores/uiStore';

const VOICES = [
  /** Revid API (CapCut Vietnamese Voices) */
  { id: '3001', label: '🇻🇳 Linh (CapCut Nữ - Truyền cảm, Tự nhiên)' },
  { id: '8001', label: '🇻🇳 Ngọc Huyền (CapCut Nữ - Nhẹ nhàng, Hiện đại)' },

  /** OpenAI TTS (Quốc tế / Tiếng Anh) */
  { id: 'onyx', label: '🌐 Onyx (Nam mạnh mẽ)' },
  { id: 'alloy', label: '🌐 Alloy (Nam/Nữ trung tính)' },
  { id: 'echo', label: '🌐 Echo (Nam trầm ấm)' },
  { id: 'fable', label: '🌐 Fable (Nam Anh quốc)' },
  { id: 'nova', label: '🌐 Nova (Nữ năng động)' },
  { id: 'shimmer', label: '🌐 Shimmer (Nữ nhẹ nhàng)' },
];

export default function TiktokClone() {
  const [activeTab, setActiveTab] = useState<'batch' | 'history'>('batch');

  /** Voice settings */
  const [prompt, setPrompt] = useState('');
  const [voiceId, setVoiceId] = useState('3001');
  const [voiceSpeed, setVoiceSpeed] = useState(1.1);

  /** Batch Mode State */
  const [batchUrlsText, setBatchUrlsText] = useState('');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  /** History State & Search */
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  /** Inline Render State for History / Batch items */
  const [renderingItemMap, setRenderingItemMap] = useState<{ [key: string]: boolean }>({});
  const [itemImagesMap, setItemImagesMap] = useState<{ [key: string]: File[] }>({});

  const { ztteam_showToast } = useUIStore();

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await api.get('/tiktok-clone/history');
      if (res.data?.success) {
        setHistoryList(res.data.data);
      }
    } catch (e: any) {
      ztteam_showToast('Không thể tải lịch sử TikTok Clone', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleBatchProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    const urlsArray = batchUrlsText.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
    if (urlsArray.length === 0) {
      ztteam_showToast('Vui lòng nhập ít nhất 1 link TikTok', 'error');
      return;
    }

    try {
      setIsBatchProcessing(true);
      const res = await api.post('/tiktok-clone/batch-process', {
        urls: urlsArray,
        prompt,
        voice_id: voiceId,
        voice_speed: voiceSpeed,
      });
      if (res.data?.success) {
        setBatchResults(res.data.data || []);
        ztteam_showToast(res.data.message || 'Đã xử lý hàng loạt thành công!', 'success');
        if (activeTab === 'history') fetchHistory();
      }
    } catch (e: any) {
      ztteam_showToast(e.response?.data?.message || 'Có lỗi khi xử lý hàng loạt', 'error');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleItemImageChange = (key: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setItemImagesMap(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), ...newFiles]
    }));
  };

  const removeItemImage = (key: string, index: number) => {
    setItemImagesMap(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== index)
    }));
  };

  const handleRenderVideoForItem = async (key: string, item: any) => {
    const images = itemImagesMap[key] || [];
    if (images.length === 0) {
      ztteam_showToast('Vui lòng chọn ít nhất 1 ảnh để dựng video', 'error');
      return;
    }

    const audioUrl = item.audio_url;
    const subVoice = item.ai_caption || item.new_script?.sub_voice;
    const hookText = item.ai_hook || item.new_script?.hook || '';

    if (!audioUrl || !subVoice) {
      ztteam_showToast('Chưa có giọng đọc AI hoặc kịch bản để dựng video', 'error');
      return;
    }

    try {
      setRenderingItemMap(prev => ({ ...prev, [key]: true }));
      const formData = new FormData();
      formData.append('audio_url', audioUrl);
      formData.append('sub_voice', subVoice);
      formData.append('hook', hookText);
      if (item.id) {
        formData.append('reel_id', item.id);
      }

      images.forEach(img => {
        formData.append('images', img);
      });

      const res = await api.post('/tiktok-clone/render', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const generatedVideoUrl = res.data.data?.video_url;
      ztteam_showToast('Dựng Video thành công!', 'success');

      /** Update local item video URL */
      if (item.id) {
        fetchHistory();
      } else if (key) {
        setBatchResults(prev => prev.map(b => b.url === item.url ? { ...b, video_url: generatedVideoUrl } : b));
      }
    } catch (e: any) {
      ztteam_showToast(e.response?.data?.message || 'Có lỗi xảy ra khi dựng video', 'error');
    } finally {
      setRenderingItemMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const filteredHistory = historyList.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.wp_post_title && item.wp_post_title.toLowerCase().includes(q)) ||
      (item.ai_script && item.ai_script.toLowerCase().includes(q)) ||
      (item.ai_caption && item.ai_caption.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Tab Switcher */}
      <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">TikTok Clone AI</h1>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-bold rounded-full flex items-center gap-1 shadow-sm">
              <span className="material-symbols-outlined text-sm text-amber-500">bolt</span>
              Voice-to-Script AI
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Bóc băng âm thanh TikTok (STT), viết lại kịch bản AI Rewrite và dựng Video MP4 tự động.</p>
        </div>

        {/* Tab Navigation Pill Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-full border border-slate-200/80 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'batch'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">dynamic_feed</span>
            Tạo Hàng Loạt (Batch)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">grid_view</span>
            Lịch Sử Render ({historyList.length})
          </button>
        </div>
      </div>

      {/* TAB 1: BATCH GENERATOR */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">add_link</span>
              Nhập Link TikTok / YouTube Shorts / Reels (Dán 1 hoặc Nhiều Link)
            </h2>

            <form onSubmit={handleBatchProcess} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 pl-1">
                    Giọng Đọc AI (TTS)
                  </label>
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full rounded-full bg-gray-100 border-2 border-transparent px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-0 focus:border-primary font-medium cursor-pointer"
                  >
                    {VOICES.map(v => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 pl-1">
                    Tốc Độ Giọng Đọc: <span className="text-primary font-bold">{voiceSpeed}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.5"
                    step="0.05"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary mt-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 pl-1">
                    System Prompt Tùy Chỉnh (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Viết theo phong cách hài hước, kích thích mua hàng..."
                    className="w-full rounded-full bg-gray-100 border-2 border-transparent px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-0 focus:border-primary font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 pl-1">
                  Danh Sách Link Video (Mỗi link 1 dòng)
                </label>
                <textarea
                  rows={4}
                  required
                  value={batchUrlsText}
                  onChange={(e) => setBatchUrlsText(e.target.value)}
                  placeholder={`https://www.tiktok.com/@user/video/11111111\nhttps://www.tiktok.com/@user/video/22222222\nhttps://www.youtube.com/shorts/33333333`}
                  className="w-full rounded-2xl bg-gray-100 border-2 border-transparent p-4 text-xs text-slate-800 focus:outline-none focus:ring-0 focus:border-primary font-mono leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isBatchProcessing}
                className="w-full py-3.5 bg-primary hover:bg-blue-600 text-white font-bold rounded-full shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
              >
                {isBatchProcessing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                    <span>Đang Bóc Băng & Tạo Giọng Đọc AI...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">bolt</span>
                    <span>Xử Lý Hàng Loạt (Bóc Băng Whisper + AI Rewrite + Tạo Audio)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Batch Results Preview Grid */}
          {batchResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pl-1">
                <span className="material-symbols-outlined text-emerald-600">task_alt</span>
                Kết Quả Xử Lý Hàng Loạt ({batchResults.filter(r => r.success).length}/{batchResults.length} thành công)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {batchResults.map((item, idx) => {
                  const key = `batch_${idx}`;
                  const isRenderingThis = renderingItemMap[key];
                  const itemImages = itemImagesMap[key] || [];

                  return (
                    <div key={idx} className="glass-card overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between p-4 space-y-3">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          {item.cover ? (
                            <img src={item.cover} alt="cover" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200" />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200">
                              <span className="material-symbols-outlined">videocam</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">{item.title || item.url}</p>
                            {item.success ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                Đã tạo audio AI
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 mt-1">
                                <span className="material-symbols-outlined text-xs">error</span>
                                Lỗi: {item.error}
                              </span>
                            )}
                          </div>
                        </div>

                        {item.success && item.audio_url && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                            <p className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs text-primary">graphic_eq</span>
                              Giọng Đọc AI (TTS):
                            </p>
                            <audio src={`${api.defaults.baseURL?.replace('/api', '')}${item.audio_url}`} controls className="h-7 w-full" />
                          </div>
                        )}

                        {item.video_url && (
                          <div className="space-y-2.5">
                            <div className="relative aspect-[9/16] w-full max-w-[260px] mx-auto rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-md">
                              <video src={`${api.defaults.baseURL?.replace('/api', '')}${item.video_url}`} controls className="w-full h-full object-cover" />
                              <div className="absolute top-2.5 right-2.5 bg-emerald-500/90 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1 pointer-events-none">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                9:16 MP4
                              </div>
                            </div>
                            <a
                              href={`${api.defaults.baseURL?.replace('/api', '')}${item.video_url}`}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-full hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-sm">download</span>
                              Tải Video MP4 (9:16)
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Inline Image Selector & Video Renderer */}
                      {item.success && item.audio_url && !item.video_url && (
                        <div className="pt-2 border-t border-slate-100 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-purple-600 text-sm">photo_library</span>
                              Ảnh dựng slideshow:
                            </span>
                            <label className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-full cursor-pointer transition-colors">
                              + Chọn Ảnh
                              <input type="file" multiple accept="image/*" onChange={(e) => handleItemImageChange(key, e.target.files)} className="hidden" />
                            </label>
                          </div>

                          {itemImages.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {itemImages.map((img, i) => (
                                <div key={i} className="relative group w-11 h-11 rounded-lg overflow-hidden border border-slate-200">
                                  <img src={URL.createObjectURL(img)} alt="thumb" className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => removeItemImage(key, i)}
                                    className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-0"
                                  >
                                    <span className="material-symbols-outlined text-xs">delete</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => handleRenderVideoForItem(key, item)}
                            disabled={isRenderingThis || itemImages.length === 0}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {isRenderingThis ? (
                              <>
                                <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                <span>Đang Render...</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-sm">movie</span>
                                <span>Dựng Video ({itemImages.length} ảnh)</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RESPONSIVE GRID HISTORY ARCHIVE */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* History Search & Action Bar */}
          <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tiêu đề hoặc kịch bản..."
                className="w-full rounded-full bg-gray-100 border-2 border-transparent pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-0 focus:border-primary font-medium"
              />
            </div>

            <button
              onClick={fetchHistory}
              disabled={isLoadingHistory}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-full font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer self-end md:self-auto"
            >
              <span className={`material-symbols-outlined text-sm ${isLoadingHistory ? 'animate-spin' : ''}`}>refresh</span>
              Làm mới lịch sử
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-16 text-center text-slate-400 glass-card">
              <span className="material-symbols-outlined animate-spin text-4xl mb-2 text-primary">refresh</span>
              <p className="font-bold text-sm text-slate-700">Đang tải danh sách Lịch Sử TikTok...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-slate-400 glass-card">
              <span className="material-symbols-outlined text-5xl mb-2 text-slate-300">movie_off</span>
              <p className="font-bold text-sm text-slate-700">Không tìm thấy bản ghi TikTok nào</p>
              <p className="text-xs text-slate-500 mt-1">Dán link TikTok ở tab "Tạo Hàng Loạt" để tạo video mới.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredHistory.map(item => {
                const isExpanded = expandedHistoryId === item.id;
                const key = item.id;
                const isRenderingThis = renderingItemMap[key];
                const itemImages = itemImagesMap[key] || [];

                return (
                  <div key={item.id} className="glass-card overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between p-4 space-y-3">
                    <div className="space-y-3">
                      {/* Video Player or Cover Badge */}
                      {item.video_url ? (
                        <div className="relative aspect-[9/16] w-full max-w-[260px] mx-auto rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-md group">
                          <video src={`${api.defaults.baseURL?.replace('/api', '')}${item.video_url}`} controls className="w-full h-full object-cover" />
                          <div className="absolute top-2.5 right-2.5 bg-emerald-500/90 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1 pointer-events-none">
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            9:16 MP4
                          </div>
                        </div>
                      ) : item.thumbnail_url ? (
                        <div className="relative rounded-xl overflow-hidden h-40 border border-slate-200">
                          <img src={item.thumbnail_url} alt="cover" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
                            <p className="text-xs font-bold text-white line-clamp-1">{item.wp_post_title || 'TikTok Video'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="h-28 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-3xl">movie</span>
                        </div>
                      )}

                      {/* Header Title & Date */}
                      <div>
                        <p className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug">{item.wp_post_title || item.wp_post_id}</p>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                          <span>{new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                          {item.wp_post_url && (
                            <a href={item.wp_post_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold flex items-center gap-0.5">
                              Link TikTok <span className="material-symbols-outlined text-xs">open_in_new</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Audio Voice Player */}
                      {item.audio_url && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                          <p className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-primary">graphic_eq</span>
                            Giọng Đọc AI:
                          </p>
                          <audio src={`${api.defaults.baseURL?.replace('/api', '')}${item.audio_url}`} controls className="h-7 w-full" />
                        </div>
                      )}

                      {/* Download Button if MP4 exists */}
                      {item.video_url && (
                        <a
                          href={`${api.defaults.baseURL?.replace('/api', '')}${item.video_url}`}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          Tải Video MP4
                        </a>
                      )}

                      {/* Inline Image Uploader & Render Video Button if MP4 is missing */}
                      {!item.video_url && item.audio_url && (
                        <div className="pt-2 border-t border-slate-100 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-purple-600 text-sm">photo_library</span>
                              Ảnh dựng video MP4:
                            </span>
                            <label className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-full cursor-pointer transition-colors">
                              + Chọn Ảnh
                              <input type="file" multiple accept="image/*" onChange={(e) => handleItemImageChange(key, e.target.files)} className="hidden" />
                            </label>
                          </div>

                          {itemImages.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {itemImages.map((img, i) => (
                                <div key={i} className="relative group w-11 h-11 rounded-lg overflow-hidden border border-slate-200">
                                  <img src={URL.createObjectURL(img)} alt="thumb" className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => removeItemImage(key, i)}
                                    className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-0"
                                  >
                                    <span className="material-symbols-outlined text-xs">delete</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => handleRenderVideoForItem(key, item)}
                            disabled={isRenderingThis || itemImages.length === 0}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {isRenderingThis ? (
                              <>
                                <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                <span>Đang Render MP4...</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-sm">movie</span>
                                <span>Dựng Video ({itemImages.length} ảnh)</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Expandable Script Details */}
                      <button
                        onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                        {isExpanded ? 'Thu gọn kịch bản' : 'Xem Lời Thoại STT & AI Rewrite'}
                      </button>

                      {isExpanded && (
                        <div className="pt-2 space-y-2.5 border-t border-slate-100 text-[11px]">
                          {/* Whisper STT Original */}
                          <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/50">
                            <span className="font-extrabold text-amber-900 block mb-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">record_voice_over</span>
                              Bản Gốc (Whisper STT):
                            </span>
                            <p className="text-slate-800 leading-relaxed font-medium max-h-36 overflow-y-auto pr-1">{item.ai_script || 'Chưa có lời thoại'}</p>
                          </div>

                          {/* AI Rewrite New Script */}
                          <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/50">
                            <span className="font-extrabold text-emerald-900 block mb-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">psychology</span>
                              Kịch Bản Mới (AI Rewrite):
                            </span>
                            {item.ai_hook && (
                              <p className="font-bold text-purple-800 mb-1">HOOK: {item.ai_hook}</p>
                            )}
                            <p className="text-slate-800 leading-relaxed font-medium max-h-36 overflow-y-auto pr-1">{item.ai_caption || 'Chưa có kịch bản mới'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
