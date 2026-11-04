import { describe, expect, it } from "vitest";
import { applyCuration, heuristicCuration, instagramHandle, type CandidatePost } from "@/domain/feed/curation";

const post = (externalId: string, caption: string): CandidatePost => ({ externalId, caption, mediaType: "IMAGE" });

describe("instagramHandle", () => {
  it("reads the handle from a profile link in any common form", () => {
    expect(instagramHandle(["https://www.instagram.com/kalari_heritage/"])).toBe("kalari_heritage");
    expect(instagramHandle(["https://instagram.com/kaumudi.ayurveda?hl=en"])).toBe("kaumudi.ayurveda");
    expect(instagramHandle(["https://facebook.com/x", " https://instagram.com/second "])).toBe("second");
  });

  it("ignores post links, other sites and anything that could inject into the API query", () => {
    expect(instagramHandle(["https://instagram.com/p/C0abc/"])).toBeNull();
    expect(instagramHandle(["https://instagram.com/reel/C0abc"])).toBeNull();
    expect(instagramHandle(["https://example.com/instagram.com/x"])).toBeNull();
    expect(instagramHandle(["https://instagram.com/a){media}"])).toBeNull();
    expect(instagramHandle([])).toBeNull();
  });
});

describe("heuristicCuration (the fake provider's policy)", () => {
  it("features calm, specific posts and hides selling, health claims and thin posts", () => {
    const { decisions } = heuristicCuration([
      post("a", "Sunrise yoga on the cliff this morning. Beginners always welcome."),
      post("b", "50% OFF all packages this week only! Link in bio."),
      post("c", "This treatment cures back pain in 3 days, guaranteed."),
      post("d", "🌴"),
    ]);
    expect(decisions.map((d) => [d.id, d.show])).toEqual([
      ["a", true],
      ["b", false],
      ["c", false],
      ["d", false],
    ]);
    expect(decisions.every((d) => d.reason.length > 0)).toBe(true);
  });
});

describe("applyCuration", () => {
  const posts = [post("a", "one"), post("b", "two")];

  it("drops ids the model invented and keeps skipped posts hidden", () => {
    const result = applyCuration(posts, {
      decisions: [
        { id: "a", show: true, reason: "Shows the retreat." },
        { id: "zzz", show: true, reason: "Invented." },
      ],
    });
    expect([...result.keys()]).toEqual(["a", "b"]);
    expect(result.get("a")).toEqual({ show: true, reason: "Shows the retreat." });
    expect(result.get("b")?.show).toBe(false);
  });
});
