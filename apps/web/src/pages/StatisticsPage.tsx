import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import api from '../services/api';
import { useZTTeamFacebookStore } from '../stores/facebookStore';
import { useWordpressStore } from '../stores/wordpressStore';

export default function StatisticsPage() {
  const { pages, ztteam_fetchPagesFromDB } = useZTTeamFacebookStore();
  const { sites, ztteam_fetchSites } = useWordpressStore();

  const [data, setData] = useState({
    chartData: [],
    leaderboard: [] as any[],
    details: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(7);
  
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Báo cáo Thống kê</h2>
          <p className="text-sm text-gray-500 mt-1">Hiệu suất cào bài và đăng video toàn hệ thống</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
            <select
              className="px-4 py-2 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-700 outline-none focus:border-primary"
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
            >
              <option value="">Tất cả Fanpage</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              className="px-4 py-2 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-700 outline-none focus:border-primary"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              <option value="">Tất cả Website</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.wp_url}</option>
              ))}
            </select>

            <button onClick={() => setDays(7)} className={`px-4 py-2 rounded-full text-xs font-bold ${days === 7 ? 'bg-primary text-white' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>7 Ngày qua</button>
            <button onClick={() => setDays(30)} className={`px-4 py-2 rounded-full text-xs font-bold ${days === 30 ? 'bg-primary text-white' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>30 Ngày qua</button>
        </div>
      </div>

      {/* Biểu đồ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Biểu đồ Bài viết cào được</h3>
          <div className="h-[300px] w-full">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">Đang tải biểu đồ...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Line type="monotone" name="Bài mới cào" dataKey="crawled" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Biểu đồ Video đã đăng</h3>
          <div className="h-[300px] w-full">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">Đang tải biểu đồ...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar name="Video thành công" dataKey="published" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard Fanpage */}
        <div className="glass-card p-6 lg:col-span-1">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Fanpage hoạt động</h3>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Đang tải...</div>
          ) : data.leaderboard.length === 0 ? (
            <div className="py-8 text-center text-gray-500">Chưa có dữ liệu Fanpage nào</div>
          ) : (
            <div className="space-y-4">
              {data.leaderboard.map((page, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{page.pageName}</p>
                      <p className="text-xs text-gray-500">{page.published} video ({page.rate}%)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Tốt
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Table */}
        <div className="glass-card p-0 lg:col-span-2 flex flex-col h-full">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Báo cáo chi tiết theo ngày</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Ngày</th>
                  <th className="px-6 py-4 font-medium">Bài đã cào</th>
                  <th className="px-6 py-4 font-medium">Video tạo thành công</th>
                  <th className="px-6 py-4 font-medium">Video lỗi</th>
                  <th className="px-6 py-4 font-medium">Tỉ lệ thành công</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">Đang tải dữ liệu...</td></tr>
                ) : data.details.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">Không có dữ liệu</td></tr>
                ) : (
                  data.details.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{row.date}</td>
                      <td className="px-6 py-4 text-emerald-600 font-medium">{row.crawled}</td>
                      <td className="px-6 py-4 text-blue-600 font-medium">{row.published}</td>
                      <td className="px-6 py-4 text-red-500 font-medium">{row.failed}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden w-24">
                            <div 
                              className={`h-full rounded-full ${row.successRate >= 80 ? 'bg-emerald-500' : row.successRate >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                              style={{ width: `${row.successRate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-8">{row.successRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
