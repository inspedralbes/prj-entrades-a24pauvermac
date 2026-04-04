<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Exception;

class PaymentController extends Controller
{
    /**
     * Crea una intención de pago (Payment Intent) en Stripe.
     * Esto le dice a Stripe cuánto dinero vamos a cobrar y nos devuelve un código secreto
     * que el frontend de Nuxt necesita para poder mostrar el formulario seguro de la tarjeta.
     */
    public function createPaymentIntent(Request $request)
    {
        try {
            // 1. Obtener la cantidad que vamos a cobrar enviada desde el frontend.
            $precioTotalEnEuros = $request->input('amount');
            
            // Si no nos envían el monto, lanzamos un error explícito
            if ($precioTotalEnEuros == null) {
                return response()->json([
                    'success' => false,
                    'message' => 'Falta indicar la cantidad a cobrar (amount).'
                ], 400);
            }

            // Stripe requiere obligatoriamente que los montos se especifiquen en centavos. 
            // Por ejemplo, 10.50€ serían 1050 centavos. Multiplicamos por 100 y lo convertimos a un entero.
            $precioTotalEnCentavos = intval(round($precioTotalEnEuros * 100));

            // 2. Configurar Stripe usando la clave secreta guardada en el archivo .env
            $claveSecretaDeStripe = env('STRIPE_SECRET');
            
            if (!$claveSecretaDeStripe) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se ha configurado la clave secreta STRIPE_SECRET en el backend.'
                ], 500);
            }

            Stripe::setApiKey($claveSecretaDeStripe);

            // 3. Crear el Payment Intent conectándose a los servidores de Stripe
            $intencionDePago = PaymentIntent::create([
                'amount' => $precioTotalEnCentavos,
                'currency' => 'eur',
                // Permitimos que Stripe gestione automáticamente qué métodos de pago (tarjeta) se ofrecen
                'automatic_payment_methods' => [
                    'enabled' => true,
                ],
            ]);

            // 4. Devolver al frontend nuestro éxito y el 'client_secret' que generó Stripe
            return response()->json([
                'success' => true,
                'clientSecret' => $intencionDePago->client_secret,
                'message' => 'Intención de pago creada correctamente en fase de pruebas.'
            ], 200);

        } catch (Exception $error) {
            // Si algo falla, capturamos el error y devolvemos su mensaje sin ocultar nada
            return response()->json([
                'success' => false,
                'message' => 'A ocurrido un error al comunicar con los servidores de Stripe: ' . $error->getMessage()
            ], 500);
        }
    }
}
