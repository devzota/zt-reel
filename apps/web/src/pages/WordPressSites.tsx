import React, { useEffect, useState } from 'react';
import { useWordpressStore } from '../stores/wordpressStore';
import { useCrawlerStore } from '../stores/crawlerStore';
import type { CrawlSource } from '../stores/crawlerStore';
import { useUIStore } from '../stores/uiStore';
import { ztteam_decodeHtmlEntity } from '../utils/stringUtils';

/** Cron value → human-readable label */
function ztteam_cronToLabel(cron: string): string {
  const map: Record<string, string> = {
    '0 */5 * * * *': 'Mỗi 5 phút',
    '0 */15 * * * *': 'Mỗi 15 phút',
    '0 */30 * * * *': 'Mỗi 30 phút',
    '0 */1 * * *': 'Mỗi 1 giờ',
    '0 */2 * * *': 'Mỗi 2 giờ',
    '0 */3 * * *': 'Mỗi 3 giờ',
    '0 */6 * * *': 'Mỗi 6 giờ',
    '0 */12 * * *': 'Mỗi 12 giờ',
    '0 0 * * *': 'Mỗi 24 giờ'
  };
  return map[cron] || cron;
}

export default function WordPressSites() {
  const { sites, isLoading, error, ztteam_fetchSites, ztteam_createSite, ztteam_updateSite, ztteam_deleteSite, ztteam_testConnection } = useWordpressStore();
  const { sources, ztteam_fetchSources, ztteam_createSource, ztteam_updateSource, ztteam_deleteSource, ztteam_toggleSource, ztteam_testScrape } = useCrawlerStore();
  const { ztteam_testPost } = useWordpressStore();
  const { ztteam_showToast, ztteam_showConfirm } = useUIStore();

  /** Which site card is expanded */
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);

  /** Site form state */
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [wpUrl, setWpUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  /** Source form state */
  const [showSourceForm, setShowSourceForm] = useState<string | null>(null);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceCategory, setSourceCategory] = useState('');
  const [frequencyCron, setFrequencyCron] = useState('0 */6 * * *');

  /** Test scrape state */
  const [testScrapeUrl, setTestScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [scrapeError, setScrapeError] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [testPostSiteId, setTestPostSiteId] = useState<string | null>(null);

  /** History state */
  const [historyModalSourceId, setHistoryModalSourceId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const ztteam_handleOpenHistory = async (sourceId: string) => {
    setHistoryModalSourceId(sourceId);
    setIsLoadingHistory(true);
    try {
      const data = await useCrawlerStore.getState().ztteam_fetchHistory(sourceId);
      setHistoryData(data);
    } catch (e) {
      ztteam_showToast('Lỗi khi tải lịch sử', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    ztteam_fetchSites();
  }, []);

  useEffect(() => {
    if (expandedSiteId) {
      ztteam_fetchSources(expandedSiteId);
    }
  }, [expandedSiteId]);

  /** ──── Site form handlers ──── */
  const ztteam_resetSiteForm = () => {
    setShowSiteForm(false);
    setEditingSiteId(null);
    setWpUrl('');
    setWpUsername('');
    setWpAppPassword('');
    setTestResult(null);
  };

  const ztteam_handleEditSite = (site: any) => {
    setEditingSiteId(site.id);
    setWpUrl(site.wp_url);
    setWpUsername(site.wp_username);
    setWpAppPassword('');
    setShowSiteForm(true);
    setTestResult(null);
  };

  const ztteam_handleTestConnection = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!wpUrl || !wpUsername || (!wpAppPassword && !editingSiteId)) {
      setTestResult({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      if (editingSiteId && !wpAppPassword) {
        setTestResult({ success: false, message: 'Vui lòng nhập mật khẩu mới để test kết nối' });
        setIsTesting(false);
        return;
      }
      await ztteam_testConnection({ wpUrl, wpUsername, wpAppPassword });
      setTestResult({ success: true, message: 'Kết nối thành công!' });
    } catch (err: any) {
      setTestResult({ success: false, message: err.response?.data?.message || 'Kết nối thất bại.' });
    } finally {
      setIsTesting(false);
    }
  };

  const ztteam_handleSubmitSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSiteId) {
        await ztteam_updateSite(editingSiteId, { wpUrl, wpUsername, wpAppPassword: wpAppPassword || undefined });
        ztteam_showToast('Cập nhật website thành công', 'success');
      } else {
        await ztteam_createSite({ wpUrl, wpUsername, wpAppPassword });
        ztteam_showToast('Thêm website thành công', 'success');
      }
      ztteam_resetSiteForm();
    } catch (err: any) {
      ztteam_showToast(err.message || 'Lỗi khi lưu website', 'error');
    }
  };

  /** ──── Source form handlers ──── */
  const ztteam_resetSourceForm = () => {
    setShowSourceForm(null);
    setEditingSourceId(null);
    setSourceUrl('');
    setSourceCategory('');
    setFrequencyCron('0 */6 * * *');
  };

  const ztteam_handleEditSource = (source: CrawlSource) => {
    setShowSourceForm(source.target_site_id);
    setEditingSourceId(source.id);
    setSourceUrl(source.source_url);
    setSourceCategory(source.source_category || '');
    setFrequencyCron(source.frequency_cron);
  };

  const ztteam_handleSubmitSource = async (e: React.FormEvent, siteId: string) => {
    e.preventDefault();
    try {
      if (editingSourceId) {
        await ztteam_updateSource(editingSourceId, { sourceUrl, sourceCategory, frequencyCron });
        ztteam_showToast('Cập nhật nguồn cào thành công', 'success');
      } else {
        const urls = sourceUrl.split('\n').map(u => u.trim()).filter(u => u);
        let successCount = 0;
        for (const url of urls) {
          try {
            await ztteam_createSource(siteId, { sourceUrl: url, sourceCategory, frequencyCron });
            successCount++;
          } catch (e) {
            console.error(`Failed to add source ${url}`, e);
          }
        }
        ztteam_showToast(`Đã thêm thành công ${successCount} nguồn cào`, 'success');
        ztteam_fetchSites();
      }
      ztteam_resetSourceForm();
      ztteam_fetchSources(siteId);
    } catch (err: any) {
      ztteam_showToast(err.message || 'Lỗi kết nối.', 'error');
    }
  };

  /** ──── Test scrape handlers ──── */
  const ztteam_handleTestScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testScrapeUrl) return;
    setIsScraping(true);
    setScrapeError('');
    setScrapeResult(null);
    try {
      const result = await ztteam_testScrape(testScrapeUrl);
      setScrapeResult(result);
    } catch (err: any) {
      setScrapeError(err.response?.data?.message || err.message || 'Lỗi khi cào bài');
    } finally {
      setIsScraping(false);
    }
  };

  const ztteam_handleTestPost = async (siteId: string) => {
    if (!scrapeResult) return;
    setIsPosting(true);
    setTestPostSiteId(siteId);
    try {
      const response = await ztteam_testPost(siteId, {
        title: scrapeResult.title,
        content: scrapeResult.contentHtml,
        excerpt: scrapeResult.excerpt,
        imageUrl: scrapeResult.image || undefined
      });
      ztteam_showToast(`Đăng bài thành công! URL: ${response.url}`, 'success');
    } catch (err: any) {
      ztteam_showToast(err.message || 'Lỗi khi đăng bài lên WordPress', 'error');
    } finally {
      setIsPosting(false);
      setTestPostSiteId(null);
    }
  };

  const ztteam_getSourcesForSite = (siteId: string): CrawlSource[] => {
    return sources.filter(s => s.target_site_id === siteId);
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">Cấu hình WordPress & Nguồn cào</h3>
          <p className="text-gray-500 text-sm">Quản lý mạng lưới website và luồng dữ liệu tự động của bạn.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => ztteam_fetchSites()}
            className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wide text-gray-700 shadow-sm hover:shadow-md transition-all">
            <span className="material-symbols-outlined text-[18px]">sync</span>
            Kiểm tra Toàn bộ
          </button>
          <button
            onClick={() => { setShowSiteForm(true); setEditingSiteId(null); setWpUrl(''); setWpUsername(''); setWpAppPassword(''); setTestResult(null); }}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm hover:scale-[1.02] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Thêm Website đích
          </button>
        </div>
      </div>

      {/* ──── Site Form (Add/Edit) ──── */}
      {showSiteForm && (
        <div className="mb-8 glass-card p-6">
          <h2 className="text-title-md font-bold text-gray-900 mb-6">
            {editingSiteId ? 'Chỉnh sửa Website Đích' : 'Thêm Website Đích (WordPress)'}
          </h2>
          <form onSubmit={ztteam_handleSubmitSite} className="space-y-4 max-w-2xl">
            <div>
              <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">URL Website</label>
              <input type="url" value={wpUrl} onChange={(e) => setWpUrl(e.target.value)}
                placeholder="https://mysite.com"
                className="w-full py-2.5 px-4 rounded-full bg-gray-100 focus:ring-2 focus:ring-primary text-sm placeholder:text-gray-400" required />
              <p className="mt-1 text-[11px] text-gray-500">Địa chỉ trang chủ Website WordPress của bạn (Nơi bot sẽ đăng bài lên).</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Username (Admin)</label>
                <input type="text" value={wpUsername} onChange={(e) => setWpUsername(e.target.value)}
                  placeholder="admin_mysite"
                  className="w-full py-2.5 px-4 rounded-full bg-gray-100 focus:ring-2 focus:ring-primary text-sm placeholder:text-gray-400" required />
                <p className="mt-1 text-[11px] text-gray-500">Tên đăng nhập tài khoản có quyền Quản trị (Administrator).</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Application Password</label>
                <input type="password" value={wpAppPassword} onChange={(e) => setWpAppPassword(e.target.value)}
                  placeholder={editingSiteId ? '(Bỏ trống để giữ nguyên)' : 'xxxx xxxx xxxx xxxx'}
                  className="w-full py-2.5 px-4 rounded-full bg-gray-100 focus:ring-2 focus:ring-primary text-sm placeholder:text-gray-400" required={!editingSiteId} />
                <p className="mt-1 text-[11px] text-gray-500">Vào WP Admin &gt; Users &gt; Profile &gt; Application Passwords để tạo.</p>
              </div>
            </div>

            {testResult && (
              <div className={`p-4 rounded-xl flex items-center gap-2 ${testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                <span className="material-symbols-outlined">{testResult.success ? 'check_circle' : 'error'}</span>
                <span className="text-sm font-medium">{testResult.message}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={ztteam_resetSiteForm}
                className="px-5 py-2 text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition-colors">Hủy bỏ</button>
              <button type="button" onClick={ztteam_handleTestConnection} disabled={isTesting}
                className="border border-primary text-primary px-5 py-2 rounded-full text-sm font-bold transition hover:bg-primary/5 disabled:opacity-50">
                {isTesting ? 'Đang test...' : 'Test Kết Nối'}
              </button>
              <button type="submit" disabled={isLoading || isTesting}
                className="bg-primary text-white px-6 py-2 rounded-full text-sm font-bold shadow-sm hover:opacity-90 disabled:opacity-50">
                {editingSiteId ? 'Cập nhật' : 'Lưu cấu hình'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ──── Error ──── */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ──── Loading ──── */}
      {isLoading && sites.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* ──── Website Cards Grid ──── */}
          <div className="grid grid-cols-1 gap-6">
            {sites.map(site => {
              const isExpanded = expandedSiteId === site.id;
              const siteSources = ztteam_getSourcesForSite(site.id);

              return (
                <div key={site.id} className="glass-card overflow-hidden">
                  {/* ── Website Header ── */}
                  <div className="bg-slate-50 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[28px]">language</span>
                      </div>
                      <div>
                        <h4 className="text-title-md font-bold text-gray-900">{site.wp_url}</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">User: {site.wp_username}</span>
                          <span className="flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-tight">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            {site.status === 'connected' ? 'REST API Connected' : site.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {!isExpanded && (
                        <>
                          <span className="text-xs text-gray-400">{site._count?.crawl_sources || 0} Nguồn cào</span>
                          <button
                            onClick={() => setExpandedSiteId(site.id)}
                            className="flex items-center gap-1 bg-white text-gray-700 px-4 py-2 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-all">
                            Mở danh sách
                            <span className="material-symbols-outlined">expand_more</span>
                          </button>
                        </>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => ztteam_handleEditSite(site)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                          <span className="material-symbols-outlined">settings</span>
                        </button>
                        <button
                          onClick={async () => {
                            const confirmed = await ztteam_showConfirm('Bạn có chắc chắn muốn xóa website này không?');
                            if (confirmed) {
                              ztteam_deleteSite(site.id);
                              ztteam_showToast('Đã xóa website', 'success');
                            }
                          }}
                          className="w-10 h-10 flex items-center justify-center hover:bg-red-50 hover:text-red-600 rounded-full transition-colors text-gray-500">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Scraper List (expanded) ── */}
                  {isExpanded && (
                    <div className="p-5">
                      <div className="flex justify-between items-center mb-4">
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Danh sách nguồn cào ({siteSources.length})
                        </h5>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setShowSourceForm(site.id); setEditingSourceId(null); setSourceUrl(''); setSourceCategory(''); setFrequencyCron('0 */6 * * *'); }}
                            className="text-primary text-[11px] font-bold flex items-center gap-1  uppercase tracking-wide">
                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                            THÊM NGUỒN CÀO
                          </button>
                          <button
                            onClick={() => setExpandedSiteId(null)}
                            className="text-gray-400 hover:text-gray-600 text-[11px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">expand_less</span>
                            Thu gọn
                          </button>
                        </div>
                      </div>

                      {/* Source Form (inline) */}
                      {showSourceForm === site.id && (
                        <div className="rounded-xl bg-blue-50/50 p-1 mb-3 shadow-sm">
                          <div className="bg-white m-1 rounded-lg p-5">
                            <form onSubmit={(e) => ztteam_handleSubmitSource(e, site.id)} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">URL Nguồn cào</label>
                                  <textarea value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                                    placeholder="https://vnexpress.net/so-hoa&#10;https://cafebiz.vn/kinh-doanh"
                                    className="w-full py-2.5 px-4 rounded-xl bg-gray-100 focus:ring-2 focus:ring-primary text-sm placeholder:text-gray-400 min-h-[80px] focus:outline-none focus:border-transparent" required />
                                  <p className="mt-2 text-[11px] text-gray-400">Link RSS (VD: domain.com/rss) hoặc Link Trang chủ báo. Bot sẽ vào đây bốc bài. Có thể điền nhiều dòng.</p>
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Chuyên mục WP (ID)</label>
                                  <input type="text" value={sourceCategory} onChange={(e) => setSourceCategory(e.target.value)}
                                    placeholder="Ví dụ: 12"
                                    className="w-full py-2.5 px-3 rounded-full bg-gray-100 focus:ring-2 focus:ring-primary text-sm placeholder:text-gray-400" />
                                  <p className="mt-2 text-[11px] text-gray-400">ID Chuyên mục trên Website của bạn (Ví dụ: 12). Bài báo cào về sẽ được tự động xếp vào chuyên mục này.</p>
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Tần suất cào</label>
                                  <select value={frequencyCron} onChange={(e) => setFrequencyCron(e.target.value)}
                                    className="w-full py-2.5 px-3 rounded-full bg-gray-100 focus:ring-2 focus:ring-primary text-sm placeholder:text-gray-400 cursor-pointer" required>
                                    <option value="0 */5 * * * *">5 phút</option>
                                    <option value="0 */15 * * * *">15 phút</option>
                                    <option value="0 */30 * * * *">30 phút</option>
                                    <option value="0 */1 * * *">1 tiếng</option>
                                    <option value="0 */2 * * *">2 tiếng</option>
                                    <option value="0 */3 * * *">3 tiếng</option>
                                    <option value="0 */6 * * *">6 tiếng</option>
                                    <option value="0 */12 * * *">12 tiếng</option>
                                    <option value="0 0 * * *">Mỗi ngày</option>
                                  </select>
                                  <p className="mt-2 text-[11px] text-gray-400">Khoảng cách giữa 2 lần Bot sang trang báo kia để kiểm tra tin mới. (Không ảnh hưởng tới tốc độ Render video).</p>
                                </div>
                              </div>
                              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={ztteam_resetSourceForm}
                                  className="px-5 py-2 text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition-colors">Hủy bỏ</button>
                                <button type="submit"
                                  className="bg-primary text-white px-6 py-2 rounded-full text-sm font-bold shadow-sm hover:opacity-90">
                                  {editingSourceId ? 'Cập nhật nguồn' : 'Lưu cấu hình'}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      {/* Source Items List */}
                      <div className="space-y-3">
                        {siteSources.map(source => (
                          <div
                            key={source.id}
                            className={`flex items-center justify-between p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-all group ${!source.enabled ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900">{source.source_url}</span>
                              </div>
                              <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">CHUYÊN MỤC</span>
                                <span className="text-xs text-gray-700">{source.source_category || 'Mặc định'}</span>
                              </div>
                              <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">TẦN SUẤT</span>
                                <span className="text-xs text-gray-700">{ztteam_cronToLabel(source.frequency_cron)}</span>
                              </div>
                              <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">LẦN TRƯỚC</span>
                                <span className="text-xs text-gray-700">{source.last_crawled_at ? new Date(source.last_crawled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Chưa chạy'}</span>
                              </div>
                              <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">LẦN TỚI</span>
                                <span className="text-xs text-emerald-600 font-bold">
                                  {source.next_crawl_at && new Date(source.next_crawl_at).getTime() > Date.now() ? new Date(source.next_crawl_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : (source.enabled ? 'Đang chờ...' : '-')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Trạng thái</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs font-medium ${source.enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {source.enabled ? 'Hoạt động' : 'Đã tắt'}
                                  </span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer"
                                      checked={source.enabled}
                                      onChange={() => ztteam_toggleSource(source.id, !source.enabled)} />
                                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                  </label>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => ztteam_handleOpenHistory(source.id)}
                                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-full transition-colors" title="Lịch sử cào bài">
                                  <span className="material-symbols-outlined">history</span>
                                </button>
                                <button onClick={() => ztteam_handleEditSource(source)}
                                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-primary rounded-full transition-colors" title="Chỉnh sửa">
                                  <span className="material-symbols-outlined">edit</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    const confirmed = await ztteam_showConfirm('Bạn có chắc chắn muốn xóa nguồn cào này không?');
                                    if (confirmed) {
                                      await ztteam_deleteSource(source.id);
                                      ztteam_showToast('Đã xóa nguồn cào', 'success');
                                      ztteam_fetchSources(site.id);
                                      ztteam_fetchSites();
                                    }
                                  }}
                                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors" title="Xóa">
                                  <span className="material-symbols-outlined">delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {siteSources.length === 0 && (
                          <div className="py-8 text-center text-gray-400 text-sm">
                            Chưa có nguồn cào nào. Bấm "THÊM NGUỒN CÀO" để bắt đầu.
                          </div>
                        )}
                      </div>

                      {/* ── Test Scrape ── */}
                      <div className="mt-6 pt-5 border-t border-slate-100">
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">TEST CÀO BÀI TỰ ĐỘNG</h5>
                        <form onSubmit={ztteam_handleTestScrape} className="flex gap-3 mb-4">
                          <input type="url" value={testScrapeUrl} onChange={(e) => setTestScrapeUrl(e.target.value)}
                            placeholder="Nhập link bài báo (VD: https://vnexpress.net/...)"
                            className="flex-1 py-2.5 px-4 rounded-full bg-gray-100 focus:ring-2 focus:ring-primary text-sm placeholder:text-gray-400" required />
                          <button type="submit" disabled={isScraping}
                            className="flex items-center gap-2 bg-violet-50 text-violet-700 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wide hover:bg-violet-100 transition-all disabled:opacity-50">
                            {isScraping ? (
                              <div className="w-4 h-4 border-2 border-violet-700 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <span className="material-symbols-outlined text-[18px]">search</span>
                            )}
                            Test
                          </button>
                        </form>

                        {scrapeError && (
                          <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            <span className="text-sm">{scrapeError}</span>
                          </div>
                        )}

                        {scrapeResult && (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-xl">
                            <div className="lg:col-span-2 space-y-3">
                              <h3 className="text-title-md font-bold text-gray-900">{ztteam_decodeHtmlEntity(scrapeResult.title)}</h3>
                              <div className="prose prose-sm max-w-none text-gray-600 overflow-y-auto max-h-[300px] p-3 bg-white rounded-lg shadow-inner">
                                <div dangerouslySetInnerHTML={{ __html: scrapeResult.contentHtml }} />
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Ảnh Đại Diện</p>
                              {scrapeResult.image ? (
                                <img src={scrapeResult.image} alt="OG Image" className="w-full rounded-lg object-cover shadow-sm aspect-video" />
                              ) : (
                                <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">Không tìm thấy ảnh</div>
                              )}
                              <div className="mt-auto pt-4">
                                <button
                                  onClick={() => ztteam_handleTestPost(site.id)}
                                  disabled={isPosting && testPostSiteId === site.id}
                                  className="w-full flex justify-center items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-sm hover:opacity-90 disabled:opacity-50">
                                  <span className="material-symbols-outlined text-[18px]">publish</span>
                                  {isPosting && testPostSiteId === site.id ? 'Đang đẩy lên WP...' : 'Đăng thử lên Website'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ──── Empty State ──── */}
          {sites.length === 0 && !isLoading && (
            <div className="mt-12 border-2 border-dashed border-slate-300 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-gray-400 text-[32px]">add_link</span>
              </div>
              <h4 className="text-title-md text-gray-900 font-bold">Thêm website vệ tinh mới?</h4>
              <p className="text-sm text-gray-500 mt-1 mb-6 max-w-md">
                Tự động hóa hoàn toàn nội dung cho hệ thống của bạn bằng cách kết nối thêm nhiều website đích WordPress.
              </p>
              <button
                onClick={() => { setShowSiteForm(true); setEditingSiteId(null); }}
                className="bg-gray-900 text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-wide hover:bg-gray-700 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                Kết nối ngay
              </button>
            </div>
          )}
        </>
      )}

      {/* ──── History Modal ──── */}
      {historyModalSourceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Lịch sử Cào Bài</h3>
                  <p className="text-xs text-gray-500">50 bài viết gần nhất từ nguồn này</p>
                </div>
              </div>
              <button onClick={() => setHistoryModalSourceId(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                  <span className="material-symbols-outlined animate-spin text-3xl mb-2">progress_activity</span>
                  <p className="text-sm">Đang tải lịch sử...</p>
                </div>
              ) : historyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">hourglass_empty</span>
                  <p className="text-sm">Chưa có bài viết nào được cào từ nguồn này.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-6 font-bold w-[60%]">Bài viết</th>
                      <th className="py-3 px-6 font-bold text-center">Trạng thái</th>
                      <th className="py-3 px-6 font-bold text-right">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {historyData.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-6">
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gray-900 hover:text-primary transition-colors flex flex-col gap-1">
                            {ztteam_decodeHtmlEntity(item.title) || 'Đang lấy tiêu đề...'}
                            <span className="text-[11px] text-gray-400 font-normal truncate max-w-lg block">{item.url}</span>
                          </a>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight ${
                            item.status === 'SUCCESS' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                          }`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {item.status === 'SUCCESS' ? 'check_circle' : 'error'}
                            </span>
                            {item.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setHistoryModalSourceId(null)} className="px-6 py-2 bg-gray-900 text-white text-sm font-bold rounded-full hover:bg-gray-800 transition-colors shadow-sm">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
