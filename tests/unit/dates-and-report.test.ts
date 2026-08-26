import { describe, expect, it } from "vitest";
import {
  addDays,
  dayNumberFor,
  daysBetweenInclusive,
  isWithinRange,
  parseDateInput,
  toDateInputValue,
  toUtcDay,
} from "@/domain/shared/dates";
import {
  defaultReportTitle,
  generateReportContent,
  type ReportItem,
} from "@/domain/reports/generate";
import { markdownExcerpt, renderMarkdown } from "@/lib/markdown";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("date helpers", () => {
  it("parses YYYY-MM-DD as a UTC calendar day", () => {
    expect(parseDateInput("2026-03-05").toISOString()).toBe(
      "2026-03-05T00:00:00.000Z",
    );
  });

  it("round-trips through the date input format", () => {
    expect(toDateInputValue(parseDateInput("2026-03-05"))).toBe("2026-03-05");
  });

  it("normalises an instant with a time component to UTC midnight", () => {
    expect(
      toUtcDay(new Date("2026-03-05T23:45:00.000Z")).toISOString(),
    ).toBe("2026-03-05T00:00:00.000Z");
  });

  it("counts an inclusive day span", () => {
    expect(daysBetweenInclusive(day("2026-03-01"), day("2026-03-10"))).toBe(10);
    expect(daysBetweenInclusive(day("2026-03-01"), day("2026-03-01"))).toBe(1);
  });

  it("numbers the first day of a trip as day 1", () => {
    expect(dayNumberFor(day("2026-03-01"), day("2026-03-01"))).toBe(1);
    expect(dayNumberFor(day("2026-03-01"), day("2026-03-04"))).toBe(4);
  });

  it("includes both boundaries in a range check", () => {
    const start = day("2026-03-01");
    const end = day("2026-03-10");
    expect(isWithinRange(start, start, end)).toBe(true);
    expect(isWithinRange(end, start, end)).toBe(true);
    expect(isWithinRange(day("2026-02-28"), start, end)).toBe(false);
    expect(isWithinRange(day("2026-03-11"), start, end)).toBe(false);
  });

  it("adds days across a month boundary", () => {
    expect(toDateInputValue(addDays(day("2026-03-30"), 3))).toBe("2026-04-02");
  });

  it("rejects an unparseable date", () => {
    expect(() => parseDateInput("not a date")).toThrow();
  });
});

describe("report generation", () => {
  const items: ReportItem[] = [
    {
      dayNumber: 1,
      scheduledDate: day("2026-03-01"),
      title: "Comprehensive Blood Panel",
      moduleName: "Health & Medical",
      catalogueName: "Diagnostics",
      vendorName: "Backwater Diagnostics Centre (demo)",
      vendorLocation: "Kochi",
      clientFacingDescription: "A broad panel of blood tests.",
      whatsIncluded: "Phlebotomy appointment\nLaboratory processing",
      clientDeliverable: "A PDF results report in English.",
      clientFacingNotes: "Please come fasted.",
    },
    {
      dayNumber: 3,
      scheduledDate: day("2026-03-03"),
      title: "Private Yoga Session",
      moduleName: "Wellness & Spa",
      catalogueName: "Yoga & Movement",
      vendorName: "Kaumudi Ayurveda Retreat (demo)",
      vendorLocation: null,
      clientFacingDescription: "A one-to-one yoga session.",
      whatsIncluded: null,
      clientDeliverable: null,
      clientFacingNotes: null,
    },
  ];

  const content = generateReportContent({
    clientName: "Elena Fischer",
    itineraryTitle: "Ten days in Kerala",
    startDate: day("2026-03-01"),
    endDate: day("2026-03-10"),
    items,
  });

  it("titles the report from the itinerary", () => {
    expect(defaultReportTitle("Ten days in Kerala")).toBe(
      "What to Expect - Ten days in Kerala",
    );
  });

  it("includes the client name, dates and every item title", () => {
    expect(content).toContain("Elena Fischer");
    expect(content).toContain("Ten days in Kerala");
    expect(content).toContain("Comprehensive Blood Panel");
    expect(content).toContain("Private Yoga Session");
  });

  it("reproduces stored descriptions, inclusions and deliverables verbatim", () => {
    expect(content).toContain("A broad panel of blood tests.");
    expect(content).toContain("- Phlebotomy appointment");
    expect(content).toContain("A PDF results report in English.");
  });

  it("carries the vendor name and location through", () => {
    expect(content).toContain("Backwater Diagnostics Centre (demo)");
    expect(content).toContain("Kochi");
  });

  it("includes the coordinator note when there is one", () => {
    expect(content).toContain("Please come fasted.");
  });

  it("omits sections for items with no inclusions or deliverables", () => {
    const yogaSection = content.slice(content.indexOf("Private Yoga Session"));
    expect(yogaSection).not.toContain("**What is included**");
  });

  it("states plainly that dates are proposed, not confirmed appointments", () => {
    expect(content).toMatch(/Times shown are proposed/i);
  });

  it("carries a non-medical disclaimer and makes no clinical claim", () => {
    expect(content).toMatch(/not a medical opinion, diagnosis or treatment/i);
    expect(content).not.toMatch(/\b(cure|guarantee|will heal|treats your)\b/i);
  });

  it("handles an itinerary with no items without throwing", () => {
    const empty = generateReportContent({
      clientName: "Nobody",
      itineraryTitle: "Empty",
      startDate: null,
      endDate: null,
      items: [],
    });
    expect(empty).toContain("No elements have been added");
    expect(empty).toContain("Dates to be confirmed");
  });
});

describe("markdown rendering", () => {
  it("renders headings, lists, bold and italics", () => {
    const html = renderMarkdown("# Title\n\n- one\n- two\n\n**bold** and _soft_");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>soft</em>");
  });

  it("escapes raw HTML so admin-authored content cannot inject script", () => {
    const html = renderMarkdown('<script>alert("x")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes an img onerror payload", () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">');
    expect(html).not.toMatch(/<img/i);
    expect(html).toContain("&lt;img");
  });

  it("does not let an attribute break out of an escaped tag", () => {
    const html = renderMarkdown("\"><script>alert(1)</script>");
    expect(html).not.toContain("<script>");
  });

  it("produces a plain-text excerpt without markup", () => {
    const excerpt = markdownExcerpt("## Heading\n\n- **item** one");
    expect(excerpt).not.toContain("#");
    expect(excerpt).not.toContain("*");
    expect(excerpt).toContain("Heading");
  });
});
