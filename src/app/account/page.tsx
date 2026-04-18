import type { Metadata } from "next";
import { AccountContent } from "@/components/account/AccountContent";

export const metadata: Metadata = {
  title: "Account — optioNerd",
};

export default function AccountPage() {
  return <AccountContent />;
}
