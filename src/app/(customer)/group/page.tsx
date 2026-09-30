import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { GROUP_LIMITS } from "@/lib/domain/split";
import { openTableFor } from "@/server/groups";
import { JoinForm, StartButton } from "./lobby";

export const metadata: Metadata = { title: "Table order" };

export default async function GroupLobby() {
  const user = await requireUser("CUSTOMER");
  const open = await openTableFor(user.id);
  if (open) redirect(`/group/${open}`);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="display text-4xl sm:text-6xl">Eating together?</h1>
      <p className="mt-3 max-w-xl text-lg">
        Start a table, share the code with your friends, and everyone picks their own food. One token for the table, and each
        person pays only for their own plate from their own wallet.
      </p>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <section className="panel flex flex-col p-6 shadow-hard-lg" aria-labelledby="start-h">
          <h2 id="start-h" className="text-2xl font-black">Start a table</h2>
          <p className="mt-2 flex-1 text-muted">You&rsquo;ll get a 4-letter code to send on the group chat. Up to {GROUP_LIMITS.maxMembers} people.</p>
          <StartButton />
        </section>

        <section className="panel flex flex-col bg-turmeric-soft p-6 shadow-hard-lg" aria-labelledby="join-h">
          <h2 id="join-h" className="text-2xl font-black">Join a friend&rsquo;s table</h2>
          <p className="mt-2 text-muted">Type the code they sent you.</p>
          <JoinForm />
        </section>
      </div>

      <ol className="mt-12 grid gap-5 sm:grid-cols-4">
        {[
          ["Share the code", "Everyone joins from their own phone."],
          ["Fill your plate", "Each person adds what they're eating."],
          ["Tap I'm in", "Your share, with GST, is shown before you commit."],
          ["Host places it", "One token, and each wallet pays its own share."],
        ].map(([title, body], i) => (
          <li key={title} className="border-l-[3px] border-ink pl-3">
            <span className="display nums text-2xl">{i + 1}</span>
            <p className="mt-1 font-extrabold">{title}</p>
            <p className="text-sm text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
