import { UserProfilePage } from "../../../components/user-profile-page";

type ProfileDetailPageProps = {
  params: Promise<{
    userId: string;
  }>;
  searchParams?: Promise<{
    referrer?: string;
    site?: string;
    year?: string;
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
      site={resolvedSearchParams.site}
      year={resolvedSearchParams.year}
      userId={userId}
    />
  );
}
