import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("event Description step form contract", () => {
  it("uses a native required textarea as the canonical description field rather than a hydration-dependent hidden value", async () => {
    const editor = await readFile(path.join(process.cwd(), "app/components/RichDescriptionEditor.tsx"), "utf8");
    const wizard = await readFile(path.join(process.cwd(), "app/actions.ts"), "utf8");

    expect(editor).toContain('<textarea id="event-description"');
    expect(editor).toContain('name="description"');
    expect(editor).toContain('minLength={20}');
    expect(editor).not.toContain('contentEditable');
    expect(editor).not.toContain('<input type="hidden" name="description"');
    expect(wizard).toContain('const description = text(formData.get("description"));');
    expect(wizard).toContain('await updateEvent(eventId, user.id, { description, currentStep: 4 });');
  });
});
