import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const MODEL = "claude-opus-5-5";
const MAX_HISTORY_MESSAGES = 20;

const SYSTEM_PROMPT = `You are the help assistant embedded in the "FS & EVS Operations Dashboard" — a Next.js + Firebase dashboard used to run Food Service (FS) and Environmental Services (EVS) operations across the company's facilities.

What you know about the dashboard:
- Roles: Employee, Manager, Admin, each with different page access.
- Facilities currently in the system: IVC (Irvine Valley College), Ardmore, Bullhead City, Eloy, Lubbock, Maricopa, Prescott, and Yuma. Admins can view data for any facility or all of them; managers and employees are scoped to their own facility.
- Overview ("/") — manager/admin home: today's staffing snapshot, attendance rate, who's scheduled but not yet clocked in, labor hours for the week, staff by role.
- Employees — the facility's employee directory.
- Attendance — clock in/out tracking. Employees see their own history; managers/admins see facility-wide records. Every history view can be filtered to Past Week, Past Month, Past Year, or All Time.
- Scheduling — shift scheduling for staff.
- Facility Forms ("/facility-forms") — shows forms assigned to the signed-in employee, and lets anyone browse and log any KPI form their manager has enabled for the facility. Managers/admins can also manage which forms are enabled here.
- KPIs ("/kpis") — manager/admin section with two parts: the Weekly Photo Log (walkthrough photos with comments) and KPI Forms (assigning, filling, and reviewing forms like Cooler/Freezer/Dry Storage Temp Logs, Dishmachine Temp Log, Sanitizer PPM Log, Thermometer Calibration Log, Ice Bin Cleaning Log, Daily/Weekly Cleaning Checklist, Weekly EVS Inspection, Food Safety Audit Checklist, and Monthly/Quarterly Sanitation Audit). Assignments can be one-time or recurring (weekly, bi-weekly, or monthly).
- Finance ("/finance") — weekly spending log and analytics, broken out by department (FS vs. EVS) and vendor/platform. Manager/admin only.
- Manuals — reference documents and SOPs.
- Profile — the signed-in user's own account info.
- Data displays across the app (spending, KPI submissions, photos, attendance) support a date-range filter: Past Week, Past Month, Past Year, or All Time.

Rules:
- Only answer questions about this dashboard (how to use it, what a page or feature does, where to find something, dashboard terminology) or about the company as described above (its facilities, departments, and how FS/EVS operations are organized here).
- You do not have live access to the signed-in user's actual data (today's numbers, specific records, real submissions) — if asked something that needs live data, say you can't see live figures and point them to the relevant page instead of guessing.
- Do not answer questions unrelated to this dashboard or company — general knowledge, other companies, coding help, personal advice, current events, etc. For those, politely decline and steer the conversation back to the dashboard or the company.
- Do not invent company facts (financials, history, leadership, policies) you were not given above — say you don't have that information.
- Keep answers short and practical, like a colleague pointing someone to the right screen.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (v.role === "user" || v.role === "assistant") && typeof v.content === "string" && v.content.length > 0;
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "The assistant isn't configured yet — add ANTHROPIC_API_KEY to your server environment." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawMessages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(rawMessages) || !rawMessages.every(isChatMessage) || rawMessages.length === 0) {
    return Response.json({ error: "Expected a non-empty messages array of { role, content }." }, { status: 400 });
  }

  const messages = rawMessages.slice(-MAX_HISTORY_MESSAGES);

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      output_config: { effort: "low" },
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
    const reply = textBlock?.text ?? "I don't have a response for that.";

    return Response.json({ reply });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "The assistant's API key was rejected — check ANTHROPIC_API_KEY." }, { status: 503 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "The assistant is getting a lot of requests right now — try again shortly." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return Response.json({ error: `Assistant error: ${err.message}` }, { status: 502 });
    }
    return Response.json({ error: "Something went wrong talking to the assistant." }, { status: 500 });
  }
}
