import { notFound } from "next/navigation";
import { JoiningYearConnectionsPage } from "../../../components/joining-year-connections-page";

type JoiningYearRouteProps = {
  params: Promise<{
    year: string;
  }>;
};

export default async function JoiningYearRoute({
  params
}: JoiningYearRouteProps) {
  const { year } = await params;
  const parsedYear = Number(year);

  if (!Number.isInteger(parsedYear)) {
    notFound();
  }

  return <JoiningYearConnectionsPage year={parsedYear} />;
}
