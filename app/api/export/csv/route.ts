import { withApiSecurity, requireUserRateLimit, HttpInputError } from "@/lib/http-security";
import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/lib/auth";
import { getHistoryRows, parseHistoryFilters } from "@/lib/history";
import { getTimeZoneFromRequest } from "@/lib/timezone";
import { FinanceInputError } from "@/lib/finance-validation";
export const dynamic = "force-dynamic";
function escapeCsv(value: string | number | null | undefined) {
  let text = value == null ? "" : String(value);
  // Prevent spreadsheet formulas in user-controlled text.
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
async function handleGET(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  requireUserRateLimit(user.id, "csv-export", 4);
  try {
    const records = await getHistoryRows(
      user.id,
      parseHistoryFilters(
        new URL(req.url).searchParams,
        getTimeZoneFromRequest(req),
      ),
    );
    if (records.length > 10000) throw new HttpInputError("Kết quả vượt 10.000 mục. Hãy chọn khoảng ngày nhỏ hơn.", 400);
    const rows = [
      [
        "createdAt",
        "type",
        "currency",
        "amount",
        "category",
        "note",
        "paymentMethod",
        "detail",
        "provider",
        "fee",
      ].join(","),
    ];
    for (const row of records) {
      const exchange = row.type === "EXCHANGE";
      rows.push(
        [
          row.createdAt.toISOString(),
          row.type,
          exchange ? "DKK->VND" : row.currency,
          exchange
            ? row.fromAmountDkk! / 100
            : row.amount! / (row.currency === "DKK" ? 100 : 1),
          row.category,
          row.note,
          row.paymentMethod,
          exchange
            ? `${row.fromAmountDkk! / 100} DKK -> ${row.toAmountVnd} VND`
            : "",
          row.provider,
          row.feeAmount
            ? `${row.feeAmount / (row.feeCurrency === "VND" ? 1 : 100)} ${row.feeCurrency ?? "DKK"}`
            : "",
        ]
          .map(escapeCsv)
          .join(","),
      );
    }
    return new NextResponse("\uFEFF" + rows.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="finance-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof FinanceInputError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}

export const GET = withApiSecurity(handleGET);
