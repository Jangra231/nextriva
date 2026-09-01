import { redirect } from "next/navigation";
import { currentUser } from "../lib/auth";
import OnboardingWizard from "../components/OnboardingWizard";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login?returnTo=/onboarding");
  if (user.profileCompleted) redirect("/");
  return (
    <main>
      <OnboardingWizard />
    </main>
  );
}
