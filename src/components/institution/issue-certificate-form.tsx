
'use client';

import { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import QRCode from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UploadCloud, FilePlus, Sparkles, FileImage, FileText, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { suggestCertDetails } from '@/ai/flows/suggest-cert-details';
import { addCertificateRecord } from '@/ai/flows/manage-certificate-records';
import { embedWatermark } from '@/ai/flows/embed-watermark';
import { fileToDataUri } from '@/lib/utils';
import { GeneratedCertificate } from './generated-certificate';
import { calculateCertificateHash } from '@/lib/pki';
import type { CertificateRecord } from '@/lib/firestore-db';

// This interface represents the data that defines a certificate, used for both
// the form state and for generating the QR code and final downloadable asset.
interface CertificateDetails {
  id: string;
  studentName: string;
  course: string;
  issuingInstitution: string;
  grade: string;
  rollNumber: string;
  year: number;
}

export function IssueCertificateForm() {
  const [details, setDetails] = useState<Partial<CertificateDetails>>({ year: new Date().getFullYear() });
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  
  const [issuedCertificate, setIssuedCertificate] = useState<CertificateRecord | null>(null);
  
  const [previewQrValue, setPreviewQrValue] = useState('');
  
  const [watermarkedImageDataUri, setWatermarkedImageDataUri] = useState<string | null>(null);
  const certificateRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleOcrFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSuggesting(true);
    setIssuedCertificate(null);
    try {
      const documentDataUri = await fileToDataUri(file);
      const suggestions = await suggestCertDetails({ documentDataUri });
      
      setDetails({
          studentName: suggestions.suggestedName,
          course: suggestions.course,
          issuingInstitution: suggestions.issuingInstitution,
          id: suggestions.suggestedId,
          grade: suggestions.grade,
          rollNumber: suggestions.rollNumber,
          year: suggestions.year,
      });
      toast({
        title: 'Details Extracted',
        description: 'The form has been pre-filled using OCR.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Extraction Failed',
        description: 'Could not extract details from the document.',
        variant: 'destructive',
      });
    } finally {
      setIsSuggesting(false);
    }
  };
  
  // This useEffect hook is only for the *live preview* QR code.
  useEffect(() => {
    const { id, studentName, course, issuingInstitution, grade, rollNumber, year } = details;
    if (id && studentName && course && issuingInstitution && grade && rollNumber && year) {
      // Calculate a temporary hash for preview purposes. This must be IDENTICAL
      // to the backend calculation.
      const previewHash = calculateCertificateHash({
        id,
        studentName,
        course,
        issuingInstitution,
        grade,
        rollNumber,
        year: Number(year),
      });
      const dataToEmbed = JSON.stringify({
        id: id,
        signature: previewHash 
      });
      setPreviewQrValue(dataToEmbed);
    } else {
      setPreviewQrValue('');
    }
  }, [details]);

  // This useEffect handles the image capture and watermarking AFTER the certificate
  // component has been rendered with the final data from the issued record.
  useEffect(() => {
    if (issuedCertificate && certificateRef.current) {
      const captureAndWatermark = async () => {
        try {
          // Capture the rendered certificate as an image.
          const originalImageDataUri = await toPng(certificateRef.current!, { cacheBust: true, pixelRatio: 2 });
          
          // Embed the authoritative signature into the image as an invisible watermark.
          const watermarkResponse = await embedWatermark({
              imageDataUri: originalImageDataUri,
              watermarkText: issuedCertificate.hash, // Use the authoritative hash
          });

          setWatermarkedImageDataUri(watermarkResponse.watermarkedImageDataUri);

          toast({
            title: 'Certificate Issued & Secured',
            description: `Record added to the registry. Watermark embedded successfully.`,
          });
          
          // Clear the form for the next issuance.
          setDetails({ year: new Date().getFullYear() });

        } catch (error: any) {
          console.error('Failed to capture or watermark certificate:', error);
          toast({
            title: 'Image Processing Failed',
            description: error.message || 'An error occurred during image capture or watermarking.',
            variant: 'destructive',
          });
        } finally {
          setIsIssuing(false); // End the issuing process
        }
      };
      
      // Delay slightly to ensure the component is fully rendered before capturing
      captureAndWatermark();
    }
  }, [issuedCertificate, toast]);


  const handleIssueCertificate = async () => {
    const requiredFields: (keyof CertificateDetails)[] = ['id', 'studentName', 'course', 'issuingInstitution', 'grade', 'rollNumber', 'year'];
    const missingFields = requiredFields.filter(field => !details[field]);
    if (missingFields.length > 0) {
      toast({
        title: 'Missing Information',
        description: `Please fill all required fields: ${missingFields.join(', ')}.`,
        variant: 'destructive',
      });
      return;
    }

    setIsIssuing(true);
    setIssuedCertificate(null);
    setWatermarkedImageDataUri(null);
    try {
      // Step 1: Call the backend to add the certificate to the database.
      // This flow is now the single source of truth for generating the authoritative hash.
      const newRecord = await addCertificateRecord({
        certificateId: details.id!,
        studentName: details.studentName!,
        course: details.course!,
        issuingInstitution: details.issuingInstitution!,
        grade: details.grade!,
        rollNumber: details.rollNumber!,
        year: Number(details.year!),
      });

      // Step 2: Set the returned record in state. This will trigger the useEffect hook
      // which handles image capture, watermarking (using the authoritative hash),
      // and displaying the download section.
      setIssuedCertificate(newRecord);

    } catch (error: any)
{
      console.error('Failed to issue certificate:', error);
      toast({
        title: 'Issuance Failed',
        description: error.message || 'An error occurred. Check console for details.',
        variant: 'destructive',
      });
      setIssuedCertificate(null);
      setIsIssuing(false);
    }
  };


  const downloadImage = (dataUrl: string, fileExtension: 'png' | 'pdf') => {
     if (!issuedCertificate) return;

     if (fileExtension === 'png') {
        const link = document.createElement('a');
        link.download = `certificate-${issuedCertificate.id}.png`;
        link.href = dataUrl;
        link.click();
     } else {
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [700, 500],
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, 700, 500);
        pdf.save(`certificate-${issuedCertificate.id}.pdf`);
     }
  };

  const finalQrValue = issuedCertificate ? JSON.stringify({
    id: issuedCertificate.id,
    signature: issuedCertificate.hash, // Use the authoritative hash
  }) : '';

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>New Certificate Details</CardTitle>
        <CardDescription>Enter details manually or upload a document to auto-fill.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
               <div>
                  <Label htmlFor="suggester" className="flex items-center gap-2 mb-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-accent"/>
                    Extract Details from Document (OCR)
                  </Label>
                  <div className="relative">
                    <Input id="suggester" type="file" accept="image/png, image/jpeg, application/pdf" className="pl-12" onChange={handleOcrFileChange} disabled={isSuggesting || isIssuing}/>
                    <UploadCloud className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
                  </div>
                   {isSuggesting && <p className="text-sm text-muted-foreground mt-2">Analyzing document...</p>}
               </div>
               
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Student Name</Label>
                  <Input id="name" placeholder="e.g., Jane Doe" value={details.studentName || ''} onChange={e => setDetails({...details, studentName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rollNumber">Roll Number</Label>
                  <Input id="rollNumber" placeholder="e.g., 20CS105" value={details.rollNumber || ''} onChange={e => setDetails({...details, rollNumber: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="course">Course / Degree</Label>
                <Input id="course" placeholder="e.g., B.S. in Computer Science" value={details.course || ''} onChange={e => setDetails({...details, course: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="institution">Issuing Institution</Label>
                <Input id="institution" placeholder="e.g., Tech University" value={details.issuingInstitution || ''} onChange={e => setDetails({...details, issuingInstitution: e.target.value})} />
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade / Marks</Label>
                    <Input id="grade" placeholder="e.g., A+ or 95%" value={details.grade || ''} onChange={e => setDetails({...details, grade: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year of Completion</Label>
                    <Input id="year" type="number" placeholder="e.g., 2024" value={details.year || ''} onChange={e => setDetails({...details, year: Number(e.target.value)})} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="certId">Certificate ID</Label>
                    <Input id="certId" placeholder="e.g., CERT-2024-5891" value={details.id || ''} onChange={e => setDetails({...details, id: e.target.value})} />
                  </div>
              </div>
            </div>

            <div className="md:col-span-1 flex flex-col items-center justify-start gap-4 bg-gray-50 rounded-lg p-4 border">
                <div className="w-full space-y-3 text-center">
                    <QrCode className="h-8 w-8 text-muted-foreground mx-auto"/>
                    <h3 className="text-sm font-semibold">Live QR Code Preview</h3>
                    <div className="bg-white p-2 rounded-md shadow-inner inline-block">
                     {previewQrValue ? (
                        <QRCode value={previewQrValue} size={128} level="H" />
                     ) : (
                        <div className="w-32 h-32 flex items-center justify-center bg-gray-200 text-gray-500 text-xs text-center p-2 rounded-sm">
                            Fill all fields to generate QR code
                        </div>
                     )}
                    </div>
                     <p className="text-xs text-muted-foreground">This is a live preview. The final signature is generated upon issuance.</p>
                </div>
            </div>
        </div>

        <div className="mt-6 border-t pt-6">
          <Button className="w-full" onClick={handleIssueCertificate} disabled={isIssuing || isSuggesting || !previewQrValue}>
            {isIssuing ? (
               <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                <FilePlus className="mr-2 h-4 w-4" />
                Issue Certificate
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* This section is now split into two parts: one for rendering the certificate for capture,
        and one for displaying the final watermarked image and download buttons. */}

    {/* Part 1: Hidden certificate renderer (for html-to-image) */}
    {issuedCertificate && !watermarkedImageDataUri && (
         <div className="absolute -z-10 -top-[9999px] -left-[9999px]">
            <GeneratedCertificate 
                ref={certificateRef} 
                certificate={issuedCertificate}
                qrCodeValue={finalQrValue}
            />
        </div>
    )}

    {/* Part 2: Visible download section with the watermarked image */}
    {issuedCertificate && watermarkedImageDataUri && (
        <div className="mt-8">
            <Separator />
            <div className="my-6 text-center">
                <h2 className="text-2xl font-bold font-headline text-primary">Certificate Generated Successfully</h2>
                <p className="text-muted-foreground">Download the final, watermarked certificate below.</p>
            </div>
            <div className="flex flex-col items-center gap-6">
                <div className="scale-90 origin-top rounded-lg shadow-2xl overflow-hidden">
                   <img src={watermarkedImageDataUri} alt="Watermarked Certificate" width="700" />
                </div>
                 <div className="flex gap-4">
                    <Button onClick={() => downloadImage(watermarkedImageDataUri, 'png')}>
                        <FileImage className="mr-2 h-4 w-4"/>
                        Download as PNG
                    </Button>
                    <Button onClick={() => downloadImage(watermarkedImageDataUri, 'pdf')} variant="outline">
                        <FileText className="mr-2 h-4 w-4"/>
                        Download as PDF
                    </Button>
                </div>
            </div>
        </div>
    )}
    </>
  );
}
