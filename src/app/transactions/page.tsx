import { listTransactions } from "@/lib/data";
import { TransactionsClient } from "@/components/TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const transactions = await listTransactions();
  return <TransactionsClient initialTransactions={transactions} />;
}
