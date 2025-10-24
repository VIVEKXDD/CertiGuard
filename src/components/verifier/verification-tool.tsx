
'use client';

import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { Card, CardContent } from '@/components/ui/card';
import { Video, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { verifyCertificateAuthenticity } from '@/ai/flows/verify-certificate-authenticity';
import { VerificationResult, type VerificationResultData } from './verification-result';
import { fileToDataUri } from '@/lib/utils';
import * as pdfjsLib from 'pdfjs-dist';
import { Separator } from '../ui/separator';

// Required for pdf.js to work - serves the worker from the same origin
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();


export function VerificationTool() {
  const [result, setResult] = useState<VerificationResultData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Camera scanning logic
  useEffect(() => {
    let animationFrameId: number;

    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play();
             animationFrameId = requestAnimationFrame(tick);
          }
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && !isVerifying) {
        const video = videoRef.current;
        const canvasElement = canvasRef.current;
        const canvas = canvasElement?.getContext('2d', { willReadFrequently: true });

        if (canvasElement && canvas) {
          canvasElement.height = video.videoHeight;
          canvasElement.width = video.videoWidth;
          canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
          const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
             // For camera scans, we don't have the full document for watermarking.
             // We pass the QR data and null for the document URI.
             handleQrScan(code.data, null);
          }
        }
      }
      if (!isVerifying) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    getCameraPermission();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVerifying]);

  // Main verification API call
  const handleVerification = async (qrDataUri: string, documentDataUri: string | null) => {
    setIsVerifying(true);
    setResult(null);
    try {
      const response = await verifyCertificateAuthenticity({ qrDataUri, documentDataUri });
      setResult(response);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Verification Failed',
        description: 'An error occurred while verifying the certificate.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
      setIsProcessingFile(false); // Reset file processing state as well
    }
  };
  
  const handleQrScan = (data: string, documentDataUri: string | null) => {
    const qrDataUri = `data:text/plain;base64,${btoa(data)}`;
    handleVerification(qrDataUri, documentDataUri);
  };
  
  // File processing and QR decoding
  const processFile = async (file: File) => {
    setIsProcessingFile(true);
    setResult(null);
    try {
      let imageData: ImageData | null = null;
      let documentDataUri: string | null = null;

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error("Could not get canvas context");

      if (file.type.startsWith('image/')) {
        documentDataUri = await fileToDataUri(file);
        const img = new Image();
        img.src = documentDataUri;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        imageData = context.getImageData(0, 0, img.width, img.height);

      } else if (file.type === 'application/pdf') {
        const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        documentDataUri = canvas.toDataURL('image/png'); // Use the rendered PNG for watermark extraction
      } else {
        throw new Error("Unsupported file type. Please upload an image or PDF.");
      }
      
      if (!imageData) throw new Error("Could not process the file to get image data.");
      
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        handleQrScan(code.data, documentDataUri);
      } else {
        throw new Error("No QR code found in the document.");
      }

    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Processing Failed',
        description: error.message || "Could not find a QR code in the uploaded file.",
        variant: 'destructive',
      });
      setIsProcessingFile(false);
    }
  }
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };


  return (
    <div className="w-full">
       <Card className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {/* Scan with Camera Section */}
          <div className="p-6 border-b md:border-b-0 md:border-r">
            <h3 className="text-lg font-semibold">Scan with Camera</h3>
            <p className="text-sm text-muted-foreground mb-4">Use your device's camera to scan a physical certificate.</p>
            <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1/2 h-1/2 border-4 border-white/50 rounded-lg shadow-2xl" />
              </div>
              {hasCameraPermission === false && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-4">
                  <Video className="h-10 w-10 mb-4" />
                  <p className="text-center font-semibold">Camera access is required for live QR code scanning.</p>
                </div>
              )}
              {hasCameraPermission === null && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                  <p className="mt-4">Initializing camera...</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Upload Document Section */}
          <div className="p-6">
             <h3 className="text-lg font-semibold">Upload Document</h3>
             <p className="text-sm text-muted-foreground mb-4">Verify a digital certificate by uploading its file.</p>
            <div
              className={`flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors ${isDragging ? 'bg-muted border-primary' : 'bg-transparent'}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">PDF or Image (PNG, JPG)</p>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, application/pdf" onChange={handleFileChange} disabled={isProcessingFile || isVerifying} />
            </div>
          </div>
        </div>
      </Card>
      
      {(isVerifying || isProcessingFile) && 
        <div className="mt-8 flex items-center justify-center gap-2 text-primary">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <p className="font-semibold">{isProcessingFile ? "Processing document..." : "Verifying certificate..."}</p>
        </div>
      }
      
      {result && (
        <div className="mt-8">
          <VerificationResult {...result} />
        </div>
      )}
    </div>
  );
}
