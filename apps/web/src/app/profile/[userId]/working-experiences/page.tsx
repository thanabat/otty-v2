import { UserWorkingExperiencesPage } from "../../../../components/user-working-experiences-page";

type WorkingExperiencesRouteProps = {
  params: Promise<{
    userId: string;
  }>;
  searchParams?: Promise<{
    self?: string;
    referrer?: string;
    referrerUserId?: string;
    site?: string;
    year?: string;
    page?: string;
  }>;
};

export default async function WorkingExperiencesRoute({
  params,
  searchParams
}: WorkingExperiencesRouteProps) {
  const { userId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <UserWorkingExperiencesPage
      page={resolvedSearchParams.page}
      referrer={resolvedSearchParams.referrer}
      referrerUserId={resolvedSearchParams.referrerUserId}
      self={resolvedSearchParams.self}
      site={resolvedSearchParams.site}
      userId={userId}
      year={resolvedSearchParams.year}
    />
  );
}
