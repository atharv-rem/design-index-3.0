import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CompareRow } from "@/lib/icon-pages";

type ArticleCompareTableProps = {
  rows: CompareRow[];
  showBestFor: boolean;
};

// The table scrolls sideways when it is wider than its column. The scrollbar is hidden
// (all engines), but touch, trackpad and shift+wheel scrolling still work.
const headClassName = "font-google text-[11px] font-semibold uppercase tracking-[0.08em]";
const cellClassName = "py-3 align-middle text-[14px] leading-snug";

export default function ArticleCompareTable({ rows, showBestFor }: ArticleCompareTableProps) {
  return (
    <div className="mt-4 [&_[data-slot=table-container]]:overscroll-x-contain [&_[data-slot=table-container]]:[-ms-overflow-style:none] [&_[data-slot=table-container]]:[scrollbar-width:none] [&_[data-slot=table-container]::-webkit-scrollbar]:hidden">
      <Table variant="card" className="font-(family-name:--font-inter-stack)">
        <TableHeader>
          <TableRow className="border-0">
            <TableHead scope="col" className={headClassName}>Tool</TableHead>
            <TableHead scope="col" className={headClassName}>Pricing</TableHead>
            <TableHead scope="col" className={`${headClassName}`}>Website</TableHead>
            {showBestFor && (
              <TableHead scope="col" className={`${headClassName}`}>Best for</TableHead>
            )}
            <TableHead scope="col" className={headClassName}>Alternatives</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className={`${cellClassName} font-google font-semibold theme-text-primary`}>
                <a href={row.href} className="hover:underline">{row.name}</a>
              </TableCell>
              <TableCell className={`${cellClassName} theme-text-muted`}>{row.pricing}</TableCell>
              <TableCell className={`${cellClassName} theme-text-muted`}>
                {row.website && row.hostname ? (
                  <a href={row.website} target="_blank" rel="noopener" className="underline underline-offset-4 hover:text-(--app-text)">
                    {row.hostname}
                  </a>
                ) : (
                  "—"
                )}
              </TableCell>
              {showBestFor && (
                <TableCell className={`${cellClassName} theme-text-muted`}>{row.bestFor ?? "—"}</TableCell>
              )}
              <TableCell className={`${cellClassName} theme-text-muted`}>
                {row.alternativesHref ? (
                  <a href={row.alternativesHref} className="underline underline-offset-4 hover:text-(--app-text)">
                    See alternatives
                  </a>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
