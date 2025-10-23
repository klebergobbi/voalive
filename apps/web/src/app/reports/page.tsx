'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@reservasegura/ui';
import { BarChart, FileText, Download } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análises e estatísticas do sistema</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Relatório de Voos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Análise completa de voos realizados, cancelados e em andamento
              </p>
              <button className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                Gerar Relatório
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatório de Reservas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Estatísticas de reservas por período, status e companhia aérea
              </p>
              <button className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                Gerar Relatório
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Relatório Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Análise de receitas, despesas e faturamento
              </p>
              <button className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                Gerar Relatório
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatório de Passageiros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Dados demográficos e histórico de passageiros
              </p>
              <button className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                Gerar Relatório
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
