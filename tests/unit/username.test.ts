import { describe, expect, it } from "vitest";
import { identifierLookup, optionalUsernameSchema, usernameSchema } from "@/lib/auth/username";
import { userCreateSchema, userUpdateSchema } from "@/lib/validations/users";

describe("identifierLookup", () => {
  it("treats anything with @ as an email", () => {
    expect(identifierLookup("  Arjun@Studio.com ")).toEqual({ email: "arjun@studio.com" });
  });

  it("treats the rest as a username", () => {
    expect(identifierLookup(" Arjun.K ")).toEqual({ username: "arjun.k" });
  });
});

describe("usernameSchema", () => {
  it("accepts and lower-cases valid usernames", () => {
    expect(usernameSchema.parse(" Arjun_K-1 ")).toBe("arjun_k-1");
    expect(usernameSchema.parse("abc")).toBe("abc");
    expect(usernameSchema.parse("a".repeat(32))).toBe("a".repeat(32));
  });

  it("rejects bad lengths, characters and edges", () => {
    for (const bad of ["ab", "a".repeat(33), "arjun k", "arjun@x", ".arjun", "arjun-", "அர்ஜுன்"]) {
      expect(usernameSchema.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe("optionalUsernameSchema", () => {
  it("turns empty or null into null", () => {
    expect(optionalUsernameSchema.parse("  ")).toBeNull();
    expect(optionalUsernameSchema.parse(null)).toBeNull();
  });

  it("still validates a non-empty value", () => {
    expect(optionalUsernameSchema.safeParse("x").success).toBe(false);
  });
});

describe("user schemas", () => {
  const invite = { name: "Arjun", email: "arjun@studio.com", isOwner: true };

  it("defaults a missing username to null on invite", () => {
    expect(userCreateSchema.parse(invite).username).toBeNull();
    expect(userCreateSchema.parse({ ...invite, username: "Arjun" }).username).toBe("arjun");
  });

  it("leaves username untouched on update unless sent", () => {
    expect(userUpdateSchema.parse({ name: "Arjun" }).username).toBeUndefined();
    expect(userUpdateSchema.parse({ username: "" }).username).toBeNull();
    expect(userUpdateSchema.safeParse({ username: "a b" }).success).toBe(false);
  });
});
