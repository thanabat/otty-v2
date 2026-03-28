import { notFound } from "next/navigation";
import { JoiningYearConnectionsPage } from "../../../components/joining-year-connections-page";

type JoiningYearRouteProps = {
  params: Promise<{
    year: string;
  }>;
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function JoiningYearRoute({
  params,
  searchParams
}: JoiningYearRouteProps) {
  const { year } = await params;
  const parsedYear = Number(year);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const parsedPage = Number(resolvedSearchParams.page ?? "1");

  if (!Number.isInteger(parsedYear)) {
    notFound();
  }

  return (
    <JoiningYearConnectionsPage
      currentPage={Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1}
      year={parsedYear}
    />
  );
}
