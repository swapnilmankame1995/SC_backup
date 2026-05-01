import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Activity, Users, Calendar, Loader2, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { apiCall } from '../../utils/api';
import { toast } from 'sonner@2.0.3';

interface ChartDataPoint {
  month: string;
  year: number;
  orders: number;
  revenue: number;
  newUsers: number;
  sessions: number;
}

interface SessionData {
  sessionId: string;
  page: string;
  userAgent: string;
  referrer: string;
  timestamp: string;
}

export function Analytics() {
  const [timeRange, setTimeRange] = useState('month');
  const [sessionsTimeRange, setSessionsTimeRange] = useState<'day' | 'week' | 'month' | '6months'>('week');
  const [isLoading, setIsLoading] = useState(true);
  
  // Real data from backend
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [averageOrderValue, setAverageOrderValue] = useState(0);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [ordersByState, setOrdersByState] = useState<any[]>([]);
  const [sessionData, setSessionData] = useState<SessionData[]>([]);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [sessionsTimeRange]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const result = await apiCall('/admin/stats', { method: 'GET' });
      
      if (result.success && result.stats) {
        setTotalRevenue(result.stats.totalRevenue || 0);
        setTotalOrders(result.stats.totalOrders || 0);
        setTotalUsers(result.stats.totalUsers || 0);
        setTotalSessions(result.stats.totalSessions || 0);
        setAverageOrderValue(result.stats.averageOrderValue || 0);
        setChartData(result.stats.chartData || []);
      }
    } catch (error: any) {
      console.error('Load stats error:', error);
      toast.error('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const result = await apiCall(`/admin/analytics?range=${sessionsTimeRange}`, { method: 'GET' });
      
      if (result.success && result.analytics) {
        setSessionData(result.analytics.sessionData || []);
        
        // Convert ordersByState object to array for pie chart
        if (result.analytics.ordersByState) {
          const stateColors = ['#dc0000', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6b7280'];
          const stateData = Object.entries(result.analytics.ordersByState)
            .map(([state, orders], index) => ({
              state,
              orders: orders as number,
              color: stateColors[index % stateColors.length]
            }))
            .sort((a, b) => b.orders - a.orders);
          
          setOrdersByState(stateData);
        }
      }
    } catch (error: any) {
      console.error('Load analytics error:', error);
      toast.error('Failed to load analytics data');
    }
  };

  const cleanupOldSessions = async () => {
    if (!confirm('This will delete all session data older than 90 days. Continue?')) {
      return;
    }

    try {
      setIsCleaningUp(true);
      const result = await apiCall('/admin/cleanup-old-sessions', { method: 'POST' });
      
      if (result.success) {
        toast.success(result.message);
        // Refresh analytics after cleanup
        await loadStats();
        await loadAnalytics();
      }
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast.error('Failed to cleanup old sessions');
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Process session data for chart based on time range
  const getSessionsChartData = () => {
    if (!sessionData.length) return [];

    const now = new Date();
    
    switch (sessionsTimeRange) {
      case 'day': {
        // Group by hour
        const hourlyData: { [key: string]: number } = {};
        for (let i = 0; i < 24; i += 3) {
          hourlyData[`${i}:00`] = 0;
        }
        
        sessionData.forEach(session => {
          const hour = new Date(session.timestamp).getHours();
          const key = `${Math.floor(hour / 3) * 3}:00`;
          if (hourlyData[key] !== undefined) {
            hourlyData[key]++;
          }
        });
        
        return Object.entries(hourlyData).map(([label, sessions]) => ({ label, sessions }));
      }
      
      case 'week': {
        // Group by day of week
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dailyData: { [key: string]: number } = {};
        days.forEach(day => dailyData[day] = 0);
        
        sessionData.forEach(session => {
          const day = days[new Date(session.timestamp).getDay()];
          dailyData[day]++;
        });
        
        return days.map(day => ({ label: day, sessions: dailyData[day] }));
      }
      
      case 'month': {
        // Group by week
        const weeklyData: { [key: string]: number } = {
          'Week 1': 0,
          'Week 2': 0,
          'Week 3': 0,
          'Week 4': 0,
          'Week 5': 0
        };
        
        sessionData.forEach(session => {
          const date = new Date(session.timestamp);
          const dayOfMonth = date.getDate();
          const week = Math.ceil(dayOfMonth / 7);
          const key = `Week ${week}`;
          if (weeklyData[key] !== undefined) {
            weeklyData[key]++;
          }
        });
        
        return Object.entries(weeklyData).map(([label, sessions]) => ({ label, sessions }));
      }
      
      case '6months': {
        // Group by month
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyData: { [key: string]: number } = {};
        
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthName = months[d.getMonth()];
          monthlyData[monthName] = 0;
        }
        
        sessionData.forEach(session => {
          const monthName = months[new Date(session.timestamp).getMonth()];
          if (monthlyData[monthName] !== undefined) {
            monthlyData[monthName]++;
          }
        });
        
        return Object.entries(monthlyData).map(([label, sessions]) => ({ label, sessions }));
      }
      
      default:
        return [];
    }
  };

  // Calculate conversion rate (orders / sessions)
  // Note: Requires session tracking to be enabled
  const conversionRate = totalSessions > 0 ? (totalOrders / totalSessions) * 100 : 0;
  
  // Check if session tracking is active (has any session data)
  const hasSessionData = totalSessions > 0 || sessionData.length > 0;

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    trend 
  }: { 
    title: string; 
    value: string; 
    change?: string; 
    icon: any;
    trend?: 'up' | 'down';
  }) => (
    <Card className="p-6 bg-[#1a1a1a] border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-blue-950 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-500" />
        </div>
        {change && trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {change}
          </div>
        )}
      </div>
      <div className="text-3xl text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const sessionsChartData = getSessionsChartData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white mb-2">Analytics & Reports</h1>
          <p className="text-gray-400">Detailed business analytics and performance metrics</p>
        </div>
        <div className="flex gap-2">
          {hasSessionData && (
            <Button
              onClick={cleanupOldSessions}
              variant="outline"
              disabled={isCleaningUp}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              {isCleaningUp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cleanup Old Data
                </>
              )}
            </Button>
          )}
          <Button
            onClick={() => { loadStats(); loadAnalytics(); }}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Session Tracking Status Banner */}
      {!hasSessionData && (
        <Card className="p-4 bg-blue-950/20 border-blue-900/50">
          <div className="flex items-start gap-3">
            <div className="text-blue-500 mt-0.5">ℹ️</div>
            <div>
              <p className="text-blue-400 mb-1">Custom Session Tracking is Disabled</p>
              <p className="text-sm text-gray-400">
                Using Google Analytics or Facebook Pixel instead? Great! They use zero server resources. 
                Session-based metrics are hidden, but all order and revenue analytics are fully functional.
                <span className="block mt-1 text-xs text-gray-500">
                  To re-enable custom tracking: Set <code className="bg-black/30 px-1 py-0.5 rounded">ENABLED: true</code> in <code className="bg-black/30 px-1 py-0.5 rounded">/utils/sessionTracking.ts</code>
                </span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Key Metrics */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${hasSessionData ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        <StatCard
          title="Gross Sales"
          value={`₹${(totalRevenue / 1000).toFixed(1)}K`}
          icon={DollarSign}
        />
        <StatCard
          title="Total Orders"
          value={totalOrders.toString()}
          icon={ShoppingCart}
        />
        <StatCard
          title="Avg Order Value"
          value={`₹${averageOrderValue.toFixed(0)}`}
          icon={TrendingUp}
        />
        {hasSessionData && (
          <StatCard
            title="Conversion Rate"
            value={`${conversionRate.toFixed(2)}%`}
            icon={Activity}
          />
        )}
      </div>

      {/* Revenue & Orders Chart */}
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <h3 className="text-white mb-6">Revenue & Orders Over Time (Last 6 Months)</h3>
        {chartData.length > 0 ? (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis yAxisId="left" stroke="#666" />
                <YAxis yAxisId="right" orientation="right" stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Revenue (₹)"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-gray-500">
            No data available
          </div>
        )}
      </Card>

      <div className={`grid grid-cols-1 ${hasSessionData ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Sessions Analytics with Time Range Filter - Only show if session tracking is enabled */}
        {hasSessionData && (
          <Card className="p-6 bg-[#1a1a1a] border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white">Sessions Analytics</h3>
              <div className="flex gap-2">
                <Button
                  variant={sessionsTimeRange === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSessionsTimeRange('day')}
                  className={sessionsTimeRange === 'day' ? 'bg-[#dc0000] hover:bg-[#b80000] border-0' : 'border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'}
                >
                  Day
                </Button>
                <Button
                  variant={sessionsTimeRange === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSessionsTimeRange('week')}
                  className={sessionsTimeRange === 'week' ? 'bg-[#dc0000] hover:bg-[#b80000] border-0' : 'border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'}
                >
                  Week
                </Button>
                <Button
                  variant={sessionsTimeRange === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSessionsTimeRange('month')}
                  className={sessionsTimeRange === 'month' ? 'bg-[#dc0000] hover:bg-[#b80000] border-0' : 'border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'}
                >
                  Month
                </Button>
                <Button
                  variant={sessionsTimeRange === '6months' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSessionsTimeRange('6months')}
                  className={sessionsTimeRange === '6months' ? 'bg-[#dc0000] hover:bg-[#b80000] border-0' : 'border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'}
                >
                  6 Months
                </Button>
              </div>
            </div>
            {sessionsChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sessionsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #333',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sessions" 
                      stroke="#dc0000" 
                      strokeWidth={3}
                      dot={{ fill: '#dc0000', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Sessions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No session data available for this time range
              </div>
            )}
          </Card>
        )}

        {/* Orders by State */}
        <Card className="p-6 bg-[#1a1a1a] border-gray-800">
          <h3 className="text-white mb-6">Orders by State</h3>
          {ordersByState.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByState}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ state, percent }) => state && percent !== undefined ? `${state}: ${(percent * 100).toFixed(0)}%` : ''}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="orders"
                  >
                    {ordersByState.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No state data available
            </div>
          )}
        </Card>
      </div>

      {/* Additional Metrics Table */}
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <h3 className="text-white mb-6">Detailed Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-2">Total Users</div>
            <div className="text-2xl text-white">{totalUsers.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-2">Total Sessions</div>
            <div className="text-2xl text-white">{totalSessions.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-2">Total Revenue</div>
            <div className="text-2xl text-white">₹{totalRevenue.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-2">Conversion Rate</div>
            <div className="text-2xl text-white">{conversionRate.toFixed(2)}%</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
