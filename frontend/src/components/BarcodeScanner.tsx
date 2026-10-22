import React, { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { fetchOpenFoodFactsProduct, OpenFoodFactsResult } from '../services/openFoodFacts';
import { X, Camera, Flashlight, ZoomIn } from 'lucide-react';

interface BarcodeScannerProps {
  onProductResolved: (data: OpenFoodFactsResult) => void;
  onClose: () => void;
}

/**
 * Valida o dígito verificador oficial (Módulo 10) de códigos EAN-13, EAN-8 e UPC-A
 * para evitar leituras parciais ou incorretas.
 */
function isValidEanOrUpc(code: string): boolean {
  const digits = code.replace(/\D/g, '');
  if (![8, 12, 13].includes(digits.length)) return false;

  const nums = digits.split('').map(Number);
  const checkDigit = nums.pop()!;
  let sum = 0;

  // Da direita para a esquerda (excluindo o dígito verificador), multiplica alternadamente por 3 e 1
  for (let i = nums.length - 1, pos = 0; i >= 0; i--, pos++) {
    sum += nums[i] * (pos % 2 === 0 ? 3 : 1);
  }

  const calculated = (10 - (sum % 10)) % 10;
  return calculated === checkDigit;
}

async function decodeCanvasWithQuagga(canvas: HTMLCanvasElement): Promise<string | null> {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

  for (const patchSize of ['medium', 'large', 'small'] as const) {
    try {
      const result = await Quagga.decodeSingle({
        src: dataUrl,
        numOfWorkers: 0,
        locate: true,
        inputStream: {
          size: Math.max(canvas.width, canvas.height),
        },
        locator: {
          patchSize,
          halfSample: true,
        },
        decoder: {
          readers: ['ean_reader', 'ean_8_reader', 'upc_reader'],
        },
      });

      const code = result?.codeResult?.code?.trim();
      if (code && isValidEanOrUpc(code)) {
        return code;
      }
    } catch {
      // Tenta próximo patchSize
    }
  }
  return null;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onProductResolved,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isFetchingApi, setIsFetchingApi] = useState<boolean>(false);
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleLookupBarcode = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    stopCamera();
    if (navigator.vibrate) {
      navigator.vibrate(90);
    }
    setIsFetchingApi(true);
    const result = await fetchOpenFoodFactsProduct(cleanCode);
    setIsFetchingApi(false);
    onProductResolved(result);
  };

  useEffect(() => {
    let isCancelled = false;
    let isHandled = false;
    let lastCandidate = '';
    let scanTimer: ReturnType<typeof setTimeout> | null = null;

    const workCanvas = document.createElement('canvas');
    const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });

    let nativeDetector: any = null;
    if ('BarcodeDetector' in window) {
      try {
        const Detector = (window as unknown as { BarcodeDetector: any }).BarcodeDetector;
        nativeDetector = new Detector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
        });
      } catch {
        nativeDetector = null;
      }
    }

    async function startVideo() {
      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: 'environment' },
          });
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = (
            videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}
          ) as Record<string, any>;

          if (capabilities.torch) {
            setTorchSupported(true);
          }

          // Ativa autofoco contínuo no celular quando suportado
          const advanced: Record<string, any>[] = [];
          if (
            Array.isArray(capabilities.focusMode) &&
            capabilities.focusMode.includes('continuous')
          ) {
            advanced.push({ focusMode: 'continuous' });
          }
          if (advanced.length > 0) {
            videoTrack.applyConstraints({ advanced } as any).catch(() => {});
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const scanLoop = async () => {
          if (isCancelled || isHandled) return;

          const video = videoRef.current;
          if (video && video.readyState >= 2 && video.videoWidth > 0 && workCtx) {
            // 1. Tenta BarcodeDetector nativo primeiro
            if (nativeDetector) {
              try {
                const barcodes = await nativeDetector.detect(video);
                if (barcodes && barcodes.length > 0) {
                  const raw = String(barcodes[0].rawValue || '').trim();
                  if (isValidEanOrUpc(raw)) {
                    isHandled = true;
                    await handleLookupBarcode(raw);
                    return;
                  }
                }
              } catch {
                // Continua para o motor Quagga2
              }
            }

            // 2. Recorta a faixa central em alta definição para o Quagga2
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const cropW = Math.floor(vw * 0.85);
            const cropH = Math.floor(vh * 0.45);
            const sx = Math.floor((vw - cropW) / 2);
            const sy = Math.floor((vh - cropH) / 2);

            workCanvas.width = Math.min(1280, cropW);
            workCanvas.height = Math.floor(
              workCanvas.width * (cropH / Math.max(1, cropW))
            );

            workCtx.drawImage(
              video,
              sx,
              sy,
              cropW,
              cropH,
              0,
              0,
              workCanvas.width,
              workCanvas.height
            );

            const code = await decodeCanvasWithQuagga(workCanvas);
            if (code && !isCancelled && !isHandled) {
              // Confirma se leu o mesmo código válido 2 vezes ou se tem 13 dígitos perfeitos
              if (code === lastCandidate || code.length === 13) {
                isHandled = true;
                await handleLookupBarcode(code);
                return;
              }
              lastCandidate = code;
            }
          }

          if (!isCancelled && !isHandled) {
            scanTimer = setTimeout(scanLoop, 180);
          }
        };

        scanTimer = setTimeout(scanLoop, 300);
      } catch {
        if (!isCancelled) {
          setCameraError(
            'Permissão da câmera negada ou indisponível. Use o botão "Tirar foto do código" abaixo.'
          );
        }
      }
    }

    startVideo();

    return () => {
      isCancelled = true;
      if (scanTimer) clearTimeout(scanTimer);
      stopCamera();
    };
  }, []);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next }] as any,
      });
      setTorchOn(next);
    } catch {
      // Ignora caso o aparelho bloqueie
    }
  };

  const toggleZoom = async () => {
    const nextZoom = zoomLevel === 1 ? 1.8 : 1;
    setZoomLevel(nextZoom);

    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track || !track.getCapabilities) return;
    const caps = track.getCapabilities() as Record<string, any>;
    if (caps.zoom) {
      const clamped = Math.min(caps.zoom.max || 2, Math.max(caps.zoom.min || 1, nextZoom));
      track.applyConstraints({ advanced: [{ zoom: clamped }] as any }).catch(() => {});
    }
  };

  // Decodifica foto em múltiplas escalas e rotações (0° e 90°) para garantir leitura
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    setIsFetchingApi(true);

    try {
      const bitmap = await createImageBitmap(file);

      // 1. Tenta BarcodeDetector nativo na imagem original
      if ('BarcodeDetector' in window) {
        try {
          const Detector = (window as unknown as { BarcodeDetector: any }).BarcodeDetector;
          const detector = new Detector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
          });
          const detected = await detector.detect(bitmap);
          if (detected?.length > 0 && detected[0].rawValue) {
            await handleLookupBarcode(String(detected[0].rawValue));
            return;
          }
        } catch {
          // Segue para multi-escala Quagga2
        }
      }

      // 2. Testa em resoluções otimizadas (1400px e 900px) e rotações (0° e 90°)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (ctx) {
        for (const targetMax of [1400, 900]) {
          for (const rotate90 of [false, true]) {
            const scale = Math.min(1, targetMax / Math.max(bitmap.width, bitmap.height));
            const w = Math.round(bitmap.width * scale);
            const h = Math.round(bitmap.height * scale);

            if (!rotate90) {
              canvas.width = w;
              canvas.height = h;
              ctx.drawImage(bitmap, 0, 0, w, h);
            } else {
              canvas.width = h;
              canvas.height = w;
              ctx.save();
              ctx.translate(h / 2, w / 2);
              ctx.rotate(Math.PI / 2);
              ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
              ctx.restore();
            }

            const code = await decodeCanvasWithQuagga(canvas);
            if (code) {
              await handleLookupBarcode(code);
              return;
            }
          }
        }
      }

      setIsFetchingApi(false);
      setCameraError(
        'Não foi possível ler o código na foto. Tente com mais luz ou digite abaixo.'
      );
    } catch {
      setIsFetchingApi(false);
      setCameraError('Erro ao processar a foto. Digite o código abaixo.');
    } finally {
      e.target.value = '';
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    await handleLookupBarcode(manualBarcode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F0F0E]/95 backdrop-blur-xl flex flex-col justify-between p-4 text-stone-100">
      <div className="flex items-center justify-between max-w-sm mx-auto w-full">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Ler código de barras</h2>
          <p className="text-[11px] text-stone-400">
            Mantenha o celular a ~15cm do código
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="w-10 h-10 rounded-[12px] bg-stone-800 flex items-center justify-center"
          aria-label="Fechar câmera"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="my-auto space-y-3 w-full max-w-sm mx-auto">
        {isFetchingApi ? (
          /* Skeleton Loader silencioso */
          <div className="rounded-[12px] bg-[#171716] border border-stone-800 p-5 space-y-3 animate-pulse">
            <div className="h-5 w-40 bg-stone-800 rounded" />
            <div className="h-4 w-28 bg-stone-800/70 rounded" />
            <div className="h-10 w-full bg-stone-800/50 rounded-[12px]" />
          </div>
        ) : (
          <>
            {/* Visor HD com Guia de Alinhamento e Zoom/Lanterna */}
            <div className="relative w-full h-56 overflow-hidden rounded-[12px] border border-stone-800 bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                  transform: zoomLevel > 1 ? `scale(${zoomLevel})` : undefined,
                }}
                className="w-full h-full object-cover transition-transform duration-200"
              />

              {/* Moldura guia para as barras verticais */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="w-full h-28 rounded-[12px] border-2 border-stone-100/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative flex items-center justify-center">
                  <div className="w-11/12 h-[1.5px] bg-amber-400/90" />
                </div>
              </div>

              {/* Botões rápidos de Zoom 1.8x (ajuda no foco) e Lanterna */}
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleZoom}
                  className={`px-2.5 py-1.5 rounded-[10px] text-xs font-semibold flex items-center gap-1 backdrop-blur-md transition ${
                    zoomLevel > 1
                      ? 'bg-stone-100 text-stone-900'
                      : 'bg-black/60 text-stone-200 border border-white/15'
                  }`}
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>{zoomLevel > 1 ? '1.8x' : '1x'}</span>
                </button>

                {torchSupported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    aria-label="Lanterna"
                    className={`p-2 rounded-[10px] backdrop-blur-md transition ${
                      torchOn
                        ? 'bg-amber-400 text-stone-900'
                        : 'bg-black/60 text-stone-200 border border-white/15'
                    }`}
                  >
                    <Flashlight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {cameraError && (
              <p className="text-xs text-amber-400 text-center px-2">{cameraError}</p>
            )}

            {/* Captura de foto com decodificador multi-escala */}
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
              <span>Tirar foto do código (foco macro)</span>
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
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="text-xs text-stone-400 underline underline-offset-4"
        >
          Preencher sem código
        </button>
      </div>
    </div>
  );
};
