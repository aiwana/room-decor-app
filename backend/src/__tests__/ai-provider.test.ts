import { pollinationsProvider } from "../ai/pollinationsProvider";

describe("AI image response validation", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let clock = Date.now();

  beforeEach(() => {
    // Keep the fake clock monotonic across tests: the provider remembers its last call.
    clock += 120_000;
    jest.useFakeTimers({ now: clock });
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const generate = async () => {
    const result = pollinationsProvider.generateRoomImage({ prompt: "Modern living room" });
    // Attach handlers before advancing timers to avoid unhandled rejections.
    const settled = result.then(value => ({ value }), error => ({ error }));
    await jest.advanceTimersByTimeAsync(46_000);
    return settled;
  };

  const image = (signature: number[]) => {
    const bytes = Buffer.alloc(2048);
    Buffer.from(signature).copy(bytes);
    return bytes;
  };

  it.each([
    ["image/jpeg", [255, 216, 255]],
    ["image/png", [137, 80, 78, 71, 13, 10, 26, 10]],
    ["image/webp", [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]],
  ])("accepts %s and normalizes the response type", async (mime, signature) => {
    fetchMock.mockResolvedValue(new Response(image(signature as number[]), {
      headers: { "content-type": `${mime}; charset=binary` },
    }));
    expect(await generate()).toMatchObject({ value: { mimeType: mime, provider: "pollinations" } });
  });

  it("detects PNG when content type is application/octet-stream", async () => {
    fetchMock.mockResolvedValue(new Response(image([137, 80, 78, 71, 13, 10, 26, 10]), {
      headers: { "content-type": "application/octet-stream" },
    }));
    expect(await generate()).toMatchObject({ value: { mimeType: "image/png" } });
  });

  it("rejects a large HTML error page even if it claims to be JPEG", async () => {
    fetchMock.mockResolvedValue(new Response("<html>" + "error".repeat(500), {
      headers: { "content-type": "image/jpeg" },
    }));
    expect(await generate()).toMatchObject({ error: { name: "ProviderError", status: "invalid" } });
  });

  it("rejects a content type that disagrees with the file signature", async () => {
    fetchMock.mockResolvedValue(new Response(image([255, 216, 255]), {
      headers: { "content-type": "text/html" },
    }));
    expect(await generate()).toMatchObject({ error: { status: "invalid" } });
  });

  it("rejects truncated image data", async () => {
    fetchMock.mockResolvedValue(new Response(Buffer.from([255, 216, 255]), {
      headers: { "content-type": "image/jpeg" },
    }));
    expect(await generate()).toMatchObject({ error: { status: "invalid" } });
  });

  it("makes HTTP 504 retryable", async () => {
    fetchMock.mockResolvedValue(new Response("Gateway timeout", { status: 504 }));
    expect(await generate()).toMatchObject({ error: { status: "rate-limited" } });
  });

  it("makes body download failures retryable", async () => {
    fetchMock.mockResolvedValue({ arrayBuffer: jest.fn().mockRejectedValue(new Error("Body timed out")) });
    expect(await generate()).toMatchObject({ error: { status: "unavailable" } });
  });

  it("makes network connection failures retryable", async () => {
    fetchMock.mockRejectedValue(new Error("Connection reset"));
    expect(await generate()).toMatchObject({ error: { status: "unavailable" } });
  });
});
