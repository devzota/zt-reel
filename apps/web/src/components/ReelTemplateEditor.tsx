import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../services/api';
import { useUIStore } from '../stores/uiStore';

/**
 * Build preview HTML from template data — exported so other components
 * (e.g. mini preview cards) can reuse the same rendering logic.
 */
export function ztteam_buildTemplateHtml(data: any): string {
  let html = data.html_content || '';

  html = html.replace(/{{#if colors\.danger}}{{colors\.danger}}{{else}}{{colors\.primary}}{{\/if}}/g, '#ef4444');
  html = html.replace(/{{#if colors\.primary}}{{colors\.primary}}{{else}}#1877f2{{\/if}}/g, '#1877f2');
  
  const videoX = data.layout?.video?.x ?? 0;
  const videoW = data.layout?.video?.w ?? 1080;
  const videoH = data.layout?.video?.h ?? 1080;
  
  html = html.replace(/{{video_area\.x}}/g, String(videoX));
  html = html.replace(/{{video_area\.y}}/g, String(data.video_y || 0));
  html = html.replace(/{{video_area\.w}}/g, String(videoW));
  html = html.replace(/{{video_area\.h}}/g, String(videoH));
  html = html.replace(/{{video_area\.radius}}/g, String(data.video_radius || 0));

  html = html.replace(/position:\s*absolute;\s*left:\s*40px;\s*right:\s*40px;/g, 'position: absolute; left: {{layout.breaking.x}}px; top: {{layout.breaking.y}}px; width: 1000px;');

  const headerX = data.layout?.header?.x !== undefined ? data.layout.header.x : 84;
  const headerY = data.layout?.header?.y !== undefined ? data.layout.header.y : 1362;
  html = html.replace(/{{layout\.header\.x}}/g, String(headerX));
  html = html.replace(/{{layout\.header\.y}}/g, String(headerY));

  const breakingX = data.layout?.breaking?.x !== undefined ? data.layout.breaking.x : 40;
  const breakingY = data.layout?.breaking?.y !== undefined ? data.layout.breaking.y : 26;
  html = html.replace(/{{layout\.breaking\.x}}/g, String(breakingX));
  html = html.replace(/{{layout\.breaking\.y}}/g, String(breakingY));

  const chevronsX = data.layout?.chevrons?.x !== undefined ? data.layout.chevrons.x : 720;
  const chevronsY = data.layout?.chevrons?.y !== undefined ? data.layout.chevrons.y : 1330;
  html = html.replace(/{{layout\.chevrons\.x}}/g, String(chevronsX));
  html = html.replace(/{{layout\.chevrons\.y}}/g, String(chevronsY));

  const hookX = data.layout?.hook?.x !== undefined ? data.layout.hook.x : 90;
  const hookY = data.layout?.hook?.y !== undefined ? data.layout.hook.y : 1450;
  html = html.replace(/{{layout\.hook\.x}}/g, String(hookX));
  html = html.replace(/{{layout\.hook\.y}}/g, String(hookY));

  const verdictX = data.layout?.verdict?.x !== undefined ? data.layout.verdict.x : 90;
  const verdictY = data.layout?.verdict?.y !== undefined ? data.layout.verdict.y : 1700;
  html = html.replace(/{{layout\.verdict\.x}}/g, String(verdictX));
  html = html.replace(/{{layout\.verdict\.y}}/g, String(verdictY));

  const subtitlesX = data.layout?.subtitles?.x !== undefined ? data.layout.subtitles.x : 40;
  const subtitlesY = data.layout?.subtitles?.y !== undefined ? data.layout.subtitles.y : 1550;
  html = html.replace(/{{layout\.subtitles\.x}}/g, String(subtitlesX));
  html = html.replace(/{{layout\.subtitles\.y}}/g, String(subtitlesY));

  html = html.replace(/{{{logoSvg}}}/g, '<div style="background:#ddd;width:100%;height:100%"></div>');
  html = html.replace(/{{fanpageName}}/g, 'Fanpage Demo');

  html = html.replace(/{{#each hook}}<span class="line{{#if @first}} accent{{\/if}}">{{this}}{{#unless @last}}&#32;{{\/unless}}<\/span>{{\/each}}/g, '<span class="line accent">Tin nóng hổi</span> <span class="line">vừa thổi vừa xem</span>');
  html = html.replace(/{{#each hook}}<span>{{this}} <\/span>{{\/each}}/g, '<span>Tin nóng hổi</span> <span>vừa thổi vừa xem</span>');
  /** Handlebars syntax fallback for Breaking News Modern */
  html = html.replace(/{{#each hook}}<span class="line">{{this}}<\/span><br\/>{{\/each}}/g, '<span class="line">Tin nóng hổi</span><br/><span class="line">vừa thổi vừa xem</span>');

  /** Replace news variables for preview */
  html = html.replace(/{{title}}/g, 'Tiêu đề bài viết nổi bật, thu hút sự chú ý của người xem ngay lập tức');
  html = html.replace(/{{excerpt}}/g, 'Đoạn mô tả ngắn gọn về nội dung bài viết, giúp người dùng nắm bắt thông tin cơ bản trước khi click vào xem chi tiết.');
  html = html.replace(/{{site_name}}/g, 'Kênh Tin Tức 24h');

  /** Handle hiding elements */
  if (data.layout?.hide_title) {
    html = html.replace(/class="header"/g, 'class="header" style="display: none !important;"');
    html = html.replace(/class="text-overlay"/g, 'class="text-overlay" style="display: none !important;"');
  }
  if (data.layout?.hide_excerpt) {
    html = html.replace(/class="hook"/g, 'class="hook" style="display: none !important;"');
  }
  const fontFaceImport = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet"><style>@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;600;700;800;900&display=swap');</style>`;
  html = html.replace(/{{{fontFace}}}/g, fontFaceImport);
  
  /** Inject custom colors */
  const headerColor = data.layout?.header_color;
  if (headerColor) {
    html = html.replace(/\.header\s*\.pname\s*{([^}]*?)}/g, `.header .pname { $1 color: ${headerColor} !important; }`);
  }
  const hookColor = data.layout?.hook_color;
  if (hookColor) {
    html = html.replace(/\.hook\s*\.line\s*{([^}]*?)}/g, `.hook .line { $1 color: ${hookColor} !important; }`);
    html = html.replace(/\.hook\s*{([^}]*?)}/g, `.hook { $1 color: ${hookColor} !important; }`);
  }
  
  /** Inject uploaded bg image URL */
  if (data.layout?.bg_image_url && !html.includes('class="bg-img"')) {
    html = html.replace(/<div class="stage">/g, `<div class="stage">\n  <img class="bg-img" src="${data.layout.bg_image_url}" style="position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; z-index: -1;" />`);
  }
  html = html.replace(/{{layout\.bg_image_url}}/g, data.layout?.bg_image_url || '');
  if (!data.layout?.bg_image_url) {
    html = html.replace(/{{#unless layout\.bg_image_url}}display:none;{{\/unless}}/g, 'display:none;');
  } else {
    html = html.replace(/{{#unless layout\.bg_image_url}}display:none;{{\/unless}}/g, '');
  }

  /** Force subtitles to show in preview */
  html = html.replace(/\.subtitles-preview\s*\{([^}]*?)display:\s*none;([^}]*?)\}/g, '.subtitles-preview { $1 display: block; $2 }');

  html = html.replace(/pointer-events:\s*none;/g, 'pointer-events: auto;');
  
  html = html.replace(/html,\s*body\s*{/g, '.stage {');
  html = html.replace(/body\s*{/g, '.stage {');
  html = html.replace(/\*\s*{/g, '.stage * {');
  html = html.replace(/:root\s*{/g, '.stage {');

  /** Add visual styling for video frame in previews */
  html = html.replace(/class="video-frame"/g, 'class="video-frame" style="z-index: 50 !important; box-shadow: inset 0 0 0 2px rgba(24, 119, 242, 0.5) !important; background-color: rgba(24, 119, 242, 0.15) !important;"');

  return html;
}

/**
 * Static mini preview of a template — renders the template HTML
 * at a very small scale inside a fixed-size container.
 */
export function TemplateMiniPreview({ templateData }: { templateData: any }) {
  const ref = useRef<HTMLDivElement>(null);
  const html = useMemo(() => ztteam_buildTemplateHtml(templateData), [
    templateData.html_content, templateData.video_y, templateData.video_radius,
    templateData.layout
  ]);

  useEffect(() => {
    if (ref.current) {
      let shadow = ref.current.shadowRoot;
      if (!shadow) {
        shadow = ref.current.attachShadow({ mode: 'open' });
      }
      shadow.innerHTML = `<div class="stage" style="width: 1080px; height: 1920px; position: relative;">${html}</div>`;
    }
  }, [html]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-800" style={{ width: '108px', height: '192px' }}>
      <div
        ref={ref}
        className="absolute top-0 left-0 template-preview-wrapper"
        style={{ width: '1080px', height: '1920px', transform: 'scale(0.1)', transformOrigin: 'top left', pointerEvents: 'none' }}
      />
    </div>
  );
}

interface ReelTemplateEditorProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  onChange?: (data: any) => void;
  isOverrideMode?: boolean;
}

export default function ReelTemplateEditor({ initialData, onSave, onCancel, onChange, isOverrideMode = false }: ReelTemplateEditorProps) {
  const [formData, setFormData] = useState({
    ...initialData,
    video_y: initialData.video_y || 0,
    video_radius: initialData.video_radius || 0
  });
  const [isSaving, setIsSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { ztteam_showToast } = useUIStore();
  
  const handleUploadBgImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    /** Only upload if it is an actual template, not in override mode */
    /** Wait, in override mode, we should also allow uploading a custom BG for this specific page! */
    /** But our API endpoint is `/templates/:id/upload-bg`. We can just use the template's ID. */
    if (!formData.id) {
      ztteam_showToast('Không tìm thấy ID template', 'error');
      return;
    }

    try {
      setIsUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`templates/${formData.id}/upload-bg`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newUrl = res.data.url;
      setFormData({
        ...formData,
        layout: {
          ...(formData.layout || {}),
          bg_image_url: newUrl
        }
      });
      ztteam_showToast('Tải ảnh nền thành công', 'success');
    } catch (err) {
      ztteam_showToast('Lỗi khi tải ảnh', 'error');
    } finally {
      setIsUploading(false);
      /** Reset input */
      e.target.value = '';
    }
  };
  
  useEffect(() => {
    setFormData(initialData);
  }, [initialData.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newData = { ...formData, [e.target.name]: e.target.type === 'number' ? Number(e.target.value) : e.target.value };
    setFormData(newData);
    if (onChange) onChange(newData);
  };

  
  const handleSaveClick = async () => {
    try {
      setIsSaving(true);
      await onSave(formData);
    } catch (error) {
      ztteam_showToast('Lỗi khi lưu', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const testTTS = async () => {
    try {
      setPlaying(true);
      const res = await api.post('templates/tts/test', {
        voice: formData.voice_id || 'alloy',
        text: 'Đây là bản nghe thử giọng đọc mẫu trên hệ thống của bạn.'
      });
      if (audioRef.current) {
        audioRef.current.src = res.data.url;
        audioRef.current.play();
        audioRef.current.onended = () => setPlaying(false);
      }
    } catch (error: any) {
      setPlaying(false);
      ztteam_showToast(error.response?.data?.message || 'Lỗi phát âm thanh', 'error');
    }
  };

  return (
    <div className="flex w-full gap-8">
      {/* Form Settings */}
      <div className="w-1/2 space-y-6">
        {!isOverrideMode && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 pl-2">Tên template</label>
            <input name="name" value={formData.name || ''} onChange={handleChange} className="w-full bg-gray-100 border-2 border-transparent focus:outline-none focus:ring-0 focus:border-primary rounded-full px-5 py-2.5 transition-colors" />
          </div>
        )}
        
        {formData.format === 'video' && (
          <>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 pl-2">Dạng nội dung</label>
              <select name="content_type" value={formData.content_type || ''} onChange={handleChange} className="w-full bg-gray-100 border-2 border-transparent focus:outline-none focus:ring-0 focus:border-primary rounded-full px-5 py-2.5 transition-colors appearance-none cursor-pointer">
                <option value="myth">3 sự thật (MYTH)</option>
                <option value="benefit">3 lợi ích (BENEFIT)</option>
                <option value="cliffhanger">Tranh cãi (CLIFFHANGER)</option>
                <option value="showdown">Chọn phe (SHOWDOWN)</option>
                <option value="teaser">Tin nóng 5s (TEASER)</option>
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1 pl-2">Giọng đọc riêng của template</label>
                <select name="voice_id" value={formData.voice_id || ''} onChange={handleChange} className="w-full bg-gray-100 border-2 border-transparent focus:outline-none focus:ring-0 focus:border-primary rounded-full px-5 py-2.5 transition-colors appearance-none cursor-pointer">
                  <option value="">(theo Cài đặt chung)</option>
                  <option value="alloy">Alloy (Nam, trung tính)</option>
                  <option value="echo">Echo (Nam, ấm áp)</option>
                  <option value="fable">Fable (Nam, Anh-Anh)</option>
                  <option value="onyx">Onyx (Nam, trầm ấm)</option>
                  <option value="nova">Nova (Nữ, năng động)</option>
                  <option value="shimmer">Shimmer (Nữ, nhẹ nhàng)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  type="button" 
                  onClick={testTTS}
                  disabled={playing}
                  className="mb-1 text-sm bg-blue-50 text-primary hover:bg-blue-100 font-medium flex items-center justify-center gap-2 px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">volume_up</span> 
                  {playing ? 'Đang phát...' : 'Nghe thử'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 pl-2">Bo góc video</label>
                <input type="number" name="video_radius" value={formData.video_radius || 0} onChange={handleChange} className="w-full bg-gray-100 border-2 border-transparent focus:outline-none focus:ring-0 focus:border-primary rounded-full px-5 py-2.5 transition-colors" />
              </div>
            </div>
          </>
        )}

        {formData.format === 'image' && (
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 pl-2">Bo góc ảnh</label>
              <input type="number" name="video_radius" value={formData.video_radius || 0} onChange={handleChange} className="w-full bg-gray-100 border-2 border-transparent focus:outline-none focus:ring-0 focus:border-primary rounded-full px-5 py-2.5 transition-colors" />
            </div>

          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3 pl-2">Hiển thị nội dung</label>
          <div className="flex gap-6 pl-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={!formData.layout?.hide_title} 
                onChange={(e) => {
                  const newData = { ...formData, layout: { ...formData.layout, hide_title: !e.target.checked } };
                  setFormData(newData);
                  if (onChange) onChange(newData);
                }} 
                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
              />
              <span className="text-sm text-slate-700">Hiển thị Tiêu đề</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={!formData.layout?.hide_excerpt} 
                onChange={(e) => {
                  const newData = { ...formData, layout: { ...formData.layout, hide_excerpt: !e.target.checked } };
                  setFormData(newData);
                  if (onChange) onChange(newData);
                }} 
                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
              />
              <span className="text-sm text-slate-700">Hiển thị Mô tả</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3 pl-2">Màu sắc tuỳ chỉnh</label>
          <div className="flex gap-6 pl-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-slate-700">Tên Fanpage</span>
              <input 
                type="color" 
                value={formData.layout?.header_color || '#ffffff'} 
                onChange={(e) => {
                  const newData = { ...formData, layout: { ...formData.layout, header_color: e.target.value } };
                  setFormData(newData);
                  if (onChange) onChange(newData);
                }} 
                className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
              />
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-slate-700">Tiêu đề (Hook)</span>
              <input 
                type="color" 
                value={formData.layout?.hook_color || '#ffffff'} 
                onChange={(e) => {
                  const newData = { ...formData, layout: { ...formData.layout, hook_color: e.target.value } };
                  setFormData(newData);
                  if (onChange) onChange(newData);
                }} 
                className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1 pl-2">Giao diện (Ảnh nền 1080x1920)</label>
          <div className="flex gap-2">
            <input 
              type="file" 
              accept="image/png, image/jpeg"
              onChange={handleUploadBgImage}
              className="hidden" 
              id="bg-upload"
            />
            <label 
              htmlFor="bg-upload"
              className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-5 py-2.5 rounded-full font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-200"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              {isUploading ? 'Đang tải lên...' : 'Tải lên Ảnh nền Template'}
            </label>
            {formData.layout?.bg_image_url && (
              <button 
                type="button"
                onClick={() => {
                  const newLayout = { ...formData.layout };
                  delete newLayout.bg_image_url;
                  setFormData({ ...formData, layout: newLayout });
                }}
                className="w-11 h-11 bg-red-50 text-red-600 rounded-full flex items-center justify-center hover:bg-red-100 flex-shrink-0"
                title="Xoá ảnh nền"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            )}
          </div>
          {formData.layout?.bg_image_url && (
            <p className="text-xs text-emerald-600 mt-2 pl-2">Đã áp dụng ảnh nền tuỳ chỉnh.</p>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex gap-3">
          <button onClick={handleSaveClick} disabled={isSaving} className="bg-primary hover:bg-blue-600 text-white px-8 py-2.5 rounded-full font-semibold shadow-md shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50">
            {isSaving ? <span className="material-symbols-outlined animate-spin text-[18px]">sync</span> : null}
            Lưu
          </button>
          {isOverrideMode && onCancel && (
            <button type="button" onClick={onCancel} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-full font-semibold transition-all">
               Hủy bỏ
            </button>
          )}
          {!isOverrideMode && formData.is_default !== true && (
             <button className="bg-red-50 hover:bg-red-100 text-red-600 px-6 py-2.5 rounded-full font-semibold transition-all">
               Xóa
             </button>
          )}
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />

      {/* Preview Canvas */}
      <div className="w-1/2 flex flex-col items-center">
        <p className="text-sm font-semibold text-slate-500 mb-2">Bố cục (kéo khung trên preview để đặt vị trí)</p>
        <div className="relative border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-gray-100 mx-auto" style={{ width: '270px', height: formData.format === 'image' ? '270px' : '480px', transformOrigin: 'top center' }}>
           {/* We scale 1080x1920 or 1080x1080 to 270x480/270x270 (scale factor 0.25) */}
           <PreviewCanvas formData={formData} setFormData={setFormData} onChange={onChange} />
        </div>
        <p className="text-xs text-slate-400 mt-3 text-center px-4">
          {formData.format === 'image' 
            ? 'Kéo khung để đặt vị trí ảnh minh hoạ. Kéo góc phải bên dưới khung xanh để thay đổi kích thước tự do.'
            : 'Kéo các khung để đặt vị trí từng thành phần. Ô Video chỉ kéo lên/xuống (khoá 16:9 full-width).'
          }
        </p>
      </div>
    </div>
  );
}

function PreviewCanvas({ formData, setFormData, onChange }: { formData: any, setFormData: any, onChange?: (data: any) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  /**
   * Use a ref to always have the latest formData available in event handlers
   * without needing formData in the useEffect dependency array.
   * This prevents the entire DOM from being destroyed/recreated on every drag end.
   */
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  
  /**
   * Build the drag-enabled preview HTML (adds data-drag-id attributes on top of base HTML).
   */
  const buildDragHtml = (data: any): string => {
    let html = ztteam_buildTemplateHtml(data);
    
    /** Add drag IDs to interactive elements */
    html = html.replace(/class="header"/g, 'class="header" data-drag-id="header"');
    html = html.replace(/class="breaking"/g, 'class="breaking" data-drag-id="breaking"');
    html = html.replace(/class="chevrons"/g, 'class="chevrons" data-drag-id="chevrons"');
    html = html.replace(/class="hook"/g, 'class="hook" data-drag-id="hook"');
    html = html.replace(/class="subtitles-preview"/g, 'class="subtitles-preview" data-drag-id="subtitles"');
    
    /** Make video-frame draggable */
    html = html.replace(/class="video-frame"/g, 'class="video-frame" data-drag-id="video"');

    return html;
  };

  /**
   * Attach drag listeners. This runs once on mount and again only when
   * html_content itself changes (template switch), NOT on layout changes.
   */
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    /** Render the drag-enabled HTML into the container */
    const html = buildDragHtml(formData);
    container.innerHTML = html;

    /** Find all draggable elements and set up handlers */
    const setupDrag = () => {
      const draggables = container.querySelectorAll('[data-drag-id]');

      draggables.forEach(el => {
        const element = el as HTMLElement;
        element.style.cursor = 'move';
        element.style.outline = '2px dashed #1877f2';
        element.ondragstart = () => false;

        const id = element.getAttribute('data-drag-id');
        if (id === 'video' && !element.querySelector('.resize-handle')) {
          const handle = document.createElement('div');
          handle.className = 'resize-handle';
          handle.style.position = 'absolute';
          handle.style.right = '-20px';
          handle.style.bottom = '-20px';
          handle.style.width = '40px';
          handle.style.height = '40px';
          handle.style.background = '#1877f2';
          handle.style.border = '4px solid white';
          handle.style.borderRadius = '50%';
          handle.style.cursor = 'nwse-resize';
          handle.style.zIndex = '10000';
          handle.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          
          handle.onmousedown = (e: any) => {
            e.stopPropagation();
            e.preventDefault();
            const startX = e.clientX;
            const startY = e.clientY;
            const currentData = formDataRef.current;
            const initialW = currentData.layout?.video?.w ?? 1080;
            const initialH = currentData.layout?.video?.h ?? 1080;
            
            const onMove = (moveE: any) => {
               const dx = (moveE.clientX - startX) / 0.25;
               const dy = (moveE.clientY - startY) / 0.25;
               element.style.width = `${initialW + dx}px`;
               element.style.height = `${initialH + dy}px`;
            };
            const onUp = (upE: any) => {
               document.removeEventListener('mousemove', onMove);
               document.removeEventListener('mouseup', onUp);
               const dx = (upE.clientX - startX) / 0.25;
               const dy = (upE.clientY - startY) / 0.25;
               setFormData((prev: any) => {
                 const newData = {
                    ...prev,
                    layout: {
                       ...(prev.layout || {}),
                       video: {
                          ...(prev.layout?.video || {}),
                          w: Math.round(initialW + dx),
                          h: Math.round(initialH + dy)
                       }
                    }
                 };
                 if (onChange) setTimeout(() => onChange(newData), 0);
                 return newData;
               });
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          };
          element.appendChild(handle);
        }

        element.onmousedown = (e: MouseEvent) => {
          const id = element.getAttribute('data-drag-id');
          if (!id) return;
          
          e.preventDefault();
          e.stopPropagation();
          
          document.body.style.userSelect = 'none';
          
          const currentData = formDataRef.current;
          const startX = e.clientX;
          const startY = e.clientY;
            const initialLayoutX = id === 'video' ? (currentData.layout?.video?.x ?? 0) : (currentData.layout?.[id]?.x ?? element.offsetLeft);
            const initialLayoutY = id === 'video' ? (currentData.video_y ?? element.offsetTop) : (currentData.layout?.[id]?.y ?? element.offsetTop);
  
            /** Highlight dragging element */
            element.style.outline = '3px solid #1877f2';
            element.style.zIndex = '9999';

          const onMove = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) / 0.25;
            const dy = (moveEvent.clientY - startY) / 0.25;
            element.style.transform = `translate(${dx}px, ${dy}px)`;
          };
    
          const onUp = (upEvent: MouseEvent) => {
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            
            /** Reset visual styles */
            element.style.outline = '2px dashed #1877f2';
            element.style.zIndex = '';
            element.style.transform = '';
            
            const dx = (upEvent.clientX - startX) / 0.25;
            const dy = (upEvent.clientY - startY) / 0.25;
            
            /** Only commit if actually moved */
            if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
            
            setFormData((prev: any) => {
              let newData = prev;
              if (id === 'video') {
                newData = { 
                  ...prev, 
                  video_y: Math.round(initialLayoutY + dy),
                  layout: {
                    ...(prev.layout || {}),
                    video: {
                      ...(prev.layout?.video || {}),
                      w: prev.layout?.video?.w ?? 1080,
                      h: prev.layout?.video?.h ?? 1080,
                      x: Math.round(initialLayoutX + dx)
                    }
                  }
                };
              } else {
                newData = {
                  ...prev,
                  layout: {
                    ...prev.layout,
                    [id]: {
                      x: Math.round(initialLayoutX + dx),
                      y: Math.round(initialLayoutY + dy)
                    }
                  }
                };
              }
              if (onChange) setTimeout(() => onChange(newData), 0);
              return newData;
            });
          };
    
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        };
      });
    };

    setupDrag();

    return () => {
      /** Clean up by nullifying onmousedown handlers */
      const draggables = container.querySelectorAll('[data-drag-id]');
      draggables.forEach(el => {
        (el as HTMLElement).onmousedown = null;
      });
    };
  }, [formData.html_content, formData.layout?.bg_image_url]);

  /**
   * When layout values change (video_y, layout.header, etc.) after drag ends,
   * update the positions of the elements in the DOM directly without re-rendering.
   * This keeps the drag handlers alive and avoids the flash/lag.
   */
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    /** Update video-frame position and size */
    const videoEl = container.querySelector('[data-drag-id="video"]') as HTMLElement;
    if (videoEl) {
      videoEl.style.top = `${formData.video_y || 0}px`;
      videoEl.style.left = `${formData.layout?.video?.x ?? 0}px`;
      videoEl.style.width = `${formData.layout?.video?.w ?? 1080}px`;
      videoEl.style.height = `${formData.layout?.video?.h ?? 1080}px`;
      videoEl.style.borderRadius = `${formData.video_radius || 0}px`;
    }

    /** Update header position */
    const headerEl = container.querySelector('[data-drag-id="header"]') as HTMLElement;
    if (headerEl) {
      headerEl.style.left = `${formData.layout?.header?.x || 0}px`;
      headerEl.style.top = `${formData.layout?.header?.y || 0}px`;
    }

    /** Update breaking position */
    const breakingEl = container.querySelector('[data-drag-id="breaking"]') as HTMLElement;
    if (breakingEl) {
      const bx = formData.layout?.breaking?.x !== undefined ? formData.layout.breaking.x : 40;
      const by = formData.layout?.breaking?.y !== undefined ? formData.layout.breaking.y : 26;
      breakingEl.style.left = `${bx}px`;
      breakingEl.style.top = `${by}px`;
    }

    /** Update hook position */
    const hookEl = container.querySelector('[data-drag-id="hook"]') as HTMLElement;
    if (hookEl) {
      hookEl.style.left = `${formData.layout?.hook?.x || 0}px`;
      hookEl.style.top = `${formData.layout?.hook?.y || 0}px`;
    }

    /** Update chevrons position */
    const chevronsEl = container.querySelector('[data-drag-id="chevrons"]') as HTMLElement;
    if (chevronsEl) {
      const cx = formData.layout?.chevrons?.x !== undefined ? formData.layout.chevrons.x : 720;
      const cy = formData.layout?.chevrons?.y !== undefined ? formData.layout.chevrons.y : 1330;
      chevronsEl.style.left = `${cx}px`;
      chevronsEl.style.top = `${cy}px`;
    }

    /** Update verdict position */
    const verdictEl = container.querySelector('[data-drag-id="verdict"]') as HTMLElement;
    if (verdictEl) {
      verdictEl.style.left = `${formData.layout?.verdict?.x || 0}px`;
      verdictEl.style.top = `${formData.layout?.verdict?.y || 0}px`;
    }

    /** Update subtitles position */
    const subtitlesEl = container.querySelector('[data-drag-id="subtitles"]') as HTMLElement;
    if (subtitlesEl) {
      const sx = formData.layout?.subtitles?.x !== undefined ? formData.layout.subtitles.x : 40;
      const sy = formData.layout?.subtitles?.y !== undefined ? formData.layout.subtitles.y : 1550;
      subtitlesEl.style.left = `${sx}px`;
      subtitlesEl.style.top = `${sy}px`;
    }
  }, [formData.video_y, formData.layout, formData.video_radius]);

  return (
    <div 
      ref={containerRef}
      className="absolute top-0 left-0 template-preview-wrapper"
      style={{ width: '1080px', height: '1920px', transform: 'scale(0.25)', transformOrigin: 'top left' }}
    />
  );
}
