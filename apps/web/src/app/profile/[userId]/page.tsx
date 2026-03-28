import { UserProfilePage } from "../../../components/user-profile-page";

type ProfileDetailPageProps = {
  params: Promise<{
    userId: string;
  }>;
  searchParams?: Promise<{
    referrer?: string;
  }>;
};

export default async function ProfileDetailPage({
  params,
  searchParams
}: ProfileDetailPageProps) {
  const { userId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <UserProfilePage
      referrer={resolvedSearchParams.referrer}
      userId={userId}
    />
  );
}
