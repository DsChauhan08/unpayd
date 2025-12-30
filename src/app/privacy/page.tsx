export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-black text-white p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="mb-4 text-zinc-400">
                Your privacy is important to us.
            </p>
            <h2 className="text-xl font-semibold mb-2 mt-8">1. Data Collection</h2>
            <p className="mb-4 text-zinc-400">
                We collect your email and name for authentication purposes. Chat history is stored securely.
            </p>
            <h2 className="text-xl font-semibold mb-2 mt-8">2. AI Models</h2>
            <p className="mb-4 text-zinc-400">
                Your chats are processed by third-party AI providers (Cerebras, OpenRouter) to generate responses. They are not used for training their models.
            </p>
        </div>
    );
}
