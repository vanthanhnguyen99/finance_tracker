import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { FinanceInputError } from "./finance-validation";
import { revalidatePath } from "next/cache";

export function budgetApiError(error: unknown) {
  if (error instanceof FinanceInputError || error instanceof SyntaxError)
    return NextResponse.json(
      {
        error:
          error instanceof SyntaxError
            ? "Dữ liệu JSON không hợp lệ."
            : error.message,
      },
      { status: 400 },
    );
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return NextResponse.json(
      { error: "Ngân sách này đã tồn tại trong tháng." },
      { status: 409 },
    );
  throw error;
}
export function refreshBudgetPages() {
  for (const page of ["/", "/budgets", "/history"]) revalidatePath(page);
}
export function requireBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new FinanceInputError("Dữ liệu không hợp lệ.");
  return body as Record<string, unknown>;
}
