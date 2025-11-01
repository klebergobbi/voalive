'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@reservasegura/ui';
import { HelpCircle, Book, MessageCircle, Mail, Phone, ChevronDown, ChevronUp, Send, Search } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    category: 'Reservas',
    question: 'Como faço para reservar um voo?',
    answer: 'Para reservar um voo, vá até a página de Voos, selecione o voo desejado e clique em "Reservar". Preencha os dados dos passageiros e finalize o pagamento.',
  },
  {
    category: 'Reservas',
    question: 'Posso cancelar minha reserva?',
    answer: 'Sim, você pode cancelar sua reserva acessando a página de Reservas, selecionando a reserva desejada e clicando em "Cancelar Reserva". Verifique a política de cancelamento do voo.',
  },
  {
    category: 'Reservas',
    question: 'Como altero os dados de uma reserva?',
    answer: 'Atualmente não é possível alterar dados de uma reserva existente. Se precisar fazer alterações, cancele a reserva e crie uma nova.',
  },
  {
    category: 'Pagamentos',
    question: 'Quais formas de pagamento são aceitas?',
    answer: 'Aceitamos cartão de crédito, cartão de débito, PIX e boleto bancário. Todas as transações são processadas de forma segura.',
  },
  {
    category: 'Pagamentos',
    question: 'Quando meu pagamento será processado?',
    answer: 'Pagamentos com cartão são processados imediatamente. PIX leva até 24h úteis. Boletos podem levar até 3 dias úteis para compensação.',
  },
  {
    category: 'Pagamentos',
    question: 'Como solicito reembolso?',
    answer: 'Reembolsos são processados automaticamente para reservas canceladas dentro do prazo. O valor será creditado na mesma forma de pagamento em até 10 dias úteis.',
  },
  {
    category: 'Voos',
    question: 'Como acompanho o status do meu voo?',
    answer: 'Acesse a página de "Voos ao Vivo" para ver o status em tempo real de voos. Você também receberá notificações sobre alterações no status do seu voo.',
  },
  {
    category: 'Voos',
    question: 'O que fazer em caso de atraso ou cancelamento?',
    answer: 'Em caso de atraso ou cancelamento, você será notificado automaticamente. Entre em contato com nossa central de suporte para reacomodação em outro voo.',
  },
  {
    category: 'Conta',
    question: 'Como altero minha senha?',
    answer: 'Vá até Configurações > Segurança e use o formulário de alteração de senha. Você precisará informar sua senha atual e a nova senha.',
  },
  {
    category: 'Conta',
    question: 'Como atualizo meus dados pessoais?',
    answer: 'Acesse Configurações > Perfil para atualizar seu nome e email. Alterações no email requerem confirmação.',
  },
];

export default function HelpPage() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const categories = ['Todas', ...Array.from(new Set(faqs.map(faq => faq.category)))];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 2000));

    setFormSuccess(true);
    setContactForm({ name: '', email: '', subject: '', message: '' });
    setIsSending(false);

    setTimeout(() => setFormSuccess(false), 5000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">Central de Ajuda</h1>
              <p className="text-muted-foreground">Encontre respostas e suporte</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Book className="h-8 w-8 mx-auto mb-3 text-blue-500" />
              <h3 className="font-semibold mb-1">Documentação</h3>
              <p className="text-xs text-muted-foreground">Guias completos</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <HelpCircle className="h-8 w-8 mx-auto mb-3 text-green-500" />
              <h3 className="font-semibold mb-1">FAQ</h3>
              <p className="text-xs text-muted-foreground">Perguntas frequentes</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-8 w-8 mx-auto mb-3 text-purple-500" />
              <h3 className="font-semibold mb-1">Chat ao Vivo</h3>
              <p className="text-xs text-muted-foreground">Suporte em tempo real</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Mail className="h-8 w-8 mx-auto mb-3 text-orange-500" />
              <h3 className="font-semibold mb-1">Email</h3>
              <p className="text-xs text-muted-foreground">suporte@voalive.com</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FAQ Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Perguntas Frequentes</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar perguntas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedCategory === category
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* FAQ List */}
                <div className="space-y-3">
                  {filteredFAQs.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Nenhuma pergunta encontrada
                    </p>
                  ) : (
                    filteredFAQs.map((faq, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                          className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex justify-between items-center"
                        >
                          <div className="flex-1">
                            <span className="text-xs text-blue-600 font-medium">{faq.category}</span>
                            <p className="font-medium mt-1">{faq.question}</p>
                          </div>
                          {expandedFAQ === index ? (
                            <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                          )}
                        </button>
                        {expandedFAQ === index && (
                          <div className="p-4 bg-gray-50 border-t">
                            <p className="text-sm text-gray-700">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form & Info */}
          <div className="space-y-6">
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Fale Conosco
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formSuccess ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <p className="text-sm text-green-800 font-medium">
                      Mensagem enviada com sucesso!
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Responderemos em breve.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitContact} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        type="text"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="subject">Assunto</Label>
                      <Input
                        id="subject"
                        type="text"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Mensagem</Label>
                      <textarea
                        id="message"
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        required
                        rows={4}
                        className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>

                    <Button type="submit" disabled={isSending} className="w-full">
                      {isSending ? (
                        <>Enviando...</>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar Mensagem
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Outros Canais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Suporte 24/7</p>
                    <p className="text-sm text-muted-foreground">+55 (11) 0000-0000</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">suporte@voalive.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MessageCircle className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Chat ao Vivo</p>
                    <p className="text-sm text-muted-foreground">Seg-Sex: 8h às 20h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Card */}
            <Card className="bg-red-50 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800">Emergência?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-700 mb-3">
                  Para problemas urgentes relacionados a voos, ligue para nossa central de emergência:
                </p>
                <p className="text-lg font-bold text-red-800">
                  +55 (11) 9999-9999
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Disponível 24h por dia, 7 dias por semana
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
