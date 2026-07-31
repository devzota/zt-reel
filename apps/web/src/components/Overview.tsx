import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { ztteam_decodeHtmlEntity } from '../utils/stringUtils';

export default function Overview() {
  const [stats, setStats] = useState({
    totalPages: 0,
    totalCrawled: 0,
    totalReelsCreated: 0,
    totalReelsPublished: 0,
    successRate: 100,
    alerts: [] as any[],
    activities: [] as any[],
    health: {
      crawler: { status: 'Hoạt động', details: 'OK' },
      factory: { status: 'Đang xử lý', details: 'OK' },
      publisher: { status: 'Sẵn sàng', details: 'OK' }
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('dashboard/stats');
        if (res.data) setStats(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchChart = async () => {
      try {
        const res = await api.get('dashboard/chart');
        if (res.data && res.data.chartData) setChartData(res.data.chartData);
      } catch (e) {
        console.error(e);
      }
    };

    fetchStats();
    fetchChart();
  }, []);

  return (
    <>
    <div className="w-full">
        {/*  Alerts Section  */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {stats.alerts && stats.alerts.length > 0 ? stats.alerts.map((alert: any, idx: number) => (
              <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl shadow-sm ${alert.type === 'TOKEN_EXPIRED' ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${alert.type === 'TOKEN_EXPIRED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                      <span className="material-symbols-outlined" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {alert.type === 'TOKEN_EXPIRED' ? 'warning' : 'error'}
                      </span>
                  </div>
                  <div className="flex-1">
                      <h4 className={`text-sm font-bold ${alert.type === 'TOKEN_EXPIRED' ? 'text-red-700' : 'text-amber-700'}`}>{alert.title}</h4>
                      <p className="text-xs text-gray-500">{alert.message}</p>
                  </div>
              </div>
            )) : (
              <>
                <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <span className="material-symbols-outlined" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-emerald-700">Hệ thống ổn định</h4>
                        <p className="text-xs text-gray-500">Tất cả các Cron job đang hoạt động bình thường, không có cảnh báo.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-cyan-50 rounded-xl shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700">
                        <span className="material-symbols-outlined">smart_toy</span>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-cyan-700">AI Reel Factory</h4>
                        <p className="text-xs text-gray-500">Hệ thống đang sẵn sàng tiếp nhận và render tự động các bài viết mới.</p>
                    </div>
                </div>
              </>
            )}
        </div>

        {/*  Stats Grid  */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {/* Facebook Pages */}
            <div className="glass-card p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-primary">
                        <span className="material-symbols-outlined" data-icon="pages">pages</span>
                    </div>
                    <span className="px-2 py-1 bg-blue-50 text-primary rounded-full text-[10px] font-bold">LIVE</span>
                </div>
                <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Tổng Facebook Page</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900">{isLoading ? '...' : stats.totalPages}</span>
                    <span className="text-xs text-gray-400">Connected</span>
                </div>
            </div>

            {/* Bài Cào */}
            <div className="glass-card p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-violet-50 rounded-xl text-violet-600">
                        <span className="material-symbols-outlined" data-icon="cloud_download">cloud_download</span>
                    </div>
                    <span className="flex items-center text-xs font-bold text-emerald-600">
                        <span className="material-symbols-outlined text-sm" data-icon="trending_up">trending_up</span>
                    </span>
                </div>
                <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Tổng Bài Cào</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900">{isLoading ? '...' : stats.totalCrawled}</span>
                    <span className="text-xs text-gray-400">Tất cả thời gian</span>
                </div>
            </div>

            {/* Reel */}
            <div className="glass-card p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                        <span className="material-symbols-outlined" data-icon="movie_filter">movie_filter</span>
                    </div>
                    <span className="flex items-center text-xs font-bold text-primary">
                        <span className="material-symbols-outlined text-sm" data-icon="sync">sync</span>
                        Processing
                    </span>
                </div>
                <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Tổng Reel Đã Tạo</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900">{isLoading ? '...' : stats.totalReelsCreated}</span>
                    <span className="text-xs text-gray-400">AI Engine</span>
                </div>
            </div>

            {/* Published */}
            <div className="glass-card p-6 flex flex-col hover:-translate-y-1 transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                        <span className="material-symbols-outlined" data-icon="check_circle" data-weight="fill"
                            style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">{isLoading ? '...' : stats.successRate}% Success Rate</span>
                </div>
                <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Bài Đăng Thành Công</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900">{isLoading ? '...' : stats.totalReelsPublished}</span>
                    <span className="text-xs text-gray-400">Auto Published</span>
                </div>
            </div>
        </div>

        {/*  Main Dashboard Content Grid  */}
        <div className="grid grid-cols-12 gap-5">
            {/*  Pipeline Chart (75%)  */}
            <div className="col-span-12 lg:col-span-8 glass-card p-6 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-title-md font-bold text-gray-900">Hiệu suất Pipeline Tự động</h3>
                        <p className="text-xs text-gray-500">Theo dõi dòng chảy dữ liệu từ bài cào đến thành phẩm</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold">7 Ngày qua</button>
                    </div>
                </div>
                {/*  Chart  */}
                <div className="h-64 w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="crawled" name="Bài cào" stroke="#1877f2" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="published" name="Đăng thành công" stroke="#10b981" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-gray-400">Đang tải biểu đồ...</div>
                    )}
                </div>
                <div className="flex gap-6 mt-8 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span className="text-xs text-gray-500">Bài cào (3.4k)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                        <span className="text-xs text-gray-500">Reel tạo (1.2k)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-tertiary"></div>
                        <span className="text-xs text-gray-500">Bài đăng (892)</span>
                    </div>
                </div>
            </div>

            {/*  Side Recent Activity (25%)  */}
            <div className="col-span-12 lg:col-span-4 space-y-5">
                <div className="glass-card p-6 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-title-md font-bold text-gray-900">Hoạt động gần đây</h3>
                        <a className="text-primary text-xs font-bold" href="#">Xem tất cả</a>
                    </div>
                    <div className="space-y-6">
                        {stats.activities && stats.activities.length > 0 ? stats.activities.map((activity: any) => (
                          <div key={activity.id} className="flex gap-4">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${activity.type === 'CRAWL' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                                  {activity.type === 'CRAWL' ? (
                                    <span className="material-symbols-outlined">cloud_download</span>
                                  ) : (
                                    <span className="material-symbols-outlined">movie_filter</span>
                                  )}
                              </div>
                              <div className="flex flex-col justify-between w-full">
                                  <p className="text-sm font-semibold line-clamp-1" title={ztteam_decodeHtmlEntity(activity.title) || ''}>
                                    {ztteam_decodeHtmlEntity(activity.title)}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                      <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                                        activity.status === 'SUCCESS' || activity.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700' : 
                                        activity.status === 'FAILED' ? 'bg-red-50 text-red-600' : 
                                        'bg-blue-50 text-blue-700'
                                      }`}>
                                        {activity.status}
                                      </span>
                                      <span className="truncate flex-1 max-w-[150px]">• {activity.pageName || activity.sourceName}</span>
                                  </div>
                              </div>
                          </div>
                        )) : (
                          <div className="text-sm text-gray-400">Chưa có hoạt động nào gần đây.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/*  System Health Section  */}
        <div className="mt-8">
            <h3 className="text-title-md font-bold text-gray-900 mb-6">Trạng thái hệ thống AI</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="glass-card p-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <span className="material-symbols-outlined" data-icon="database">database</span>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Crawler Node 01</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-sm font-bold text-gray-900">{stats.health.crawler.status} ({stats.health.crawler.details})</span>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
                        <span className="material-symbols-outlined" data-icon="memory">memory</span>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Reel Factory</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                            <span className="text-sm font-bold text-gray-900">{stats.health.factory.status} ({stats.health.factory.details})</span>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                        <span className="material-symbols-outlined" data-icon="publish">publish</span>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Publishing Engine</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-sm font-bold text-gray-900">{stats.health.publisher.status} ({stats.health.publisher.details})</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </>
  );
}