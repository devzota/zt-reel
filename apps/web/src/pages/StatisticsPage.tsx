import React, { useEffect, useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Area, AreaChart, ComposedChart
} from 'recharts';
import api from '../services/api';
import { useZTTeamFacebookStore } from '../stores/facebookStore';
import { useWordpressStore } from '../stores/wordpressStore';

export default function StatisticsPage() {
  const { pages, ztteam_fetchPagesFromDB } = useZTTeamFacebookStore();
  const { sites, ztteam_fetchSites } = useWordpressStore();

  const [data, setData] = useState({
    chartData: [] as any[],
    leaderboard: [] as any[],
    details: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(7);
  
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [activeChartTab, setActiveChartTab] = useState<'CRAWL' | 'PUBLISH'>('CRAWL');

  useEffect(() => {
    ztteam_fetchPagesFromDB();
    ztteam_fetchSites();
  }, [ztteam_fetchPagesFromDB, ztteam_fetchSites]);

  useEffect(() => {
    const fetchChart = async () => {
      setIsLoading(true);
      try {
        let url = `dashboard/chart?days=${days}`;
        if (selectedPageId) url += `&pageId=${selectedPageId}`;
        if (selectedSiteId) url += `&siteId=${selectedSiteId}`;
        
        const res = await api.get(url);
        if (res.data) {
          setData(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChart();
  }, [days, selectedPageId, selectedSiteId]);

  /** Extract dynamic chart keys */
  const crawlKeys = useMemo(() => {
    if (!data.chartData.length) return [];
    return Object.keys(data.chartData[0]).filter(k => k.startsWith('crawl_'));
  }, [data.chartData]);

  const pubKeys = useMemo(() => {
    if (!data.chartData.length) return [];
    return Object.keys(data.chartData[0]).filter(k => k.startsWith('pub_'));
  }, [data.chartData]);

  const createKeys = useMemo(() => {
    if (!data.chartData.length) return [];
    return Object.keys(data.chartData[0]).filter(k => k.startsWith('create_'));
  }, [data.chartData]);

  const totalCrawled = useMemo(() => {
    return data.chartData.reduce((sum, d) => {
      let dailySum = 0;
      crawlKeys.forEach(k => dailySum += (d[k] || 0));
      return sum + dailySum;
    }, 0);
  }, [data.chartData, crawlKeys]);

  const totalPublished = useMemo(() => {
    return data.chartData.reduce((sum, d) => {
      let dailySum = 0;
      pubKeys.forEach(k => dailySum += (d[k] || 0));
      return sum + dailySum;
    }, 0);
  }, [data.chartData, pubKeys]);

  const totalCreated = useMemo(() => {
    return data.chartData.reduce((sum, d) => {
      let dailySum = 0;
      createKeys.forEach(k => dailySum += (d[k] || 0));
      return sum + dailySum;
    }, 0);
  }, [data.chartData, createKeys]);

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444'];
  const pubColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Báo cáo Thống kê</h2>
          <p className="text-sm text-gray-500 mt-1">Hiệu suất cào bài, đăng video và tương tác Facebook Insights toàn hệ thống</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
            <select
              className="px-4 py-2 rounded-full text-sm font-semibold bg-white border border-slate-200/60 text-slate-700 outline-none focus:border-primary focus:ring-0 cursor-pointer shadow-sm"
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
            >
              <option value="">Tất cả Fanpage</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              className="px-4 py-2 rounded-full text-sm font-semibold bg-white border border-slate-200/60 text-slate-700 outline-none focus:border-primary focus:ring-0 cursor-pointer shadow-sm"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              <option value="">Tất cả Website</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.wp_url}</option>
              ))}
            </select>

            <div className="flex items-center bg-white border border-slate-200/60 rounded-full p-1 shadow-sm">
              <button onClick={() => setDays(7)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${days === 7 ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>7 Ngày</button>
              <button onClick={() => setDays(30)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${days === 30 ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>30 Ngày</button>
            </div>
        </div>
      </div>

      {/* 4 KPI Overview Cards (Facebook Insights) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-extrabold uppercase tracking-wider">Tổng Lượt Xem (Views)</span>
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">visibility</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-800">
              {(data as any).overview?.totalMediaViews?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">FB Insights</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-extrabold uppercase tracking-wider">Lượt Tiếp Cận (Reach)</span>
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">campaign</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-800">
              {(data as any).overview?.totalUniqueReach?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Unique</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-extrabold uppercase tracking-wider">Tổng Tương Tác</span>
            <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">thumb_up</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-800">
              {(data as any).overview?.totalEngagements?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Reactions+</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-extrabold uppercase tracking-wider">Follower Mới</span>
            <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-800">
              +{(data as any).overview?.newFollowers?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">7 ngày</span>
          </div>
        </div>
      </div>

      {/* Biểu đồ Tổng hợp (Comprehensive Chart Frame) - 3 Columns */}
      {isLoading ? (
        <div className="glass-card py-24 w-full flex flex-col items-center justify-center text-slate-400 mb-8">
          <span className="material-symbols-outlined animate-spin text-4xl mb-2">refresh</span>
          <span className="font-medium">Đang tải dữ liệu biểu đồ...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Crawled Card */}
          <div className="glass-card p-6 rounded-3xl flex flex-col">
            <div className="mb-6 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-sky-500 mb-1 uppercase tracking-wider">Bài Cào Về</p>
                <h3 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                  {totalCrawled.toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">language</span>
              </div>
            </div>
            
            <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData} syncId="reportSync" margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="reportCrawled" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e0f2fe', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }} cursor={{ stroke: '#93c5fd', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        {crawlKeys.map((key, idx) => (
                          <Area key={key} type="monotone" name={key.replace('crawl_', '')} dataKey={key} stroke={colors[idx % colors.length]} fill="url(#reportCrawled)" strokeWidth={2} />
                        ))}
                        {crawlKeys.length === 0 && (
                          <Area type="monotone" dataKey="crawled" name="Tải về (Crawl)" stroke="#0ea5e9" fill="url(#reportCrawled)" strokeWidth={2} />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>
          
          {/* Created Card */}
          <div className="glass-card p-6 rounded-3xl flex flex-col">
            <div className="mb-6 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-amber-500 mb-1 uppercase tracking-wider">Tạo Thành Công</p>
                <h3 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                  {totalCreated.toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">movie_filter</span>
              </div>
            </div>
            
            <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData} syncId="reportSync" margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="reportCreated" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #fef3c7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }} cursor={{ stroke: '#fcd34d', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        {createKeys.map((key, idx) => (
                          <Area key={key} type="monotone" name={key.replace('create_', '')} dataKey={key} stroke={pubColors[idx % pubColors.length]} fill="url(#reportCreated)" strokeWidth={2} />
                        ))}
                        {createKeys.length === 0 && (
                          <Area type="monotone" dataKey="created" name="Tạo nội dung" stroke="#f59e0b" fill="url(#reportCreated)" strokeWidth={2} />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>

          {/* Published Card */}
          <div className="glass-card p-6 rounded-3xl flex flex-col">
            <div className="mb-6 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-emerald-500 mb-1 uppercase tracking-wider">Đã Đăng (Publish)</p>
                <h3 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                  {totalPublished.toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/24000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
            </div>
            
            <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData} syncId="reportSync" margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="reportPublished" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #d1fae5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }} cursor={{ stroke: '#6ee7b7', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        {pubKeys.map((key, idx) => (
                          <Area key={key} type="monotone" name={key.replace('pub_', '')} dataKey={key} stroke={pubColors[idx % pubColors.length]} fill="url(#reportPublished)" strokeWidth={2} />
                        ))}
                        {pubKeys.length === 0 && (
                          <Area type="monotone" dataKey="published" name="Đăng Fanpage" stroke="#10b981" fill="url(#reportPublished)" strokeWidth={2} />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Leaderboard Fanpage */}
        <div className="glass-card p-0 xl:col-span-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between z-10">
            <div>
              <h3 className="text-[15px] sm:text-base font-bold text-slate-800 tracking-tight">Top Fanpage Xuất Sắc</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Xếp hạng theo lượt tương tác</p>
            </div>
            <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded-md shadow-sm border border-emerald-200/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Real-time
            </span>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-white custom-scrollbar">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                <span className="material-symbols-outlined animate-spin text-3xl mb-2">refresh</span>
                <span className="text-sm font-medium">Đang tải xếp hạng...</span>
              </div>
            ) : data.leaderboard.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">hide_image</span>
                <span className="text-sm font-medium">Chưa có dữ liệu Fanpage</span>
              </div>
            ) : (
              <div className="space-y-3">
                {data.leaderboard.map((page, index) => (
                  <div key={index} className="group flex items-center p-3 rounded-2xl bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ring-1 ring-slate-100 hover:ring-blue-100">
                    {/* Rank Indicator */}
                    <div className={`w-7 font-black text-xl text-center tracking-tighter shrink-0 ${
                      index === 0 ? 'text-amber-400 drop-shadow-sm' :
                      index === 1 ? 'text-slate-400 drop-shadow-sm' :
                      index === 2 ? 'text-orange-400 drop-shadow-sm' :
                      'text-slate-200'
                    }`}>
                      {index + 1}
                    </div>
                    
                    {/* Avatar */}
                    <div className="relative shrink-0 ml-1">
                      {page.avatar ? (
                        <img 
                          src={page.avatar} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.fallback) {
                              target.dataset.fallback = 'true';
                              target.src = `https://graph.facebook.com/${page.fbPageId || page.pageId}/picture?type=large`;
                            }
                          }}
                          className="w-10 h-10 rounded-full shadow-sm object-cover ring-2 ring-white" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center ring-2 ring-white">
                          <span className="material-symbols-outlined text-[18px] text-slate-400">storefront</span>
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-[8px] text-white">done</span>
                      </div>
                    </div>

                    {/* Page Info */}
                    <div className="flex-1 min-w-0 ml-3">
                      <p className="text-[13px] sm:text-[14px] font-bold text-slate-800 truncate leading-snug">{page.pageName}</p>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">Đã đăng {page.published} bài</p>
                    </div>
                    
                    {/* Stats Inline on Right */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg" title="Số bài đã đăng thành công trên Fanpage">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        <span className="text-[11px] font-black">{page.published} bài</span>
                      </div>
                      <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg" title="Tổng lượt tương tác (Like, React, Comment, Share) từ Facebook">
                        <span className="material-symbols-outlined text-[13px]">trending_up</span>
                        <span className="text-[11px] font-black">{page.interactions?.toLocaleString() || 0} TT</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Grid: Highlighted Posts */}
        <div className="glass-card p-0 xl:col-span-2 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center z-10">
            <div>
              <h3 className="text-[15px] sm:text-base font-bold text-slate-800 tracking-tight">Video Nổi Bật Tương Tác Cao</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Top 15 video xu hướng trên hệ thống</p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-amber-50">
              <span className="material-symbols-outlined text-[18px] text-amber-500">local_fire_department</span>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 p-5 bg-white overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                <span className="material-symbols-outlined animate-spin text-3xl mb-2">refresh</span>
                <span className="text-sm font-medium">Đang tải video nổi bật...</span>
              </div>
            ) : data.details.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">videocam_off</span>
                <span className="text-sm font-medium">Không có dữ liệu video nổi bật</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.details.map((post, index) => (
                  <div key={post.id} className="group relative flex items-start gap-3.5 p-3 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all duration-300 ring-1 ring-slate-100 hover:ring-blue-100">
                    
                    {/* Rank Badge - Floating */}
                    <div className="absolute -left-2 -top-2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center z-10">
                      <span className={`text-[10px] font-black ${
                        index === 0 ? 'text-amber-500' : 
                        index === 1 ? 'text-slate-500' : 
                        index === 2 ? 'text-orange-500' : 
                        'text-slate-400'
                      }`}>
                        #{index + 1}
                      </span>
                    </div>

                    {/* Thumbnail - Compact Reel Ratio */}
                    <div className="w-14 h-20 rounded-xl bg-slate-100 shrink-0 relative overflow-hidden shadow-sm">
                      <img 
                        src={post.thumbnail} 
                        alt={post.title} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">play_arrow</span>
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col h-20 justify-between py-0.5">
                      <div>
                        {/* Page Tag */}
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 mb-1.5">
                          <span className="material-symbols-outlined text-[10px]">verified</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-[120px]">{post.pageName}</span>
                        </div>
                        {/* Title */}
                        <p className="text-[12px] sm:text-[13px] font-semibold text-slate-800 leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </p>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-3 mt-auto">
                        <div className="flex items-center gap-1 text-slate-500">
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          <span className="text-[11px] font-black text-slate-600">{post.views?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-rose-400">
                          <span className="material-symbols-outlined text-[14px]">favorite</span>
                          <span className="text-[11px] font-black text-rose-500">{post.reactions?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
