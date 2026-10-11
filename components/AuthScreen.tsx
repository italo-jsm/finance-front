import Image from "next/image";

type AuthScreenProps = {
  failed?: boolean;
  onRetry?: () => void;
};

export function AuthScreen({ failed = false, onRetry }: AuthScreenProps) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-white px-6 py-10 text-neutral-950">
      <div className="w-full max-w-[352px] text-center">
        <Image src="/im-logo.svg" alt="IM — Italo Mariano" width={128} height={84} priority className="mx-auto" />
        <p role={failed ? "alert" : "status"} className="mt-10 text-sm leading-6 text-neutral-600">
          {failed ? "Não foi possível abrir o login. Tente novamente." : "Conectando…"}
        </p>
        {failed && onRetry && (
          <button type="button" onClick={onRetry}
            className="mt-6 min-h-12 w-full rounded-md bg-neutral-950 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950">
            Tentar novamente
          </button>
        )}
      </div>
    </main>
  );
}
