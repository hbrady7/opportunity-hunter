"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, Label, Chip, Spinner, KeyMissing, FallbackNote } from "@/components/ui";
import { AgentErrorView } from "@/components/agents/agent-error";
import { useApiStatus, agentPost, AgentError } from "@/lib/client";
import { useStore } from "@/lib/store";
import { SI_TABLE, GLOSSARY, SOURCES, PLAYBOOK, type PaidFlag } from "@/lib/learn-content";
import { ExternalLink, MessageCircleQuestion, Send, BookmarkPlus, Check } from "lucide-react";

const SECTIONS = [
  ["si", "Status Indicators"],
  ["reimb", "Separately Reimbursable 101"],
  ["oppspfs", "OPPS vs PFS"],
  ["anatomy", "Code Anatomy"],
  ["ncci", "NCCI & Packaging"],
  ["lines", "Service Lines"],
  ["playbook", "The Playbook"],
  ["glossary", "Glossary"],
  ["sources", "Official Sources"],
  ["ask", "Ask"],
] as const;

function PaidPill({ flag }: { flag: PaidFlag }) {
  const tone = flag === "Yes" ? "green" : flag === "No" ? "red" : flag === "Conditional" ? "amber" : "slate";
  return <Chip tone={tone}>{flag === "Other" ? "OTHER FS" : flag.toUpperCase()}</Chip>;
}

