/**
 * Admin Dashboard Component
 * 
 * Real-time business metrics and analytics dashboard for administrators.
 * 
 * Features:
 * - Key Performance Indicators (KPIs)
 *   - Total users (registered customers)
 *   - Total orders (lifetime order count)
 *   - Total revenue (₹, all-time)
 *   - Average order value (AOV in ₹)
 *   - Total sessions (visitor analytics)
 * 
 * - Trend Analysis
 *   - Month-over-month growth/decline
 *   - Visual trend indicators (up/down arrows)
 *   - Color-coded positive/negative changes
 * 
 * - Visual Analytics
 *   - Mini sparkline charts on stat cards
 *   - Time-series chart for revenue/orders/users
 *   - Gradient card backgrounds for visual appeal
 * 
 * Data Sources:
 * - User count: users_8927474f table
 * - Order count: orders_8927474f table
 * - Revenue: SUM(price × quantity + shippingCost) from orders
 * - Sessions: Analytics tracking (Google Analytics integration)
 * 
 * Refresh: Loads on mount, manual refresh via button
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Users, ShoppingCart, IndianRupee, Package, Activity } from 'lucide-react';
import { apiCall } from '../../utils/api';

/**
 * Dashboard Component Props
 * Currently no props needed (data fetched from API)
 */
interface DashboardProps {
  // Reserved for future use (e.g., date range filters)
}

export function Dashboard({}: DashboardProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  /**
   * Dashboard Statistics
   * 
   * Core metrics displayed in stat cards:
   * - totalUsers: Count of registered users
   * - totalOrders: Count of all orders (lifetime)
   * - totalRevenue: Sum of all order totals in ₹
   * - averageOrderValue: totalRevenue / totalOrders
   * - totalSessions: Unique visitor sessions (analytics)
   */
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    totalSessions: 0,
  });

  /**
   * Chart Data
   * Time-series data for trend visualization
   * Format: [{ date: '2024-01', revenue: 5000, orders: 20, users: 150 }, ...]
   */
  const [chartData, setChartData] = useState<any[]>([]);
  
  /**
   * Loading State
   * Shows skeleton/loading state while fetching data
   */
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  /**
   * Fetch dashboard statistics from server
   * 
   * API Endpoint: GET /admin/stats
   * 
   * Returns:
   * - stats: Current metrics (total users, orders, revenue, etc.)
   * - chartData: Time-series data for charts
   * 
   * Called on component mount
   */
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await apiCall('/admin/stats', { method: 'GET' });
        if (result.success && result.stats) {
          setStats(result.stats);
          if (result.stats.chartData) {
            setChartData(result.stats.chartData);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  // ============================================================================
  // TREND CALCULATION
  // ============================================================================
  
  /**
   * Calculate month-over-month trend
   * 
   * Compares current month vs previous month to show growth/decline.
   * 
   * Formula:
   * - change% = ((current - previous) / previous) × 100
   * 
   * Edge cases:
   * - Less than 2 data points: Show 0% (insufficient data)
   * - Previous value is 0: Show +100% if current > 0, else 0%
   * 
   * @param key - Metric key (e.g., 'revenue', 'orders', 'users')
   * @returns Trend object with formatted percentage and direction
   * 
   * @example
   * const trend = calculateTrend('revenue');
   * // Returns: { value: '+25.3%', isPositive: true }
   */
  const calculateTrend = (key: string) => {
    // Need at least 2 months of data for comparison
    if (chartData.length < 2) return { value: '0%', isPositive: true };
    
    const current = chartData[chartData.length - 1][key] || 0;  // Latest month
    const previous = chartData[chartData.length - 2][key] || 0; // Previous month
    
    // Handle division by zero (first month of data)
    if (previous === 0) {
      return { 
        value: current > 0 ? '+100%' : '0%', 
        isPositive: true 
      };
    }
    
    // Calculate percentage change
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
      isPositive: change >= 0
    };
  };

  const StatCard = ({ 
    title, 
    value, 
    trendValue,
    isTrendPositive,
    icon: Icon, 
    color, 
    dataKey
  }: { 
    title: string; 
    value: string; 
    trendValue?: string;
    isTrendPositive?: boolean;
    icon: any; 
    color: string;
    dataKey?: string;
  }) => (
    <Card className={`p-6 bg-gradient-to-br ${color} border-0 relative overflow-hidden`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 pr-2">
            <div className="text-xl mb-1 font-bold text-white break-words">{value}</div>
            <div className="text-sm opacity-90 text-white">{title}</div>
          </div>
          <Icon className="w-8 h-8 text-white opacity-80 flex-shrink-0" />
        </div>
        {(trendValue) && (
          <div className="flex items-center gap-2 text-white">
            {isTrendPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{trendValue} from last month</span>
          </div>
        )}
      </div>
      {!!(dataKey && chartData.length > 0) && (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line type="monotone" dataKey={dataKey} stroke="#fff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );

  const userTrend = calculateTrend('newUsers');
  const revenueTrend = calculateTrend('revenue');
  const orderTrend = calculateTrend('orders');
  const sessionTrend = calculateTrend('sessions');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Overview of your business metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          trendValue={revenueTrend.value}
          isTrendPositive={revenueTrend.isPositive}
          icon={IndianRupee}
          color="from-emerald-600 to-emerald-500"
          dataKey="revenue"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders.toString()}
          trendValue={orderTrend.value}
          isTrendPositive={orderTrend.isPositive}
          icon={ShoppingCart}
          color="from-blue-600 to-blue-500"
          dataKey="orders"
        />
        <StatCard
          title="Sessions"
          value={stats.totalSessions.toString()}
          trendValue={sessionTrend.value}
          isTrendPositive={sessionTrend.isPositive}
          icon={Activity}
          color="from-[#dc0000] to-red-600"
          dataKey="sessions"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toString()}
          trendValue={userTrend.value}
          isTrendPositive={userTrend.isPositive}
          icon={Users}
          color="from-purple-600 to-purple-500"
          dataKey="newUsers"
        />
        <StatCard
          title="Avg. Order Value"
          value={`₹${stats.averageOrderValue.toFixed(0)}`}
          icon={Package}
          color="from-orange-500 to-pink-500"
        />
      </div>

      {/* Traffic Chart */}
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white mb-1">Performance Overview</h3>
            <p className="text-sm text-gray-400">Revenue and Orders over the last 6 months</p>
          </div>
        </div>

        <div className="h-[300px]">
          {isLoading ? (
             <div className="h-full flex items-center justify-center text-gray-500">Loading chart...</div>
          ) : chartData.length === 0 ? (
             <div className="h-full flex items-center justify-center text-gray-500">No data available yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#666" 
                  tick={{ fill: '#888' }} 
                  axisLine={{ stroke: '#333' }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#666" 
                  tick={{ fill: '#888' }} 
                  axisLine={{ stroke: '#333' }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#666"
                  tick={{ fill: '#888' }} 
                  axisLine={{ stroke: '#333' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#2a2a2a', 
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  name="Revenue"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  yAxisId="right"
                  name="Orders"
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
