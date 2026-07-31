import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useWordpressStore } from '../stores/wordpressStore';
import { useUIStore } from '../stores/uiStore';
import ReelTemplateEditor, { TemplateMiniPreview } from '../components/ReelTemplateEditor';

export default function FacebookPageSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ztteam_showToast, ztteam_showConfirm } = useUIStore();
  const { sites, ztteam_fetchSites, ztteam_fetchCategories, ztteam_fetchTags } = useWordpressStore();

  const [activeTab, setActiveTab] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [pageName, setPageName] = useState('');

  /** Settings State */
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [postFormat, setPostFormat] = useState('reel');
  const [addLinkToCaption, setAddLinkToCaption] = useState(false);
  const [addLinkToComment, setAddLinkToComment] = useState(false);
  const [scheduleMode, setScheduleMode] = useState('fixed');
  const [scheduleFixedTimes, setScheduleFixedTimes] = useState<string[]>([]);
  const [timeInput, setTimeInput] = useState('');
  const [scheduleImmediateGap, setScheduleImmediateGap] = useState(60);

  const [autoCreateEnabled, setAutoCreateEnabled] = useState(false);
  const [autoScanInterval, setAutoScanInterval] = useState(2);
  const [autoScanBatchSize, setAutoScanBatchSize] = useState(1);
  const [autoQueueLimit, setAutoQueueLimit] = useState(3);
  const [autoMaxPostAgeDays, setAutoMaxPostAgeDays] = useState(1);
  const [aiTone, setAiTone] = useState('professional');
  const [aiCaptionLength, setAiCaptionLength] = useState('medium');
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [defaultReelTemplateId, setDefaultReelTemplateId] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);

  const [isTestingPrompt, setIsTestingPrompt] = useState(false);
  const [testPromptResult, setTestPromptResult] = useState<any>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPostContent, setTestPostContent] = useState('');

  /** Scheduler Status states */
  const [lastRenderTime, setLastRenderTime] = useState<string | null>(null);
  const [nextRenderTime, setNextRenderTime] = useState<string | null>(null);
  const [lastPublishTime, setLastPublishTime] = useState<string | null>(null);
  const [nextPublishTime, setNextPublishTime] = useState<string | null>(null);

  /** TAB 5 states */
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [reels, setReels] = useState<any[]>([]);
  const [isLoadingReels, setIsLoadingReels] = useState(false);

  /** Create Reel Modal states */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSiteId, setCreateSiteId] = useState('');
  const [createPosts, setCreatePosts] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [createPostId, setCreatePostId] = useState('');
  const [createPostTitle, setCreatePostTitle] = useState('');
  const [createTemplateId, setCreateTemplateId] = useState('');
  const [isCreatingReel, setIsCreatingReel] = useState(false);

  const [isPosting, setIsPosting] = useState<Record<string, boolean>>({});

  const [sources, setSources] = useState<any[]>([]);
  const [sourceCategoriesCache, setSourceCategoriesCache] = useState<Record<string, any[]>>({});
  const [sourceTagsCache, setSourceTagsCache] = useState<Record<string, any[]>>({});

  useEffect(() => {
    ztteam_fetchSites();
    fetchSettings();
    fetchTemplates();
  }, [id]);

  useEffect(() => {
    if (activeTab === 5) {
      ztteam_loadReels();
    }
  }, [activeTab, id]);

  /** SSE Live Time Update for Tab 5 */
  useEffect(() => {
    if (activeTab !== 5) return;
    const sse = new EventSource(`/api/render/events`);
    sse.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        setReels(prevReels => prevReels.map(r => r.id === payload.id ? { ...r, ...payload } : r));
      } catch (err) { }
    };
    return () => sse.close();
  }, [activeTab]);

  const ztteam_loadReels = async () => {
    try {
      setIsLoadingReels(true);
      const res = await api.get(`render/list?fbPageId=${id}&limit=20&_t=${Date.now()}`);
      setReels(res.data.reels || []);
    } catch (error: any) {
      ztteam_showToast('Lỗi tải danh sách reel', 'error');
    } finally {
      setIsLoadingReels(false);
    }
  };

  const ztteam_retryReel = async (reelId: string) => {
    try {
      await api.post(`render/retry/${reelId}`);
      ztteam_showToast('Đã thêm lại vào hàng đợi render', 'success');
      ztteam_loadReels();
    } catch (error: any) {
      ztteam_showToast(error.response?.data?.message || 'Lỗi retry', 'error');
    }
  };

  const ztteam_deleteReel = async (reelId: string) => {
    const confirmed = await ztteam_showConfirm('Xác nhận xóa', 'Xóa reel này? Hành động không thể hoàn tác.');
    if (!confirmed) return;
    try {
      await api.post(`render/delete/${reelId}`);
      ztteam_showToast('Đã xóa reel', 'success');
      ztteam_loadReels();
    } catch (error: any) {
      ztteam_showToast(error.response?.data?.message || 'Lỗi xóa', 'error');
    }
  };

  const ztteam_handleTestPrompt = async () => {
    if (!testPostContent.trim()) {
      ztteam_showToast('Vui lòng nhập nội dung bài viết mẫu', 'error');
      return;
    }
    try {
      setIsTestingPrompt(true);
      setTestPromptResult(null);
      const res = await api.post('ai/test-prompt', {
        postContent: testPostContent,
        tone: aiTone,
        captionLength: aiCaptionLength,
        customPrompt: aiCustomPrompt
      });
      setTestPromptResult(res.data);
      ztteam_showToast('Test Prompt thành công', 'success');
    } catch (error: any) {
      ztteam_showToast(error.response?.data?.message || 'Lỗi test prompt', 'error');
    } finally {
      setIsTestingPrompt(false);
    }
  };

  const [isFetchingSample, setIsFetchingSample] = useState(false);

  const ztteam_openTestPromptModal = async () => {
    setTestPromptResult(null);
    setTestPostContent('');
    setShowTestModal(true);

    /** Try to fetch real data from configured sources */
    const activeSource = sources.find(s => s.is_active && s.target_site_id);
    if (activeSource) {
      try {
        setIsFetchingSample(true);
        const params = new URLSearchParams();
        if (activeSource.target_category_id) params.append('categoryId', activeSource.target_category_id);
        if (activeSource.target_tags) params.append('targetTags', activeSource.target_tags);
        const qs = params.toString();

        const res = await api.get(`wordpress/sites/${activeSource.target_site_id}/sample-post${qs ? '?' + qs : ''}`);
        if (res.data && res.data.content) {
          const content = res.data.content;
          setTestPostContent(content.substring(0, 2000));
          return;
        }
      } catch (error) {
        console.error('Failed to fetch sample post:', error);
      } finally {
        setIsFetchingSample(false);
      }
    }

    /** Fallback if no source or failed to fetch */
    setTestPostContent('Hôm nay là một ngày tuyệt vời để khám phá những tính năng mới của công nghệ AI. Sự phát triển của AI giúp tiết kiệm hàng ngàn giờ làm việc mỗi tuần cho các nhà sáng tạo nội dung. Bạn đã sẵn sàng để ứng dụng AI vào hệ thống của mình chưa?');
  };

  const ztteam_handleCreateReel = async () => {
    if (!createPostId || !createPostTitle.trim()) {
      ztteam_showToast('Vui lòng chọn một bài viết', 'error');
      return;
    }

    let template = createTemplateId || defaultReelTemplateId;
    if (!template) {
      const vTemplates = templates.filter(t => t.format === 'video');
      if (vTemplates.length > 0) template = vTemplates[0].id;
    }

    if (!template) {
      ztteam_showToast('Chưa có Giao diện Reel nào khả dụng', 'error');
      return;
    }

    try {
      setIsCreatingReel(true);
      const selectedPost = createPosts.find(p => String(p.id) === String(createPostId));

      await api.post('render/create', {
        pageId: id,
        wpPostId: String(createPostId),
        wpPostTitle: createPostTitle,
        wpPostUrl: selectedPost ? selectedPost.link : undefined,
        templateId: template
      });
      ztteam_showToast('Đã thêm lệnh tạo Reel vào hàng đợi', 'success');
      setShowCreateModal(false);
      setCreatePostId('');
      setCreatePostTitle('');
      ztteam_loadReels();
    } catch (err: any) {
      ztteam_showToast(err.response?.data?.error || err.response?.data?.message || 'Lỗi tạo Reel', 'error');
    } finally {
      setIsCreatingReel(false);
    }
  };

  useEffect(() => {
    if (createSiteId) {
      setIsLoadingPosts(true);
      api.get(`wordpress/sites/${createSiteId}/posts`)
        .then(res => {
          setCreatePosts(res.data || []);
          if (res.data && res.data.length > 0) {
            setCreatePostId(res.data[0].id);
            setCreatePostTitle(res.data[0].title);
          }
        })
        .catch(err => {
          ztteam_showToast('Lỗi tải danh sách bài viết', 'error');
          setCreatePosts([]);
        })
        .finally(() => setIsLoadingPosts(false));
    } else {
      setCreatePosts([]);
      setCreatePostId('');
      setCreatePostTitle('');
    }
  }, [createSiteId]);

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

  const fetchTemplates = async () => {
    try {
      const res = await api.get(`templates?pageId=${id}&_t=${Date.now()}`);
      setTemplates(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`facebook/pages/${id}/settings?_t=${Date.now()}`);
      const data = res.data;
      setPageName(data.name || 'Fanpage Settings');
      setTags(data.tags || []);
      setPostFormat(data.post_format || 'reel');
      setAddLinkToCaption(data.add_link_to_caption || false);
      setAddLinkToComment(data.add_link_to_comment || false);
      setScheduleMode(data.schedule_mode || 'fixed');
      setScheduleFixedTimes(data.schedule_fixed_times || []);
      setScheduleImmediateGap(data.schedule_immediate_gap_minutes || 60);

      setAutoCreateEnabled(data.auto_create_enabled || false);
      setAutoScanInterval(data.auto_scan_interval_hours || 2);
      setAutoScanBatchSize(data.auto_scan_batch_size || 1);
      setAutoQueueLimit(data.auto_queue_limit || 3);
      setAutoMaxPostAgeDays(data.auto_max_post_age_days || 1);
      setAiTone(data.ai_tone || 'professional');
      setAiCaptionLength(data.ai_caption_length || 'medium');
      setAiCustomPrompt(data.ai_custom_prompt || '');
      setVoiceSpeed(data.voice_speed || 1.0);
      setDefaultReelTemplateId(data.default_reel_template_id || '');

      setLastRenderTime(data.last_render_time || null);
      setNextRenderTime(data.next_render_time || null);
      setLastPublishTime(data.last_publish_time || null);
      setNextPublishTime(data.next_publish_time || null);

      setSources(data.sources || []);

      /** Prefetch categories for existing sources */
      if (data.sources) {
        data.sources.forEach((s: any) => {
          if (s.target_site_id && !sourceCategoriesCache[s.target_site_id]) {
            loadCategories(s.target_site_id);
          }
          if (s.target_site_id && !sourceTagsCache[s.target_site_id]) {
            loadTags(s.target_site_id);
          }
        });
      }
    } catch (error: any) {
      ztteam_showToast(error.response?.data?.message || 'Lỗi tải cấu hình', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async (siteId: string) => {
    try {
      const cats = await ztteam_fetchCategories(siteId);
      setSourceCategoriesCache(prev => ({ ...prev, [siteId]: cats }));
    } catch (e) {
      console.error(e);
    }
  };

  const loadTags = async (siteId: string) => {
    try {
      const tagsData = await ztteam_fetchTags(siteId);
      setSourceTagsCache(prev => ({ ...prev, [siteId]: tagsData }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.put(`facebook/pages/${id}/settings`, {
        tags,
        post_format: postFormat,
        add_link_to_caption: addLinkToCaption,
        add_link_to_comment: addLinkToComment,
        schedule_mode: scheduleMode,
        schedule_fixed_times: scheduleFixedTimes,
        schedule_immediate_gap_minutes: scheduleImmediateGap,
        auto_create_enabled: autoCreateEnabled,
        auto_scan_interval_hours: autoScanInterval,
        auto_scan_batch_size: autoScanBatchSize,
        auto_queue_limit: autoQueueLimit,
        auto_max_post_age_days: autoMaxPostAgeDays,
        ai_tone: aiTone,
        ai_caption_length: aiCaptionLength,
        ai_custom_prompt: aiCustomPrompt,
        voice_speed: voiceSpeed,
        default_reel_template_id: defaultReelTemplateId,
        sources
      });
      ztteam_showToast('Đã lưu cấu hình thành công', 'success');
    } catch (error: any) {
      ztteam_showToast(error.response?.data?.message || 'Lỗi lưu cấu hình', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const addTime = () => {
    if (timeInput.trim() && !scheduleFixedTimes.includes(timeInput.trim())) {
      setScheduleFixedTimes([...scheduleFixedTimes, timeInput.trim()]);
      setTimeInput('');
    }
  };

  const addSource = () => {
    setSources([...sources, { id: Date.now().toString(), target_site_id: '', target_category_id: '', is_active: true }]);
  };

  if (isLoading) {
    return <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-4xl text-gray-300">sync</span></div>;
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <button onClick={() => navigate('/facebook')} className="text-gray-500 hover:text-primary flex items-center gap-1 text-sm font-bold mb-2 transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Quay lại danh sách
          </button>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">Cấu hình Fanpage: {pageName}</h3>
          <p className="text-gray-500 text-sm">Tùy chỉnh toàn diện chiến lược phân phối nội dung và tự động hóa.</p>
        </div>
        <div>
          <button onClick={handleSave} disabled={isSaving} className="px-6 py-3 bg-primary hover:bg-blue-700 text-white font-bold rounded-full shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50">
            {isSaving ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : <span className="material-symbols-outlined text-[20px]">save</span>}
            Lưu Thay Đổi
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
          {[
            { id: 1, icon: 'info', label: 'Thông tin chung' },
            { id: 2, icon: 'movie', label: 'Giao diện Reel' },
            { id: 3, icon: 'schedule', label: 'Cấu hình đăng bài' },
            { id: 4, icon: 'smart_toy', label: 'Tự động chạy' },
            { id: 5, icon: 'queue_music', label: 'Lịch sử & Hàng đợi' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-slate-100'}`}
            >
              <span className="material-symbols-outlined text-[20px]" style={activeTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : {}}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full min-h-[500px]">
          {/* TAB 1 */}
          {activeTab === 1 && (
            <div className="glass-card p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-slate-100 pb-2">Thông tin chung</h4>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Tags (Gom nhóm Fanpage)</label>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="VD: Giải trí, Tin tức..." className="flex-1 bg-slate-50 border-2 border-transparent focus:border-primary rounded-xl px-4 py-2 text-sm focus:ring-0 outline-none" />
                  <button onClick={addTag} className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100">Thêm</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map(t => (
                    <span key={t} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-bold flex items-center gap-1">
                      {t} <span onClick={() => setTags(tags.filter(x => x !== t))} className="material-symbols-outlined text-[14px] cursor-pointer hover:text-red-500">close</span>
                    </span>
                  ))}
                  {tags.length === 0 && <span className="text-sm text-gray-400">Chưa có tag nào</span>}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 */}
          {activeTab === 2 && (
            <div className="glass-card p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                <h4 className="text-lg font-bold text-gray-900">Giao diện Reel</h4>
              </div>

              {editingTemplate ? (
                <div className="mt-4">
                  <ReelTemplateEditor
                    initialData={editingTemplate}
                    onCancel={() => setEditingTemplate(null)}
                    onSave={async (data) => {
                      try {
                        await api.put(`templates/${editingTemplate.id}`, data);
                        ztteam_showToast('Đã lưu giao diện thành công', 'success');
                        setEditingTemplate(null);
                        fetchTemplates();
                      } catch (error: any) {
                        ztteam_showToast(error.response?.data?.message || 'Lỗi lưu giao diện', 'error');
                      }
                    }}
                  />
                </div>
              ) : (
                <>
                  <p className="text-gray-500 text-sm mb-4">Chọn giao diện Reel mặc định cho Fanpage này. Các video tạo ra sẽ sử dụng bố cục, màu sắc và âm thanh của giao diện này.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.filter(t => t.format === 'video').map(t => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setDefaultReelTemplateId(t.id);
                        }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex gap-4 items-start ${defaultReelTemplateId === t.id ? 'border-primary bg-blue-50/30 shadow-md shadow-blue-500/10' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'}`}
                      >
                        <TemplateMiniPreview templateData={defaultReelTemplateId === t.id ? t : t} />
                        <div className="flex-1 min-w-0 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-1">
                            <h5 className="font-bold text-gray-900 truncate">{t.name}</h5>
                            {defaultReelTemplateId === t.id && <span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0 ml-2">check_circle</span>}
                          </div>
                          <div className="flex gap-2 flex-wrap mb-2 mt-1">
                            {t.is_default && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-semibold border border-amber-200">MẶC ĐỊNH</span>}
                            {defaultReelTemplateId === t.id && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">ĐANG CHỌN</span>}
                          </div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t.content_type}</p>

                          <div className="flex gap-2 mt-auto" onClick={e => e.stopPropagation()}>
                            {!t.fb_page_id ? (
                              <button
                                onClick={async () => {
                                  try {
                                    await api.post('templates/clone', { templateId: t.id, pageId: id });
                                    ztteam_showToast('Đã sao chép giao diện thành công!', 'success');
                                    fetchTemplates();
                                  } catch (err: any) {
                                    ztteam_showToast(err.response?.data?.message || 'Lỗi sao chép giao diện', 'error');
                                  }
                                }}
                                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                Sao chép
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => setEditingTemplate(t)}
                                  className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                  Sửa
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const confirmed = await ztteam_showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa giao diện này không?');
                                    if (!confirmed) return;
                                    try {
                                      await api.delete(`templates/${t.id}`);
                                      ztteam_showToast('Đã xóa giao diện', 'success');
                                      if (defaultReelTemplateId === t.id) {
                                        setDefaultReelTemplateId('');
                                      }
                                      fetchTemplates();
                                    } catch (err: any) {
                                      ztteam_showToast(err.response?.data?.message || 'Lỗi xóa giao diện', 'error');
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ml-auto"
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {templates.filter(t => t.format === 'video').length === 0 && (
                      <div className="col-span-full p-4 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium border border-amber-200">
                        Chưa có giao diện Reel nào. Hãy sao chép từ kho hệ thống để tùy chỉnh.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3 */}
          {activeTab === 3 && (
            <div className="glass-card p-6 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <h4 className="text-lg font-bold text-gray-900 border-b border-slate-100 pb-2">Cấu hình đăng bài lên Fanpage</h4>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Lần đăng trước</div>
                  <div className="text-sm text-gray-900 font-bold">{lastPublishTime ? new Date(lastPublishTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Chưa đăng'}</div>
                </div>
                <div className="h-8 w-[1px] bg-blue-200 mx-4"></div>
                <div>
                  <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Lần đăng tới (dự kiến)</div>
                  <div className="text-sm text-emerald-600 font-bold">
                    {nextPublishTime && new Date(nextPublishTime).getTime() > Date.now() ? new Date(nextPublishTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Đang chờ...'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Hình thức đăng</label>
                  <select value={postFormat} onChange={e => setPostFormat(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-primary rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-0 outline-none">
                    <option value="reel">Chỉ đăng Reel</option>
                    <option value="image">Chỉ đăng Ảnh</option>
                    <option value="mixed">Reel và Ảnh xen kẽ</option>
                  </select>
                  <p className="mt-1 text-[11px] text-gray-500">Cách Bot xuất bản nội dung lên Facebook. "Xen kẽ" sẽ giúp Fanpage đa dạng hơn.</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={addLinkToCaption} onChange={e => setAddLinkToCaption(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span className="text-sm font-bold text-gray-700">Tự động gắn link Website vào Caption</span>
                  </label>
                  <p className="mt-1 ml-8 text-[11px] text-gray-500">Kéo traffic về Website: Bot sẽ tự động dán Link gốc của bài báo vào nội dung (caption) khi đăng lên Facebook.</p>
                </div>
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={addLinkToComment} onChange={e => setAddLinkToComment(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span className="text-sm font-bold text-gray-700">Tự động chèn link Website vào Comment đầu tiên</span>
                  </label>
                  <p className="mt-1 ml-8 text-[11px] text-gray-500">Thay vì để ở caption (dễ bị FB bóp tương tác), Bot sẽ tự động bình luận Link bài báo ngay bên dưới bài đăng Facebook.</p>
                </div>
              </div>

              <hr className="border-slate-100" />

              <div>
                <h5 className="font-bold text-gray-900 mb-3">Lịch tự động đăng</h5>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="scheduleMode" value="fixed" checked={scheduleMode === 'fixed'} onChange={() => setScheduleMode('fixed')} className="text-primary focus:ring-primary" />
                    <span className="text-sm font-bold text-gray-700">Khung giờ cố định</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="scheduleMode" value="immediate" checked={scheduleMode === 'immediate'} onChange={() => setScheduleMode('immediate')} className="text-primary focus:ring-primary" />
                    <span className="text-sm font-bold text-gray-700">Đăng ngay khi có bài mới</span>
                  </label>
                </div>

                {scheduleMode === 'fixed' && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-gray-500 mb-3">Thêm các khung giờ (VD: 05:00, 16:30) để hệ thống tự động đẩy bài từ hàng đợi lên Fanpage.</p>
                    <div className="flex gap-2 mb-3 max-w-xs">
                      <input type="time" value={timeInput} onChange={e => setTimeInput(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-primary outline-none" />
                      <button onClick={addTime} className="px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-blue-600">Thêm</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scheduleFixedTimes.map(t => (
                        <span key={t} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm">
                          {t} <span onClick={() => setScheduleFixedTimes(scheduleFixedTimes.filter(x => x !== t))} className="material-symbols-outlined text-[14px] cursor-pointer hover:text-red-500">close</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {scheduleMode === 'immediate' && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-sm text-amber-800 font-bold mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">bolt</span> Đăng ngay sau khi Video làm xong</p>
                    <label className="block text-xs text-amber-700 font-medium mb-1">Giãn cách tối thiểu giữa 2 bài (phút)</label>
                    <input type="number" min="10" value={scheduleImmediateGap} onChange={e => setScheduleImmediateGap(parseInt(e.target.value))} className="w-32 bg-white border border-amber-200 rounded-xl px-4 py-2 text-sm outline-none" />
                    <p className="text-[10px] text-amber-700 mt-1 opacity-80 leading-tight">Khoảng thời gian nghỉ giữa 2 lần đăng bài liên tiếp. Tránh việc Bot đăng dồn dập khiến Facebook đánh dấu Page là Spam.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4 */}
          {activeTab === 4 && (
            <div className="glass-card p-6 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Tự tạo nội dung</h4>
                  <p className="text-sm text-gray-500 mt-1">Tự động lấy bài mới từ nguồn Website, nạp vào hàng đợi và tạo Reel/Ảnh.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={autoCreateEnabled} onChange={e => setAutoCreateEnabled(e.target.checked)} />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {autoCreateEnabled && (
                <>
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Lần lấy bài trước</div>
                      <div className="text-sm text-gray-900 font-bold">{lastRenderTime ? new Date(lastRenderTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Chưa chạy'}</div>
                    </div>
                    <div className="h-8 w-[1px] bg-emerald-200 mx-4"></div>
                    <div>
                      <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Lần lấy bài tới (dự kiến)</div>
                      <div className="text-sm text-emerald-600 font-bold">
                        {nextRenderTime && new Date(nextRenderTime).getTime() > Date.now() ? new Date(nextRenderTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Đang chờ quét...'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h5 className="font-bold text-gray-900 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[20px]">rss_feed</span> Nguồn bài viết</h5>
                      <button onClick={addSource} className="text-sm font-bold text-primary bg-blue-50 px-4 py-1.5 rounded-full hover:bg-blue-100 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">add</span> Thêm nguồn
                      </button>
                    </div>

                    <div className="space-y-4">
                      {sources.map((src, index) => (
                        <div key={src.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                          <div className="flex-1 grid grid-cols-3 gap-4">
                            <select
                              value={src.target_site_id}
                              onChange={e => {
                                const newSites = [...sources];
                                newSites[index].target_site_id = e.target.value;
                                newSites[index].target_category_id = '';
                                newSites[index].target_tags = '';
                                setSources(newSites);
                                if (e.target.value && !sourceCategoriesCache[e.target.value]) loadCategories(e.target.value);
                                if (e.target.value && !sourceTagsCache[e.target.value]) loadTags(e.target.value);
                              }}
                              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                            >
                              <option value="">-- Chọn Website đích --</option>
                              {sites.map(s => <option key={s.id} value={s.id}>{s.wp_url}</option>)}
                            </select>

                            <select
                              value={src.target_category_id || ''}
                              onChange={e => {
                                const newSites = [...sources];
                                newSites[index].target_category_id = e.target.value;
                                setSources(newSites);
                              }}
                              disabled={!src.target_site_id}
                              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-slate-100"
                            >
                              <option value="">Tất cả chuyên mục</option>
                              {(sourceCategoriesCache[src.target_site_id] || []).map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.count})</option>
                              ))}
                            </select>

                            <select
                              value={src.target_tags || ''}
                              onChange={e => {
                                const newSites = [...sources];
                                newSites[index].target_tags = e.target.value;
                                setSources(newSites);
                              }}
                              disabled={!src.target_site_id}
                              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-slate-100"
                            >
                              <option value="">Tất cả thẻ (Tags)</option>
                              {(sourceTagsCache[src.target_site_id] || []).map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.count})</option>
                              ))}
                            </select>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={src.is_active} onChange={e => {
                              const newSites = [...sources];
                              newSites[index].is_active = e.target.checked;
                              setSources(newSites);
                            }} className="w-4 h-4 text-emerald-600 rounded" />
                            <span className="text-xs font-bold text-gray-600">Bật</span>
                          </label>

                          <button onClick={() => setSources(sources.filter((_, i) => i !== index))} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      ))}
                      {sources.length === 0 && <p className="text-sm text-gray-400 italic">Chưa cấu hình nguồn bài viết nào.</p>}
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Chu kỳ quét (giờ)</label>
                      <input type="number" min="1" value={autoScanInterval} onChange={e => setAutoScanInterval(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-primary outline-none" />
                      <p className="text-[10px] text-gray-400 mt-1 leading-tight">Khoảng cách giữa 2 lần Bot đi quét báo nguồn để lấy bài.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Số bài mỗi lần</label>
                      <input type="number" min="1" value={autoScanBatchSize} onChange={e => setAutoScanBatchSize(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-primary outline-none" />
                      <p className="text-[10px] text-gray-400 mt-1 leading-tight">Số lượng video tối đa được tạo trong MỘT LẦN quét. Đặt là 1 nếu muốn chia đều cơ hội cho các Fanpage khác.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Giữ trong hàng đợi</label>
                      <input type="number" min="1" value={autoQueueLimit} onChange={e => setAutoQueueLimit(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-primary outline-none" />
                      <p className="text-[10px] text-gray-400 mt-1 leading-tight">Số video TỐI ĐA Đang chờ + Đang render cùng lúc. Chống treo máy chủ. Nên để 3-5.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tuổi bài tối đa (ngày)</label>
                      <input type="number" min="1" value={autoMaxPostAgeDays} onChange={e => setAutoMaxPostAgeDays(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-primary outline-none" />
                      <p className="text-[10px] text-gray-400 mt-1 leading-tight">Bỏ qua bài báo cũ. Tập trung làm video cho tin tức mới nóng hổi.</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="font-bold text-gray-700">Lưu ý:</span> Chu kỳ {autoScanInterval}h ≈ quét {Math.floor(24 / autoScanInterval)} lần/ngày. Hàng đợi đủ số "{autoQueueLimit}" thì hệ thống sẽ ngừng tạo thêm cho đến khi đăng bớt.
                  </p>

                  <hr className="border-slate-100" />

                  <div>
                    <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span> Cấu hình AI (Viết kịch bản/Caption)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Giọng văn (Tone)</label>
                        <select value={aiTone} onChange={e => setAiTone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-primary outline-none">
                          <option value="professional">Chuyên nghiệp, Lịch sự</option>
                          <option value="humorous">Hài hước, Gen Z</option>
                          <option value="dramatic">Kịch tính, Giật gân</option>
                          <option value="inspirational">Truyền cảm hứng, Chữa lành</option>
                          <option value="news">Tin tức, Khách quan</option>
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1 leading-tight">Văn phong mà AI sẽ sử dụng để viết kịch bản Video.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Độ dài kịch bản</label>
                        <select value={aiCaptionLength} onChange={e => setAiCaptionLength(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-primary outline-none">
                          <option value="short">Ngắn gọn (~15 giây)</option>
                          <option value="medium">Vừa phải (~30 giây)</option>
                          <option value="long">Chi tiết (~60 giây)</option>
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1 leading-tight">Quản lý độ dài của Kịch bản (ảnh hưởng trực tiếp đến độ dài Video).</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tốc độ đọc (Voice Speed)</label>
                        <select value={voiceSpeed} onChange={e => setVoiceSpeed(parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-primary outline-none">
                          <option value={0.8}>Chậm (0.8x)</option>
                          <option value={0.9}>Hơi chậm (0.9x)</option>
                          <option value={1.0}>Chuẩn (1.0x)</option>
                          <option value={1.1}>Hơi nhanh (1.1x)</option>
                          <option value={1.2}>Nhanh (1.2x)</option>
                          <option value={1.3}>Rất nhanh (1.3x)</option>
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1 leading-tight">Tốc độ đọc của MC Ảo. Chọn 1.1x - 1.2x sẽ làm video có nhịp điệu nhanh hơn.</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Custom Prompt (Tùy chọn)</label>
                      <textarea
                        value={aiCustomPrompt}
                        onChange={e => setAiCustomPrompt(e.target.value)}
                        placeholder="Ví dụ: Viết kịch bản kể một câu chuyện vui vẻ, góc nhìn ngôi thứ 3..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none min-h-[100px]"
                      ></textarea>
                      <div className="flex justify-between items-start mt-2">
                        <p className="text-xs text-gray-500 max-w-xl">
                          Nếu để trống, hệ thống sẽ sử dụng Prompt chuẩn mực mặc định. AI sẽ tự động phân loại thành 3 phần: Tiêu đề video (Hook), Kịch bản nói (Voice) và Nội dung bài đăng (Caption).
                        </p>
                        <button
                          onClick={ztteam_openTestPromptModal}
                          disabled={isFetchingSample}
                          className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 flex items-center gap-1 transition-colors whitespace-nowrap ml-4 disabled:opacity-50"
                        >
                          {isFetchingSample ? (
                            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined text-[16px]">science</span>
                          )}
                          Test Prompt
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 5 */}
          {activeTab === 5 && (
            <div className="glass-card p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Lịch sử & Hàng đợi</h4>
                  <p className="text-sm text-gray-500 mt-1">Quản lý các Reel của Fanpage này</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-1.5 bg-primary text-white hover:bg-blue-600 rounded-full font-semibold transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Tạo Reel thủ công
                  </button>
                  <button onClick={ztteam_loadReels} className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-full font-semibold transition-colors flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    Làm mới
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {isLoadingReels ? (
                  <div className="glass-card p-12 text-center">
                    <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
                    <p className="text-gray-500 mt-3">Đang tải...</p>
                  </div>
                ) : reels.length === 0 ? (
                  <div className="glass-card p-12 text-center bg-slate-50/50">
                    <span className="material-symbols-outlined text-5xl text-gray-300">movie_filter</span>
                    <p className="text-gray-500 mt-3 text-lg font-semibold">Chưa có Reel nào</p>
                    <p className="text-gray-400 text-sm mt-1">Các bài viết mới sẽ được render và hiển thị tại đây.</p>
                  </div>
                ) : (
                  reels.map(reel => (
                    <div key={reel.id} className="border border-slate-200/60 rounded-xl p-4 flex gap-4 items-start bg-white hover:shadow-md transition-shadow">
                      {/** Thumbnail */}
                      <div className="w-16 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        {reel.thumbnail_url ? (
                          <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${reel.thumbnail_url}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl text-gray-400">movie</span>
                          </div>
                        )}
                      </div>

                      {/** Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h4 className="font-bold text-gray-900 truncate">{reel.wp_post_title || 'Untitled'}</h4>
                          {ztteam_getStatusBadge(reel.status)}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Tạo lúc: {ztteam_formatDate(reel.created_at)}
                        </p>

                        {/** Progress bar for RENDERING status */}
                        {reel.status === 'RENDERING' && (
                          <div className="mt-2 mb-3">
                            <div className="flex justify-between text-[11px] text-blue-600 font-semibold mb-1">
                              <span>Đang xử lý...</span>
                              <span>{reel.progress}%</span>
                            </div>
                            <div className="w-full bg-blue-100 rounded-full h-1.5">
                              <div
                                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${reel.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/** Error log for FAILED */}
                        {reel.status === 'FAILED' && reel.error_log && (
                          <div className="mt-2 mb-3 p-2 bg-red-50 rounded text-[11px] text-red-600 font-mono truncate">
                            {reel.error_log}
                          </div>
                        )}

                        {/** Actions */}
                        <div className="flex gap-2 mt-2">
                          {reel.status === 'POSTED' && reel.fb_post_id && (
                            <a
                              href={`https://www.facebook.com/${reel.page?.fb_page_id || id}/videos/${reel.fb_post_id}`}
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
                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${reel.video_url}`}
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
                              className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-full text-[11px] font-bold transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">refresh</span>
                              Thử lại
                            </button>
                          )}
                          <button
                            onClick={() => ztteam_deleteReel(reel.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-full text-[11px] font-bold transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Reel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
              <h3 className="text-lg font-bold text-gray-900">Tạo Reel Thủ Công</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5 bg-white">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Chọn Nguồn (Website) <span className="text-red-500">*</span></label>
                <select
                  value={createSiteId}
                  onChange={e => setCreateSiteId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm focus:border-primary outline-none transition-colors"
                >
                  <option value="">-- Chọn Website --</option>
                  {Array.from(new Set(sources.map(s => s.target_site_id))).map(siteId => {
                    const linkedSite = sites.find(s => s.id === siteId);
                    if (!linkedSite) return null;
                    return <option key={siteId} value={siteId}>{linkedSite.wp_url}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                  Chọn Bài Viết <span className="text-red-500">*</span>
                  {isLoadingPosts && <span className="material-symbols-outlined text-[16px] animate-spin text-primary">progress_activity</span>}
                </label>
                <select
                  value={createPostId}
                  onChange={e => {
                    const postId = e.target.value;
                    setCreatePostId(postId);
                    const post = createPosts.find(p => String(p.id) === String(postId));
                    if (post) setCreatePostTitle(post.title);
                  }}
                  disabled={!createSiteId || isLoadingPosts || createPosts.length === 0}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm focus:border-primary outline-none transition-colors disabled:opacity-60"
                >
                  <option value="">-- Chọn Bài Viết Gần Đây --</option>
                  {createPosts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} (Ngày: {new Date(p.date).toLocaleDateString('vi-VN')})
                    </option>
                  ))}
                </select>
                {createPosts.length === 0 && createSiteId && !isLoadingPosts && (
                  <p className="text-xs text-red-500 mt-1">Không tìm thấy bài viết nào.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Giao diện (Template)</label>
                <select
                  value={createTemplateId || defaultReelTemplateId}
                  onChange={e => setCreateTemplateId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm focus:border-primary outline-none transition-colors"
                >
                  <option value="">-- Mặc định của Page --</option>
                  {templates.filter(t => t.format === 'video').map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1.5 italic">Nếu để trống, hệ thống sẽ sử dụng Giao diện mặc định của Fanpage.</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2 rounded-full font-bold text-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={ztteam_handleCreateReel}
                disabled={isCreatingReel}
                className="px-6 py-2 rounded-full font-bold text-sm bg-primary text-white hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {isCreatingReel ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">movie</span>
                )}
                Tạo Reel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TEST PROMPT */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">science</span>
                Test AI Prompt
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Bài viết mẫu để Test</label>
                <textarea
                  value={testPostContent}
                  onChange={e => setTestPostContent(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:border-primary outline-none min-h-[120px]"
                ></textarea>
              </div>

              {testPromptResult && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase">
                    <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                    Kết quả từ AI
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-bold text-gray-500 block mb-1 uppercase">Tiêu đề (Hook)</span>
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-sm font-semibold text-primary">
                        {testPromptResult.hook || '(Trống)'}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-500 block mb-1 uppercase">Kịch bản Audio (Sub Voice)</span>
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap">
                        {testPromptResult.sub_voice || '(Trống)'}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-500 block mb-1 uppercase">Nội dung bài đăng (Caption)</span>
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap">
                        {testPromptResult.caption || '(Trống)'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-5 py-2 rounded-full font-bold text-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={ztteam_handleTestPrompt}
                disabled={isTestingPrompt}
                className="px-6 py-2 rounded-full font-bold text-sm bg-primary text-white hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {isTestingPrompt ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                )}
                Chạy Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
