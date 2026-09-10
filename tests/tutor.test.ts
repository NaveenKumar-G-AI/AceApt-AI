import { afterEach, describe, expect, it, vi } from "vitest";
import { generateTutor } from "@/ai/provider";
import { tutorInput } from "@/ai/schemas";
import { POST } from "@/app/api/tutor/route";
const input = {
  action: "hint" as const,
  message: "How do I find 20 percent of 500?",
  history: [],
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Gemini tutor boundary", () => {
  it("refuses a missing key without contacting a provider", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetcher = vi.fn();
    await expect(
      generateTutor(input, undefined, fetcher),
    ).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["hint", "explain", "reasoning"] as const)(
    "validates a %s reply and keeps provider credentials in the server header",
    async (action) => {
      vi.stubEnv("GEMINI_API_KEY", "test-only-value");
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      message: "Start by finding one tenth of the base.",
                      nextStep: "What is 500 divided by 10?",
                    }),
                  },
                ],
              },
            },
          ],
        }),
      );
      const result = await generateTutor(
        { ...input, action },
        undefined,
        fetcher,
      );
      expect(result.message).toContain("one tenth");
      const [url, options] = fetcher.mock.calls[0];
      expect(String(url)).not.toContain("test-only-value");
      expect(options?.headers).toHaveProperty(
        "x-goog-api-key",
        "test-only-value",
      );
      expect(String(options?.body)).toContain(
        "Never reveal a complete answer for the hint action",
      );
    },
  );
  it.each([401, 429, 500, 503])(
    "handles upstream HTTP %i without exposing the provider body",
    async (status) => {
      vi.stubEnv("GEMINI_API_KEY", "test-only-value");
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("private provider detail", { status }));
      await expect(
        generateTutor(input, undefined, fetcher),
      ).rejects.toMatchObject({
        message: "The tutor is temporarily unavailable.",
        status: status === 429 ? 429 : 503,
      });
    },
  );
  it.each(["not json", "{}", '{"message":""}'])(
    "rejects malformed structured content %s",
    async (text) => {
      vi.stubEnv("GEMINI_API_KEY", "test-only-value");
      await expect(
        generateTutor(input, undefined, async () =>
          Response.json({ candidates: [{ content: { parts: [{ text }] } }] }),
        ),
      ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    },
  );
  it("handles a safety refusal", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-only-value");
    await expect(
      generateTutor(input, undefined, async () =>
        Response.json({ candidates: [{ finishReason: "SAFETY" }] }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it("handles network failures and cancellation", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-only-value");
    await expect(
      generateTutor(input, undefined, async () => {
        throw Error("network");
      }),
    ).rejects.toMatchObject({ status: 502 });
    await expect(
      generateTutor(input, AbortSignal.abort(), async () => {
        throw Error("abort");
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });
  it("rejects extremely short, long and unexpected input", () => {
    for (const message of ["", "hi", "x".repeat(4001)])
      expect(tutorInput.safeParse({ ...input, message }).success).toBe(false);
    expect(
      tutorInput.safeParse({ ...input, apiKey: "do not accept" }).success,
    ).toBe(false);
  });
});
describe("HTTP request boundary", () => {
  it("reaches Gemini and returns a validated reply through Render", async () => {
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://aceapt-test.onrender.com");
    vi.stubEnv("GEMINI_API_KEY", "test-only-value");
    const output = {message: "Find one tenth first.", nextStep: "What is 500 divided by 10?"};
    const fetcher = vi.fn().mockResolvedValue(Response.json({candidates: [{
      finishReason: "STOP", content: {parts: [{text: JSON.stringify(output)}]},
    }]}));
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(new Request("http://0.0.0.0:10000/api/tutor", {
      method: "POST", body: JSON.stringify(input),
      headers: {origin: "https://aceapt-test.onrender.com", "x-forwarded-for": crypto.randomUUID()},
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(output);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each([
    "https://other.onrender.com", "https://aceapt-test.onrender.com.evil.example",
    "http://aceapt-test.onrender.com", "null", "not a URL",
  ])("rejects an unrelated or malformed origin behind Render: %s", async origin => {
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://aceapt-test.onrender.com");
    const response = await POST(new Request("http://0.0.0.0:10000/api/tutor", {
      method: "POST", body: "{}",
      headers: {origin, "x-forwarded-host": "other.onrender.com", "x-forwarded-proto": "https"},
    }));
    expect(response.status).toBe(403);
  });
  it("accepts a separately configured custom domain", async () => {
    vi.stubEnv("APP_ORIGIN", "https://learn.example.com/");
    const response = await POST(new Request("http://0.0.0.0:10000/api/tutor", {
      method: "POST", body: "{}",
      headers: {origin: "https://learn.example.com", "x-forwarded-for": crypto.randomUUID()},
    }));
    expect(response.status).toBe(400);
  });
  it("ignores invalid public-origin configuration instead of throwing", async () => {
    vi.stubEnv("APP_ORIGIN", "https://learn.example.com/path");
    vi.stubEnv("RENDER_EXTERNAL_URL", "invalid");
    const response = await POST(new Request("http://0.0.0.0:10000/api/tutor", {
      method: "POST", body: "{}", headers: {origin: "https://learn.example.com"},
    }));
    expect(response.status).toBe(403);
  });
  it("accepts the Render public origin behind the internal Next.js listener", async () => {
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://aceapt-test.onrender.com");
    const response = await POST(new Request("http://0.0.0.0:10000/api/tutor", {
      method: "POST",
      headers: {origin: "https://aceapt-test.onrender.com", "x-forwarded-for": crypto.randomUUID()},
      body: "{}",
    }));
    expect(response.status).toBe(400);
  });
  function request(
    body: string,
    origin = "http://localhost",
    ip = crypto.randomUUID(),
  ) {
    return new Request("http://localhost/api/tutor", {
      method: "POST",
      headers: { origin, "x-forwarded-for": ip },
      body,
    });
  }
  it("rejects cross-origin requests", async () => {
    expect(
      (await POST(request(JSON.stringify(input), "http://other.example")))
        .status,
    ).toBe(403);
  });
  it("handles invalid JSON, invalid schema and excessive bodies", async () => {
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request('{"message":"hi"}'))).status).toBe(400);
    expect((await POST(request("x".repeat(49000)))).status).toBe(413);
  });
  it("returns a useful missing-key response without a stack trace", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const response = await POST(request(JSON.stringify(input)));
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain("available solution steps");
    expect(body).not.toMatch(/GEMINI|stack|test-only/);
  });
  it("limits repeated submissions", async () => {
    const ip = crypto.randomUUID();
    for (let i = 0; i < 12; i++)
      await POST(request("{", "http://localhost", ip));
    expect((await POST(request("{", "http://localhost", ip))).status).toBe(429);
  });
});
