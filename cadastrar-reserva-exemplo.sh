#!/bin/bash

# Script para cadastrar uma nova reserva no sistema
# Uso: bash cadastrar-reserva-exemplo.sh

echo "📝 Cadastrando nova reserva..."

curl -X POST https://www.reservasegura.pro/api/v2/external-booking/register \
-H "Content-Type: application/json" \
-d '{
  "bookingCode": "XYZ789",
  "lastName": "SANTOS",
  "firstName": "CARLOS",
  "fullName": "Carlos Santos",
  "airline": "AZUL",
  "flightNumber": "AD4506",
  "origin": "CGH",
  "destination": "SDU",
  "departureDate": "2025-12-01T15:00:00.000Z",
  "arrivalDate": "2025-12-01T16:30:00.000Z",
  "seat": "10C",
  "class": "Econômica",
  "email": "carlos.santos@example.com",
  "phone": "+55 11 98888-7777",
  "document": "987.654.321-00",
  "source": "MANUAL",
  "purchaseDate": "2025-11-01T12:00:00.000Z",
  "totalAmount": 450.00
}' -k

echo ""
echo "✅ Reserva cadastrada!"
