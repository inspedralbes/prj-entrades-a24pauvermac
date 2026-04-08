<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ticket VMK Cinema</title>
    <style>
        @font-face {
            font-family: 'DejaVu Sans';
            src: url('data:font/ttf;base64,') format('truetype');
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'DejaVu Sans', 'Helvetica', 'Arial', sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #1a1a1a;
        }
        
        .ticket-container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 30px;
            border: 2px solid #1a1a1a;
            border-radius: 8px;
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #1a1a1a;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        
        .logo {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 4px;
            margin-bottom: 5px;
        }
        
        .subtitle {
            font-size: 14px;
            color: #666;
            letter-spacing: 2px;
        }
        
        .poster-section {
            text-align: center;
            margin: 15px 0;
        }
        
        .movie-poster {
            width: 150px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .movie-title {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 4px;
        }
        
        .info-section {
            margin: 15px 0;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .info-label {
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 1px;
        }
        
        .info-value {
            font-weight: bold;
        }
        
        .seats-section {
            margin: 20px 0;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 4px;
        }
        
        .seats-title {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .seat-item {
            display: inline-block;
            padding: 5px 12px;
            margin: 3px;
            background-color: #1a1a1a;
            color: white;
            border-radius: 3px;
            font-size: 13px;
            font-weight: bold;
        }
        
        .divider {
            height: 2px;
            background: repeating-linear-gradient(
                to right,
                #1a1a1a,
                #1a1a1a 10px,
                transparent 10px,
                transparent 15px
            );
            margin: 25px 0;
        }
        
        .barcode-section {
            text-align: center;
            margin: 20px 0;
        }
        
        .barcode {
            font-family: 'Courier New', monospace;
            font-size: 18px;
            letter-spacing: 8px;
            font-weight: bold;
            padding: 10px;
            background-color: #f5f5f5;
            display: inline-block;
            border-radius: 4px;
        }
        
        .reservation-code {
            text-align: center;
            margin-top: 15px;
            font-size: 12px;
            color: #666;
        }
        
        .reservation-code strong {
            color: #1a1a1a;
            font-size: 14px;
        }
        
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 10px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="ticket-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">VMK CINEMA</div>
            <div class="subtitle">✦ ✦ ✦ ✦ ✦</div>
        </div>
        
        <!-- Poster -->
        @if($posterUrl)
        <div class="poster-section">
            <img src="{{ $posterUrl }}" alt="Poster" class="movie-poster" />
        </div>
        @endif
        
        <!-- Movie Title -->
        <div class="movie-title">
            {{ $movieTitle }}
        </div>
        
        <!-- Session Info -->
        <div class="info-section">
            <div class="info-row">
                <span class="info-label">Fecha</span>
                <span class="info-value">{{ $date }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Hora</span>
                <span class="info-value">{{ $time }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Sala</span>
                <span class="info-value">{{ $room }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Formato</span>
                <span class="info-value">{{ $format }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Idioma</span>
                <span class="info-value">{{ $language }}</span>
            </div>
        </div>
        
        <!-- Tickets Count -->
        <div class="info-section">
            <div class="info-row">
                <span class="info-label">Entradas</span>
                <span class="info-value">{{ $ticketCount }}</span>
            </div>
        </div>
        
        <!-- Seats -->
        <div class="seats-section">
            <div class="seats-title">Asientos</div>
            @foreach($seats as $seat)
                <span class="seat-item">Fila {{ $seat['row'] }} - Asiento {{ $seat['number'] }}</span>
            @endforeach
        </div>
        
        <!-- Buyer -->
        <div class="info-section">
            <div class="info-row">
                <span class="info-label">Comprador</span>
                <span class="info-value">{{ $buyerName }}</span>
            </div>
        </div>
        
        <!-- Divider -->
        <div class="divider"></div>
        
        <!-- Barcode -->
        <div class="barcode-section">
            <div class="barcode">{{ $barcode }}</div>
        </div>
        
        <!-- Reservation Code -->
        <div class="reservation-code">
            Código de reserva: <strong>{{ $reservationCode }}</strong>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            Conserva este ticket para el acceso a la sala<br>
            No válido para reembolso
        </div>
    </div>
</body>
</html>