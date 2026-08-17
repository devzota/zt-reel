import React, { useState } from 'react';
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

  const { ztteam_showToast } = useUIStore();

  React.useEffect(() => {
    const savedResult = localStorage.getItem('tiktok_clone_result');
    if (savedResult) {
      try {
        setResult(JSON.parse(savedResult));
      } catch (e) {}
    }
  }, []);

  React.useEffect(() => {
    if (result) {
      localStorage.setItem('tiktok_clone_result', JSON.stringify(result));
    }
  }, [result]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">TikTok Clone</h1>
            <span className="px-3 py-0.5 bg-blue-50 text-primary border border-blue-200/60 text-xs font-bold rounded-full">Voice to Script</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Tải âm thanh từ TikTok, bóc băng tự động và dùng AI viết lại kịch bản mới 100%.</p>
        </div>
      </div>

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
                  Đường dẫn Video TikTok
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
                        ztteam_showToast('Không thể tạo file nghe thử', 'error');
                      }
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center p-0 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-200/60 shadow-sm flex-shrink-0 cursor-pointer"
                    title="Nghe thử giọng này"
                  >
                    <span className="material-symbols-outlined text-xl">volume_up</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-1.5 pl-1">
                  <span>Tốc độ đọc giọng</span>
                  <span className="text-primary font-bold">{voiceSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={voiceSpeed}
                  onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 pl-1">
                  Prompt Tùy Chỉnh (Tùy chọn)
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Để trống để dùng Prompt mặc định. Bạn có thể yêu cầu AI viết theo giọng hài hước, kinh dị..."
                  rows={4}
                  className="w-full rounded-2xl bg-gray-100 border-2 border-transparent px-5 py-3 text-sm text-slate-800 focus:outline-none focus:ring-0 focus:border-primary transition-all font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || isRewriting}
                className="w-full bg-primary text-white py-3 rounded-full font-bold hover:bg-blue-600 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    Đang Tải & Bóc Băng...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">auto_fix_high</span>
                    Tải & Bóc Băng Video
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Result & Render Section */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* Meta Card */}
              {result.tiktok_meta && (
                <div className="glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img src={result.tiktok_meta.cover} alt="Cover" className="w-20 h-20 object-cover rounded-xl shadow-sm border border-slate-200/60" />
                    <div>
                      <h3 className="font-bold text-slate-800 line-clamp-2">{result.tiktok_meta.title}</h3>
                      <p className="text-xs text-emerald-600 mt-2 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Đã tải Audio & Bóc băng tự động thành công
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRewrite}
                    disabled={isRewriting || isLoading}
                    className="bg-amber-500 text-white px-5 py-2.5 text-sm rounded-full font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm flex-shrink-0 cursor-pointer"
                  >
                    {isRewriting ? (
                      <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">autorenew</span>
                    )}
                    Đổi Voice & Viết Lại
                  </button>
                </div>
              )}

              {/* Script Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original Script */}
                <div className="glass-card p-6">
                  <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400">speech_to_text</span>
                    Bản Gốc (Whisper STT)
                  </h3>
                  <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-sm whitespace-pre-wrap max-h-[360px] overflow-y-auto border border-slate-200/60 font-medium">
                    {result.original_text}
                  </div>
                </div>

                {/* AI Rewritten Script */}
                <div className="glass-card p-6 border-2 border-primary/20">
                  <h3 className="font-bold text-primary mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <span className="material-symbols-outlined">edit_note</span>
                    Kịch Bản Mới (AI Rewrite)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Hook Hấp Dẫn</span>
                      <p className="text-slate-800 font-bold text-sm bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">{result.new_script?.hook}</p>
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Caption Bài Đăng</span>
                      <p className="text-slate-600 text-xs italic">{result.new_script?.caption}</p>
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Kịch Bản Lời Đọc (Sub Voice)</span>
                      <div className="bg-amber-50/60 p-4 rounded-xl text-slate-800 text-sm whitespace-pre-wrap max-h-[220px] overflow-y-auto border border-amber-200/60 font-medium">
                        {result.new_script?.sub_voice}
                      </div>
                    </div>

                    {result.audio_url && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Nghe Thử Giọng Đọc AI (TTS)</span>
                        <audio key={Date.now()} controls className="w-full h-10 rounded-full">
                          <source src={`${api.defaults.baseURL?.replace('/api', '')}${result.audio_url}?t=${Date.now()}`} type="audio/mpeg" />
                          Trình duyệt không hỗ trợ Audio.
                        </audio>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Render Section Card */}
              <div className="glass-card p-6 border-2 border-emerald-500/20">
                <h3 className="font-bold text-emerald-600 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined">movie_edit</span>
                  Bước 3: Tải Ảnh Lên & Render Video (Có Phụ Đề)
                </h3>
                
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">cloud_upload</span>
                    <p className="text-slate-700 font-bold">Bấm hoặc Kéo thả ảnh vào đây</p>
                    <p className="text-xs text-slate-400 mt-1">Hỗ trợ JPG, PNG (Khuyên dùng từ 3-6 ảnh)</p>
                  </div>

                  {images.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
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
                        Video Đã Sẵn Sàng!
                      </h4>
                      <video 
                        src={`${api.defaults.baseURL?.replace('/api', '')}${videoUrl}`} 
                        controls 
                        className="w-[270px] h-[480px] rounded-2xl shadow-xl bg-black"
                      />
                      <a 
                        href={`${api.defaults.baseURL?.replace('/api', '')}${videoUrl}`} 
                        download
                        target="_blank"
                        className="mt-6 px-6 py-2.5 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2 shadow-md shadow-emerald-600/20"
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
                    className="w-full mt-4 bg-emerald-600 text-white py-3 rounded-full font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    {isRendering ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">refresh</span>
                        Đang Render Video (Vui lòng chờ 1-2 phút)...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">movie</span>
                        Render Video (Slideshow + Giọng Đọc + Phụ Đề)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-12 flex flex-col items-center justify-center text-center text-slate-400 min-h-[400px]">
              <span className="material-symbols-outlined text-6xl mb-4 text-slate-300">smart_toy</span>
              <p className="font-semibold text-slate-600">Nhập Link TikTok để AI tự động tách giọng nói<br/>và viết lại thành kịch bản mới 100%.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
