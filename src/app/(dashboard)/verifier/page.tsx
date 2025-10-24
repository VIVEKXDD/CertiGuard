import { PageHeader } from '@/components/page-header';
import { VerificationTool } from '@/components/verifier/verification-tool';

export default function VerifierPage() {
  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Verify Certificate"
        description="Upload a certificate document or scan a QR code to verify its authenticity."
      />
      <VerificationTool />
    </div>
  );
}
