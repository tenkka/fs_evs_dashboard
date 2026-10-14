"use client";

import { Header } from "@/components/layout/Header";
import { PersonalInfoCard } from "@/components/profile/PersonalInfoCard";
import { CertificatesSection } from "@/components/profile/CertificatesSection";
import { useAuthedUser } from "@/lib/UserContext";

export default function ProfilePage() {
  const { persona } = useAuthedUser();

  return (
    <>
      <Header title="My Profile" description="Personal information and certificates" />

      <main className="flex-1 space-y-6 p-5">
        <PersonalInfoCard />
        <CertificatesSection uid={persona.id} />
      </main>
    </>
  );
}
