import { describe, expect, it } from "vitest";
import {
  canonicalFlimmerName,
  flimmerPartnerOf,
  isFlimmerUsername,
} from "../allowlist";
import {
  applyFlimmerAction,
  createSession,
  flimmerPercent,
  scoreChoice,
  scoreDual,
  scoreSpectrum,
  signalKindForRound,
} from "../engine";

describe("Flimmer allowlist", () => {
  it("accepts only the two pair usernames", () => {
    expect(isFlimmerUsername("SuperBata1804")).toBe(true);
    expect(isFlimmerUsername("superselim0606")).toBe(true);
    expect(isFlimmerUsername("anyone-else")).toBe(false);
    expect(isFlimmerUsername(null)).toBe(false);
  });

  it("maps each username to the other", () => {
    expect(flimmerPartnerOf("SuperBata1804")).toBe("SuperSelim0606");
    expect(flimmerPartnerOf("SuperSelim0606")).toBe("SuperBata1804");
    expect(canonicalFlimmerName("superbata1804")).toBe("SuperBata1804");
  });
});

describe("Flimmer scoring", () => {
  it("treats index 0 as a direct hit and the tagged decoy as almost", () => {
    expect(scoreChoice(0, 1)).toBe("direct");
    expect(scoreChoice(2, 1)).toBe("almost");
    expect(scoreChoice(3, 1)).toBe("miss");
  });

  it("scores spectrum near-misses as almost", () => {
    expect(scoreSpectrum(40, 40)).toBe("direct");
    expect(scoreSpectrum(40, 55)).toBe("almost");
    expect(scoreSpectrum(10, 80)).toBe("miss");
  });

  it("scores dual thoughts on overlap", () => {
    expect(scoreDual("kiss me now", "kiss me now")).toBe("direct");
    expect(scoreDual("kiss me now", "kiss me")).toBe("almost");
    expect(scoreDual("blue", "train")).toBe("miss");
  });
});

describe("Flimmer session", () => {
  it("starts only when both are ready and alternates sender", () => {
    let state = createSession("SuperBata1804", "SuperSelim0606", "seed");
    state = applyFlimmerAction(state, { type: "toggle_ready", by: "SuperBata1804" });
    expect(state.started).toBe(false);
    state = applyFlimmerAction(state, { type: "toggle_ready", by: "SuperSelim0606" });
    expect(state.started).toBe(true);
    expect(state.sender).toBe("SuperBata1804");
    expect(signalKindForRound(0)).toBe("emoji");
  });

  it("computes private flimmer percent from almost-weighted hits", () => {
    expect(
      flimmerPercent([{ hit: "direct" }, { hit: "almost" }, { hit: "miss" }])
    ).toBe(56);
  });
});
