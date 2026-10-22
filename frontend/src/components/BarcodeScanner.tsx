import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { fetchOpenFoodFactsProduct, OpenFoodFactsResult } from '../services/openFoodFacts';
import { X, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onProductResolved: (data: OpenFoodFactsResult) => void;
  onClose: () => void;
}

const SUPPORTED_BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
];

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onProductResolved,
  onClose,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isFetchingApi, setIsFetchingApi] = useState<boolean>(false);
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleLookupBarcode = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    setIsFetchingApi(true);
    const result = await fetchOpenFoodFactsProduct(cleanCode);
    setIsFetchingApi(false);
    onProductResolved(result);
  };

  useEffect(() => {
    const regionId = 'barcode-reader-viewport';
    let isHandled = false;

    const html5QrCode = new Html5Qrcode(regionId, {
      formatsToSupport: SUPPORTED_BARCODE_FORMATS,
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    });
    scannerRef.current = html5QrCode;

    const onScanSuccess = async (decodedText: string) => {
      if (isHandled) return;
      isHandled = true;

      if (navigator.vibrate) {
        navigator.vibrate(80);
      }

      await html5QrCode.stop().catch(() => {});
      await handleLookupBarcode(decodedText);
    };

    const scannerConfig = {
      fps: 15,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const width = Math.min(280, Math.floor(viewfinderWidth * 0.85));
        const height = Math.min(140, Math.floor(viewfinderHeight * 0.55));
        return { width: Math.max(200, width), height: Math.max(100, height) };
      },
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
    };

    // Tenta câmera traseira em HD para foco nítido nas barras finas do EAN-13
    html5QrCode
      .start(
        {
          facingMode: 'environment',
        },
        scannerConfig,
        onScanSuccess,
        () => {}
      )
      .catch(() => {
        // Fallback para qualquer câmera disponível (ex: notebook ou câmera frontal)
        html5QrCode
          .start(
            { facingMode: 'user' },
            scannerConfig,
            onScanSuccess,
            () => {}
          )
          .catch(() => {
            setCameraError(
              'Não foi possível abrir o vídeo ao vivo. Use o botão "Tirar foto do código" ou digite abaixo.'
            );
          });
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop().catch(() => {});
      }

      // 1. Tenta BarcodeDetector nativo do navegador primeiro (muito rápido no Android/iOS)
      if ('BarcodeDetector' in window) {
        try {
          const Detector = (window as unknown as { BarcodeDetector: any }).BarcodeDetector;
          const detector = new Detector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
          });
          const bitmap = await createImageBitmap(file);
          const barcodes = await detector.detect(bitmap);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            await handleLookupBarcode(barcodes[0].rawValue);
            return;
          }
        } catch {
          // Segue para o fallback do html5-qrcode
        }
      }

      // 2. Fallback via html5-qrcode scanFile
      const tempScanner =
        scannerRef.current ||
        new Html5Qrcode('barcode-reader-viewport', {
          formatsToSupport: SUPPORTED_BARCODE_FORMATS,
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        });
      const decodedText = await tempScanner.scanFile(file, false);
      await handleLookupBarcode(decodedText);
    } catch {
      setCameraError(
        'Não conseguimos ler o código nessa foto. Tente aproximar mais ou digite os números abaixo.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {});
    }
    await handleLookupBarcode(manualBarcode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F0F0E]/95 backdrop-blur-xl flex flex-col justify-between p-4 text-stone-100">
      <div className="flex items-center justify-between max-w-sm mx-auto w-full">
        <h2 className="text-base font-semibold tracking-tight">Ler código de barras</h2>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-[12px] bg-stone-800 flex items-center justify-center"
          aria-label="Fechar câmera"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="my-auto space-y-3 w-full max-w-sm mx-auto">
        {isFetchingApi ? (
          /* Skeleton Loader silencioso enquanto busca na API */
          <div className="rounded-[12px] bg-[#171716] border border-stone-800 p-5 space-y-3 animate-pulse">
            <div className="h-5 w-40 bg-stone-800 rounded" />
            <div className="h-4 w-28 bg-stone-800/70 rounded" />
            <div className="h-10 w-full bg-stone-800/50 rounded-[12px]" />
          </div>
        ) : (
          <>
            <div
              id="barcode-reader-viewport"
              className="w-full overflow-hidden rounded-[12px] border border-stone-800 bg-black min-h-[220px]"
            />

            {cameraError && (
              <p className="text-xs text-amber-400 text-center px-2">{cameraError}</p>
            )}

            {/* Botão para tirar foto nítida com foco automático da câmera nativa do celular */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-[12px] bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition"
            >
              <Camera className="w-4 h-4" />
              <span>Tirar foto do código (foco automático)</span>
            </button>

            <form
              onSubmit={handleManualSubmit}
              className="bg-[#171716] border border-stone-800 rounded-[12px] p-3 space-y-2"
            >
              <label className="block text-xs text-stone-400">
                Ou digite os números do código
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="7891000100103"
                  className="flex-1 rounded-[12px] bg-stone-900 border border-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!manualBarcode.trim()}
                  className="px-4 py-2 rounded-[12px] bg-stone-100 text-stone-900 disabled:opacity-40 text-xs font-semibold transition"
                >
                  Buscar
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <div className="text-center pb-2">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-stone-400 underline underline-offset-4"
        >
          Preencher sem código
        </button>
      </div>
    </div>
  );
};
