import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("native custom-question editor", () => {
  it("offers server-safe add, remove, reorder, and named form controls without client hydration", () => {
    const editor = source("app/components/QuestionsEditor.tsx"); const page = source("app/dashboard/manage-events/create-event/[eventId]/page.tsx"); const actions = source("app/actions.ts");
    expect(editor).not.toContain('"use client"');
    expect(editor).toContain("Add New Question");
    expect(editor).toContain("questionDrafts");
    expect(editor).toContain("customQuestionCount");
    expect(editor).toContain("Remove custom question");
    expect(page).toContain("questionDrafts={query.questionDrafts}");
    expect(actions).toContain("nativeQuestionCount");
    expect(actions).toContain("customQuestion_${index}_question");
  });
});
