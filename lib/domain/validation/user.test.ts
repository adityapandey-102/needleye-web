import { describe, expect, it } from "vitest";
import { inviteUserSchema, updateUserSchema } from "./user";

describe("inviteUserSchema", () => {
  it("accepts a valid invite", () => {
    expect(inviteUserSchema.safeParse({ email: "a@b.com", fullName: "A B", role: "designer" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(inviteUserSchema.safeParse({ email: "not-an-email", fullName: "A B", role: "designer" }).success).toBe(false);
  });

  it("rejects an unknown role", () => {
    expect(inviteUserSchema.safeParse({ email: "a@b.com", fullName: "A B", role: "superadmin" }).success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a partial update of just `active`", () => {
    expect(updateUserSchema.safeParse({ active: false }).success).toBe(true);
  });
});
