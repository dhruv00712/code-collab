export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center">
      <div>
        <h1 className="text-4xl font-bold mb-4">CodeCollab 💻</h1>
        <p className="text-lg text-gray-300 mb-6">
          Real-time collaborative coding with live chat & compiler
        </p>
        <a
          href="/auth"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Get Started
        </a>
      </div>
    </div>
  );
}
