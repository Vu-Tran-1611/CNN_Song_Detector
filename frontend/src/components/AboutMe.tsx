// "About me": who built this and what they work on.

const FOCUS = ["Recommender systems", "LLM applications", "RAG", "AI agents", "Backend integration for AI products"];

export function AboutMe() {
  return (
    <section id="about" aria-labelledby="about-title" className="flex scroll-mt-24 flex-col gap-5">
      <h2 id="about-title" className="text-2xl font-bold text-ink sm:text-3xl">
        About me
      </h2>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-5">
          <p className="text-lg leading-relaxed text-ink">
            Hi, I&apos;m <strong className="font-semibold">Hoang Tran</strong>, a Computer Science student at{" "}
            <strong className="font-semibold">Penn State University</strong>, focused on{" "}
            <strong className="font-semibold">Machine Learning Engineering</strong> and{" "}
            <strong className="font-semibold">AI Engineering</strong>. I like building practical AI systems where a model, a backend
            service and a real application work together.
          </p>
          <p className="text-lg leading-relaxed text-ink-muted">
            My recent work is in recommendation systems, LLM-powered agents and RAG. I built an e-commerce recommender with
            content-based retrieval, Two-Tower, BERT4Rec and ComiRec models, and an agentic shopping assistant that searches
            products with LLM tool calling and answers store-policy questions through RAG with LangChain and Pinecone.
          </p>
          <p className="text-lg leading-relaxed text-ink-muted">
            I also build full-stack web apps with Laravel, MySQL, FastAPI and REST APIs, and I enjoy turning ML ideas into working
            products rather than leaving them in notebooks.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <p className="rounded-2xl px-5 py-4 text-lg text-ink shadow-[var(--shadow-soft-inset)]">
            <span className="font-semibold text-accent-deep">Currently:</span> looking for{" "}
            <strong className="font-semibold">Machine Learning Engineer</strong> and{" "}
            <strong className="font-semibold">AI Engineer</strong> new grad roles.
          </p>
          <div>
            <h3 className="mb-3 text-lg font-bold text-ink">Interests</h3>
            <ul className="flex flex-wrap gap-2">
              {FOCUS.map((item) => (
                <li key={item} className="rounded-full px-4 py-2 text-base font-medium text-ink shadow-[var(--shadow-soft-sm)]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
