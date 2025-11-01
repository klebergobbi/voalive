'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@reservasegura/ui';
import { BarChart, FileText, Download, TrendingUp, DollarSign, Plane, Users, Calendar, Loader2, Filter } from 'lucide-react';
import { apiService } from '../../lib/api';

interface BookingStats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
}

interface TransactionStats {
  total: number;
  totalAmount: number;
  success: number;
  pending: number;
  failed: number;
}

interface FlightStats {
  total: number;
  onTime: number;
  delayed: number;
  cancelled: number;
}

interface MonthlyData {
  month: string;
  bookings: number;
  revenue: number;
}

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [bookingStats, setBookingStats] = useState<BookingStats | null>(null);
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null);
  const [flightStats, setFlightStats] = useState<FlightStats | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    try {
      setIsLoading(true);

      const [bookingsResponse, transactionsResponse, flightsResponse] = await Promise.all([
        apiService.getBookingStats(),
        apiService.getTransactionStats(),
        apiService.getFlightStats(),
      ]);

      if (bookingsResponse.success && bookingsResponse.data) {
        setBookingStats(bookingsResponse.data);
      }

      if (transactionsResponse.success && transactionsResponse.data) {
        setTransactionStats(transactionsResponse.data);
      }

      if (flightsResponse.success && flightsResponse.data) {
        setFlightStats(flightsResponse.data);
      }
    } catch (error: any) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    setIsGeneratingReport(true);

    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In a real implementation, this would call an API endpoint to generate and download the report
    alert(`Relatório de ${reportType} gerado com sucesso! (Funcionalidade em desenvolvimento)`);

    setIsGeneratingReport(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calculateGrowth = (current: number, total: number) => {
    if (total === 0) return 0;
    return ((current / total) * 100).toFixed(1);
  };

  // Calculate monthly data based on actual stats
  const monthlyData: MonthlyData[] = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const totalBookings = bookingStats?.total || 0;
    const totalRevenue = transactionStats?.totalAmount || 0;
    const avgBookingsPerMonth = totalBookings > 0 ? Math.floor(totalBookings / 6) : 0;
    const avgRevenuePerMonth = totalRevenue > 0 ? Math.floor(totalRevenue / 6) : 0;

    return months.map((month, index) => {
      // Distribute data evenly across months
      // In production, this would use actual historical data
      return {
        month,
        bookings: avgBookingsPerMonth,
        revenue: avgRevenuePerMonth,
      };
    });
  }, [bookingStats, transactionStats]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-lg">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart className="h-6 w-6" />
              <div>
                <h1 className="text-2xl font-bold">Relatórios</h1>
                <p className="text-muted-foreground">Análises e estatísticas do sistema</p>
              </div>
            </div>
            <Button onClick={() => handleGenerateReport('Completo')} disabled={isGeneratingReport}>
              {isGeneratingReport ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Tudo
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Filter Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dateFrom">Data Inicial</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dateTo">Data Final</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadAllStats} className="w-full">
                  Aplicar Filtro
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Reservas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingStats?.total || 0}</div>
              <p className="text-xs text-green-600 mt-1">
                +{calculateGrowth(bookingStats?.confirmed || 0, bookingStats?.total || 1)}% confirmadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(transactionStats?.totalAmount || 0)}
              </div>
              <p className="text-xs text-green-600 mt-1">
                {transactionStats?.success || 0} transações concluídas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Total de Voos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{flightStats?.total || 0}</div>
              <p className="text-xs text-blue-600 mt-1">
                {calculateGrowth(flightStats?.onTime || 0, flightStats?.total || 1)}% no horário
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calculateGrowth(bookingStats?.confirmed || 0, bookingStats?.total || 1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Reservas confirmadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Análise de Reservas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Confirmadas</span>
                  <span className="text-lg font-bold text-green-600">
                    {bookingStats?.confirmed || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="font-medium">Pendentes</span>
                  <span className="text-lg font-bold text-yellow-600">
                    {bookingStats?.pending || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="font-medium">Canceladas</span>
                  <span className="text-lg font-bold text-red-600">
                    {bookingStats?.cancelled || 0}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => handleGenerateReport('Reservas')}
                disabled={isGeneratingReport}
                className="w-full mt-4"
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar Relatório de Reservas
              </Button>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Análise Financeira
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Pagamentos Aprovados</span>
                  <span className="text-lg font-bold text-green-600">
                    {transactionStats?.success || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="font-medium">Pagamentos Pendentes</span>
                  <span className="text-lg font-bold text-yellow-600">
                    {transactionStats?.pending || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="font-medium">Pagamentos Falhados</span>
                  <span className="text-lg font-bold text-red-600">
                    {transactionStats?.failed || 0}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => handleGenerateReport('Financeiro')}
                disabled={isGeneratingReport}
                className="w-full mt-4"
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar Relatório Financeiro
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Performance Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-2">
                {monthlyData.map((data, index) => {
                  const maxBookings = Math.max(...monthlyData.map(d => d.bookings));
                  const height = (data.bookings / maxBookings) * 100;

                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div className="w-full flex flex-col-reverse items-center mb-2" style={{ height: '150px' }}>
                        <div
                          className="w-12 bg-blue-500 rounded-t hover:bg-blue-600 transition-all cursor-pointer relative group"
                          style={{ height: `${height}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                            {data.bookings} reservas
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium">{data.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Receita Mensal</h4>
                <div className="grid grid-cols-6 gap-2">
                  {monthlyData.map((data, index) => (
                    <div key={index} className="text-center">
                      <p className="text-xs text-gray-600">{data.month}</p>
                      <p className="text-sm font-bold text-green-600">
                        {formatCurrency(data.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flight Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Estatísticas de Voos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total</p>
                <p className="text-2xl font-bold">{flightStats?.total || 0}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">No Horário</p>
                <p className="text-2xl font-bold text-green-600">{flightStats?.onTime || 0}</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Atrasados</p>
                <p className="text-2xl font-bold text-yellow-600">{flightStats?.delayed || 0}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Cancelados</p>
                <p className="text-2xl font-bold text-red-600">{flightStats?.cancelled || 0}</p>
              </div>
            </div>
            <Button
              onClick={() => handleGenerateReport('Voos')}
              disabled={isGeneratingReport}
              className="w-full mt-4"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar Relatório de Voos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
