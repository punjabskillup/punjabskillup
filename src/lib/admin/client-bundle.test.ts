import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

async function getFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? getFiles(path) : Promise.resolve([path]);
    }),
  );
  return nested.flat();
}

describe("client bundle secrets", () => {
  it("does not include the Supabase service-role key", async (context) => {
    const staticDirectory = join(process.cwd(), ".next", "static");
    let files: string[];

    try {
      files = await getFiles(staticDirectory);
    } catch {
      context.skip();
      return;
    }

    const javascript = await Promise.all(
      files
        .filter((file) => file.endsWith(".js"))
        .map((file) => readFile(file, "utf8")),
    );
    const clientOutput = javascript.join("\n");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(clientOutput).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceKey) {
      expect(clientOutput).not.toContain(serviceKey);
    }
  });
});