function AskBox() {
  const api = useApiStatus();
  const addQuestion = useStore((s) => s.addQuestion);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AgentError | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [usedWeb, setUsedWeb] = useState(true);
  const [saved, setSaved] = useState(false);

  async function ask() {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setSaved(false);
    try {
      const data = await agentPost<{ answer: string; usedWebSearch: boolean }>("/api/ask", { question: q });
      setAnswer(data.answer);
      setUsedWeb(data.usedWebSearch);
    } catch (e) {
      setError(e instanceof AgentError ? e : new AgentError("agent_error", "Could not answer."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-claim p-4 sm:p-5">
      <Label>Ask the analyst</Label>
      <p className="text-xs text-slate mt-1">Free-form RCM question. Answers name a CMS source to verify against.</p>
      <div className="flex gap-2 mt-3">
        <input
          className="field"
          placeholder="e.g. When does modifier 25 unlock a separate E/M payment?"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
        />
        <button className="btn btn-sm shrink-0" disabled={loading || !q.trim()} onClick={ask}>
          {loading ? <Spinner /> : <Send size={13} />}
        </button>
      </div>
      {!api.loading && !api.keyConfigured && <div className="mt-3"><KeyMissing /></div>}
      {error && <div className="mt-3"><AgentErrorView error={error} /></div>}
      {answer && (
        <div className="mt-3">
          {!usedWeb && <div className="mb-2"><FallbackNote message="Answer based on model knowledge — confirm against the named CMS source." /></div>}
          <div className="prose-claim text-sm whitespace-pre-wrap border-t border-rule pt-3">{answer}</div>
          <button
            className="btn btn-sm btn-ghost mt-3"
            onClick={() => {
              addQuestion(q, "Learn · Ask");
              setSaved(true);
            }}
          >
            {saved ? <Check size={13} /> : <BookmarkPlus size={13} />} {saved ? "Saved to question bank" : "Save question for mentor"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function LearnPage() {
  return (
    <div>
      <PageHeader
        field="6 · LEARN"
        title="Learning hub"
        subtitle="Accurate, hand-written RCM reference — works with no API key. Start with status indicators; they decide everything."
      />

      {/* section nav */}
      <div className="flex flex-wrap gap-1.5 mb-6 no-print">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="chip text-slate hover:text-ink">
            {label}
          </a>
        ))}
      </div>

      {/* SI TABLE */}
      <section id="si" className="scroll-mt-20 mb-10">
        <h2 className="text-lg font-semibold mb-1">OPPS Status Indicators</h2>
        <p className="text-sm text-slate mb-3">
          The heart of the hub. The status indicator in OPPS Addendum B tells you, at a glance, whether a code earns its own
          payment. <strong className="text-ink">Yes</strong> = separately paid; <strong className="text-ink">No</strong> = packaged or not payable;{" "}
          <strong className="text-ink">Conditional</strong> = depends on what else is on the claim.
        </p>
        <div className="card-plain overflow-x-auto">
          <table className="ledger min-w-[560px]">
            <thead>
              <tr>
                <th>SI</th>
                <th>Separately paid?</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {SI_TABLE.map((r) => (
                <tr key={r.si}>
                  <td className="mono font-semibold align-top">{r.si}</td>
                  <td className="align-top"><PaidPill flag={r.paid} /></td>
                  <td className="text-xs">{r.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate mt-2 mono">Follows OPPS Addendum D1. Always confirm a specific code in the current Addendum B.</p>
      </section>

      {/* REIMBURSABLE 101 */}
      <section id="reimb" className="scroll-mt-20 mb-10 prose-claim">
        <h2>Separately Reimbursable 101</h2>
        <p>
          &ldquo;Separately reimbursable&rdquo; means a code generates <strong>its own</strong> OPPS payment instead of having its cost folded
          into another service. This is the mentor&rsquo;s <strong>hard gate</strong>: if a code is packaged, a consulting engagement can&rsquo;t
          &ldquo;lift&rdquo; it into new revenue — the hospital is already being paid for it inside the primary service.
        </p>
        <h3>Why bundled codes can&rsquo;t be lifted</h3>
        <p>
          Under OPPS, many supporting services (status <code>N</code>, and conditionally <code>Q1</code>–<code>Q4</code>) are <em>packaged</em>.
          Billing them adds no dollars because Medicare already accounts for their cost in the APC rate of the primary procedure. Recommending a
          packaged code as &ldquo;new revenue&rdquo; is the classic rookie mistake — it won&rsquo;t survive review.
        </p>
        <h3>How to check a code yourself (Addendum B walkthrough)</h3>
        <ul>
          <li>Open the current <strong>OPPS Addendum B</strong> file from CMS.</li>
          <li>Find your CPT/HCPCS code (the file is sorted by code).</li>
          <li>Read the <strong>Status Indicator</strong> column. <code>S</code>, <code>T</code>, <code>V</code>, <code>R</code>, <code>U</code>, <code>J1</code>, <code>K</code>, <code>G</code> generally pay separately.</li>
          <li><code>N</code> = packaged (no separate pay). <code>Q1/Q2</code> = packaged only when billed alongside certain services — otherwise separate.</li>
          <li>Note the <strong>APC</strong> and <strong>payment rate</strong> columns for the order-of-magnitude dollars.</li>
        </ul>
      </section>

      {/* OPPS vs PFS */}
      <section id="oppspfs" className="scroll-mt-20 mb-10 prose-claim">
        <h2>OPPS vs PFS — facility vs professional</h2>
        <p>
          A single outpatient encounter can generate <strong>two</strong> Medicare payments from two different systems:
        </p>
        <ul>
          <li><strong>OPPS</strong> pays the <strong>hospital (facility)</strong> for the use of the room, staff, supplies, and equipment. Payment is grouped by <strong>APC</strong> and driven by the <strong>status indicator</strong>. This is where most ORO opportunity lives, because the charge data you analyze is facility-side.</li>
          <li><strong>PFS</strong> (Physician Fee Schedule) pays the <strong>physician (professional)</strong> for their cognitive and procedural work. It&rsquo;s <strong>RVU</strong>-based and billed separately by the provider group.</li>
        </ul>
        <p>
          Because your pivot data is hospital charge detail, you approximate opportunity from <strong>OPPS/national Medicare facility rates</strong>.
          When a code is professional-only (no OPPS APC), the <strong>PFS</strong> national amount is the right baseline instead.
        </p>
      </section>

      {/* CODE ANATOMY */}
      <section id="anatomy" className="scroll-mt-20 mb-10 prose-claim">
        <h2>Code Anatomy — what sits on a claim</h2>
        <ul>
          <li><strong>CPT code</strong> — 5-digit AMA procedure code (e.g., <code>99284</code>). The &ldquo;what was done.&rdquo;</li>
          <li><strong>HCPCS Level II</strong> — letter + 4 digits (e.g., <code>J7307</code>, <code>G0378</code>) for drugs, devices, and services not in CPT.</li>
          <li><strong>Revenue code</strong> — 4-digit UB-04 code naming the hospital <em>department/cost center</em> (e.g., <code>0450</code> ED, <code>0636</code> drugs requiring detail coding). The &ldquo;where it happened.&rdquo;</li>
          <li><strong>Internal charge code</strong> — the hospital&rsquo;s own charge-master ID. It <em>maps</em> to a CPT/HCPCS code and a revenue code. The &ldquo;what the hospital calls it.&rdquo;</li>
        </ul>
        <p>
          On a claim, the charge code drives billing, but the <strong>CPT/HCPCS</strong> determines payment and the <strong>revenue code</strong>
          places it in a department. A broken charge-code → CPT mapping is a common source of leakage and a frequent consulting fix.
        </p>
      </section>

      {/* NCCI */}
      <section id="ncci" className="scroll-mt-20 mb-10 prose-claim">
        <h2>NCCI Edits &amp; Packaging Basics</h2>
        <p>
          The <strong>National Correct Coding Initiative</strong> stops improper billing two ways:
        </p>
        <ul>
          <li><strong>PTP edits</strong> (Procedure-to-Procedure): two codes that shouldn&rsquo;t be billed together. A column-1/column-2 pair denies the second code unless a modifier (e.g., <code>59</code>, <code>X{`{EPSU}`}</code>) documents a distinct service.</li>
          <li><strong>MUEs</strong> (Medically Unlikely Edits): the maximum units expected for one patient, one day. Exceeding it triggers denials or review.</li>
        </ul>
        <p>
          <strong>Packaging</strong> is different from an edit — it&rsquo;s a payment policy. A packaged code (status <code>N</code>) is allowed on the
          claim but earns no separate dollars. When sizing opportunity, always separate &ldquo;can&rsquo;t bill it&rdquo; (an edit) from &ldquo;won&rsquo;t get paid extra for it&rdquo; (packaging).
        </p>
      </section>

      {/* SERVICE LINES */}
      <section id="lines" className="scroll-mt-20 mb-10">
        <h2 className="text-lg font-semibold mb-3">Service-Line One-Pagers</h2>
        <div className="space-y-4">
          <div className="card-plain p-4 prose-claim">
            <h3 className="!mt-0">Emergency Department</h3>
            <p><strong>Revenue anatomy:</strong> the ED visit E/M (<code>99281</code>–<code>99285</code>, status <code>V</code>) plus everything done alongside it — procedures, infusions, injections, observation.</p>
            <ul>
              <li><strong>Key families:</strong> visit leveling 99281–99285; critical care <code>99291</code>/<code>99292</code>; drug administration 96360–96379; wound/laceration repair, fracture care, splinting.</li>
              <li><strong>Leakage patterns:</strong> under-leveled visits; procedures and infusions performed but not charged; missing modifier <code>25</code> on a separately identifiable E/M.</li>
              <li><strong>In the charge data:</strong> high 99283/99284 volume but few procedure/infusion charges per visit is a red flag for under-capture.</li>
            </ul>
          </div>
          <div className="card-plain p-4 prose-claim">
            <h3 className="!mt-0">Observation</h3>
            <p><strong>Revenue anatomy:</strong> observation is a <em>status</em>, billed by the hour, not an inpatient admission.</p>
            <ul>
              <li><strong>Key codes:</strong> <code>G0378</code> (observation services, per hour), <code>G0379</code> (direct admission to observation).</li>
              <li><strong>Rules that matter:</strong> the <strong>8-hour</strong> minimum threshold; comprehensive APC <strong>8011</strong> packaging dynamics (the C-APC absorbs most same-claim services).</li>
              <li><strong>Leakage patterns:</strong> hours under-counted; observation not billed when criteria were met; failing to recognize when 8011 packaging changes the marginal value of add-on services.</li>
            </ul>
          </div>
          <div className="card-plain p-4 prose-claim">
            <h3 className="!mt-0">Women&rsquo;s Health</h3>
            <p><strong>Revenue anatomy:</strong> preventive services plus procedures with a separately payable <em>device</em> component.</p>
            <ul>
              <li><strong>Key families:</strong> preventive/well-woman visits; <strong>LARC</strong> insertion (<code>58300</code>) + the device (<code>J7296</code>–<code>J7307</code>); OB ultrasounds; non-stress test (<code>59025</code>).</li>
              <li><strong>Leakage patterns:</strong> billing the insertion but not the device (or vice-versa); missing separately payable J-code devices; ultrasounds not coded to the right specificity.</li>
              <li><strong>In the charge data:</strong> insertion procedures without matching device charges signal lost device revenue.</li>
            </ul>
          </div>
          <div className="card-plain p-4 prose-claim">
            <h3 className="!mt-0">Oncology</h3>
            <p><strong>Revenue anatomy:</strong> drug administration plus the drugs themselves (J-codes), governed by a strict hierarchy.</p>
            <ul>
              <li><strong>Drug-admin hierarchy (<code>96360</code>–<code>96417</code>):</strong> exactly one <em>initial</em> service per encounter, then <em>sequential</em>, <em>concurrent</em>, and <em>each-additional-hour</em> add-ons. Picking the wrong &ldquo;initial&rdquo; understates payment.</li>
              <li><strong>J-code drugs:</strong> check the status indicator — <code>G</code> (pass-through) and <code>K</code> are separately payable; <code>N</code> is packaged.</li>
              <li><strong>Leakage patterns:</strong> add-on infusion hours not captured; wrong initial/sequential designation; wasted drug not billed with <code>JW</code> (or <code>JZ</code> for zero waste).</li>
            </ul>
          </div>
        </div>
      </section>

      {/* PLAYBOOK */}
      <section id="playbook" className="scroll-mt-20 mb-10">
        <h2 className="text-lg font-semibold mb-1">The Playbook</h2>
        <p className="text-sm text-slate mb-3">The capstone methodology, end to end. Each step links to the module that does it.</p>
        <div className="space-y-2">
          {PLAYBOOK.map((s) => (
            <div key={s.n} className="card-plain p-4 flex gap-3">
              <span className="mono text-claim font-bold text-lg leading-none shrink-0 w-6">{s.n}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm">{s.title}</div>
                <p className="text-sm text-slate mt-1">{s.body}</p>
                {s.href && (
                  <Link href={s.href} className="text-xs text-claim underline mt-1.5 inline-block">
                    {s.hrefLabel} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GLOSSARY */}
      <section id="glossary" className="scroll-mt-20 mb-10">
        <h2 className="text-lg font-semibold mb-3">Glossary</h2>
        <div className="card-plain divide-y divide-rule">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="p-3 sm:flex sm:gap-4">
              <div className="mono text-sm font-semibold sm:w-44 shrink-0">{g.term}</div>
              <div className="text-sm text-slate">{g.def}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SOURCES */}
      <section id="sources" className="scroll-mt-20 mb-10">
        <h2 className="text-lg font-semibold mb-3">Official Sources</h2>
        <div className="space-y-2">
          {SOURCES.map((s) => (
            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="card-plain p-3 flex items-start gap-3 hover:border-ink transition-colors">
              <ExternalLink size={15} className="text-claim shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="text-xs text-slate">{s.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ASK */}
      <section id="ask" className="scroll-mt-20 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircleQuestion size={18} className="text-claim" />
          <h2 className="text-lg font-semibold">Ask</h2>
        </div>
        <AskBox />
      </section>
    </div>
  );
}
