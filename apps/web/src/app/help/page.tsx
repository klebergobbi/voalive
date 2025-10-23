'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@reservasegura/ui';
import { HelpCircle, Book, MessageCircle, Mail, Phone } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">Central de Ajuda</h1>
          <p className="text-muted-foreground">Encontre respostas e suporte</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Documentação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Acesse guias completos sobre como usar todas as funcionalidades do sistema
              </p>
              <button className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors">
                Acessar Documentação
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Perguntas Frequentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Encontre respostas rápidas para as dúvidas mais comuns
              </p>
              <button className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors">
                Ver FAQ
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Chat ao Vivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Fale com nossa equipe de suporte em tempo real
              </p>
              <button className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors">
                Iniciar Chat
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Suporte por Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Envie sua dúvida ou problema para nosso email de suporte
              </p>
              <button className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors">
                suporte@reservasegura.pro
              </button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Contato de Emergência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Suporte 24/7</p>
                <p className="text-sm text-muted-foreground">+55 (11) 0000-0000</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
