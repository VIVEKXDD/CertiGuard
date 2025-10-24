import { forwardRef } from 'react';
import { ShieldCheck, Calendar, Award, User, Building } from 'lucide-react';
import QRCode from 'qrcode.react';
import type { CertificateRecord } from '@/lib/firestore-db';

interface GeneratedCertificateProps {
  certificate: Partial<CertificateRecord>;
  qrCodeValue: string;
}

export const GeneratedCertificate = forwardRef<HTMLDivElement, GeneratedCertificateProps>(({ certificate, qrCodeValue }, ref) => {
  if (!certificate) return null;

  const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number | undefined }) => {
    if (!value) return null;
    return (
        <div className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-gray-500" />
          <span className="font-semibold">{label}:</span>
          <span className="whitespace-nowrap overflow-hidden text-ellipsis">{value}</span>
        </div>
    );
  };
  
  return (
    <div ref={ref} className="bg-white text-gray-800 p-8 rounded-lg shadow-2xl w-[700px] border-4 border-indigo-900 font-sans relative overflow-hidden">
      <div className="grid grid-cols-3 gap-8 relative z-10">
        {/* Left Column */}
        <div className="col-span-1 flex flex-col items-center text-center border-r pr-8 border-gray-200">
            <ShieldCheck className="h-16 w-16 text-indigo-900 mb-4" />
            <h1 className="text-2xl font-bold font-serif text-indigo-900">Certificate of Completion</h1>
            <div className="w-1/2 h-0.5 bg-gray-300 mx-auto my-4" />
            <p className="text-gray-600 text-sm">This is to certify that the individual named herein has successfully completed the prescribed course of study.</p>
            <div className="mt-auto pt-4">
                <QRCode value={qrCodeValue} size={100} level="H" />
                <p className="text-xs text-gray-500 mt-2">Scan to Verify</p>
            </div>
        </div>

        {/* Right Column */}
        <div className="col-span-2">
            <div className="text-center mb-6">
              <p className="text-lg text-gray-600">This certificate is proudly presented to</p>
              <h2 className="text-5xl font-serif font-bold tracking-wider my-2 text-gray-800 break-words">{certificate.studentName}</h2>
              <p className="text-lg text-gray-600">for the successful completion of</p>
              <p className="text-3xl font-bold font-serif mt-2 text-teal-700 break-words">{certificate.course}</p>
            </div>
            
            <div className="my-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-serif font-semibold mb-3 text-center text-gray-700">Academic Details</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <DetailItem icon={User} label="Roll Number" value={certificate.rollNumber} />
                    <DetailItem icon={Award} label="Grade" value={certificate.grade} />
                    <DetailItem icon={Building} label="Institution" value={certificate.issuingInstitution} />
                    <DetailItem icon={Calendar} label="Year" value={certificate.year} />
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-500">
              <p>Issued on: {new Date().toLocaleDateString()}</p>
              <p className="break-all">Certificate ID: {certificate.id}</p>
            </div>
        </div>
      </div>
    </div>
  );
});

GeneratedCertificate.displayName = 'GeneratedCertificate';
