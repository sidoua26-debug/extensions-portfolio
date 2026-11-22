---
name: unslop-seo
description: Editorial de-slopping, fact-grounding, and clear technical structuring for ExtensionGuy guides, tool documentation, and website copy. Strips AI clichés, em-dashes, and unsubstantiated claims while ensuring answers appear directly in the opening 40 words. Scoped to ExtensionGuy's static website, browser extensions, guides, and tools.
metadata:
  author: illyism
  source: https://github.com/Illyism/seo-skills (commit a158c36a1c2c84a44ee7a1ae69c009caf73e1a35)
  adapted_for: ExtensionGuy (https://extensionguy.me)
  version: 1.0.0
  license: MIT
---

# Unslop SEO and technical clarity pass for ExtensionGuy

Ensure all ExtensionGuy technical guides, landing pages, and tool documentation are grounded in real implementation facts, structured with direct answers, and free of generic AI-generated filler.

> **ExtensionGuy Grounding & Rules:**
> - Ground all claims in the codebase, test fixtures, and verified architecture.
> - Preserves on-device privacy principles: tools and extensions process files locally in the browser with zero server uploads. Never overstate or qualify security claims beyond actual implementation (e.g. clarify that canvas redaction blackouts do not guarantee removal of invisible metadata unless sanitized).
> - Do not require external subscription tools (e.g. AI SEO Tracker). Do not promise search rankings or automated AI citations.
> - Respect repository source-of-truth rules: if modifying generated site pages, edit `build_redesign.py` and run `python3 build_redesign.py`. If modifying standalone guides, edit `guides/<slug>/index.html`.

## Three-phase editing workflow

### Phase 1: Entity and fact grounding
1. **Concrete Mechanics over Adjectives:**
   - Replace vague marketing buzzwords ("blazing-fast", "seamless", "effortless") with verified technical mechanics (e.g. "runs offline via client-side WebAssembly in a Web Worker", "packages LaTeX and media into a ZIP using fflate without server upload").
2. **Privacy & Security Boundaries:**
   - Clearly state that file processing occurs locally in the user's browser.
   - Accurately describe limitations (e.g. PDF redaction visual blackout boundaries, file size recommendations).
3. **No Fabricated Data:**
   - Never insert estimated benchmarks or invented statistics. If a metric is unmeasured, describe the exact mechanism or mark `<!-- [NEEDS VERIFICATION] -->`.

### Phase 2: Direct answer structure
1. **Answer in the First 40 Words:**
   - State the direct answer, technical solution, or core mechanism in the opening sentences. Avoid introductory preamble ("In today's fast-paced digital world...").
2. **Clear Heading Hierarchy:**
   - Use sentence case for headings (`<h2>How client-side PDF redaction works</h2>`).
   - Phrase key section headings as practical questions users search for.
   - Provide an immediate 1-2 sentence direct answer directly following each question heading before detailed steps or code samples.
3. **Self-Contained Technical Sections:**
   - Ensure individual sections and step-by-step instructions make complete sense on their own.

### Phase 3: The 20-point anti-slop rules

| # | Pattern | ExtensionGuy Rule |
| --- | --- | --- |
| 1 | **Em dashes (—) and en dashes (–)** | Zero em dashes in generated copy. Use commas, colons, or clean periods. Number ranges use plain hyphens (`3-5`). |
| 2 | **"Not just X, but Y" / "It's not X, it's Y"** | Eliminate rhetorical contrast framing. State the fact directly. |
| 3 | **AI Vocabulary Clichés** | Eliminate: `delve`, `pivotal`, `tapestry`, `landscape`, `testament`, `underscore`, `foster`, `garner`, `interplay`, `intricate`, `crucial`, `vibrant`, `showcase`, `additionally`, `moreover`, `furthermore`. |
| 4 | **Abstract Buzzwords** | Replace abstract nouns with concrete technical terms (`foundation` instead of `bedrock`, `method` instead of `vector`). |
| 5 | **Inflated Verb Phrases** | Replace `serves as`, `boasts`, `stands as` with `is`, `has`, or concrete active verbs. |
| 6 | **Puffery** | Cut `revolutionary`, `groundbreaking`, `game-changing`, `cutting-edge`, `world-class`. Name the actual capability. |
| 7 | **Trailing `-ing` Clauses** | Cut vague tails like `"...ensuring maximum performance"`. If a tail holds a real fact, make it an explicit sentence. |
| 8 | **Pompous Verbs** | Use `use` instead of `utilize`/`leverage`; `help` instead of `facilitate`; `because` instead of `due to the fact that`. |
| 9 | **Passive Voice** | Name the actor (`"the Web Worker generates LaTeX"`, not `"LaTeX is generated"`). |
| 10 | **Vague Adverbs** | Replace `"converts rapidly"` with the tested benchmark or describe the client-side execution model. |
| 11 | **Title Case Headings** | Use sentence case for all subheadings (`<h2>`, `<h3>`). |
| 12 | **Chatbot Preamble & Outro** | Cut `"In this guide, we will explore"`, `"Let's dive in!"`, `"In conclusion"`. |

## Check script

Run this python check against modified guides or pages to detect slop patterns:

```bash
python3 - <files> <<'PY'
import re, sys
pat = re.compile(
    r"[\u2013\u2014]"
    r"|\bnot (just|only) [^.]{1,60}?(\bbut\b|[,;] it'?s\b)|\bit'?s not [^.,]{1,40}, it'?s\b"
    r"|\b(delve\w*|pivotal|tapestry|landscape|testament|underscor\w*|foster\w*|garner\w*"
    r"|interplay|intricate|crucial|vibrant|showcas\w*|utiliz\w*|leverag\w*|seamless\w*"
    r"|paradigm|bedrock|substrate|north star|flywheel|nexus|locus"
    r"|blazing-fast|groundbreaking|game-changing|cutting-edge|revolutionary|world-class|next-generation|robust"
    r"|serves as|stands as|boasts|in order to|due to the fact that|facilitat\w*|commenc\w*"
    r"|significantly|easily|experts (believe|say|agree)|industry reports|studies show|many teams find"
    r"|in this (article|guide|post)|let'?s dive|i hope this helps|as we have seen|in conclusion"
    r"|in today'?s fast-paced|moreover|furthermore|additionally)\b",
    re.I,
)
hits = 0
for f in sys.argv[1:]:
    fence = False
    for i, line in enumerate(open(f, encoding="utf-8", errors="ignore"), 1):
        if line.lstrip().startswith(("```", "~~~")):
            fence = not fence
            continue
        if not fence and pat.search(line):
            hits += 1
            print(f"{f}:{i}: {line.strip()[:160]}")
print(f"{hits} hits")
sys.exit(1 if hits else 0)
PY
```

## Verification Checklist

- [ ] Technical explanations are accurate and grounded in real repository code.
- [ ] Direct answer is provided within the first 40 words.
- [ ] No em dashes, AI buzzwords, or unverified claims.
- [ ] Maintained sources are updated and any generated HTML files are recompiled.

---
*Upstream attribution: Adapted from [Illyism/seo-skills](https://github.com/Illyism/seo-skills) (pinned commit `a158c36a1c2c84a44ee7a1ae69c009caf73e1a35`). Distributed under the MIT License.*
