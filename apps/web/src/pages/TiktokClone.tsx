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

  /** History State */
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
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

      // Update local item video URL
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">TikTok Clone AI</h1>
            <span className="px-3 py-0.5 bg-blue-50 text-primary border border-blue-200/60 text-xs font-bold rounded-full">Voice to Script</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Bóc băng âm thanh TikTok, viết lại kịch bản 100% bằng AI và render video mới ngầm không đơ web.</p>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-full border border-slate-200/60 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'batch' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-sm">dynamic_feed</span>
            Tạo Hàng Loạt (1 hoặc Nhiều Link)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-sm">history</span>
            Lịch Sử Render (Video & Kịch Bản)
          </button>
        </div>
      </div>

      {/* TAB 1: BATCH MULTI-LINKS MODE */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">dynamic_feed</span>
              Nhập Danh Sách Link TikTok / Shorts / Reels (Dán 1 hoặc Nhiều Link)
            </h2>

            <form onSubmit={handleBatchProcess} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 pl-1">
                    Giọng Đọc AI (TTS)
                  </label>
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full rounded-full bg-gray-100 border-2 border-transparent px-5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-0 focus:border-primary transition-all font-medium cursor-pointer"
                  >
                    {VOICES.map(v => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 pl-1">
                    Tốc Độ Giọng Đọc: <span className="text-primary font-bold">{voiceSpeed}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.5"
                    step="0.05"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary mt-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 pl-1">
                  Yêu Cầu Tùy Chỉnh AI Rewrite (System Prompt - Tùy chọn)
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ví dụ: Viết lại kịch bản theo phong cách hài hước, kích thích mua hàng..."
                  className="w-full rounded-full bg-gray-100 border-2 border-transparent px-5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-0 focus:border-primary transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 pl-1">
                  Danh Sách Link Video (Mỗi link 1 dòng - Có thể dán 1 link hoặc 100 link cùng lúc)
                </label>
                <textarea
                  rows={4}
                  required
                  value={batchUrlsText}
                  onChange={(e) => setBatchUrlsText(e.target.value)}
                  placeholder={`https://www.tiktok.com/@user/video/11111111\nhttps://www.tiktok.com/@user/video/22222222\nhttps://www.youtube.com/shorts/33333333`}
                  className="w-full rounded-2xl bg-gray-100 border-2 border-transparent p-4 text-sm text-slate-800 focus:outline-none focus:ring-0 focus:border-primary transition-all font-mono leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isBatchProcessing}
                className="w-full py-3 bg-primary hover:bg-blue-700 text-white font-bold rounded-full shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isBatchProcessing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                    <span>Đang Bóc Băng & Viết Lại Kịch Bản AI Ngầm (Vui lòng chờ)...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">bolt</span>
                    <span>Xử Lý Hàng Loạt Ngầm (Bóc Băng + AI Rewrite + Tạo Audio)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Batch Results View */}
          {batchResults.length > 0 && (
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">task_alt</span>
                Kết Quả Xử Lý Hàng Loạt ({batchResults.filter(r => r.success).length}/{batchResults.length} thành công)
              </h3>

              <div className="space-y-4">
                {batchResults.map((item, idx) => {
                  const key = `batch_${idx}`;
                  const isRenderingThis = renderingItemMap[key];
                  const itemImages = itemImagesMap[key] || [];

                  return (
                    <div key={idx} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {item.cover ? (
                            <img src={item.cover} alt="cover" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200/60" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                              <span className="material-symbols-outlined">videocam</span>
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-sm text-slate-900 line-clamp-1">{item.title || item.url}</p>
                            {item.success ? (
                              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                Đã tạo kịch bản & Giọng đọc AI
                              </p>
                            ) : (
                              <p className="text-xs text-red-600 font-semibold flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-xs">error</span>
                                Lỗi: {item.error}
                              </p>
                            )}
                          </div>
                        </div>

                        {item.success && item.audio_url && (
                          <div className="flex items-center gap-2">
                            <audio src={`${api.defaults.baseURL?.replace('/api', '')}${item.audio_url}`} controls className="h-8 max-w-[180px]" />
                          </div>
                        )}
                      </div>

                      {/* Video Output Preview if Rendered */}
                      {item.video_url && (
                        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <video src={`${api.defaults.baseURL?.replace('/api', '')}${item.video_url}`} controls className="h-32 w-auto rounded-lg shadow-sm" />
                            <div>
                              <p className="text-xs font-bold text-slate-800">Video MP4 Hoàn Chỉnh</p>
                              <p className="text-[11px] text-slate-500">Đã ghép ảnh + Giọng đọc AI + Subtitles</p>
                            </div>
                          </div>
                          <a
                            href={`${api.defaults.baseURL?.replace('/api', '')}${item.video_url}`}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-full hover:opacity-90 transition-opacity flex items-center gap-1.5 self-start sm:self-auto"
                          >
                            <span className="material-symbols-outlined text-sm">download</span>
                            Tải Video MP4
                          </a>
                        </div>
                      )}

                      {/* Inline Image Uploader & Video Render for Batch Item */}
                      {item.success && item.audio_url && !item.video_url && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-purple-600 text-sm">movie_filter</span>
                              Chọn Ảnh để dựng Video Slideshow:
                            </span>
                            <label className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-full cursor-pointer transition-colors">
                              + Chọn Ảnh
                              <input type="file" multiple accept="image/*" onChange={(e) => handleItemImageChange(key, e.target.files)} className="hidden" />
                            </label>
                          </div>

                          {itemImages.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {itemImages.map((img, i) => (
                                <div key={i} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-200">
                                  <img src={URL.createObjectURL(img)} alt="thumb" className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => removeItemImage(key, i)}
                                    className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-0"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => handleRenderVideoForItem(key, item)}
                            disabled={isRenderingThis || itemImages.length === 0}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-full shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            {isRenderingThis ? (
                              <>
                                <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                <span>Đang Render Video...</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-sm">movie</span>
                                <span>Dựng Video MP4 ({itemImages.length} ảnh đã chọn)</span>
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

      {/* TAB 2: HISTORY ARCHIVE & STT */}
      {activeTab === 'history' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                Lịch Sử Render TikTok (Video, Audio & Kịch Bản STT)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Lưu trữ 100% Video MP4 đã dựng, Giọng Đọc AI, Whisper STT và Kịch Bản AI Rewrite.</p>
            </div>
            <button
              onClick={fetchHistory}
              disabled={isLoadingHistory}
              className="px-3.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-full font-bold text-xs flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-sm ${isLoadingHistory ? 'animate-spin' : ''}`}>refresh</span>
              Làm mới
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-slate-400">
              <span className="material-symbols-outlined animate-spin text-3xl mb-2">refresh</span>
              <p className="font-bold text-sm">Đang tải lịch sử...</p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">folder_off</span>
              <p className="font-bold text-sm text-slate-700">Chưa có lịch sử TikTok Clone nào</p>
              <p className="text-xs text-slate-500 mt-1">Dán link TikTok ở tab "Tạo Hàng Loạt" để tạo video và lưu lịch sử.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyList.map(item => {
                const isExpanded = expandedHistoryId === item.id;
                const key = item.id;
                const isRenderingThis = renderingItemMap[key];
                const itemImages = itemImagesMap[key] || [];

                return (
                  <div key={item.id} className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-4 transition-all shadow-sm space-y-3">
                    {/* Header Item */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt="cover" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200/60" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined">movie</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{item.wp_post_title || item.wp_post_id}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span>Tạo lúc: {new Date(item.created_at).toLocaleString('vi-VN')}</span>
                            {item.wp_post_url && (
                              <a href={item.wp_post_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                                Link Gốc <span className="material-symbols-outlined text-xs">open_in_new</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {item.audio_url && (
                          <audio src={`${api.defaults.baseURL?.replace('/api', '')}${item.audio_url}`} controls className="h-8 max-w-[160px]" />
                        )}
                        <button
                          onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                          className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-full font-bold text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                          {isExpanded ? 'Thu Gọn' : 'Xem Kịch Bản & Video'}
                        </button>
                      </div>
                    </div>

                    {/* Final Rendered Video Player if exists */}
                    {item.video_url && (
                      <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <video src={`${api.defaults.baseURL?.replace('/api', '')}${item.video_url}`} controls className="h-36 w-auto rounded-xl shadow-md border border-slate-200" />
                          <div>
                            <p className="text-xs font-extrabold text-slate-800">🎬 Video MP4 Chính Đã Render</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Đã hoàn tất ghép Slideshow + Giọng đọc AI + Subtitles</p>
                          </div>
                        </div>
                        <a
                          href={`${api.defaults.baseURL?.replace('/api', '')}${item.video_url}`}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-full hover:opacity-90 transition-opacity flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          Tải Video MP4
                        </a>
                      </div>
                    )}

                    {/* Inline Image Uploader & Video Render for History Item if video_url missing */}
                    {!item.video_url && item.audio_url && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <span className="material-symbols-outlined text-purple-600 text-sm">movie_filter</span>
                            Dựng Video MP4 cho bản ghi này (Chọn Ảnh):
                          </span>
                          <label className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-full cursor-pointer transition-colors">
                            + Chọn Ảnh
                            <input type="file" multiple accept="image/*" onChange={(e) => handleItemImageChange(key, e.target.files)} className="hidden" />
                          </label>
                        </div>

                        {itemImages.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {itemImages.map((img, i) => (
                              <div key={i} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-200">
                                <img src={URL.createObjectURL(img)} alt="thumb" className="w-full h-full object-cover" />
                                <button
                                  onClick={() => removeItemImage(key, i)}
                                  className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-0"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => handleRenderVideoForItem(key, item)}
                          disabled={isRenderingThis || itemImages.length === 0}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-full shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isRenderingThis ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                              <span>Đang Render Video MP4...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">movie</span>
                              <span>Dựng Video MP4 ({itemImages.length} ảnh đã chọn)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Column 1: Whisper STT Original */}
                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                          <span className="font-extrabold text-amber-800 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">record_voice_over</span>
                            Bản Gốc Lời Thoại (Whisper STT):
                          </span>
                          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{item.ai_script || 'Chưa có dữ liệu lời thoại gốc'}</p>
                        </div>

                        {/* Column 2: AI Rewrite New Script */}
                        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                          <span className="font-extrabold text-emerald-800 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">psychology</span>
                            Kịch Bản Mới AI Rewrite:
                          </span>
                          {item.ai_hook && (
                            <p className="font-bold text-purple-800 mb-1">HOOK: {item.ai_hook}</p>
                          )}
                          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{item.ai_caption || 'Chưa có dữ liệu kịch bản mới'}</p>
                        </div>
                      </div>
                    )}
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
