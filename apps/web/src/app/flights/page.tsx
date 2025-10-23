'use client';

import { useState, useMemo } from 'react';
import { FlightTabs } from '../../components/dashboard/flight-tabs';
import { FlightTable } from '../../components/dashboard/flight-table';
import { FlightFilters } from '../../components/dashboard/flight-filters';
import { FloatingActionButton } from '../../components/dashboard/floating-action-button';
import { FlightFormModal } from '../../components/dashboard/flight-form-modal';
import { FlightMonitor } from '../../components/dashboard/flight-monitor';
import { BookingSearchModal } from '../../components/dashboard/booking-search-modal';
import { FlightSearchModal } from '../../components/dashboard/flight-search-modal';
import { AutoFillFlightForm } from '../../components/dashboard/auto-fill-flight-form';
import { Flight, FlightCategoryType } from '@reservasegura/types';
import { mockFlights } from '../../lib/mock-data';

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>(mockFlights);
  const [activeTab, setActiveTab] = useState<FlightCategoryType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAirline, setSelectedAirline] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const [showBookingSearch, setShowBookingSearch] = useState(false);
  const [showFlightSearch, setShowFlightSearch] = useState(false);
  const [showAutoFillForm, setShowAutoFillForm] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);

  // Filter flights based on tab, search, and airline
  const filteredFlights = useMemo(() => {
    let filtered = [...flights];

    // Filter by category
    switch (activeTab) {
      case 'UPCOMING':
        filtered = filtered.filter(f =>
          new Date(f.departureTime) > new Date() && f.status === 'SCHEDULED'
        );
        break;
      case 'PENDING':
        filtered = filtered.filter(f => f.status === 'SCHEDULED');
        break;
      case 'CHECKIN_OPEN':
        filtered = filtered.filter(f => f.checkInStatus === 'OPEN');
        break;
      case 'CHECKIN_CLOSED':
        filtered = filtered.filter(f => f.checkInStatus === 'CLOSED');
        break;
      case 'FLOWN':
        filtered = filtered.filter(f => f.status === 'ARRIVED');
        break;
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        f.passengerFirstName?.toLowerCase().includes(term) ||
        f.passengerLastName?.toLowerCase().includes(term) ||
        f.locator?.toLowerCase().includes(term) ||
        f.origin.toLowerCase().includes(term) ||
        f.destination.toLowerCase().includes(term)
      );
    }

    // Filter by airline
    if (selectedAirline) {
      filtered = filtered.filter(f => f.airline === selectedAirline);
    }

    return filtered;
  }, [flights, activeTab, searchTerm, selectedAirline]);

  // Calculate counts for tabs
  const counts = useMemo(() => ({
    all: flights.length,
    upcoming: flights.filter(f =>
      new Date(f.departureTime) > new Date() && f.status === 'SCHEDULED'
    ).length,
    pending: flights.filter(f => f.status === 'SCHEDULED').length,
    checkinOpen: flights.filter(f => f.checkInStatus === 'OPEN').length,
    checkinClosed: flights.filter(f => f.checkInStatus === 'CLOSED').length,
    flown: flights.filter(f => f.status === 'ARRIVED').length,
  }), [flights]);

  const handleDeleteFlight = (id: string) => {
    setFlights(prev => prev.filter(f => f.id !== id));
  };

  const handleUpdateFlight = (id: string, updates: Partial<Flight>) => {
    setFlights(prev => prev.map(f =>
      f.id === id ? { ...f, ...updates } : f
    ));
  };

  const handleAddFlight = () => {
    setEditingFlight(null);
    setBookingData(null);
    setIsModalOpen(true);
  };

  const handleAddFlightFromBooking = () => {
    setEditingFlight(null);
    setBookingData(null);
    setShowBookingSearch(true);
  };

  const handleSearchFlight = () => {
    setEditingFlight(null);
    setBookingData(null);
    setShowFlightSearch(true);
  };

  const handleFlightSearchFound = (flightData: any) => {
    console.log('✈️ Vôo encontrado, abrindo formulário:', flightData);
    setBookingData(flightData);
    setShowAutoFillForm(true);
  };

  const handleEditFlight = (flight: Flight) => {
    setEditingFlight(flight);
    setBookingData(null);
    setIsModalOpen(true);
  };

  const handleBookingFound = (foundBookingData: any) => {
    console.log('📋 Reserva encontrada, abrindo formulário de voo:', foundBookingData);
    setBookingData(foundBookingData);
    setShowAutoFillForm(true);
  };

  const handleSubmitFlight = (flightData: Omit<Flight, 'id'>) => {
    if (editingFlight) {
      // Edit existing flight
      setFlights(prev => prev.map(f =>
        f.id === editingFlight.id
          ? { ...flightData, id: editingFlight.id }
          : f
      ));
    } else {
      // Add new flight
      const newFlight: Flight = {
        ...flightData,
        id: Date.now().toString(), // Simple ID generation
      };
      setFlights(prev => [...prev, newFlight]);
    }
  };

  const handleFlightFound = (scrapedData: any) => {
    // Add scraped flight data to the list
    if (scrapedData && scrapedData.flights) {
      const newFlights = scrapedData.flights.map((flight: any, index: number) => ({
        id: `scraped_${Date.now()}_${index}`,
        flightNumber: flight.flightNumber || '',
        origin: flight.origin || '',
        destination: flight.destination || '',
        departureTime: new Date(flight.departureTime || Date.now()),
        arrivalTime: new Date(flight.arrivalTime || Date.now()),
        airline: flight.airline || '',
        aircraft: flight.aircraft || 'N/A',
        status: flight.status || 'SCHEDULED',
        checkInStatus: flight.checkInStatus || 'NOT_AVAILABLE',
        locator: flight.locator,
        passengerFirstName: flight.passengerFirstName,
        passengerLastName: flight.passengerLastName,
      }));

      setFlights(prev => [...newFlights, ...prev]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">Gestão de Voos</h1>
              <p className="text-muted-foreground">Gerencie e monitore todos os voos</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSearchFlight}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <span>✈️</span>
                Buscar Vôo
              </button>
              <button
                onClick={() => setShowMonitor(!showMonitor)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                {showMonitor ? 'Ocultar Monitor' : 'Mostrar Monitor'}
              </button>
            </div>
          </div>
          <FlightTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
          />
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {showMonitor && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Monitoramento de Voos Online</h2>
            <FlightMonitor onFlightFound={handleFlightFound} />
          </div>
        )}

        <FlightFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedAirline={selectedAirline}
          onAirlineChange={setSelectedAirline}
        />

        <div className="bg-white rounded-lg shadow">
          <FlightTable
            flights={filteredFlights}
            onDeleteFlight={handleDeleteFlight}
            onUpdateFlight={handleUpdateFlight}
            onEditFlight={handleEditFlight}
          />
        </div>
      </div>

      <FlightFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleSubmitFlight}
        flight={editingFlight}
      />

      <BookingSearchModal
        open={showBookingSearch}
        onOpenChange={setShowBookingSearch}
        onBookingFound={handleBookingFound}
      />

      <FlightSearchModal
        open={showFlightSearch}
        onOpenChange={setShowFlightSearch}
        onFlightFound={handleFlightSearchFound}
      />

      <AutoFillFlightForm
        open={showAutoFillForm}
        onOpenChange={setShowAutoFillForm}
        onSubmit={handleSubmitFlight}
        bookingData={bookingData}
        flight={editingFlight}
      />

      <FloatingActionButton onClick={handleAddFlight} />
    </div>
  );
}
