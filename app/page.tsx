import { BlackjackGame } from "@/components/blackjack/BlackjackGame";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 flex-col items-center bg-white dark:bg-black">
        <BlackjackGame />
      </main>
    </div>
  );
}
