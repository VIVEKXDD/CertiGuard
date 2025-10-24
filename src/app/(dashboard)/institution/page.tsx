import { PageHeader } from '@/components/page-header';
import { IssueCertificateForm } from '@/components/institution/issue-certificate-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LegacyCertificateManager } from '@/components/institution/legacy-certificate-manager';

export default function InstitutionPage() {
  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Certificate Management"
        description="Issue new secure certificates or onboard existing legacy documents."
      />
      <Tabs defaultValue="issue-new">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="issue-new">Issue New Certificate</TabsTrigger>
          <TabsTrigger value="onboard-legacy">Onboard Legacy Certificate</TabsTrigger>
        </TabsList>
        <TabsContent value="issue-new" className="mt-6">
          <IssueCertificateForm />
        </TabsContent>
        <TabsContent value="onboard-legacy" className="mt-6">
          <LegacyCertificateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
