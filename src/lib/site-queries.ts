import { queryOptions } from "@tanstack/react-query";
import { getSiteData } from "@/lib/public.functions";

export const siteDataQuery = queryOptions({
  queryKey: ["site-data"],
  queryFn: () => getSiteData(),
  staleTime: 60_000,
});
