import { NavbarDemo } from "../components/Navbar";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <NavbarDemo />

      {/* Dummy content */}
      <main className="mt-24 space-y-16 px-6 pb-20">
        {Array.from({ length: 12 }).map((_, i) => (
          <section
            key={i}
            className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-gray-50 p-8 shadow-sm"
          >
            <h2 className="mb-3 text-2xl font-semibold text-gray-800">
              Section {i + 1}
            </h2>

            <p className="text-gray-600 leading-relaxed">
              This is dummy content to test scrolling behavior of your navbar.
              You can replace this later with pilgrim information such as temple
              details, darshan timings, travel guidance, rituals, or FAQs.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <div
                  key={j}
                  className="h-24 rounded-lg bg-white border shadow-sm flex items-center justify-center text-gray-500"
                >
                  Card {j + 1}
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
