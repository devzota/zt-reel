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
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'history'>('single');

  /** Single Mode State */
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [voiceId, setVoiceId] = useState('3001');
  const [voiceSpeed, setVoiceSpeed] = useState(1.1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  /** Render State */
  const [images, setImages] = useState<File[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  /** Batch Mode State */
  const [batchUrlsText, setBatchUrlsText] = useState('');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  /** History State */
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const { ztteam_showToast } = useUIStore();

  useEffect(() => {
    const savedResult = localStorage.getItem('tiktok_clone_result');
    if (savedResult) {
      try {
        setResult(JSON.parse(savedResult));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (result) {
      localStorage.setItem('tiktok_clone_result', JSON.stringify(result));
    }
  }, [result]);

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

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    try {
      setIsLoading(true);
      const res = await api.post('/tiktok-clone/process', {
        url,
        prompt,
        voice_id: voiceId,
        voice_speed: voiceSpeed,
      });
      setResult(res.data.data);
      ztteam_showToast('Xử lý thành công!', 'success');
    } catch (e: any) {
      ztteam_showToast(e.response?.data?.message || 'Có lỗi xảy ra khi xử lý link', 'error');
    } finally {
      setIsLoading(false);
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
      }
    } catch (e: any) {
      ztteam_showToast(e.response?.data?.message || 'Có lỗi khi xử lý hàng loạt', 'error');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleRewrite = async () => {
    if (!result?.original_text) return;

    try {
      setIsRewriting(true);
      const res = await api.post('/tiktok-clone/rewrite', {
        original_text: result.original_text,
        prompt,
        voice_id: voiceId,
        voice_speed: voiceSpeed,
      });
      setResult({
        ...result,
        new_script: res.data.data.new_script,
        audio_url: res.data.data.audio_url,
      });
      ztteam_showToast('Đã tạo lại kịch bản mới!', 'success');
    } catch (e: any) {
      ztteam_showToast(e.response?.data?.message || 'Có lỗi xảy ra khi tạo lại', 'error');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleRender = async () => {
    if (!result?.audio_url || !result?.new_script?.sub_voice) {
      ztteam_showToast('Chưa có kịch bản và giọng đọc AI', 'error');
      return;
    }
    if (images.length === 0) {
      ztteam_showToast('Vui lòng chọn ít nhất 1 ảnh', 'error');
      return;
    }

    try {
      setIsRendering(true);
      const formData = new FormData();
      formData.append('audio_url', result.audio_url);
      formData.append('sub_voice', result.new_script.sub_voice);
      formData.append('hook', result.new_script.hook || '');
      
      images.forEach(img => {
        formData.append('images', img);
      });

      const res = await api.post('/tiktok-clone/render', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVideoUrl(res.data.data.video_url);
      ztteam_showToast('Render Video thành công!', 'success');
    } catch (e: any) {
      ztteam_showToast(e.response?.data?.message || 'Có lỗi xảy ra khi render', 'error');
    } finally {
      setIsRendering(false);
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
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'single' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-sm">link</span>
            Xử Lý 1 Link
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'batch' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-sm">dynamic_feed</span>
            Tạo Hàng Loạt
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-sm">history</span>
            Lịch Sử Render
          </button>
        </div>
      </div>

      {/* TAB 1: SINGLE LINK MODE */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tune</span>
                Cấu Hình Bóc Băng
              </h2>

              <form onSubmit={handleProcess} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 pl-1">
                    Đường dẫn Video TikTok / Shorts / Reels
                  </label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@user/video/..."
                    className="w-full rounded-full bg-gray-100 border-2 border-transparent px-5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-0 focus:border-primary transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 pl-1">
                    Giọng Đọc AI (TTS)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={voiceId}
                      onChange={(e) => setVoiceId(e.target.value)}
                      className="flex-1 rounded-full bg-gray-100 border-2 border-transparent px-5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-0 focus:border-primary transition-all font-medium cursor-pointer appearance-none"
                    >
                      {VOICES.map(v => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await api.post('/templates/tts/test', {
                            voice: voiceId,
                            text: 'Xin chào, đây là bản nghe thử giọng đọc AI.'
                          });
                          if (res.data?.url) {
                            const audio = new Audio(res.data.url);
                            audio.playbackRate = voiceSpeed;
                            audio.play();
                          }
                        } catch (e) {
                          ztteam_showToast('Không thể test giọng đọc này', 'error');
                        }
                      }}
                      className="px-3 py-2.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                      title="Nghe thử giọng đọc"
                    >
                      <span className="material-symbols-outlined text-sm">volume_up</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 pl-1 pr-1">
                    <label className="text-sm font-semibold text-slate-700">
                      Tốc Độ Đọc (Voice Speed)
                    </label>
                    <span className="text-xs font-bold text-primary bg-blue-50 px-2 py-0.5 rounded-full">{voiceSpeed}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.5"
                    step="0.05"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 pl-1">
                    Custom Prompt (Định hướng viết lại)
                  </label>
                  <textarea
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ví dụ: Đổi xưng hô sang Mình/Các bạn, văn phong hài hước, kích thích tò mò..."
                    className="w-full rounded-2xl bg-gray-100 border-2 border-transparent p-4 text-sm text-slate-800 focus:outline-none focus:ring-0 focus:border-primary transition-all font-medium resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary text-white py-3 rounded-full font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                      Đang Tải & Bóc Băng...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">auto_fix_high</span>
                      Bóc Băng & Viết Lại Kịch Bản
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Result Details & Render */}
          <div className="lg:col-span-2 space-y-6">
            {result ? (
              <>
                {/* Step 1: Original STT Text */}
                <div className="glass-card p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">record_voice_over</span>
                    Lịch Sử Lời Thoại Gốc (Whisper STT Bóc Tách)
                  </h3>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 max-h-48 overflow-y-auto">
                    <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{result.original_text}</p>
                  </div>
                </div>

                {/* Step 2: AI Rewritten Script */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-500">psychology</span>
                      Kịch Bản Mới Biến Tấu AI Rewrite
                    </h3>
                    <button
                      onClick={handleRewrite}
                      disabled={isRewriting}
                      className="px-3.5 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-full font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className={`material-symbols-outlined text-sm ${isRewriting ? 'animate-spin' : ''}`}>refresh</span>
                      Viết Lại Bản Khác
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Hook Badge */}
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                      <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider block mb-1">CÂU TIÊU ĐỀ HOOK (Hiển thị đầu video):</span>
                      <p className="text-sm font-bold text-purple-900">{result.new_script?.hook}</p>
                    </div>

                    {/* Full Voice Script */}
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1 pl-1">LỜI THOẠI ĐỌC (Voice Sub):</span>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                        <p className="text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">{result.new_script?.sub_voice}</p>
                      </div>
                    </div>

                    {/* Audio Preview */}
                    {result.audio_url && (
                      <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-primary text-2xl">graphic_eq</span>
                          <div>
                            <p className="text-xs font-bold text-slate-800">File Giọng Đọc AI Đã Tạo</p>
                            <p className="text-[11px] text-slate-500">Sẵn sàng dùng để ghép video</p>
                          </div>
                        </div>
                        <audio src={`${api.defaults.baseURL?.replace('/api', '')}${result.audio_url}`} controls className="h-8 max-w-[200px]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Video Rendering Section */}
                <div className="glass-card p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-600">movie_filter</span>
                    Tải Ảnh & Dựng Video Slideshow + Subtitles
                  </h3>

                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">cloud_upload</span>
                      <p className="text-slate-700 font-bold text-sm">Bấm hoặc Kéo thả ảnh vào đây</p>
                      <p className="text-xs text-slate-400 mt-0.5">Khuyên dùng từ 3-6 ảnh 9:16 dọc</p>
                    </div>

                    {images.length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                        {images.map((img, idx) => (
                          <div key={idx} className="relative aspect-[9/16] bg-slate-100 rounded-xl overflow-hidden group shadow-sm border border-slate-200/60">
                            <img src={URL.createObjectURL(img)} alt={`img-${idx}`} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {videoUrl && (
                      <div className="mt-6 p-6 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex flex-col items-center">
                        <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                          Video Đã Render Thành Công!
                        </h4>
                        <video 
                          src={`${api.defaults.baseURL?.replace('/api', '')}${videoUrl}`} 
                          controls 
                          className="w-[240px] h-[426px] rounded-2xl shadow-xl bg-black"
                        />
                        <a 
                          href={`${api.defaults.baseURL?.replace('/api', '')}${videoUrl}`} 
                          download
                          target="_blank"
                          className="mt-4 px-6 py-2.5 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2 shadow-md shadow-emerald-600/20"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          Tải Video Xuống
                        </a>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleRender}
                      disabled={isRendering || images.length === 0}
                      className="w-full mt-2 bg-emerald-600 text-white py-3 rounded-full font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      {isRendering ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">refresh</span>
                          Đang Dựng Video Ngầm (Vui lòng chờ)...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">movie</span>
                          Render Video (Slideshow + Subtitles + Voice)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center text-slate-400 min-h-[400px]">
                <span className="material-symbols-outlined text-6xl mb-4 text-slate-300">smart_toy</span>
                <p className="font-semibold text-slate-600">Dán Link TikTok ở bên trái để AI tự động bóc băng lời thoại<br/>và chuyển đổi sang kịch bản hoàn toàn mới.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BATCH MULTI-LINKS MODE */}
      {activeTab === 'batch' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">dynamic_feed</span>
                Nhập Danh Sách Link TikTok Hàng Loạt
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Dán nhiều link (mỗi link 1 dòng). Hệ thống sẽ bóc băng Whisper STT và tạo kịch bản mới ngầm không làm chậm web.</p>
            </div>
          </div>

          <form onSubmit={handleBatchProcess} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 pl-1">
                Danh Sách Links (TikTok / Shorts / Reels) - Mỗi link 1 dòng
              </label>
              <textarea
                rows={6}
                required
                value={batchUrlsText}
                onChange={(e) => setBatchUrlsText(e.target.value)}
                placeholder="https://www.tiktok.com/@user/video/11111&#10;https://www.tiktok.com/@user/video/22222&#10;https://www.youtube.com/shorts/33333"
                className="w-full rounded-2xl bg-gray-100 border-2 border-transparent p-4 text-sm text-slate-800 focus:outline-none focus:ring-0 focus:border-primary transition-all font-medium font-mono"
              />
            </div>

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
                  Custom Prompt Chi Phối AI
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ví dụ: Đổi xưng hô sang Mình/Các bạn..."
                  className="w-full rounded-full bg-gray-100 border-2 border-transparent px-5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-0 focus:border-primary transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isBatchProcessing}
              className="w-full bg-primary text-white py-3.5 rounded-full font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {isBatchProcessing ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  Đang Xử Lý Hàng Loạt Ngầm (Vui lòng chờ)...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">bolt</span>
                  Bắt Đầu Xử Lý Hàng Loạt
                </>
              )}
            </button>
          </form>

          {/* Batch Results Overview */}
          {batchResults.length > 0 && (
            <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">task_alt</span>
                Kết Quả Xử Lý Hàng Loạt ({batchResults.filter(r => r.success).length}/{batchResults.length} Thành công)
              </h3>

              <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden">
                {batchResults.map((item, idx) => (
                  <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                            Đã tạo kịch bản & giọng đọc AI thành công
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
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORY ARCHIVE & STT */}
      {activeTab === 'history' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                Lịch Sử Render TikTok (Whisper STT & AI Rewrite Archive)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Lưu trữ 100% lời thoại gốc bóc băng Whisper STT, Kịch bản AI Rewrite và file Giọng Đọc AI.</p>
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
              <p className="text-xs text-slate-500 mt-1">Dán link TikTok ở tab "Xử Lý 1 Link" hoặc "Tạo Hàng Loạt" để lưu lịch sử.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyList.map(item => {
                const isExpanded = expandedHistoryId === item.id;
                return (
                  <div key={item.id} className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-4 transition-all shadow-sm">
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
                          {isExpanded ? 'Thu Gọn' : 'Xem Kịch Bản'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded History Details */}
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
