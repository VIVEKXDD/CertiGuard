
'use client';

import { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileScan, UploadCloud, ShieldCheck, QrCode, Sparkles, FilePlus, FileImage, FileText } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { useToast } from '@/hooks/use-toast';
import { fileToDataUri } from '@/lib/utils';
import { suggestCertDetails } from '@/ai/flows/suggest-cert-details';
import { addCertificateRecord } from '@/ai/flows/manage-certificate-records';
import { embedWatermark } from '@/ai/flows/embed-watermark';
import { GeneratedCertificate } from './generated-certificate';
import { calculateCertificateHash } from '@/lib/pki';
import type { CertificateRecord } from '@/lib/firestore-db';
import QRCode from 'qrcode.react';

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


const processSteps = [
    {
        icon: FileScan,
        title: "Step 1: Scanning & Digitization",
        content: [
            "The student or employer scans the physical legacy certificate.",
            "Our AI-powered OCR extracts key text like roll number, name, and marks.",
            "Advanced image processing validates the document's physical security features, such as watermarks or seals."
        ]
    },
    {
        icon: UploadCloud,
        title: "Step 2: University Upload & Validation",
        content: [
            "The university administrator uploads the scanned copy for verification.",
            "The system presents the extracted data alongside the scanned image for easy comparison with offline archives.",
            "Once validated by the admin, a secure digital twin of the legacy certificate is generated and ready for issuance."
        ]
    },
    {
        icon: ShieldCheck,
        title: "Step 3: PKI & Central Registry Integration",
        content: [
            "The certificate's content is cryptographically hashed, and this hash is signed with the University’s private key (PKI).",
            "The signed hash is then permanently stored in our Central Registry, linked to the previous record using hash chaining for immutability.",
        ]
    },
    {
        icon: QrCode,
        title: "Step 4: Secure QR Code & Watermark Issuance",
        content: [
            "A new, secure QR code is generated for the legacy certificate, which now links to its immutable record in the registry.",
            "A unique digital watermark, containing the cryptographic signature, is invisibly embedded into the digital PDF copy, making it tamper-proof."
        ]
    }
];

export function LegacyCertificateManager() {
    const [details, setDetails] = useState<Partial<CertificateDetails>>({});
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isIssuing, setIsIssuing] = useState(false);
    const [issuedCertificate, setIssuedCertificate] = useState<CertificateRecord | null>(null);
    const [previewQrValue, setPreviewQrValue] = useState('');
    const [watermarkedImageDataUri, setWatermarkedImageDataUri] = useState<string | null>(null);
    const [scannedDocumentUri, setScannedDocumentUri] = useState<string | null>(null);

    const certificateRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsSuggesting(true);
        setIssuedCertificate(null);
        setWatermarkedImageDataUri(null);
        setScannedDocumentUri(null);

        try {
            const documentDataUri = await fileToDataUri(file);
            setScannedDocumentUri(documentDataUri); // Store for preview
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
                description: 'The form has been pre-filled. Please verify and correct if needed.',
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
                    const originalImageDataUri = await toPng(certificateRef.current!, { cacheBust: true, pixelRatio: 2 });
                    const watermarkResponse = await embedWatermark({
                        imageDataUri: originalImageDataUri,
                        watermarkText: issuedCertificate.hash,
                    });
                    setWatermarkedImageDataUri(watermarkResponse.watermarkedImageDataUri);
                    toast({
                        title: 'Certificate Issued & Secured',
                        description: `Record added to the registry. Watermark embedded.`,
                    });
                    setDetails({});
                    setScannedDocumentUri(null);
                } catch (error: any) {
                    console.error('Failed to capture or watermark certificate:', error);
                    toast({
                        title: 'Image Processing Failed',
                        description: error.message || 'An error occurred during image capture.',
                        variant: 'destructive',
                    });
                } finally {
                    setIsIssuing(false);
                }
            };
            captureAndWatermark();
        }
    }, [issuedCertificate, toast]);

    const handleIssueCertificate = async () => {
        const requiredFields: (keyof CertificateDetails)[] = ['id', 'studentName', 'course', 'issuingInstitution', 'grade', 'rollNumber', 'year'];
        const missingFields = requiredFields.filter(field => !details[field]);
        if (missingFields.length > 0) {
            toast({
                title: 'Missing Information',
                description: `Please verify all fields are filled: ${missingFields.join(', ')}.`,
                variant: 'destructive',
            });
            return;
        }

        setIsIssuing(true);
        setIssuedCertificate(null);
        setWatermarkedImageDataUri(null);
        try {
            const newRecord = await addCertificateRecord({
                certificateId: details.id!,
                studentName: details.studentName!,
                course: details.course!,
                issuingInstitution: details.issuingInstitution!,
                grade: details.grade!,
                rollNumber: details.rollNumber!,
                year: Number(details.year!),
            });
            setIssuedCertificate(newRecord);
        } catch (error: any) {
            console.error('Failed to issue certificate:', error);
            toast({
                title: 'Issuance Failed',
                description: error.message || 'An error occurred.',
                variant: 'destructive',
            });
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
        signature: issuedCertificate.hash,
    }) : '';


    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <Card>
                    <CardHeader>
                        <CardTitle>How Our Solution Handles Legacy Certificates</CardTitle>
                        <CardDescription>
                            Follow this secure, multi-step process to bring your existing physical certificates into the digital verification ecosystem.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible defaultValue="item-0">
                            {processSteps.map((step, index) => (
                                <AccordionItem value={`item-${index}`} key={index}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-3">
                                            <step.icon className="h-5 w-5 text-primary" />
                                            <span className="font-semibold">{step.title}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                                            {step.content.map((point, pIndex) => (
                                                <li key={pIndex}>{point}</li>
                                            ))}
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Onboard a Legacy Certificate</CardTitle>
                        <CardDescription>
                            Upload a scanned legacy document to begin the digitization and security enhancement process.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="legacy-file">Scanned Certificate Document</Label>
                                <div className="relative">
                                    <Input id="legacy-file" type="file" accept="image/png, image/jpeg, application/pdf" className="pl-12" onChange={handleFileChange} disabled={isSuggesting || isIssuing} />
                                    <FileScan className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                               {isSuggesting ? "Analyzing document..." : "Uploading a document will trigger the AI-powered OCR to extract details."}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {scannedDocumentUri && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Verify Extracted Details</CardTitle>
                        <CardDescription>
                            Review the AI-extracted information below and make any necessary corrections before issuing the secure digital twin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-4">
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
                               <h3 className="text-sm font-semibold text-center">Original Document</h3>
                               <img src={scannedDocumentUri} alt="Scanned Certificate" className="rounded-md shadow-md max-h-48 w-auto"/>
                            </div>
                        </div>
                        <div className="mt-6 border-t pt-6">
                          <Button className="w-full" onClick={handleIssueCertificate} disabled={isIssuing || isSuggesting || !previewQrValue}>
                            {isIssuing ? (
                               <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                            ) : (
                              <>
                                <FilePlus className="mr-2 h-4 w-4" />
                                Issue Verified Certificate
                              </>
                            )}
                          </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {issuedCertificate && !watermarkedImageDataUri && (
                 <div className="absolute -z-10 -top-[9999px] -left-[9999px]">
                    <GeneratedCertificate 
                        ref={certificateRef} 
                        certificate={issuedCertificate}
                        qrCodeValue={finalQrValue}
                    />
                </div>
            )}

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
        </div>
    );
}
